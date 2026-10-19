/**
 * ChatWidget Module - Master Coach Platform v3.0
 * Modern Real-Time Slide-over Messenger & Omnipresent Floating Launcher
 * 
 * Features:
 * - Omnipresent Floating Action Launcher with Royal Navy gradient & unread pulse badge
 * - Slide-over Messenger Drawer (#chat-drawer) with frosted backdrop overlay
 * - Native WebSocket connection manager (/ws?token=<jwt_token>)
 * - 25s ping/pong heartbeat and automatic exponential backoff reconnection
 * - Graceful REST/SSE dual-broadcast fallback with message deduplication
 * - 1-on-1 private supervisory channel vs cohort group discussion switcher
 * - Voice note recording (MediaRecorder API) with live timer, waveform & simulated fallback
 * - Image attachment with composer thumbnail preview & click-to-expand lightbox
 * - Real-time typing indicators with animated bouncing dots
 * - Interactive audio player bubbles with progress scrubbing
 */

(function () {
    'use strict';

    class ChatWidgetManager {
        constructor() {
            this.ws = null;
            this.isOpen = false;
            this.isFullscreen = false;
            this.activeChannelId = null;
            this.channels = [];
            this.messages = [];
            this.processedMessageIds = new Set();
            this.reconnectAttempts = 0;
            this.reconnectTimer = null;
            this.pingInterval = null;
            this.isTyping = false;
            this.typingDebounceTimer = null;
            this.typingStopTimer = null;
            this.remoteTypingTimeout = null;

            // Audio Recording State
            this.mediaRecorder = null;
            this.mediaStream = null;
            this.audioChunks = [];
            this.isRecording = false;
            this.recordStartTime = null;
            this.recordTimerId = null;
            this.isCancelledVoice = false;

            // Audio Playback State
            this.audioElement = new Audio();
            this.currentPlayingMsgId = null;

            // Image Preview State
            this.pendingImageFile = null;
            this.pendingImagePreviewUrl = null;

            // Fallback status
            this.connectionState = 'disconnected'; // 'connecting' | 'online' | 'reconnecting' | 'fallback'
            this.sseStream = null;

            // Bind methods
            this.handleWsMessage = this.handleWsMessage.bind(this);
            this.handleWsClose = this.handleWsClose.bind(this);
            this.handleWsError = this.handleWsError.bind(this);
            this.handleWsOpen = this.handleWsOpen.bind(this);
            this.toggleFullscreen = this.toggleFullscreen.bind(this);
        }

        /**
         * Initialize widget DOM elements and listeners
         */
        init() {
            this.cacheDomElements();
            this.bindEvents();
            this.initAudioPlayerEvents();

            // Load channels from API or mock store
            this.loadChannels().then(() => {
                this.render();
                // Connect WebSocket if token is available
                const token = this.getAuthToken();
                if (token) {
                    this.connect(token);
                }
            });
        }

        cacheDomElements() {
            this.dom = {
                root: document.getElementById('floating-chat-root'),
                launcherBtn: document.getElementById('floating-chat-launcher'),
                launcherBadge: document.getElementById('floating-chat-badge'),
                launcherStatusDot: document.getElementById('floating-chat-status-dot'),
                drawer: document.getElementById('chat-drawer'),
                backdrop: document.getElementById('chat-drawer-backdrop'),
                drawerTitle: document.getElementById('chat-drawer-channel-title'),
                avatarEl: document.getElementById('chat-header-avatar'),
                subtitleEl: document.getElementById('chat-drawer-channel-subtitle'),
                fullscreenBtn: document.getElementById('chat-fullscreen-btn'),
                wsStatusBadge: document.getElementById('chat-ws-status-badge'),
                wsStatusLabel: document.getElementById('chat-ws-status-label'),
                btnDirect: document.getElementById('btn-channel-direct'),
                btnGroup: document.getElementById('btn-channel-group'),
                badgeDirect: document.getElementById('badge-channel-direct'),
                badgeGroup: document.getElementById('badge-channel-group'),
                typingIndicator: document.getElementById('chat-drawer-typing-indicator'),
                typingText: document.getElementById('chat-drawer-typing-text'),
                contentArea: document.getElementById('chat-content-area'),
                mediaModal: document.getElementById('chat-media-modal')
            };
        }

        bindEvents() {
            // Close drawer or exit fullscreen on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    if (this.isFullscreen) {
                        this.toggleFullscreen();
                    } else {
                        this.close();
                    }
                }
            });
        }

        initAudioPlayerEvents() {
            this.audioElement.ontimeupdate = () => {
                if (this.currentPlayingMsgId && this.audioElement.duration > 0) {
                    const cur = this.audioElement.currentTime;
                    const dur = this.audioElement.duration;
                    const pct = (cur / dur) * 100;
                    this.updateAudioUi(this.currentPlayingMsgId, !this.audioElement.paused, pct, cur, dur);
                }
            };

            this.audioElement.onended = () => {
                if (this.currentPlayingMsgId) {
                    this.updateAudioUi(this.currentPlayingMsgId, false, 0);
                    this.currentPlayingMsgId = null;
                }
            };
        }

        getAuthToken() {
            if (window.ApiClient && window.ApiClient.token) {
                return window.ApiClient.token;
            }
            try {
                return localStorage.getItem('master_coach_token') || localStorage.getItem('token') || '';
            } catch (_) {
                return '';
            }
        }

        getCurrentUser() {
            if (window.ApiClient && typeof window.ApiClient.getUser === 'function') {
                const u = window.ApiClient.getUser();
                if (u) return u;
            }
            const isSupervisor = (window.appState && window.appState.currentRole === 'supervisor');
            return {
                id: isSupervisor ? 1 : 2,
                name: isSupervisor ? 'الماستر كوتش عبدالكريم الخليفي' : 'كوتش أحمد بن صالح الشمري',
                role: isSupervisor ? 'admin' : 'coach'
            };
        }

        // =========================================================================
        // WebSocket Connection Manager & Heartbeat
        // =========================================================================

        connect(token) {
            if (!token) return;

            // Close existing socket cleanly
            this.cleanUpSocket();

            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = location.host || 'localhost:3000';
            const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

            this.updateConnectionStatus('connecting');

            try {
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = this.handleWsOpen;
                this.ws.onmessage = this.handleWsMessage;
                this.ws.onerror = this.handleWsError;
                this.ws.onclose = this.handleWsClose;
            } catch (err) {
                console.warn('[ChatWidget] WebSocket connection failed to initialize:', err);
                this.handleWsError(err);
            }
        }

        handleWsOpen() {
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('online');
            if (window.App && typeof window.App.updateNetworkStatus === 'function') {
                window.App.updateNetworkStatus('online');
            }

            // 25s ping/pong heartbeat
            if (this.pingInterval) clearInterval(this.pingInterval);
            this.pingInterval = setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    try {
                        this.ws.send(JSON.stringify({ type: 'ping' }));
                    } catch (_) {}
                }
            }, 25000);
        }

        handleWsMessage(event) {
            try {
                const data = JSON.parse(event.data);
                if (!data || typeof data !== 'object') return;

                switch (data.type) {
                    case 'connection:ack':
                        this.handleConnectionAck(data);
                        break;
                    case 'pong':
                        // Heartbeat acknowledged
                        break;
                    case 'chat:message':
                        this.handleIncomingMessage(data.message || data.payload);
                        break;
                    case 'chat:typing':
                        this.handleRemoteTyping(data.payload || data);
                        break;
                    case 'chat:read_receipt':
                        this.handleReadReceipt(data.payload || data);
                        break;
                    case 'NOTIFICATION_NEW':
                        if (window.App && typeof window.App.handleIncomingNotification === 'function') {
                            window.App.handleIncomingNotification(data.notification || data.payload);
                        }
                        break;
                    case 'error':
                        console.warn('[ChatWidget] Server WebSocket notice:', data.message || data.code);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error('[ChatWidget] Error handling WS message:', err);
            }
        }

        handleConnectionAck(data) {
            if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
                this.channels = data.channels;
                if (window.appState && window.appState.chatState) {
                    window.appState.chatState.channels = data.channels;
                }
            }
            this.updateChannelTabsUi();
            this.updateLauncherBadge();
        }

        handleIncomingMessage(msg) {
            if (!msg || !msg.id) return;

            // Deduplicate message by id (prevents double-renders from REST dual-broadcast)
            if (this.processedMessageIds.has(msg.id)) {
                return;
            }
            this.processedMessageIds.add(msg.id);

            const channelId = Number(msg.channel_id || msg.channelId);
            const targetChannel = this.channels.find(c => c.id === channelId);

            let previewText = msg.content || '';
            const mType = msg.message_type || msg.messageType;
            if (mType === 'audio') {
                previewText = 'تسجيل صوتي إشرافي مباشر';
            } else if (mType === 'image') {
                previewText = 'صورة ومخطط إشرافي';
            } else if (mType === 'file') {
                previewText = 'مستند معتمد مرفق';
            }

            if (targetChannel) {
                targetChannel.last_message = previewText;
                targetChannel.last_message_time = msg.created_at || msg.createdAt || new Date().toISOString();
            }

            // If message belongs to active channel
            if (channelId === this.activeChannelId) {
                if (!this.messages.some(m => m.id === msg.id)) {
                    this.messages.push(msg);
                }
                if (window.appState && window.appState.chatState) {
                    if (!window.appState.chatState.messages.some(m => m.id === msg.id)) {
                        window.appState.chatState.messages.push(msg);
                    }
                }

                this.renderMessagesOnly();
                this.scrollToBottom();

                // If drawer is open, immediately mark read
                if (this.isOpen) {
                    this.sendReadReceipt(channelId, msg.id);
                    if (targetChannel) {
                        targetChannel.unread_count = 0;
                        targetChannel.unreadCount = 0;
                    }
                } else {
                    if (targetChannel) {
                        targetChannel.unread_count = (targetChannel.unread_count || 0) + 1;
                        targetChannel.unreadCount = targetChannel.unread_count;
                    }
                }
            } else {
                // Another channel received message
                if (targetChannel) {
                    targetChannel.unread_count = (targetChannel.unread_count || 0) + 1;
                    targetChannel.unreadCount = targetChannel.unread_count;
                }
            }

            this.updateChannelTabsUi();
            this.updateLauncherBadge();

            // Clear remote typing indicator for this channel
            this.hideRemoteTyping();
        }

        handleRemoteTyping(data) {
            const channelId = Number(data.channelId || data.channel_id);
            const userId = Number(data.userId || data.user_id);
            const currentUser = this.getCurrentUser();

            if (channelId !== this.activeChannelId || userId === currentUser.id) {
                return;
            }

            if (data.isTyping) {
                const name = data.userName || 'الطرف الآخر';
                this.showRemoteTyping(`${name} يكتب الآن...`);

                // Auto hide after 4 seconds if no new typing frame is received
                if (this.remoteTypingTimeout) clearTimeout(this.remoteTypingTimeout);
                this.remoteTypingTimeout = setTimeout(() => {
                    this.hideRemoteTyping();
                }, 4000);
            } else {
                this.hideRemoteTyping();
            }
        }

        showRemoteTyping(text) {
            if (this.dom.typingIndicator && this.dom.typingText) {
                this.dom.typingText.textContent = text;
                this.dom.typingIndicator.style.display = 'flex';
                this.scrollToBottom();
            }
        }

        hideRemoteTyping() {
            if (this.dom.typingIndicator) {
                this.dom.typingIndicator.style.display = 'none';
            }
        }

        handleReadReceipt(data) {
            const channelId = Number(data.channelId || data.channel_id);
            const userId = Number(data.userId || data.user_id);
            const currentUser = this.getCurrentUser();

            if (userId === currentUser.id) {
                const ch = this.channels.find(c => c.id === channelId);
                if (ch) {
                    ch.unread_count = 0;
                    ch.unreadCount = 0;
                }
                this.updateChannelTabsUi();
                this.updateLauncherBadge();
            }
        }

        handleWsError(err) {
            console.warn('[ChatWidget] WebSocket error:', err && err.message ? err.message : err);
        }

        handleWsClose() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }

            this.updateConnectionStatus('reconnecting');
            if (window.App && typeof window.App.updateNetworkStatus === 'function') {
                window.App.updateNetworkStatus('reconnecting');
            }

            // Exponential backoff reconnect: 1s, 2s, 4s, 8s, up to 30s max
            const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
            this.reconnectAttempts++;

            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
                const token = this.getAuthToken();
                if (token) {
                    this.connect(token);
                }
            }, delay);

            // Initiate SSE fallback stream if WS stays disconnected
            this.initSseFallback();
        }

        cleanUpSocket() {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            if (this.ws) {
                try {
                    this.ws.onopen = null;
                    this.ws.onmessage = null;
                    this.ws.onerror = null;
                    this.ws.onclose = null;
                    this.ws.close();
                } catch (_) {}
                this.ws = null;
            }
        }

        initSseFallback() {
            if (this.sseStream || !window.ApiClient || !window.ApiClient.token) return;
            try {
                this.sseStream = window.ApiClient.createChatStream(
                    (data) => {
                        if (data && data.type === 'new_message' && data.message) {
                            this.handleIncomingMessage(data.message);
                        }
                    },
                    (err) => {
                        console.warn('[ChatWidget] SSE fallback notice:', err);
                    }
                );
            } catch (_) {}
        }

        updateConnectionStatus(status) {
            this.connectionState = status;
            const dot = this.dom.launcherStatusDot;
            const badge = this.dom.wsStatusBadge;
            const label = this.dom.wsStatusLabel;

            if (status === 'online') {
                if (dot) {
                    dot.className = 'chat-launcher-status-dot online';
                    dot.title = 'المحادثة والتوجيه';
                }
                if (badge) {
                    badge.className = 'chat-ws-status-badge online';
                    badge.style.display = 'none';
                }
                if (label) {
                    label.textContent = '';
                }
            } else if (status === 'reconnecting' || status === 'connecting') {
                if (dot) {
                    dot.className = 'chat-launcher-status-dot reconnecting';
                    dot.title = 'جارٍ إعادة الاتصال...';
                }
                if (badge) {
                    badge.className = 'chat-ws-status-badge reconnecting';
                    badge.style.display = 'inline-flex';
                }
                if (label) {
                    label.textContent = 'إعادة الاتصال...';
                }
            } else {
                if (dot) {
                    dot.className = 'chat-launcher-status-dot offline';
                    dot.title = 'غير متصل';
                }
                if (badge) {
                    badge.className = 'chat-ws-status-badge offline';
                    badge.style.display = 'inline-flex';
                }
                if (label) {
                    label.textContent = 'غير متصل';
                }
            }
        }

        // =========================================================================
        // Channel Management & Message Loading
        // =========================================================================

        async loadChannels() {
            if (window.ApiClient && window.ApiClient.token) {
                try {
                    const res = await window.ApiClient.getChatChannels();
                    if (res && res.channels && res.channels.length > 0) {
                        this.channels = res.channels;
                        if (!this.activeChannelId) {
                            // Default to direct supervisory channel if present, otherwise group
                            const direct = this.channels.find(c => c.channel_type === 'direct');
                            this.activeChannelId = direct ? direct.id : this.channels[0].id;
                        }
                        await this.loadMessages(this.activeChannelId);
                        this.updateChannelTabsUi();
                        this.updateLauncherBadge();
                        return;
                    }
                } catch (err) {
                    console.warn('[ChatWidget] getChatChannels API notice:', err.message);
                }
            }

            // Offline Seed Channels fallback
            this.channels = [
                {
                    id: 2,
                    name: 'جلسات التوجيه الإشرافي المباشر',
                    channel_type: 'direct',
                    description: 'قناة التواصل الإشرافي الخاص والآمن بين الماستر كوتش عبدالكريم والكوتش المشارك',
                    last_message: 'تم الاطلاع على تسجيل الجلسة، يرجى الاستماع للتوجيه الصوتي المرفق.',
                    last_message_time: new Date().toISOString(),
                    unread_count: 0
                },
                {
                    id: 1,
                    name: 'ديوان زمالة الماستر كوتش (دفعة 2026)',
                    channel_type: 'group',
                    description: 'ديوان النقاش المهني المفتوح لكافة الكوتشز المقيدين بالدفعة والماستر كوتش المشرف',
                    last_message: 'مرحباً بكم زملاء دفعة الماستر كوتش 2026 في منصة التوجيه المعتمدة',
                    last_message_time: new Date().toISOString(),
                    unread_count: 0
                }
            ];
            this.activeChannelId = 2;
            this.messages = [
                {
                    id: 101,
                    channel_id: 2,
                    sender_id: 1,
                    sender_name: 'الماستر كوتش عبدالكريم الخليفي',
                    sender_role: 'admin',
                    message_type: 'text',
                    content: 'أهلاً بك كوتش أحمد. أنا متاح هنا لمتابعة إيداعاتك وتزويدك بالملاحظات التقييمية حول الروبركات الستة وتطبيقات الأدوات.',
                    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
                }
            ];
            this.updateChannelTabsUi();
            this.updateLauncherBadge();
        }

        async loadMessages(channelId) {
            if (!channelId) return;
            if (window.ApiClient && window.ApiClient.token) {
                try {
                    const res = await window.ApiClient.getChatMessages(channelId);
                    if (res && res.messages) {
                        this.messages = res.messages;
                        res.messages.forEach(m => this.processedMessageIds.add(m.id));

                        if (window.appState && window.appState.chatState) {
                            window.appState.chatState.messages = res.messages;
                            window.appState.chatState.activeChannelId = channelId;
                        }

                        // Mark read
                        await this.sendReadReceipt(channelId);
                        const ch = this.channels.find(c => c.id === channelId);
                        if (ch) {
                            ch.unread_count = 0;
                            ch.unreadCount = 0;
                        }
                        this.updateChannelTabsUi();
                        this.updateLauncherBadge();
                    }
                } catch (err) {
                    console.warn('[ChatWidget] getChatMessages API notice:', err.message);
                }
            }
        }

        async switchChannel(target) {
            let nextChannelId = null;

            if (target === 'direct') {
                const direct = this.channels.find(c => c.channel_type === 'direct');
                nextChannelId = direct ? direct.id : 2;
            } else if (target === 'group') {
                const group = this.channels.find(c => c.channel_type === 'group');
                nextChannelId = group ? group.id : 1;
            } else {
                nextChannelId = Number(target);
            }

            if (!nextChannelId || nextChannelId === this.activeChannelId) {
                return;
            }

            // Pause any active audio
            this.stopAudioPlayback();

            this.activeChannelId = nextChannelId;
            if (window.appState && window.appState.chatState) {
                window.appState.chatState.activeChannelId = nextChannelId;
            }

            await this.loadMessages(this.activeChannelId);
            this.renderMessagesOnly();
            this.updateChannelTabsUi();
            this.scrollToBottom();
        }

        updateChannelTabsUi() {
            const activeCh = this.channels.find(c => c.id === this.activeChannelId);
            const isDirect = activeCh ? (activeCh.channel_type === 'direct') : true;

            if (this.dom.btnDirect && this.dom.btnGroup) {
                if (isDirect) {
                    this.dom.btnDirect.classList.add('active');
                    this.dom.btnGroup.classList.remove('active');
                } else {
                    this.dom.btnDirect.classList.remove('active');
                    this.dom.btnGroup.classList.add('active');
                }
            }

            if (this.dom.drawerTitle && activeCh) {
                this.dom.drawerTitle.textContent = isDirect ? 'الماستر كوتش عبدالكريم الخليفي' : ((activeCh && activeCh.name) || 'المحادثة الجماعية للدفعة');
            }

            if (this.dom.avatarEl) {
                this.dom.avatarEl.innerHTML = isDirect
                    ? (window.AppIcons ? window.AppIcons.get('graduationCap', { size: 22 }) : '')
                    : (window.AppIcons ? window.AppIcons.get('users', { size: 22 }) : '');
                this.dom.avatarEl.className = 'chat-header-avatar ' + (isDirect ? 'direct' : 'group');
            }

            if (this.dom.subtitleEl && activeCh) {
                this.dom.subtitleEl.textContent = isDirect
                    ? 'جلسة الإشراف الفردي المباشر • تمكين الرؤية'
                    : 'القناة التفاعلية المشتركة • دفعة 2026';
            }

            // Badges on channel switcher tabs
            const directCh = this.channels.find(c => c.channel_type === 'direct');
            const groupCh = this.channels.find(c => c.channel_type === 'group');

            const directUnread = directCh ? (directCh.unread_count || directCh.unreadCount || 0) : 0;
            const groupUnread = groupCh ? (groupCh.unread_count || groupCh.unreadCount || 0) : 0;

            if (this.dom.badgeDirect) {
                if (directUnread > 0) {
                    this.dom.badgeDirect.textContent = directUnread;
                    this.dom.badgeDirect.style.display = 'inline-flex';
                } else {
                    this.dom.badgeDirect.style.display = 'none';
                }
            }

            if (this.dom.badgeGroup) {
                if (groupUnread > 0) {
                    this.dom.badgeGroup.textContent = groupUnread;
                    this.dom.badgeGroup.style.display = 'inline-flex';
                } else {
                    this.dom.badgeGroup.style.display = 'none';
                }
            }

            // If in fullscreen mode, also sync sidebar card states and active banner
            if (this.isFullscreen) {
                const cards = document.querySelectorAll('.chat-fs-channel-card');
                cards.forEach(card => {
                    const cardType = card.getAttribute('data-channel-type');
                    if ((cardType === 'direct' && isDirect) || (cardType === 'group' && !isDirect)) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                });

                const bannerTitle = document.getElementById('chat-fs-banner-title');
                const bannerSub = document.getElementById('chat-fs-banner-sub');
                const bannerAvatar = document.getElementById('chat-fs-banner-avatar');
                const bannerTag = document.getElementById('chat-fs-banner-tag');

                if (bannerTitle) bannerTitle.textContent = isDirect ? 'الماستر كوتش عبدالكريم الخليفي' : ((activeCh && activeCh.name) || 'المحادثة الجماعية للدفعة');
                if (bannerSub) bannerSub.textContent = isDirect ? 'جلسة الإشراف الفردي المباشر • تمكين الرؤية للاستشارات المهنية' : 'القناة التفاعلية المشتركة لكوتشز الدفعة ومناقشات الحالات الميدانية';
                if (bannerAvatar) {
                    bannerAvatar.innerHTML = isDirect
                        ? (window.AppIcons ? window.AppIcons.get('graduationCap', { size: 24 }) : '')
                        : (window.AppIcons ? window.AppIcons.get('users', { size: 24 }) : '');
                    bannerAvatar.className = 'chat-fs-active-avatar ' + (isDirect ? 'direct' : 'group');
                }
                if (bannerTag) bannerTag.textContent = isDirect ? 'إشراف فردي 1-على-1' : 'نقاش جماعي للدفعة';
            }
        }

        updateLauncherBadge() {
            const totalUnread = this.channels.reduce((acc, c) => acc + (c.unread_count || c.unreadCount || 0), 0);
            const badge = this.dom.launcherBadge || document.getElementById('floating-chat-badge');
            const topNavBadge = document.getElementById('chat-nav-badge');

            if (badge) {
                if (totalUnread > 0) {
                    badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                    badge.style.display = 'flex';
                    badge.classList.add('pulse');
                } else {
                    badge.style.display = 'none';
                    badge.classList.remove('pulse');
                }
            }

            if (topNavBadge) {
                if (totalUnread > 0) {
                    topNavBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                    topNavBadge.style.display = 'inline-block';
                } else {
                    topNavBadge.style.display = 'none';
                }
            }
        }

        // =========================================================================
        // Drawer Toggle / Visibility & Fullscreen
        // =========================================================================

        toggle(forceState) {
            const targetState = (typeof forceState === 'boolean') ? forceState : !this.isOpen;
            if (targetState) {
                this.open();
            } else {
                this.close();
            }
        }

        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            const drawer = this.dom.drawer || document.getElementById('chat-drawer');
            const fsBtn = this.dom.fullscreenBtn || document.getElementById('chat-fullscreen-btn');

            if (this.isFullscreen) {
                if (drawer) drawer.classList.add('is-fullscreen');
                if (fsBtn) {
                    fsBtn.title = 'تصغير الشاشة (Restore)';
                    fsBtn.setAttribute('aria-label', 'تصغير الشاشة');
                    fsBtn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    `;
                }
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.render();
                    this.scrollToBottom();
                }
            } else {
                if (drawer) drawer.classList.remove('is-fullscreen');
                if (fsBtn) {
                    fsBtn.title = 'ملء الشاشة';
                    fsBtn.setAttribute('aria-label', 'ملء الشاشة');
                    fsBtn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                        </svg>
                    `;
                }
                this.render();
                this.scrollToBottom();
            }
        }

        open() {
            this.lastFocusedElement = document.activeElement;
            this.isOpen = true;
            if (this.dom.drawer) this.dom.drawer.classList.add('is-open');
            if (this.dom.backdrop) this.dom.backdrop.classList.add('is-active');
            if (this.dom.launcherBtn) this.dom.launcherBtn.classList.add('is-open');

            // Render content area
            this.render();
            this.scrollToBottom();

            // Clear unread for active channel
            if (this.activeChannelId) {
                this.sendReadReceipt(this.activeChannelId);
                const ch = this.channels.find(c => c.id === this.activeChannelId);
                if (ch) {
                    ch.unread_count = 0;
                    ch.unreadCount = 0;
                }
                this.updateChannelTabsUi();
                this.updateLauncherBadge();
            }

            setTimeout(() => {
                const input = document.getElementById('chat-msg-input');
                if (input && typeof input.focus === 'function') {
                    input.focus();
                }
            }, 100);
        }

        close() {
            this.isOpen = false;
            if (this.isFullscreen) {
                this.toggleFullscreen();
            }
            if (this.dom.drawer) this.dom.drawer.classList.remove('is-open');
            if (this.dom.backdrop) this.dom.backdrop.classList.remove('is-active');
            if (this.dom.launcherBtn) this.dom.launcherBtn.classList.remove('is-open');

            this.stopAudioPlayback();
            this.hideRemoteTyping();

            if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
                this.lastFocusedElement.focus();
                this.lastFocusedElement = null;
            }
        }

        // =========================================================================
        // Message Dispatching & Read Receipts
        // =========================================================================

        async sendMessage(content, type = 'text', mediaUrl = null, mediaMeta = null) {
            const channelId = this.activeChannelId;
            if (!channelId) return;

            const trimmedContent = (typeof content === 'string') ? content.trim() : '';
            if (type === 'text' && !trimmedContent) return;

            const currentUser = this.getCurrentUser();
            const correlationId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

            // Cancel any typing notification
            this.sendTyping(false);

            // Attempt via native WebSocket first
            let sentViaWs = false;
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    const frame = {
                        type: 'chat:send',
                        channelId,
                        correlationId,
                        payload: {
                            channelId,
                            content: trimmedContent,
                            messageType: type,
                            mediaUrl,
                            mediaMeta
                        }
                    };
                    this.ws.send(JSON.stringify(frame));
                    sentViaWs = true;
                } catch (err) {
                    console.warn('[ChatWidget] WebSocket send error, falling back to REST:', err);
                }
            }

            // Fallback via REST if WS not available or failed
            if (!sentViaWs && window.ApiClient && window.ApiClient.token) {
                try {
                    const res = await window.ApiClient.sendChatMessage(channelId, {
                        messageType: type,
                        content: trimmedContent,
                        mediaUrl,
                        mediaMeta
                    });
                    if (res && res.message) {
                        this.handleIncomingMessage(res.message);
                    }
                } catch (err) {
                    console.error('[ChatWidget] REST fallback failed:', err);
                    if (window.App && window.App.showToast) {
                        window.App.showToast('فشل إرسال الرسالة: ' + err.message, 'warn');
                    }
                }
            }
        }

        sendTyping(isTyping) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            const channelId = this.activeChannelId;
            if (!channelId) return;

            try {
                this.ws.send(JSON.stringify({
                    type: 'chat:typing',
                    payload: {
                        channelId,
                        isTyping: Boolean(isTyping)
                    }
                }));
            } catch (_) {}
        }

        async sendReadReceipt(channelId, messageId = null) {
            if (!channelId) return;

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(JSON.stringify({
                        type: 'chat:read',
                        payload: { channelId, messageId }
                    }));
                } catch (_) {}
            }

            if (window.ApiClient && window.ApiClient.token) {
                try {
                    await window.ApiClient.markChatRead(channelId, messageId);
                } catch (_) {}
            }
        }

        // =========================================================================
        // Voice Note Recording (MediaRecorder API)
        // =========================================================================

        toggleVoiceRecording() {
            if (this.isRecording) {
                this.finishVoiceRecording();
            } else {
                this.startVoiceRecording();
            }
        }

        async startVoiceRecording() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.simulateVoiceNoteFallback();
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaStream = stream;

                const mimeCandidates = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/mp4',
                    'audio/aac'
                ];
                let options = {};
                if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                    const supported = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));
                    if (supported) options = { mimeType: supported };
                }

                this.mediaRecorder = new MediaRecorder(stream, options);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        this.audioChunks.push(e.data);
                    }
                };

                this.mediaRecorder.onstop = async () => {
                    if (this.isCancelledVoice) {
                        this.isCancelledVoice = false;
                        return;
                    }
                    const mime = this.mediaRecorder.mimeType || 'audio/webm';
                    const audioBlob = new Blob(this.audioChunks, { type: mime });
                    await this.uploadAndSendVoiceNote(audioBlob);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                this.recordStartTime = Date.now();
                this.renderComposer();

                if (this.recordTimerId) clearInterval(this.recordTimerId);
                this.recordTimerId = setInterval(() => {
                    const timerEl = document.getElementById('chat-recording-timer');
                    if (timerEl && this.recordStartTime) {
                        const elapsedSec = Math.floor((Date.now() - this.recordStartTime) / 1000);
                        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                        const secs = String(elapsedSec % 60).padStart(2, '0');
                        timerEl.textContent = `${mins}:${secs}`;
                    }
                }, 500);

            } catch (err) {
                console.warn('[ChatWidget] Microphone access denied or unavailable:', err);
                if (window.App && window.App.showToast) {
                    window.App.showToast('لم يتم العثور على ميكروفون متاح - سيتم توظيف تسجيل إشرافي معتمد', 'info');
                }
                this.simulateVoiceNoteFallback();
            }
        }

        cancelVoiceRecording() {
            this.isCancelledVoice = true;
            if (this.recordTimerId) clearInterval(this.recordTimerId);
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(t => t.stop());
            }
            this.isRecording = false;
            this.renderComposer();
        }

        finishVoiceRecording() {
            if (this.recordTimerId) clearInterval(this.recordTimerId);
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(t => t.stop());
            }
            this.isRecording = false;
            this.renderComposer();
        }

        async uploadAndSendVoiceNote(blob) {
            if (window.App && window.App.showToast) {
                window.App.showToast('جارٍ رفع الملاحظة الصوتية وبثها...', 'info');
            }

            const mime = blob.type || 'audio/webm';
            let ext = '.webm';
            if (mime.includes('mp4') || mime.includes('aac')) ext = '.m4a';
            else if (mime.includes('ogg')) ext = '.ogg';
            else if (mime.includes('wav')) ext = '.wav';
            else if (mime.includes('mp3') || mime.includes('mpeg')) ext = '.mp3';

            const durationSeconds = this.recordStartTime
                ? Math.max(1, Math.round((Date.now() - this.recordStartTime) / 1000))
                : 0;

            const audioFile = new File([blob], `voice_note_${Date.now()}${ext}`, { type: mime });

            if (window.ApiClient && window.ApiClient.token) {
                try {
                    const uploadRes = await window.ApiClient.uploadChatMedia(audioFile);
                    if (uploadRes && uploadRes.fileUrl) {
                        await this.sendMessage(
                            'تسجيل صوتي إشرافي مباشر',
                            'audio',
                            uploadRes.fileUrl,
                            {
                                fileName: uploadRes.fileName,
                                sizeBytes: uploadRes.sizeBytes,
                                mimeType: uploadRes.mimeType,
                                durationSeconds
                            }
                        );
                        this.recordStartTime = null;
                        return;
                    }
                } catch (err) {
                    console.error('[ChatWidget] Voice note upload failed:', err);
                    if (window.App && window.App.showToast) {
                        window.App.showToast('فشل رفع التسجيل الصوتي: ' + err.message, 'warn');
                    }
                }
            }

            // Offline simulated fallback
            await this.sendMessage(
                'تسجيل صوتي إشرافي مباشر',
                'audio',
                '/uploads/sample_supervisor_guidance.mp3',
                {
                    fileName: 'sample_supervisor_guidance.mp3',
                    sizeBytes: 256000,
                    mimeType: 'audio/mp3',
                    durationSeconds: durationSeconds || 12
                }
            );
            this.recordStartTime = null;
        }

        async simulateVoiceNoteFallback() {
            await this.sendMessage(
                'تسجيل صوتي إشرافي: ملاحظات حول الكفاية C101 وتطبيق نموذج التمكين',
                'audio',
                '/uploads/sample_supervisor_guidance.mp3',
                {
                    fileName: 'sample_supervisor_guidance.mp3',
                    sizeBytes: 256000,
                    mimeType: 'audio/mp3',
                    durationSeconds: 15
                }
            );
        }

        // =========================================================================
        // Image Attachment & Composer Thumbnail Preview
        // =========================================================================

        onImageSelected(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            if (file.size > 50 * 1024 * 1024) {
                if (window.App && window.App.showToast) {
                    window.App.showToast('حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)', 'warn');
                }
                event.target.value = '';
                return;
            }

            this.pendingImageFile = file;
            const isImage = file.type.startsWith('image/');
            this.isPendingFileDocument = !isImage;

            if (isImage) {
                // Generate client thumbnail preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.pendingImagePreviewUrl = e.target.result;
                    this.renderImagePreviewStrip();
                };
                reader.readAsDataURL(file);
            } else {
                this.pendingImagePreviewUrl = 'document_preview';
                this.renderImagePreviewStrip();
            }

            event.target.value = '';
        }

        renderImagePreviewStrip() {
            const previewContainer = document.getElementById('chat-composer-image-preview');
            if (!previewContainer) return;

            if (this.pendingImagePreviewUrl) {
                const isDoc = this.isPendingFileDocument;
                const docIconHtml = (window.AppIcons && window.AppIcons.get)
                    ? window.AppIcons.get('fileText', {size:22, style:'color:#2563EB;'})
                    : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>';
                const previewThumb = isDoc
                    ? `<div style="width:42px; height:42px; display:flex; align-items:center; justify-content:center; background:#EFF6FF; border-radius:6px;">${docIconHtml}</div>`
                    : `<img src="${this.pendingImagePreviewUrl}" alt="معاينة المرفق" class="composer-preview-thumb">`;

                previewContainer.innerHTML = `
                    <div class="composer-preview-card">
                        ${previewThumb}
                        <div class="composer-preview-info">
                            <span class="composer-preview-filename">${this.escapeHtml(this.pendingImageFile.name)}</span>
                            <span class="composer-preview-size">${Math.round(this.pendingImageFile.size / 1024)} كيلوبايت ${isDoc ? '(مستند)' : ''}</span>
                        </div>
                        <button class="composer-preview-remove-btn" onclick="window.ChatWidget.cancelImagePreview()" title="إلغاء المرفق" aria-label="إلغاء">
                            <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `;
                previewContainer.style.display = 'block';
            } else {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }
        }

        cancelImagePreview() {
            this.pendingImageFile = null;
            this.pendingImagePreviewUrl = null;
            this.isPendingFileDocument = false;
            this.renderImagePreviewStrip();
        }

        async uploadAndSendPendingImage(caption = '') {
            if (!this.pendingImageFile) return;

            const file = this.pendingImageFile;
            const isDoc = this.isPendingFileDocument;
            const msgType = isDoc ? 'file' : 'image';
            this.cancelImagePreview();

            if (window.App && window.App.showToast) {
                window.App.showToast(`جارٍ رفع ${isDoc ? 'المستند' : 'الصورة'} (${file.name})...`, 'info');
            }

            if (window.ApiClient && window.ApiClient.token) {
                try {
                    const uploadRes = await window.ApiClient.uploadChatMedia(file);
                    if (uploadRes && uploadRes.fileUrl) {
                        await this.sendMessage(
                            caption || uploadRes.originalName || file.name,
                            msgType,
                            uploadRes.fileUrl,
                            {
                                fileName: uploadRes.fileName,
                                originalName: uploadRes.originalName,
                                sizeBytes: uploadRes.sizeBytes,
                                mimeType: uploadRes.mimeType
                            }
                        );
                        if (window.App && window.App.showToast) {
                            window.App.showToast(`تم إرسال ${isDoc ? 'المستند' : 'الصورة'} بنجاح`, 'success');
                        }
                        return;
                    }
                } catch (err) {
                    console.error('[ChatWidget] Media upload failed:', err);
                    if (window.App && window.App.showToast) {
                        window.App.showToast(`فشل رفع ${isDoc ? 'المستند' : 'الصورة'}: ` + err.message, 'warn');
                    }
                }
            }

            // Offline fallback
            await this.sendMessage(
                caption || file.name,
                msgType,
                'assets/images/logo.png',
                {
                    fileName: file.name,
                    originalName: file.name,
                    sizeBytes: file.size,
                    mimeType: file.type || (isDoc ? 'application/pdf' : 'image/png')
                }
            );
        }

        openImageLightbox(imageUrl, title = 'معاينة المخطط / الصورة') {
            const modal = this.dom.mediaModal || document.getElementById('chat-media-modal');
            if (!modal) return;

            const safeTitle = this.escapeHtml(title);
            modal.innerHTML = `
                <div class="modal-container chat-lightbox-container">
                    <div class="modal-header chat-lightbox-header">
                        <div class="chat-lightbox-title-wrap">
                            <span class="chat-lightbox-icon">
                                <svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </span>
                            <h3>${safeTitle}</h3>
                        </div>
                        <button class="btn-close-modal" onclick="window.ChatWidget.closeLightbox()" aria-label="إغلاق المعاينة" title="إغلاق المعاينة (Esc)">
                            <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="modal-body chat-lightbox-body">
                        <img src="${encodeURI(imageUrl)}" alt="${safeTitle}" class="chat-lightbox-image">
                    </div>
                    <div class="modal-footer chat-lightbox-footer">
                        <a href="${encodeURI(imageUrl)}" download target="_blank" class="btn-secondary chat-lightbox-download-btn">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            تنزيل الصورة الأصلية
                        </a>
                        <button class="btn-primary" onclick="window.ChatWidget.closeLightbox()">إغلاق المعاينة</button>
                    </div>
                </div>
            `;
            modal.classList.add('active');
        }

        closeLightbox() {
            const modal = this.dom.mediaModal || document.getElementById('chat-media-modal');
            if (modal) modal.classList.remove('active');
        }

        // =========================================================================
        // Audio Player Controls & Scrubbing
        // =========================================================================

        playAudio(msgId, mediaUrl) {
            if (this.currentPlayingMsgId === msgId) {
                if (!this.audioElement.paused) {
                    this.audioElement.pause();
                    this.updateAudioUi(msgId, false, (this.audioElement.currentTime / this.audioElement.duration) * 100);
                    return;
                } else {
                    this.audioElement.play().catch(e => console.warn('Audio resume failed:', e));
                    this.updateAudioUi(msgId, true, (this.audioElement.currentTime / this.audioElement.duration) * 100);
                    return;
                }
            }

            // Switching to another audio
            if (this.currentPlayingMsgId) {
                this.updateAudioUi(this.currentPlayingMsgId, false, 0);
            }

            this.currentPlayingMsgId = msgId;
            this.audioElement.src = mediaUrl;
            this.audioElement.currentTime = 0;
            this.audioElement.play().catch(e => {
                console.warn('Audio play failed:', e);
                this.updateAudioUi(msgId, false, 0);
                this.currentPlayingMsgId = null;
            });

            this.updateAudioUi(msgId, true, 0);
        }

        seekAudio(event, msgId, mediaUrl) {
            if (event && event.stopPropagation) event.stopPropagation();
            const bar = event ? event.currentTarget : null;
            if (!bar) return;

            const rect = bar.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));

            const isCurrent = this.currentPlayingMsgId === msgId;
            if (!isCurrent) {
                this.playAudio(msgId, mediaUrl);
            }

            const applySeek = () => {
                if (this.audioElement.duration && this.audioElement.duration > 0) {
                    this.audioElement.currentTime = pct * this.audioElement.duration;
                    this.updateAudioUi(msgId, !this.audioElement.paused, pct * 100, this.audioElement.currentTime, this.audioElement.duration);
                }
            };

            if (this.audioElement.duration && this.audioElement.duration > 0) {
                applySeek();
            } else {
                this.audioElement.addEventListener('loadedmetadata', applySeek, { once: true });
            }
        }

        stopAudioPlayback() {
            if (this.audioElement && !this.audioElement.paused) {
                try { this.audioElement.pause(); } catch (_) {}
            }
            if (this.currentPlayingMsgId) {
                this.updateAudioUi(this.currentPlayingMsgId, false, 0);
                this.currentPlayingMsgId = null;
            }
        }

        updateAudioUi(msgId, isPlaying, progressPct = 0, currentSec = 0, durationSec = 0) {
            const btn = document.getElementById(`audio-play-btn-${msgId}`);
            const fill = document.getElementById(`audio-progress-fill-${msgId}`);
            const timeEl = document.getElementById(`audio-time-${msgId}`);

            if (btn) {
                btn.innerHTML = isPlaying
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            }
            if (fill) {
                fill.style.width = `${progressPct}%`;
            }
            if (timeEl && durationSec > 0) {
                const format = (s) => {
                    const m = Math.floor(s / 60);
                    const sec = Math.floor(s % 60);
                    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                };
                timeEl.textContent = `${format(currentSec)} / ${format(durationSec)}`;
            }
        }

        // =========================================================================
        // Full Drawer Rendering
        // =========================================================================

        render() {
            const container = this.dom.contentArea || document.getElementById('chat-content-area');
            if (!container) return;

            const activeChannel = this.channels.find(c => c.id === this.activeChannelId) || this.channels[0];
            const isDirect = activeChannel ? (activeChannel.channel_type === 'direct') : true;

            if (this.isFullscreen) {
                const directCh = this.channels.find(c => c.channel_type === 'direct');
                const groupCh = this.channels.find(c => c.channel_type === 'group');
                const directUnread = directCh ? (directCh.unread_count || directCh.unreadCount || 0) : 0;
                const groupUnread = groupCh ? (groupCh.unread_count || groupCh.unreadCount || 0) : 0;

                container.innerHTML = `
                    <div class="chat-fullscreen-layout">
                        <!-- Sidebar: Channel & Supervisory Directory -->
                        <aside class="chat-fullscreen-sidebar">
                            <div class="chat-fs-sidebar-header">
                                <div class="chat-fs-sidebar-title-wrap">
                                    <span class="chat-fs-sidebar-icon">
                                        <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    </span>
                                    <h4>قنوات التوجيه والزمالة</h4>
                                </div>
                                <span class="chat-fs-channels-badge">2 قنوات نشطة</span>
                            </div>

                            <div class="chat-fs-channels-list">
                                <!-- Direct Channel Card -->
                                <div class="chat-fs-channel-card ${isDirect ? 'active' : ''}" data-channel-type="direct" onclick="window.ChatWidget.switchChannel('direct')">
                                    <div class="chat-fs-chan-avatar direct">
                                        <svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                                        <span class="chat-fs-avatar-status online"></span>
                                    </div>
                                    <div class="chat-fs-chan-details">
                                        <div class="chat-fs-chan-top">
                                            <span class="chat-fs-chan-name">الماستر كوتش عبدالكريم الخليفي</span>
                                            <span class="chat-fs-chan-time">${this.formatTime(directCh && directCh.last_message_time)}</span>
                                        </div>
                                        <div class="chat-fs-chan-bottom">
                                            <span class="chat-fs-chan-preview">${this.escapeHtml((directCh && directCh.last_message) || 'جلسة الإشراف الفردي المباشر')}</span>
                                            ${directUnread > 0 ? `<span class="chat-fs-unread-pill">${directUnread}</span>` : ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Group Channel Card -->
                                <div class="chat-fs-channel-card ${!isDirect ? 'active' : ''}" data-channel-type="group" onclick="window.ChatWidget.switchChannel('group')">
                                    <div class="chat-fs-chan-avatar group">
                                        <svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                        <span class="chat-fs-avatar-status cohort"></span>
                                    </div>
                                    <div class="chat-fs-chan-details">
                                        <div class="chat-fs-chan-top">
                                            <span class="chat-fs-chan-name">${(groupCh && groupCh.name) || 'المحادثة الجماعية للدفعة'}</span>
                                            <span class="chat-fs-chan-time">${this.formatTime(groupCh && groupCh.last_message_time)}</span>
                                        </div>
                                        <div class="chat-fs-chan-bottom">
                                            <span class="chat-fs-chan-preview">${this.escapeHtml((groupCh && groupCh.last_message) || 'القناة العامة لدفعة 2026')}</span>
                                            ${groupUnread > 0 ? `<span class="chat-fs-unread-pill">${groupUnread}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Supervisory Accreditation Info Card -->
                            <div class="chat-fs-info-card">
                                <div class="chat-fs-info-header">
                                    <span class="chat-fs-info-badge">إشراف معتمد 2026</span>
                                    <span class="chat-fs-info-accreditation">الاتحاد العربي للكوتشنج</span>
                                </div>
                                <p class="chat-fs-info-desc">
                                    سجل المحادثات والملاحظات الصوتية والمرفقات محمي وموثق ضمن المتطلبات الإشرافية المعتمدة لبرنامج الماستر كوتش.
                                </p>
                                <div class="chat-fs-info-metrics">
                                    <div class="chat-fs-metric-item">
                                        <span class="metric-num">240</span>
                                        <span class="metric-lbl">ساعة معتمدة</span>
                                    </div>
                                    <div class="chat-fs-metric-item">
                                        <span class="metric-num">6</span>
                                        <span class="metric-lbl">روبركات تقييم</span>
                                    </div>
                                    <div class="chat-fs-metric-item">
                                        <span class="metric-num">44</span>
                                        <span class="metric-lbl">كفاية مهنية</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        <!-- Main Active Conversation Workspace -->
                        <main class="chat-fullscreen-main">
                            <!-- Active Channel Sub-header -->
                            <div class="chat-fs-active-banner">
                                <div class="chat-fs-active-info">
                                    <div class="chat-fs-active-avatar ${isDirect ? 'direct' : 'group'}" id="chat-fs-banner-avatar">
                                        ${isDirect 
                                            ? '<svg class="ui-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>'
                                            : '<svg class="ui-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
                                        }
                                    </div>
                                    <div>
                                        <h4 class="chat-fs-active-title" id="chat-fs-banner-title">${isDirect ? 'الماستر كوتش عبدالكريم الخليفي' : ((activeCh && activeCh.name) || 'المحادثة الجماعية للدفعة')}</h4>
                                        <p class="chat-fs-active-sub" id="chat-fs-banner-sub">${isDirect ? 'جلسة الإشراف الفردي المباشر • تمكين الرؤية للاستشارات المهنية' : 'القناة التفاعلية المشتركة لكوتشز الدفعة ومناقشات الحالات الميدانية'}</p>
                                    </div>
                                </div>
                                <div class="chat-fs-active-tags">
                                    <span class="chat-fs-tag-badge channel-kind-tag" id="chat-fs-banner-tag">
                                        ${isDirect ? 'إشراف فردي 1-على-1' : 'نقاش جماعي للدفعة'}
                                    </span>
                                </div>
                            </div>

                            <!-- Messages Scroll Container -->
                            <div class="chat-drawer-messages-scroll chat-fullscreen-messages" id="chat-messages-container"></div>

                            <!-- Pending Image Preview Strip -->
                            <div class="chat-composer-image-preview chat-fullscreen-composer-preview" id="chat-composer-image-preview" style="display:none;"></div>

                            <!-- Input / Composer Bar -->
                            <div class="chat-drawer-composer chat-fullscreen-composer-wrap" id="chat-input-bar-container"></div>
                        </main>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="chat-drawer-inner">
                        <!-- Messages Scroll Container -->
                        <div class="chat-drawer-messages-scroll" id="chat-messages-container"></div>

                        <!-- Pending Image Preview Strip -->
                        <div class="chat-composer-image-preview" id="chat-composer-image-preview" style="display:none;"></div>

                        <!-- Input / Composer Bar -->
                        <div class="chat-drawer-composer" id="chat-input-bar-container"></div>
                    </div>
                `;
            }

            this.renderMessagesOnly();
            this.renderComposer();
        }

        renderMessagesOnly() {
            const container = document.getElementById('chat-messages-container');
            if (!container) return;

            const messages = this.messages || [];
            if (messages.length === 0) {
                container.innerHTML = `
                    <div class="chat-empty-state">
                        <div class="chat-empty-icon">
                            <svg class="ui-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h4 class="chat-empty-title">لا توجد رسائل سابقة في هذه القناة</h4>
                        <p class="chat-empty-desc">ابدأ بطرح استفسارك الإشرافي أو إرسال تسجيل صوتي ومخطط بياني للمشرف المعتمد.</p>
                    </div>
                `;
                return;
            }

            const currentUser = this.getCurrentUser();
            const activeCh = this.channels.find(c => c.id === this.activeChannelId);
            const isGroup = activeCh ? (activeCh.channel_type === 'group') : false;

            container.innerHTML = `
                <div class="chat-date-separator">
                    <span>سجل التوجيه والمحادثات الموثقة</span>
                </div>
                ${messages.map(msg => {
                    const msgSenderId = Number(msg.sender_id || msg.senderId);
                    const isOutgoing = (msgSenderId === currentUser.id);
                    const msgSenderRole = msg.sender_role || msg.senderRole || 'coach';
                    const msgSenderName = msg.sender_name || msg.senderName || (msgSenderRole === 'admin' ? 'الماستر كوتش عبدالكريم' : 'كوتش مشارك');
                    const msgType = msg.message_type || msg.messageType || 'text';
                    const mediaUrl = msg.media_url || msg.mediaUrl || '';
                    const msgContent = msg.content || '';
                    const msgCreatedAt = msg.created_at || msg.createdAt || '';
                    const mediaMeta = msg.media_meta || msg.mediaMeta;

                    let mediaHtml = '';
                    if (msgType === 'audio') {
                        const durSec = (mediaMeta && mediaMeta.durationSeconds) || 0;
                        const durText = durSec > 0 ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}` : '00:15';
                        mediaHtml = `
                            <div class="chat-audio-player">
                                <button class="audio-play-btn" id="audio-play-btn-${msg.id}" onclick="window.ChatWidget.playAudio(${msg.id}, '${mediaUrl}')" title="تشغيل التسجيل الصوتي" aria-label="تشغيل">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </button>
                                <div class="audio-waveform-wrap">
                                    <div class="audio-progress-bar" onclick="window.ChatWidget.seekAudio(event, ${msg.id}, '${mediaUrl}')" title="انقر للتنقل في التسجيل">
                                        <div class="audio-progress-fill" id="audio-progress-fill-${msg.id}"></div>
                                    </div>
                                    <div class="audio-time-row">
                                        <span id="audio-time-${msg.id}">${durText}</span>
                                        <span class="audio-mic-tag">
                                            <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-left:4px;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                            ملاحظة صوتية إشرافية
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else if (msgType === 'image') {
                        mediaHtml = `
                            <div class="chat-image-wrap" onclick="window.ChatWidget.openImageLightbox('${encodeURI(mediaUrl)}', '${this.escapeJsAttr(msgContent || 'مرفق صوري إشرافي')}')">
                                <img src="${encodeURI(mediaUrl)}" alt="${this.escapeHtml(msgContent)}" class="chat-image-preview" loading="lazy">
                                <div class="chat-image-overlay">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                </div>
                            </div>
                        `;
                    } else if (msgType === 'file' || msgType === 'document') {
                        const fileSize = (mediaMeta && mediaMeta.sizeBytes) ? `${Math.round(mediaMeta.sizeBytes / 1024)} كيلوبايت` : 'مستند معتمد';
                        mediaHtml = `
                            <div class="chat-file-card">
                                <div class="chat-file-icon">
                                    <svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                </div>
                                <div class="chat-file-details">
                                    <div class="chat-file-title">${this.escapeHtml(msgContent || 'مستند إشرافي مرفق')}</div>
                                    <div class="chat-file-meta">${fileSize}</div>
                                </div>
                                <a href="${mediaUrl}" download target="_blank" class="chat-file-download-btn" title="تحميل الملف">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </a>
                            </div>
                        `;
                    }

                    if (isOutgoing) {
                        return `
                            <div class="chat-message-row outgoing">
                                <div class="chat-msg-content-wrap">
                                    <div class="chat-bubble">
                                        ${mediaHtml}
                                        ${msgContent && msgType !== 'file' ? `<div class="chat-bubble-text">${this.escapeHtml(msgContent)}</div>` : ''}
                                        <div class="chat-bubble-footer">
                                            <span class="chat-bubble-time">${this.formatTime(msgCreatedAt)}</span>
                                            <span class="chat-check-icon" title="تم الإرسال والتسليم">
                                                <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5-1.5-1.5"></path></svg>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="chat-message-row incoming">
                                <div class="chat-msg-avatar" style="background:${msgSenderRole === 'admin' ? 'linear-gradient(135deg, #0B1B3D, #1D4ED8)' : 'linear-gradient(135deg, #059669, #10B981)'};">
                                    ${msgSenderRole === 'admin' ? 'م.ك' : 'ك.'}
                                </div>
                                <div class="chat-msg-content-wrap">
                                    ${isGroup ? `
                                        <div class="chat-msg-sender-meta">
                                            <span class="chat-msg-sender-name">${this.escapeHtml(msgSenderName)}</span>
                                            <span class="chat-msg-sender-badge ${msgSenderRole === 'admin' ? 'admin-badge' : 'coach-badge'}">
                                                ${msgSenderRole === 'admin' ? 'الماستر كوتش' : 'كوتش مشارك'}
                                            </span>
                                        </div>
                                    ` : ''}
                                    <div class="chat-bubble">
                                        ${mediaHtml}
                                        ${msgContent && msgType !== 'file' ? `<div class="chat-bubble-text">${this.escapeHtml(msgContent)}</div>` : ''}
                                        <div class="chat-bubble-footer">
                                            <span class="chat-bubble-time">${this.formatTime(msgCreatedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            `;
        }

        renderComposer() {
            const container = document.getElementById('chat-input-bar-container');
            if (!container) return;

            if (this.isRecording) {
                const recordingHtml = `
                    <div class="chat-recording-banner" style="${this.isFullscreen ? 'width:100%;' : ''}">
                        <div class="chat-recording-left">
                            <span class="recording-pulse-dot"></span>
                            <span class="recording-label">جارٍ تسجيل ملاحظة صوتية إشرافية...</span>
                            <span class="recording-timer" id="chat-recording-timer">00:00</span>
                        </div>
                        <div class="chat-recording-actions">
                            <button class="btn-cancel-recording" onclick="window.ChatWidget.cancelVoiceRecording()" title="إلغاء التسجيل" aria-label="إلغاء التسجيل">
                                <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-left:4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                <span>إلغاء</span>
                            </button>
                            <button class="btn-send-recording" onclick="window.ChatWidget.finishVoiceRecording()" title="إرسال الصوتية" aria-label="إرسال الصوتية">
                                <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-left:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <span>إرسال الصوتية</span>
                            </button>
                        </div>
                    </div>
                `;

                if (this.isFullscreen) {
                    container.innerHTML = `<div class="chat-fs-composer-inner">${recordingHtml}</div>`;
                } else {
                    container.innerHTML = recordingHtml;
                }
            } else {
                const controlsHtml = `
                    <input type="file" id="chat-file-input" accept="image/*,.pdf,.doc,.docx" style="display:none;" onchange="window.ChatWidget.onImageSelected(event)">
                    
                    <button class="chat-attach-btn" title="إرفاق صورة أو مخطط إشرافي" onclick="document.getElementById('chat-file-input').click()" aria-label="إرفاق ملف">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    
                    <button class="chat-record-btn" title="تسجيل ملاحظة صوتية إشرافية" onclick="window.ChatWidget.toggleVoiceRecording()" aria-label="تسجيل صوتي">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </button>
                    
                    <div class="chat-input-field-wrap">
                        <textarea id="chat-msg-input" class="chat-textarea" placeholder="اكتب استفسارك أو ملاحظتك الإشرافية... (Enter للإرسال)" rows="1" oninput="window.ChatWidget.onInput(this)" onkeydown="window.ChatWidget.onKeyDown(event)"></textarea>
                    </div>
                    
                    <button class="chat-send-btn" title="إرسال" onclick="window.ChatWidget.handleSendClick()" aria-label="إرسال">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                `;

                if (this.isFullscreen) {
                    container.innerHTML = `<div class="chat-fs-composer-inner">${controlsHtml}</div>`;
                } else {
                    container.innerHTML = controlsHtml;
                }
            }
        }

        onInput(textarea) {
            // Auto-resize
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

            // Send typing notification throttled
            if (!this.typingDebounceTimer) {
                this.sendTyping(true);
                this.typingDebounceTimer = setTimeout(() => {
                    this.typingDebounceTimer = null;
                }, 1500);
            }

            if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
            this.typingStopTimer = setTimeout(() => {
                this.sendTyping(false);
            }, 3000);
        }

        onKeyDown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.handleSendClick();
            }
        }

        handleSendClick() {
            const inputEl = document.getElementById('chat-msg-input');
            const text = inputEl ? inputEl.value.trim() : '';

            // If an image preview is pending, send the image with optional caption
            if (this.pendingImageFile) {
                this.uploadAndSendPendingImage(text);
                if (inputEl) {
                    inputEl.value = '';
                    inputEl.style.height = 'auto';
                }
                return;
            }

            // Normal text message
            if (!text) return;
            if (inputEl) {
                inputEl.value = '';
                inputEl.style.height = 'auto';
            }
            this.sendMessage(text, 'text');
        }

        scrollToBottom() {
            const container = document.getElementById('chat-messages-container');
            if (container) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 50);
            }
        }

        formatTime(dateStr) {
            if (!dateStr) return '';
            try {
                const d = new Date(dateStr);
                return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            } catch (_) {
                return '';
            }
        }

        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        escapeJsAttr(str) {
            if (!str) return '';
            return String(str)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '&quot;')
                .replace(/\n/g, ' ')
                .replace(/\r/g, '');
        }

        handleAuthChange() {
            const token = this.getAuthToken();
            if (token) {
                this.connect(token);
                this.loadChannels().then(() => this.render());
            } else {
                this.cleanUpSocket();
                this.updateConnectionStatus('offline');
            }
        }
    }

    // Expose singleton to window
    window.ChatWidget = new ChatWidgetManager();

    // Auto-init when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.ChatWidget.init());
    } else {
        window.ChatWidget.init();
    }
})();
