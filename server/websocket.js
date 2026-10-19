/**
 * Native WebSocket Server Module for Master Coach Platform v3.0
 * Provides bidirectional real-time messaging, channel segregation,
 * presence tracking, heartbeat ping/pong, and dual-broadcast bridge.
 */

const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./database');

// Module-level reference to the active ChannelManager for dual-broadcast bridge
let activeChannelManager = null;
let activeWss = null;
let heartbeatInterval = null;

/**
 * Extracts authentication token from upgrade request.
 * Supports:
 * 1. URL search param (?token=...)
 * 2. Authorization header (Bearer ...)
 * 3. Sec-WebSocket-Protocol header (token or Bearer <token>)
 */
function extractToken(request, searchParams) {
    if (searchParams.get('token')) {
        return searchParams.get('token');
    }

    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }

    const protocolHeader = request.headers['sec-websocket-protocol'];
    if (protocolHeader) {
        const parts = protocolHeader.split(',').map(s => s.trim());
        for (const part of parts) {
            if (part.toLowerCase().startsWith('bearer.')) {
                return part.slice(7);
            }
            if (part.toLowerCase() !== 'bearer' && (part.includes('.') || part.length > 20)) {
                return part;
            }
        }
        if (parts.length > 0 && parts[0].toLowerCase() !== 'bearer') {
            return parts[0];
        }
    }

    return null;
}

/**
 * Writes an HTTP error response to the raw socket and terminates it.
 */
function rejectUpgrade(socket, statusCode = 401, statusText = 'Unauthorized') {
    try {
        socket.end(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${statusText.length}\r\n\r\n${statusText}`);
    } catch (_) {
        socket.destroy();
    }
}

/**
 * ChannelManager maintains connected WebSocket clients mapped by userId,
 * enforces channel membership, and isolates private supervisory communications.
 */
class ChannelManager {
    constructor(wss) {
        this.wss = wss;
        this.userSockets = new Map(); // userId (number) -> Set<WebSocket>
    }

    addClient(ws) {
        if (!ws.user || !ws.user.id) return;
        const userId = ws.user.id;
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(ws);
    }

    removeClient(ws) {
        if (!ws.user || !ws.user.id) return;
        const userId = ws.user.id;
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Broadcasts an event to all connected members of a channel.
     * Enforces strict channel segregation:
     * - Group channel: all active coaches and admin
     * - Direct channel: only the assigned candidate coach and Master Coach (admin)
     */
    broadcastToChannel(channelId, eventObject, excludeWs = null) {
        const numericChannelId = parseInt(channelId, 10);
        if (isNaN(numericChannelId)) return;

        const channel = db.getChannelById(numericChannelId);
        if (!channel) return;

        const dataStr = typeof eventObject === 'string' ? eventObject : JSON.stringify(eventObject);

        for (const [userId, sockets] of this.userSockets.entries()) {
            const user = db.getUserById(userId);
            if (!user) continue;

            const isAuthorized = (user.role === 'admin') || db.isUserChannelMember(numericChannelId, userId);
            if (isAuthorized) {
                for (const ws of sockets) {
                    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                        try {
                            ws.send(dataStr);
                        } catch (err) {
                            console.error('Error dispatching WebSocket frame to client:', err.message);
                        }
                    }
                }
            }
        }
    }

    /**
     * Dispatches an event directly to a specific user across all their open sockets.
     */
    sendToUser(userId, eventObject) {
        const sockets = this.userSockets.get(Number(userId));
        if (!sockets) return;
        const dataStr = typeof eventObject === 'string' ? eventObject : JSON.stringify(eventObject);
        for (const ws of sockets) {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(dataStr);
                } catch (err) {
                    console.error('Error dispatching direct frame to user:', err.message);
                }
            }
        }
    }

    /**
     * Returns list of currently connected user IDs.
     */
    getConnectedUserIds() {
        return Array.from(this.userSockets.keys());
    }

    /**
     * Returns whether a user is currently online.
     */
    isUserOnline(userId) {
        const sockets = this.userSockets.get(Number(userId));
        return !!(sockets && sockets.size > 0);
    }
}

/**
 * Handles incoming `chat:send` WebSocket frame.
 */
function handleChatSend(ws, payload, correlationId, channelManager) {
    const channelId = parseInt(payload.channelId || payload.channel_id, 10);
    if (isNaN(channelId)) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_CHANNEL_ID',
            message: 'معرف القناة غير صالح',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const channel = db.getChannelById(channelId);
    if (!channel) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'CHANNEL_NOT_FOUND',
            message: 'قناة المحادثة غير موجودة',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const isMember = db.isUserChannelMember(channelId, ws.user.id);
    if (!isMember && ws.user.role !== 'admin') {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'ليس لديك صلاحية الإرسال في هذه القناة الإشرافية',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const messageType = payload.messageType || payload.message_type || 'text';
    const validTypes = ['text', 'audio', 'image', 'file'];
    if (!validTypes.includes(messageType)) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_MESSAGE_TYPE',
            message: `نوع الرسالة غير صالح (${messageType})`,
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const isStringContent = typeof payload.content === 'string';
    const content = isStringContent ? payload.content.trim() : '';

    if (messageType === 'text' && (!isStringContent || !content)) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'CONTENT_REQUIRED',
            message: 'Message content is required for text messages',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    if (content.length > 10000) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'CONTENT_TOO_LONG',
            message: 'محتوى الرسالة يتجاوز الحد الأقصى المسموح به (10,000 حرف)',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const mediaUrl = payload.mediaUrl || payload.media_url || null;
    if (['audio', 'image', 'file'].includes(messageType) && !mediaUrl) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'MEDIA_URL_REQUIRED',
            message: 'رابط الملف المرفق مطلوب',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const mediaMeta = payload.mediaMeta || payload.media_meta || null;

    const newMsg = db.createChatMessage({
        channelId,
        senderId: ws.user.id,
        messageType,
        content,
        mediaUrl,
        mediaMeta
    });

    const event = {
        type: 'chat:message',
        channelId,
        message: newMsg,
        payload: {
            channelId,
            message: newMsg,
            ...newMsg
        },
        correlationId,
        timestamp: new Date().toISOString()
    };

    channelManager.broadcastToChannel(channelId, event);
}

/**
 * Handles incoming `chat:typing` WebSocket frame.
 */
function handleChatTyping(ws, payload, correlationId, channelManager) {
    const channelId = parseInt(payload.channelId || payload.channel_id, 10);
    if (isNaN(channelId)) return;

    const channel = db.getChannelById(channelId);
    if (!channel) return;

    const isMember = db.isUserChannelMember(channelId, ws.user.id);
    if (!isMember && ws.user.role !== 'admin') {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'ليس لديك صلاحية في هذه القناة',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    const isTyping = Boolean(payload.isTyping !== undefined ? payload.isTyping : payload.typing);

    const event = {
        type: 'chat:typing',
        channelId,
        userId: ws.user.id,
        userName: ws.user.name,
        isTyping,
        payload: {
            channelId,
            userId: ws.user.id,
            userName: ws.user.name,
            isTyping
        },
        correlationId,
        timestamp: new Date().toISOString()
    };

    // Broadcast to other channel participants, excluding the sender socket
    channelManager.broadcastToChannel(channelId, event, ws);
}

/**
 * Handles incoming `chat:read` WebSocket frame.
 */
function handleChatRead(ws, payload, correlationId, channelManager) {
    const channelId = parseInt(payload.channelId || payload.channel_id, 10);
    if (isNaN(channelId)) return;

    const channel = db.getChannelById(channelId);
    if (!channel) return;

    const isMember = db.isUserChannelMember(channelId, ws.user.id);
    if (!isMember && ws.user.role !== 'admin') {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'ليس لديك صلاحية في هذه القناة',
            correlationId,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    let messageId = payload.messageId || payload.message_id ? parseInt(payload.messageId || payload.message_id, 10) : null;
    if (!messageId) {
        const sqlite = db.getDb();
        const last = sqlite.prepare('SELECT MAX(id) as maxId FROM chat_messages WHERE channel_id = ?').get(channelId);
        messageId = last ? (last.maxId || 0) : 0;
    }

    db.markChannelRead(channelId, ws.user.id, messageId);

    const event = {
        type: 'chat:read_receipt',
        channelId,
        userId: ws.user.id,
        messageId,
        lastReadMessageId: messageId,
        payload: {
            channelId,
            userId: ws.user.id,
            messageId,
            lastReadMessageId: messageId
        },
        correlationId,
        timestamp: new Date().toISOString()
    };

    channelManager.broadcastToChannel(channelId, event);
}

/**
 * Dual-broadcast bridge: exported so REST routes can broadcast messages
 * over WebSocket channels alongside SSE streams.
 */
function broadcastChatMessageViaWS(channelId, message) {
    if (activeChannelManager) {
        const numericChannelId = parseInt(channelId, 10);
        const event = {
            type: 'chat:message',
            channelId: numericChannelId,
            message,
            payload: {
                channelId: numericChannelId,
                message,
                ...message
            },
            timestamp: new Date().toISOString()
        };
        activeChannelManager.broadcastToChannel(numericChannelId, event);
    }
}

/**
 * Dual-broadcast bridge for read receipts.
 */
function broadcastReadReceiptViaWS(channelId, userId, messageId) {
    if (activeChannelManager) {
        const numericChannelId = parseInt(channelId, 10);
        const event = {
            type: 'chat:read_receipt',
            channelId: numericChannelId,
            userId: Number(userId),
            messageId: Number(messageId),
            lastReadMessageId: Number(messageId),
            payload: {
                channelId: numericChannelId,
                userId: Number(userId),
                messageId: Number(messageId),
                lastReadMessageId: Number(messageId)
            },
            timestamp: new Date().toISOString()
        };
        activeChannelManager.broadcastToChannel(numericChannelId, event);
    }
}

/**
 * Dual-broadcast bridge for supervisory live notifications.
 */
function broadcastNotificationViaWS(userId, notification) {
    if (activeChannelManager) {
        const event = {
            type: 'NOTIFICATION_NEW',
            notification,
            timestamp: new Date().toISOString()
        };
        activeChannelManager.sendToUser(Number(userId), event);
    }
}

/**
 * Initializes the WebSocket server and binds to an HTTP server instance.
 * @param {import('http').Server} httpServer
 * @returns {{ wss: WebSocketServer, channelManager: ChannelManager, broadcastChatMessageViaWS: Function }}
 */
function initWebSocketServer(httpServer) {
    const wss = new WebSocketServer({
        noServer: true,
        handleProtocols: (protocols) => {
            if (protocols && protocols.size > 0) {
                return Array.from(protocols)[0];
            }
            return false;
        }
    });

    const channelManager = new ChannelManager(wss);
    activeChannelManager = channelManager;
    activeWss = wss;

    // Attach upgrade listener
    httpServer.on('upgrade', (request, socket, head) => {
        try {
            const host = request.headers.host || 'localhost';
            const urlObj = new URL(request.url, `http://${host}`);
            const pathname = urlObj.pathname;

            // Only accept /ws and /api/chat/ws paths
            if (pathname !== '/ws' && pathname !== '/ws/' && pathname !== '/api/chat/ws' && pathname !== '/api/chat/ws/') {
                rejectUpgrade(socket, 404, 'Not Found');
                return;
            }

            const token = extractToken(request, urlObj.searchParams);
            if (!token) {
                rejectUpgrade(socket, 401, 'Unauthorized');
                return;
            }

            let decoded;
            try {
                decoded = jwt.verify(token, config.JWT_SECRET);
            } catch (err) {
                rejectUpgrade(socket, 401, 'Unauthorized');
                return;
            }

            const user = db.getUserById(decoded.id);
            if (!user) {
                rejectUpgrade(socket, 401, 'Unauthorized');
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.user = user;
                ws.isAlive = true;
                wss.emit('connection', ws, request);
            });
        } catch (err) {
            console.error('WebSocket upgrade handler error:', err);
            rejectUpgrade(socket, 500, 'Internal Server Error');
        }
    });

    // Connection event listener
    wss.on('connection', (ws) => {
        channelManager.addClient(ws);

        // Low-level pong listener for heartbeat liveness
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Send connection acknowledgement
        const ackEvent = {
            type: 'connection:ack',
            userId: ws.user.id,
            name: ws.user.name,
            role: ws.user.role,
            channels: db.getChatChannelsForUser(ws.user.id),
            payload: {
                userId: ws.user.id,
                name: ws.user.name,
                role: ws.user.role,
                channels: db.getChatChannelsForUser(ws.user.id)
            },
            timestamp: new Date().toISOString()
        };
        try {
            ws.send(JSON.stringify(ackEvent));
        } catch (e) {
            console.error('Failed to send connection:ack:', e.message);
        }

        // Handle incoming WebSocket messages
        ws.on('message', (data) => {
            try {
                let msg;
                try {
                    msg = JSON.parse(data.toString());
                } catch (e) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'BAD_REQUEST',
                        message: 'صيغة الرسالة غير صالحة، يجب أن تكون بتنسيق JSON',
                        timestamp: new Date().toISOString()
                    }));
                    return;
                }

                if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'BAD_REQUEST',
                        message: 'Message payload must be a JSON object',
                        timestamp: new Date().toISOString()
                    }));
                    return;
                }

                const type = typeof msg.type === 'string' ? msg.type : '';
                const payload = (msg.payload && typeof msg.payload === 'object' && !Array.isArray(msg.payload))
                    ? msg.payload
                    : msg;
                const correlationId = msg.correlationId;

                switch (type) {
                    case 'ping': {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            correlationId,
                            timestamp: new Date().toISOString(),
                            payload: { timestamp: new Date().toISOString() }
                        }));
                        break;
                    }

                    case 'chat:send': {
                        handleChatSend(ws, payload, correlationId, channelManager);
                        break;
                    }

                    case 'chat:typing': {
                        handleChatTyping(ws, payload, correlationId, channelManager);
                        break;
                    }

                    case 'chat:read': {
                        handleChatRead(ws, payload, correlationId, channelManager);
                        break;
                    }

                    case 'notifications:mark_read': {
                        if (payload.id && ws.user) {
                            db.markNotificationAsRead(payload.id, ws.user.id);
                            const unreadCount = db.getUnreadNotificationsCount(ws.user.id);
                            ws.send(JSON.stringify({
                                type: 'notifications:read_ack',
                                id: payload.id,
                                unreadCount,
                                correlationId,
                                timestamp: new Date().toISOString()
                            }));
                        }
                        break;
                    }

                    case 'notifications:mark_all_read': {
                        if (ws.user) {
                            db.markAllNotificationsAsRead(ws.user.id);
                            ws.send(JSON.stringify({
                                type: 'notifications:all_read_ack',
                                unreadCount: 0,
                                correlationId,
                                timestamp: new Date().toISOString()
                            }));
                        }
                        break;
                    }

                    default: {
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'UNKNOWN_EVENT',
                            message: `نوع الحدث غير معروف: ${type}`,
                            correlationId,
                            timestamp: new Date().toISOString()
                        }));
                    }
                }
            } catch (unhandledErr) {
                console.error('Unhandled WebSocket message error:', unhandledErr);
                try {
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'INTERNAL_ERROR',
                        message: 'Internal server error while processing message',
                        timestamp: new Date().toISOString()
                    }));
                } catch (_) {
                    // Ignore send errors if socket is closing or destroyed
                }
            }
        });

        ws.on('close', () => {
            channelManager.removeClient(ws);
        });

        ws.on('error', (err) => {
            console.error('WebSocket client error:', err.message);
            channelManager.removeClient(ws);
        });
    });

    // 30s Heartbeat interval to terminate dead sockets
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            try {
                ws.ping();
            } catch (_) {}
        });
    }, 30000);
    if (heartbeatInterval.unref) {
        heartbeatInterval.unref();
    }

    // Clean up when HTTP server closes
    httpServer.on('close', () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        try {
            wss.close();
        } catch (_) {}
    });

    return {
        wss,
        channelManager,
        broadcastChatMessageViaWS,
        broadcastReadReceiptViaWS,
        broadcastNotificationViaWS
    };
}

module.exports = {
    initWebSocketServer,
    ChannelManager,
    broadcastChatMessageViaWS,
    broadcastReadReceiptViaWS,
    broadcastNotificationViaWS,
    getActiveChannelManager: () => activeChannelManager,
    getActiveWss: () => activeWss
};
