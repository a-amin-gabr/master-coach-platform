const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { broadcastChatMessageViaWS, broadcastReadReceiptViaWS } = require('../websocket');

// Multer storage for chat media (voice notes, images, document attachments)
const chatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(config.UPLOADS_DIR)) {
            fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
        }
        cb(null, config.UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
        cb(null, `chat-${unique}-${base}${ext}`);
    }
});

const chatFileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.m4a', '.webm', '.ogg', '.txt', '.xlsx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        return cb(new Error(`نوع الملف غير مدعوم (${ext || 'بدون امتداد'}). الأنواع المسموحة تشمل: PDF, DOCX, PNG, JPG, WEBP, MP3, WAV, WEBM, XLSX`), false);
    }
    cb(null, true);
};

const chatUpload = multer({
    storage: chatStorage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// In-Memory SSE Clients for Real-Time Streaming
const sseClients = new Set();

function broadcastChatMessage(channelId, message) {
    const dataStr = `data: ${JSON.stringify({ type: 'new_message', channelId: Number(channelId), message })}\n\n`;
    for (const client of sseClients) {
        try {
            // Check if user is member of channel or admin
            if (client.role === 'admin' || db.isUserChannelMember(channelId, client.userId)) {
                client.res.write(dataStr);
            }
        } catch (err) {
            console.error('SSE broadcast error:', err.message);
            sseClients.delete(client);
        }
    }
}

// Keep-alive heartbeat for SSE connections
const sseHeartbeat = setInterval(() => {
    for (const client of sseClients) {
        try {
            client.res.write(':keep-alive\n\n');
        } catch (_) {
            sseClients.delete(client);
        }
    }
}, 15000);
if (sseHeartbeat.unref) {
    sseHeartbeat.unref();
}

// ----------------------------------------------------
// 1. GET /api/chat/stream (Server-Sent Events)
// ----------------------------------------------------
router.get('/stream', (req, res) => {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'رمز التوثيق مفقود للاتصال الحي' });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = db.getUserById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'المستخدم غير موجود' });
        }

        // Set SSE Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        const clientObj = {
            res,
            userId: user.id,
            role: user.role
        };
        sseClients.add(clientObj);

        // Send initial connect acknowledgement
        res.write(`data: ${JSON.stringify({ type: 'connected', userId: user.id, timestamp: new Date().toISOString() })}\n\n`);

        const cleanup = () => {
            sseClients.delete(clientObj);
        };
        req.on('close', cleanup);
        res.on('close', cleanup);
        res.on('error', cleanup);
    } catch (err) {
        return res.status(401).json({ error: 'رمز التوثيق غير صالح أو منتهي الصلاحية' });
    }
});

// ----------------------------------------------------
// 2. GET /api/chat/channels (List all user channels)
// ----------------------------------------------------
router.get('/channels', authenticate, (req, res) => {
    try {
        const channels = db.getChatChannelsForUser(req.user.id);
        return res.json({ channels });
    } catch (err) {
        console.error('Error fetching chat channels:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قنوات المحادثة', details: err.message });
    }
});

// ----------------------------------------------------
// 3. GET /api/chat/channels/:channelId/messages
// ----------------------------------------------------
router.get('/channels/:channelId/messages', authenticate, (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId, 10);
        if (isNaN(channelId)) {
            return res.status(400).json({ error: 'معرف القناة غير صالح' });
        }

        const channel = db.getChannelById(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'قناة المحادثة غير موجودة' });
        }

        // Must be member or admin
        const isMember = db.isUserChannelMember(channelId, req.user.id);
        if (!isMember && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'ليس لديك صلاحية الوصول إلى هذه المحادثة الإشرافية' });
        }

        const { limit, after, search } = req.query;
        const messages = db.getChannelMessages(channelId, { limit, afterId: after, search });

        return res.json({
            channelId,
            channelName: channel.name,
            channelType: channel.channel_type,
            messages
        });
    } catch (err) {
        console.error('Error fetching chat messages:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل', details: err.message });
    }
});

// ----------------------------------------------------
// 4. POST /api/chat/channels/:channelId/messages
// ----------------------------------------------------
router.post('/channels/:channelId/messages', authenticate, (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId, 10);
        if (isNaN(channelId)) {
            return res.status(400).json({ error: 'معرف القناة غير صالح' });
        }

        const channel = db.getChannelById(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'قناة المحادثة غير موجودة' });
        }

        // Must be member or admin
        const isMember = db.isUserChannelMember(channelId, req.user.id);
        if (!isMember && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'ليس لديك صلاحية الإرسال في هذه القناة' });
        }

        const { messageType, content, mediaUrl, mediaMeta } = req.body;
        const type = messageType || 'text';
        const validTypes = ['text', 'audio', 'image', 'file'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `نوع الرسالة غير صالح (${type}). الأنواع المسموحة: ${validTypes.join(', ')}` });
        }

        if (type === 'text' && (!content || !content.trim())) {
            return res.status(400).json({ error: 'محتوى الرسالة النصية مطلوب' });
        }

        if (content && content.length > 10000) {
            return res.status(400).json({ error: 'محتوى الرسالة يتجاوز الحد الأقصى المسموح به (10,000 حرف)' });
        }

        if (['audio', 'image', 'file'].includes(type) && !mediaUrl) {
            return res.status(400).json({ error: 'رابط الملف المرفق مطلوب' });
        }

        const newMsg = db.createChatMessage({
            channelId,
            senderId: req.user.id,
            messageType: type,
            content: content ? content.trim() : '',
            mediaUrl: mediaUrl || null,
            mediaMeta: mediaMeta || null
        });

        // Broadcast to real-time stream clients (SSE)
        broadcastChatMessage(channelId, newMsg);

        // Broadcast to WebSocket clients
        if (typeof broadcastChatMessageViaWS === 'function') {
            broadcastChatMessageViaWS(channelId, newMsg);
        }

        return res.status(201).json({
            message: newMsg,
            status: 'success'
        });
    } catch (err) {
        console.error('Error sending chat message:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرسالة', details: err.message });
    }
});

// ----------------------------------------------------
// 5. POST /api/chat/upload (Upload voice note, image, file)
// ----------------------------------------------------
router.post('/upload', authenticate, (req, res, next) => {
    chatUpload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)' });
            }
            return res.status(400).json({ error: err.message || 'فشل رفع الملف المرفق' });
        }
        next();
    });
}, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم استلام أي ملف للرفع' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        let inferredType = 'file';

        if (req.file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.webm', '.ogg'].includes(ext)) {
            inferredType = 'audio';
        } else if (req.file.mimetype.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
            inferredType = 'image';
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        return res.status(201).json({
            fileUrl,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            type: inferredType
        });
    } catch (err) {
        console.error('Chat upload error:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء معالجة الملف المرفوع', details: err.message });
    }
});

// ----------------------------------------------------
// 6. POST /api/chat/channels/:channelId/read (Mark read)
// ----------------------------------------------------
router.post('/channels/:channelId/read', authenticate, (req, res) => {
    try {
        const channelId = parseInt(req.params.channelId, 10);
        if (isNaN(channelId)) {
            return res.status(400).json({ error: 'معرف القناة غير صالح' });
        }

        const channel = db.getChannelById(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'قناة المحادثة غير موجودة' });
        }

        const isMember = db.isUserChannelMember(channelId, req.user.id);
        if (!isMember && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'ليس لديك صلاحية الوصول إلى هذه القناة' });
        }

        const messageId = req.body.messageId ? parseInt(req.body.messageId, 10) : null;
        db.markChannelRead(channelId, req.user.id, messageId);

        // Broadcast read receipt to WebSocket clients
        if (typeof broadcastReadReceiptViaWS === 'function') {
            broadcastReadReceiptViaWS(channelId, req.user.id, messageId || 0);
        }

        return res.json({ success: true, channelId });
    } catch (err) {
        console.error('Error marking channel read:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة القراءة', details: err.message });
    }
});

// ----------------------------------------------------
// 7. GET /api/chat/search (Search messages)
// ----------------------------------------------------
router.get('/search', authenticate, (req, res) => {
    try {
        const query = req.query.q || '';
        if (!query.trim()) {
            return res.json({ results: [] });
        }

        const results = db.searchChatMessages(req.user.id, query.trim());
        return res.json({ query: query.trim(), count: results.length, results });
    } catch (err) {
        console.error('Error searching chat messages:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء البحث في الرسائل', details: err.message });
    }
});

module.exports = router;
