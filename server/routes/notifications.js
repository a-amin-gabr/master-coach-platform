const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { broadcastNotificationViaWS } = require('../websocket');

// GET /api/notifications (List notifications with type filter and unread filter)
router.get('/', authenticate, (req, res) => {
    try {
        const userId = req.user.id;
        const type = req.query.type || null;
        const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
        const limit = parseInt(req.query.limit, 10) || 50;

        const notifications = db.getNotifications(userId, { type, unreadOnly, limit });
        const unreadCount = db.getUnreadNotificationsCount(userId);

        return res.json({
            notifications,
            unreadCount,
            total: notifications.length
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب الإشعارات والتنبيهات', details: err.message });
    }
});

// GET /api/notifications/unread-count (Quick badge check)
router.get('/unread-count', authenticate, (req, res) => {
    try {
        const count = db.getUnreadNotificationsCount(req.user.id);
        return res.json({ unreadCount: count });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب عدد الإشعارات غير المقروءة' });
    }
});

// POST /api/notifications/:id/read (Mark single notification as read)
router.post('/:id/read', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'معرف الإشعار غير صالح' });

        const success = db.markNotificationAsRead(id, req.user.id);
        const unreadCount = db.getUnreadNotificationsCount(req.user.id);

        return res.json({
            success,
            id,
            unreadCount
        });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ error: 'خطأ في تحديث حالة قراءة الإشعار' });
    }
});

// POST /api/notifications/read-all (Mark all notifications as read)
router.post('/read-all', authenticate, (req, res) => {
    try {
        const count = db.markAllNotificationsAsRead(req.user.id);
        return res.json({
            success: true,
            updatedCount: count,
            unreadCount: 0
        });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        return res.status(500).json({ error: 'خطأ في تحديد الكل كمقروء' });
    }
});

// POST /api/notifications (Admin or supervisor dispatches a notification)
router.post('/', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { cohortId, type, title, message, linkTab, linkId, linkAction, metadata } = req.body;
        const targetUserId = req.body.targetUserId || req.body.userId;

        if (!type || !title || !message) {
            return res.status(400).json({ error: 'نوع الإشعار والعنوان والنص حقول إلزامية' });
        }

        const validTypes = [
            'task_review', 'voice_note', 'rubric_eval', 'rubric_update',
            'cohort_update', 'cohort_announcement', 'chat_msg', 'ethics_alert',
            'ethics_clearance', 'system'
        ];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `نوع الإشعار غير صالح. الأنواع المقبولة: ${validTypes.join(', ')}` });
        }

        const results = [];

        if (cohortId) {
            // Broadcast to all coaches in cohort
            const dbConn = db.getDb();
            const cohortCoaches = dbConn.prepare('SELECT user_id FROM coaches WHERE cohort_id = ?').all(cohortId);
            for (const c of cohortCoaches) {
                const notif = db.createNotification({
                    userId: c.user_id,
                    type,
                    title,
                    message,
                    linkTab,
                    linkId,
                    linkAction,
                    metadata
                });
                results.push(notif);
                try {
                    broadcastNotificationViaWS(c.user_id, notif);
                } catch (_) {}
            }
        } else if (targetUserId) {
            const notif = db.createNotification({
                userId: targetUserId,
                type,
                title,
                message,
                linkTab,
                linkId,
                linkAction,
                metadata
            });
            results.push(notif);
            try {
                broadcastNotificationViaWS(targetUserId, notif);
            } catch (_) {}
        } else {
            return res.status(400).json({ error: 'يجب تحديد targetUserId أو cohortId لإرسال الإشعار' });
        }

        return res.status(201).json({
            message: 'تم إرسال الإشعار وبثه بنجاح',
            sentCount: results.length,
            notification: results[0],
            notifications: results
        });
    } catch (err) {
        console.error('Error creating notification:', err);
        return res.status(500).json({ error: 'خطأ أثناء إنشاء وبث الإشعار', details: err.message });
    }
});

// DELETE /api/notifications/:id (Delete notification)
router.delete('/:id', authenticate, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'معرف الإشعار غير صالح' });

        const success = db.deleteNotification(id, req.user.id);
        const unreadCount = db.getUnreadNotificationsCount(req.user.id);

        return res.json({
            success,
            unreadCount
        });
    } catch (err) {
        console.error('Error deleting notification:', err);
        return res.status(500).json({ error: 'خطأ في حذف الإشعار' });
    }
});

module.exports = router;
