const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/pending-tasks (Supervisor Review Queue across all coaches)
router.get('/pending-tasks', authenticate, requireRole('admin'), (req, res) => {
    try {
        const dbConn = db.getDb();
        const rows = dbConn.prepare(`
            SELECT 
                t.id, t.coach_id, t.title, t.category, t.rubric_code, t.status, t.version, t.updated_at,
                c.candidate_code, u.name as coach_name, u.email as coach_email
            FROM tasks t
            JOIN coaches c ON t.coach_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE t.status = 'submitted'
            ORDER BY t.updated_at DESC
        `).all();

        const pendingTasks = rows.map(r => {
            const evCount = dbConn.prepare('SELECT COUNT(*) as count FROM evidences WHERE task_id = ? AND coach_id = ?').get(r.id, r.coach_id);
            return {
                id: r.id,
                coachId: r.coach_id,
                coachName: r.coach_name,
                coachEmail: r.coach_email,
                candidateCode: r.candidate_code,
                title: r.title,
                category: r.category,
                rubricCode: r.rubric_code,
                status: r.status,
                version: r.version,
                evidencesCount: evCount ? evCount.count : 0,
                updatedAt: r.updated_at
            };
        });

        return res.json({
            count: pendingTasks.length,
            pendingTasks
        });
    } catch (err) {
        console.error('Error fetching pending tasks:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المهام المعلقة', details: err.message });
    }
});

// GET /api/admin/stats (Platform Executive Metrics)
router.get('/stats', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coaches = db.getAllCoaches();
        const dbConn = db.getDb();

        const taskAgg = dbConn.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'revision_required' THEN 1 ELSE 0 END) as revision_required,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
            FROM tasks
        `).get();

        const toolCount = dbConn.prepare('SELECT COUNT(*) as count FROM tool_applications').get();
        const rubricAvg = dbConn.prepare('SELECT AVG(level) as avg_level FROM rubrics_evaluations').get();
        const certifiedCount = coaches.filter(c => c.audit_status === 'certified').length;

        return res.json({
            coachesCount: coaches.length,
            tasks: {
                total: taskAgg.total || 0,
                approved: taskAgg.approved || 0,
                pending: taskAgg.submitted || 0,
                revisionRequired: taskAgg.revision_required || 0,
                draft: taskAgg.draft || 0
            },
            toolsApplicationsTotal: toolCount ? toolCount.count : 0,
            rubricsOverallAverage: rubricAvg && rubricAvg.avg_level ? parseFloat(rubricAvg.avg_level.toFixed(2)) : 4.5,
            certifiedGraduates: certifiedCount,
            coaches
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات المنصة', details: err.message });
    }
});

// POST /api/admin/reset-demo (Reset to clean demo data)
router.post('/reset-demo', authenticate, requireRole('admin'), (req, res) => {
    try {
        db.initializeDatabase(true);
        return res.json({
            success: true,
            message: 'تمت بنجاح إعادة تعيين المنصة إلى البيانات النموذجية الافتراضية المعتمدة'
        });
    } catch (err) {
        console.error('Error resetting demo:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء استعادة البيانات النموذجية', details: err.message });
    }
});

// GET /api/admin/export (Export full platform database backup)
router.get('/export', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coaches = db.getAllCoaches();
        const exportData = {
            exportDate: new Date().toISOString(),
            platform: 'Tamkeen Al-Roaya Master Coach Platform v3.0',
            founder: 'الماستر كوتش عبدالكريم الخليفي',
            coaches: coaches.map(c => ({
                summary: c,
                fullState: db.getCoachCompleteState(c.id)
            }))
        };

        return res.json(exportData);
    } catch (err) {
        console.error('Error exporting data:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تصدير البيانات', details: err.message });
    }
});

module.exports = router;
