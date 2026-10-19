const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

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

// ----------------------------------------------------
// Dynamic Certificate & Official Dossier Management
// ----------------------------------------------------

// GET /api/admin/certificate-config
router.get('/certificate-config', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = req.query.coachId ? parseInt(req.query.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        return res.json({
            coachId,
            certificateConfig: state.certificateConfig
        });
    } catch (err) {
        console.error('Error getting certificate config:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب إعدادات الشهادة', details: err.message });
    }
});

// PUT /api/admin/certificate-config (Update metadata & signatories)
router.put('/certificate-config', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, title, subtitle, documentRef, issueDate, orgName, programSub, accreditationNote, signatory1, signatory2, stampText, committeeVerdictText } = req.body;
        const targetId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        if (!state.certificateConfig) {
            const ProgramStore = require('../../js/data.js');
            state.certificateConfig = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA.certificateConfig));
        }

        if (title !== undefined) state.certificateConfig.title = title;
        if (subtitle !== undefined) state.certificateConfig.subtitle = subtitle;
        if (documentRef !== undefined) state.certificateConfig.documentRef = documentRef;
        if (issueDate !== undefined) state.certificateConfig.issueDate = issueDate;
        if (orgName !== undefined) state.certificateConfig.orgName = orgName;
        if (programSub !== undefined) state.certificateConfig.programSub = programSub;
        if (accreditationNote !== undefined) state.certificateConfig.accreditationNote = accreditationNote;
        if (signatory1 !== undefined) state.certificateConfig.signatory1 = signatory1;
        if (signatory2 !== undefined) state.certificateConfig.signatory2 = signatory2;
        if (stampText !== undefined) state.certificateConfig.stampText = stampText;
        if (committeeVerdictText !== undefined) state.certificateConfig.committeeVerdictText = committeeVerdictText;

        db.updateCoachState(targetId, state);
        return res.json({
            message: 'تم تحديث بيانات الشهادة والمحضر والموقعين بنجاح',
            certificateConfig: state.certificateConfig
        });
    } catch (err) {
        console.error('Error updating certificate config:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تحديث إعدادات الشهادة', details: err.message });
    }
});

// POST /api/admin/certificate-rows (Add new row to certificate table)
router.post('/certificate-rows', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, title, target, achieved, indicator, verdict, status } = req.body;
        const targetId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        if (!state.certificateConfig) {
            const ProgramStore = require('../../js/data.js');
            state.certificateConfig = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA.certificateConfig));
        }

        const newRow = {
            id: 'cert_row_' + Date.now(),
            title: title || 'معيار تدقيق معتمد إضافي',
            target: target || 'مستوفى بالكامل',
            achieved: achieved || 'تم الاستيفاء والتحقق',
            indicator: indicator || 'تحقق مستقل من المشرف الأكاديمي',
            verdict: verdict || 'مستوفى 100%',
            status: status || 'approved',
            isCustom: true
        };

        state.certificateConfig.rows.push(newRow);
        db.updateCoachState(targetId, state);

        return res.json({
            message: 'تمت إضافة البند الجديد إلى محضر الاعتماد والشهادة بنجاح',
            row: newRow,
            rows: state.certificateConfig.rows
        });
    } catch (err) {
        console.error('Error adding certificate row:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة بند الشهادة', details: err.message });
    }
});

// PUT /api/admin/certificate-rows/:id (Edit an existing row)
router.put('/certificate-rows/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const rowId = req.params.id;
        const { coachId, title, target, achieved, indicator, verdict, status } = req.body;
        const targetId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        if (!state.certificateConfig || !Array.isArray(state.certificateConfig.rows)) {
            return res.status(404).json({ error: 'سجل بنود الشهادة غير موجود' });
        }

        const row = state.certificateConfig.rows.find(r => r.id === rowId);
        if (!row) return res.status(404).json({ error: 'البند المطلوب غير موجود في الشهادة' });

        if (title !== undefined) row.title = title;
        if (target !== undefined) row.target = target;
        if (achieved !== undefined) row.achieved = achieved;
        if (indicator !== undefined) row.indicator = indicator;
        if (verdict !== undefined) row.verdict = verdict;
        if (status !== undefined) row.status = status;

        db.updateCoachState(targetId, state);
        return res.json({
            message: 'تم تحديث بيانات البند بنجاح',
            row,
            rows: state.certificateConfig.rows
        });
    } catch (err) {
        console.error('Error updating certificate row:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل بند الشهادة', details: err.message });
    }
});

// DELETE /api/admin/certificate-rows/:id (Remove row from certificate)
router.delete('/certificate-rows/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const rowId = req.params.id;
        const coachId = req.query.coachId ? parseInt(req.query.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        if (!state.certificateConfig || !Array.isArray(state.certificateConfig.rows)) {
            return res.status(404).json({ error: 'سجل بنود الشهادة غير موجود' });
        }

        const initialLen = state.certificateConfig.rows.length;
        state.certificateConfig.rows = state.certificateConfig.rows.filter(r => r.id !== rowId);

        if (state.certificateConfig.rows.length === initialLen) {
            return res.status(404).json({ error: 'البند المطلوب حذفه غير موجود' });
        }

        db.updateCoachState(coachId, state);
        return res.json({
            message: 'تم حذف البند من الشهادة والمحضر بنجاح',
            deletedRowId: rowId,
            rows: state.certificateConfig.rows
        });
    } catch (err) {
        console.error('Error deleting certificate row:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حذف بند الشهادة', details: err.message });
    }
});

// POST /api/admin/certificate-rows/reset (Reset rows to curriculum defaults)
router.post('/certificate-rows/reset', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = req.body.coachId ? parseInt(req.body.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const ProgramStore = require('../../js/data.js');
        state.certificateConfig = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA.certificateConfig));

        db.updateCoachState(coachId, state);
        return res.json({
            message: 'تم استعادة بنود المحضر والشهادة النموذجية المعتمدة بالحقيبة',
            certificateConfig: state.certificateConfig
        });
    } catch (err) {
        console.error('Error resetting certificate rows:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء استعادة بنود الشهادة', details: err.message });
    }
});

// ----------------------------------------------------
// Dynamic Tasks Bank Management
// ----------------------------------------------------

// POST /api/admin/tasks (Create a new task)
router.post('/tasks', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, id, title, category, rubricCode, description, evidencesRequired, status, version } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const taskId = id || `TASK-${Date.now().toString().slice(-4)}`;
        if (state.tasks.some(t => t.id === taskId)) {
            return res.status(400).json({ error: 'معرف المهمة مسجل مسبقاً' });
        }

        const newTask = {
            id: taskId,
            title: title || 'مهمة مهنية جديدة',
            category: category || 'ممارسة وتطبيق ميداني',
            rubricCode: rubricCode || 'RUB-SESS',
            description: description || 'متطلب معتمد ضمن خطة التطوير والممارسة الميدانية للماستر كوتش.',
            evidencesRequired: evidencesRequired || ['تقرير موثق ومطابق لمعايير الروبرك'],
            status: status || 'draft',
            version: version || 'v1.0',
            reflection: { whatDidIDo: '', why: '', impact: '', whatWillIChange: '' },
            supervisorFeedback: { grade: 5.0, notes: '', audioUrl: '' },
            evidences: [],
            history: [
                {
                    version: version || 'v1.0',
                    date: new Date().toISOString().split('T')[0],
                    status: status || 'draft',
                    note: 'تمت إضافة المهمة بواسطة الماستر كوتش المشرف العام.'
                }
            ]
        };

        state.tasks.push(newTask);

        const dbConn = db.getDb();
        const now = new Date().toISOString();
        dbConn.prepare(`
            INSERT INTO tasks (id, coach_id, title, category, rubric_code, status, version, grade, reflection_json, supervisor_notes, audio_feedback_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newTask.id,
            targetCoachId,
            newTask.title,
            newTask.category,
            newTask.rubricCode,
            newTask.status,
            newTask.version,
            5.0,
            JSON.stringify(newTask.reflection),
            '',
            null,
            now
        );

        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تمت إضافة المهمة بنجاح إلى بنك المهام',
            task: newTask,
            tasks: state.tasks
        });
    } catch (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة المهمة', details: err.message });
    }
});

// PUT /api/admin/tasks/:id (Edit an existing task)
router.put('/tasks/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const taskId = req.params.id;
        const { coachId, title, category, rubricCode, description, status, version } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return res.status(404).json({ error: 'المهمة غير موجودة' });

        if (title !== undefined) task.title = title;
        if (category !== undefined) task.category = category;
        if (rubricCode !== undefined) task.rubricCode = rubricCode;
        if (description !== undefined) task.description = description;
        if (status !== undefined) task.status = status;
        if (version !== undefined) task.version = version;

        const dbConn = db.getDb();
        const now = new Date().toISOString();
        dbConn.prepare(`
            UPDATE tasks 
            SET title = ?, category = ?, rubric_code = ?, status = ?, version = ?, updated_at = ?
            WHERE id = ? AND coach_id = ?
        `).run(task.title, task.category, task.rubricCode, task.status, task.version, now, taskId, targetCoachId);

        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تم تحديث بيانات المهمة بنجاح',
            task,
            tasks: state.tasks
        });
    } catch (err) {
        console.error('Error editing task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل المهمة', details: err.message });
    }
});

// DELETE /api/admin/tasks/:id (Delete a task)
router.delete('/tasks/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const taskId = req.params.id;
        const coachId = req.query.coachId ? parseInt(req.query.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const initialLen = state.tasks.length;
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        if (state.tasks.length === initialLen) {
            return res.status(404).json({ error: 'المهمة المطلوب حذفها غير موجودة' });
        }

        const dbConn = db.getDb();
        dbConn.prepare('DELETE FROM tasks WHERE id = ? AND coach_id = ?').run(taskId, coachId);
        dbConn.prepare('DELETE FROM evidences WHERE task_id = ? AND coach_id = ?').run(taskId, coachId);

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم حذف المهمة بنجاح من بنك المهام',
            deletedTaskId: taskId,
            tasks: state.tasks
        });
    } catch (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حذف المهمة', details: err.message });
    }
});

// ----------------------------------------------------
// Dynamic Competencies Management
// ----------------------------------------------------

// POST /api/admin/competencies (Add a new competency)
router.post('/competencies', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, id, domainId, title, description, level, isCritical, evidenceDescription } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const compId = id || `COMP-D${domainId?.replace(/[^0-9]/g, '') || '1'}-${Date.now().toString().slice(-3)}`;
        if (state.competencies.some(c => c.id === compId)) {
            return res.status(400).json({ error: 'معرف الكفاية موجود مسبقاً' });
        }

        const newComp = {
            id: compId,
            domainId: domainId || 'D1',
            title: title || 'كفاية مهنية جديدة',
            description: description || 'ممارسة احترافية متقدمة وفق معايير الاتحاد العربي للكوتشنج.',
            level: level || 'master',
            isCritical: !!isCritical,
            evidenceDescription: evidenceDescription || 'وثائق وأدلة تطبيقية معتمدة.',
            status: 'mastered',
            evaluatedBy: 'الماستر كوتش عبدالكريم الخليفي'
        };

        state.competencies.push(newComp);
        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تمت إضافة الكفاية بنجاح إلى مصفوفة الكفايات',
            competency: newComp,
            competencies: state.competencies
        });
    } catch (err) {
        console.error('Error adding competency:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة الكفاية', details: err.message });
    }
});

// PUT /api/admin/competencies/:id (Edit competency)
router.put('/competencies/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const compId = req.params.id;
        const { coachId, domainId, title, description, level, isCritical, status, evidenceDescription } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const comp = state.competencies.find(c => c.id === compId);
        if (!comp) return res.status(404).json({ error: 'الكفاية غير موجودة' });

        if (domainId !== undefined) comp.domainId = domainId;
        if (title !== undefined) comp.title = title;
        if (description !== undefined) comp.description = description;
        if (level !== undefined) comp.level = level;
        if (isCritical !== undefined) comp.isCritical = !!isCritical;
        if (status !== undefined) comp.status = status;
        if (evidenceDescription !== undefined) comp.evidenceDescription = evidenceDescription;

        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تم تحديث بيانات الكفاية بنجاح',
            competency: comp,
            competencies: state.competencies
        });
    } catch (err) {
        console.error('Error updating competency:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل الكفاية', details: err.message });
    }
});

// DELETE /api/admin/competencies/:id (Delete competency)
router.delete('/competencies/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const compId = req.params.id;
        const coachId = req.query.coachId ? parseInt(req.query.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const initialLen = state.competencies.length;
        state.competencies = state.competencies.filter(c => c.id !== compId);
        if (state.competencies.length === initialLen) {
            return res.status(404).json({ error: 'الكفاية المطلوب حذفها غير موجودة' });
        }

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم حذف الكفاية بنجاح من مصفوفة الكفايات',
            deletedCompId: compId,
            competencies: state.competencies
        });
    } catch (err) {
        console.error('Error deleting competency:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حذف الكفاية', details: err.message });
    }
});

// ----------------------------------------------------
// Dynamic Rubrics Criteria Management
// ----------------------------------------------------

// POST /api/admin/rubrics/criteria (Add criterion to rubric)
router.post('/rubrics/criteria', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, rubricCode, id, name, weight, isCritical, description, levels, requiredImprovement } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        const normalizedCode = (rubricCode || '').toLowerCase();
        const rubric = state.rubrics.find(r => {
            const rCode = (r.code || '').toLowerCase();
            return rCode === normalizedCode || 
                   (normalizedCode === 'rub-sess' && rCode === 'sessions') ||
                   (normalizedCode === 'rub-port' && rCode === 'portfolio') ||
                   (normalizedCode === 'rub-res' && rCode === 'research_paper') ||
                   (normalizedCode === 'rub-proj' && rCode === 'innovation_project') ||
                   (normalizedCode === 'rub-intv' && rCode === 'final_interview') ||
                   (normalizedCode === 'rub-supv' && rCode === 'supervision_rubric') ||
                   rCode.includes(normalizedCode);
        });
        if (!rubric) return res.status(404).json({ error: 'الروبرك غير موجود' });

        const critId = id || `${rubricCode}-C${Date.now().toString().slice(-3)}`;
        if (rubric.criteria.some(c => c.id === critId)) {
            return res.status(400).json({ error: 'معرف المعيار موجود مسبقاً في هذا الروبرك' });
        }

        const newCrit = {
            id: critId,
            name: name || 'معيار تقييمي جديد',
            weight: weight !== undefined ? parseFloat(weight) : 0.20,
            isCritical: !!isCritical,
            description: description || 'وصف المعيار التقييمي وضوابط تحققه.',
            currentLevel: 5,
            evidence: 'أدلة إشرافية موثقة ومعتمدة',
            requiredImprovement: requiredImprovement || 'الحفاظ على التميز والممارسة المستدامة.',
            levels: levels || {
                1: 'أداء أولي محدود بحاجة لدعم',
                2: 'أداء مقبول بحاجة لتطوير',
                3: 'أداء جيد مستوفٍ للمعايير',
                4: 'أداء جيد جداً يظهر إتقاناً',
                5: 'أداء ممتاز ريادي'
            }
        };

        rubric.criteria.push(newCrit);
        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تمت إضافة المعيار بنجاح إلى الروبرك',
            criterion: newCrit,
            rubric
        });
    } catch (err) {
        console.error('Error adding rubric criterion:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة معيار الروبرك', details: err.message });
    }
});

// PUT /api/admin/rubrics/criteria/:id (Edit rubric criterion)
router.put('/rubrics/criteria/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const critId = req.params.id;
        const { coachId, rubricCode, name, weight, isCritical, description, requiredImprovement, currentLevel } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        let foundRubric = null;
        let crit = null;
        for (const r of state.rubrics) {
            if (rubricCode && r.code !== rubricCode) continue;
            const c = r.criteria.find(x => x.id === critId);
            if (c) {
                foundRubric = r;
                crit = c;
                break;
            }
        }
        if (!crit) return res.status(404).json({ error: 'المعيار غير موجود في الروبركات' });

        if (name !== undefined) crit.name = name;
        if (weight !== undefined) crit.weight = parseFloat(weight);
        if (isCritical !== undefined) crit.isCritical = !!isCritical;
        if (description !== undefined) crit.description = description;
        if (requiredImprovement !== undefined) crit.requiredImprovement = requiredImprovement;
        if (currentLevel !== undefined) crit.currentLevel = parseInt(currentLevel, 10);

        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تم تحديث بيانات المعيار بنجاح',
            criterion: crit,
            rubric: foundRubric
        });
    } catch (err) {
        console.error('Error updating rubric criterion:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل معيار الروبرك', details: err.message });
    }
});

// DELETE /api/admin/rubrics/criteria/:id (Delete rubric criterion)
router.delete('/rubrics/criteria/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const critId = req.params.id;
        const coachId = req.query.coachId ? parseInt(req.query.coachId, 10) : 1;
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        let deleted = false;
        state.rubrics.forEach(r => {
            const beforeLen = r.criteria.length;
            r.criteria = r.criteria.filter(c => c.id !== critId);
            if (r.criteria.length < beforeLen) deleted = true;
        });

        if (!deleted) return res.status(404).json({ error: 'المعيار المطلوب حذفه غير موجود' });

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم حذف المعيار من الروبرك بنجاح',
            deletedCritId: critId
        });
    } catch (err) {
        console.error('Error deleting rubric criterion:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حذف معيار الروبرك', details: err.message });
    }
});

// ----------------------------------------------------
// Dynamic Targets & Quotas Management
// ----------------------------------------------------

// PUT /api/admin/quotas (Update quantitative target quotas)
router.put('/quotas', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { coachId, totalTargetHours, casesTarget, sessionsTarget, mbtiTarget, wheelTarget, swotTarget, researchPagesTarget } = req.body;
        const targetCoachId = coachId ? parseInt(coachId, 10) : 1;
        const state = db.getCoachCompleteState(targetCoachId);
        if (!state) return res.status(404).json({ error: 'ملف الكوتش غير موجود' });

        if (totalTargetHours !== undefined) {
            state.metadata.totalTargetHours = parseInt(totalTargetHours, 10);
        }
        if (casesTarget !== undefined) {
            state.metadata.casesTarget = parseInt(casesTarget, 10);
        }
        if (sessionsTarget !== undefined) {
            state.metadata.sessionsTarget = parseInt(sessionsTarget, 10);
        }
        if (mbtiTarget !== undefined && state.toolsSummary.mbti) {
            state.toolsSummary.mbti.target = parseInt(mbtiTarget, 10);
        }
        if (wheelTarget !== undefined && state.toolsSummary.wheelOfLife) {
            state.toolsSummary.wheelOfLife.target = parseInt(wheelTarget, 10);
        }
        if (swotTarget !== undefined && state.toolsSummary.swot) {
            state.toolsSummary.swot.target = parseInt(swotTarget, 10);
        }
        if (researchPagesTarget !== undefined && state.researchPaper) {
            state.researchPaper.targetPages = parseInt(researchPagesTarget, 10);
        }

        db.updateCoachState(targetCoachId, state);

        return res.json({
            message: 'تم تحديث المستهدفات والحصص التدريبية بنجاح',
            metadata: state.metadata,
            toolsSummary: state.toolsSummary
        });
    } catch (err) {
        console.error('Error updating quotas:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تحديث المستهدفات', details: err.message });
    }
});

// ----------------------------------------------------
// Dynamic Coaches Accounts Management
// ----------------------------------------------------

// POST /api/admin/coaches (Add a new coach account)
router.post('/coaches', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { name, email, password, title, candidateCode, phone, supervisorName } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
        }

        const dbConn = db.getDb();
        const existing = dbConn.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً لكوتش آخر' });
        }

        const now = new Date().toISOString();
        const hash = bcrypt.hashSync(password, 10);

        const userRes = dbConn.prepare(`
            INSERT INTO users (email, password_hash, name, role, avatar, phone, created_at)
            VALUES (?, ?, ?, 'coach', 'assets/images/logo.png', ?, ?)
        `).run(email, hash, name, phone || '+966 50 000 0000', now);

        const newUserId = userRes.lastInsertRowid;
        const cCode = candidateCode || `MC-2026-${String(newUserId).padStart(3, '0')}`;

        const coachRes = dbConn.prepare(`
            INSERT INTO coaches (user_id, candidate_code, title, enrollment_date, supervisor_name, committee_chair, current_standing, audit_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'مسجل حديثاً قيد استكمال المتطلبات', 'in_progress', ?)
        `).run(
            newUserId,
            cCode,
            title || 'كوتش مشارك',
            now.split('T')[0],
            supervisorName || 'الماستر كوتش عبدالكريم الخليفي',
            'د. عبدالكريم الخليفي',
            now
        );

        const newCoachId = coachRes.lastInsertRowid;

        const ProgramStore = require('../../js/data.js');
        const newState = JSON.parse(JSON.stringify(ProgramStore.DEFAULT_DATA));
        newState.metadata.candidate = {
            id: cCode,
            name,
            title: title || 'كوتش مشارك',
            avatar: 'assets/images/logo.png',
            email,
            phone: phone || '+966 50 000 0000',
            enrollmentDate: now.split('T')[0],
            supervisorName: supervisorName || 'الماستر كوتش عبدالكريم الخليفي',
            committeeChair: 'د. عبدالكريم الخليفي',
            currentStanding: 'مسجل حديثاً قيد استكمال المتطلبات'
        };

        dbConn.prepare(`
            INSERT INTO coach_program_state (coach_id, state_json, updated_at)
            VALUES (?, ?, ?)
        `).run(newCoachId, JSON.stringify(newState), now);

        // Setup chat channels
        db.setupNewCoachChat(newUserId, newCoachId, name);

        return res.json({
            message: 'تم إنشاء حساب الكوتش الجديد وتهيئة قنوات الإشراف والملف بنجاح',
            coach: {
                id: newCoachId,
                userId: newUserId,
                name,
                email,
                title: title || 'كوتش مشارك',
                candidateCode: cCode
            }
        });
    } catch (err) {
        console.error('Error creating coach account:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء حساب الكوتش', details: err.message });
    }
});

// PUT /api/admin/coaches/:id (Update coach account info)
router.put('/coaches/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = parseInt(req.params.id, 10);
        const { name, title, candidateCode, currentStanding, auditStatus, supervisorName, phone, cohortId, cohort_id } = req.body;
        const dbConn = db.getDb();
        const coachRow = dbConn.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId);
        if (!coachRow) return res.status(404).json({ error: 'الكوتش غير موجود' });

        if (name || phone) {
            dbConn.prepare(`
                UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?
            `).run(name || null, phone || null, coachRow.user_id);
        }

        const targetCohortId = cohortId !== undefined ? cohortId : (cohort_id !== undefined ? cohort_id : undefined);
        const resolvedAuditStatus = auditStatus || req.body.audit_status || null;

        if (targetCohortId !== undefined) {
            // If changing cohort, remove from previous cohort chat channel
            if (coachRow.cohort_id && coachRow.cohort_id !== targetCohortId) {
                const oldChannel = dbConn.prepare('SELECT id FROM chat_channels WHERE cohort_id = ?').get(coachRow.cohort_id);
                if (oldChannel) {
                    dbConn.prepare('DELETE FROM chat_channel_members WHERE channel_id = ? AND user_id = ?').run(oldChannel.id, coachRow.user_id);
                }
            }

            // If assigned to a new cohort, add to new cohort channel
            if (targetCohortId) {
                const newChannel = dbConn.prepare('SELECT id FROM chat_channels WHERE cohort_id = ?').get(targetCohortId);
                if (newChannel) {
                    dbConn.prepare(`
                        INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, last_read_message_id, joined_at)
                        VALUES (?, ?, 'member', 0, ?)
                    `).run(newChannel.id, coachRow.user_id, new Date().toISOString());
                }
            }
        }

        dbConn.prepare(`
            UPDATE coaches 
            SET title = COALESCE(?, title),
                candidate_code = COALESCE(?, candidate_code),
                current_standing = COALESCE(?, current_standing),
                audit_status = COALESCE(?, audit_status),
                supervisor_name = COALESCE(?, supervisor_name),
                cohort_id = CASE WHEN ? = 1 THEN ? ELSE cohort_id END
            WHERE id = ?
        `).run(
            title || null,
            candidateCode || null,
            currentStanding || null,
            resolvedAuditStatus,
            supervisorName || null,
            targetCohortId !== undefined ? 1 : 0,
            targetCohortId || null,
            coachId
        );

        const state = db.getCoachCompleteState(coachId);
        if (state && state.metadata && state.metadata.candidate) {
            if (name) state.metadata.candidate.name = name;
            if (title) state.metadata.candidate.title = title;
            if (candidateCode) state.metadata.candidate.id = candidateCode;
            if (currentStanding) state.metadata.candidate.currentStanding = currentStanding;
            if (supervisorName) state.metadata.candidate.supervisorName = supervisorName;
            if (phone) state.metadata.candidate.phone = phone;
            db.updateCoachState(coachId, state);
        }

        return res.json({
            message: 'تم تحديث بيانات الكوتش بنجاح',
            coach: db.getCoachById(coachId)
        });
    } catch (err) {
        console.error('Error updating coach:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل بيانات الكوتش', details: err.message });
    }
});

// DELETE /api/admin/coaches/:id (Delete coach account)
router.delete('/coaches/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = parseInt(req.params.id, 10);
        if (coachId === 1) {
            return res.status(400).json({ error: 'لا يمكن حذف الكوتش الرئيسي النموذجي للمنصة (أحمد الشمري)' });
        }

        const dbConn = db.getDb();
        const coachRow = dbConn.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId);
        if (!coachRow) return res.status(404).json({ error: 'الكوتش غير موجود' });

        dbConn.prepare('DELETE FROM users WHERE id = ?').run(coachRow.user_id);

        return res.json({
            message: 'تم حذف حساب الكوتش وكافة بياناته بنجاح',
            deletedCoachId: coachId
        });
    } catch (err) {
        console.error('Error deleting coach:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء حذف حساب الكوتش', details: err.message });
    }
});

// POST /api/admin/coaches/:id/reset-password (Master Coach resets coach password)
router.post('/coaches/:id/reset-password', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = parseInt(req.params.id, 10);
        const { newPassword } = req.body;
        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({ error: 'كلمة المرور الجديدة مطلوبة ويجب ألا تقل عن 6 أحرف' });
        }

        const result = db.resetCoachPassword(coachId, newPassword, req.user.id, req.user.name);
        return res.json(result);
    } catch (err) {
        console.error('Error resetting coach password:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تغيير كلمة مرور الكوتش' });
    }
});

// PUT /api/admin/coaches/:id/tune-targets (Fine-tune individual coach targets)
router.put('/coaches/:id/tune-targets', authenticate, requireRole('admin'), (req, res) => {
    try {
        const coachId = parseInt(req.params.id, 10);
        const { customTargets } = req.body;
        if (!customTargets || typeof customTargets !== 'object') {
            return res.status(400).json({ error: 'بيانات المستهدفات المخصصة مطلوبة' });
        }

        const result = db.tuneCoachTargets(coachId, customTargets, req.user.id, req.user.name);
        return res.json(result);
    } catch (err) {
        console.error('Error tuning coach targets:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تخصيص مستهدفات الكوتش' });
    }
});

// ----------------------------------------------------
// Multi-Cohort Management System (الدفعات التدريبية)
// ----------------------------------------------------

// GET /api/admin/cohorts (List all cohorts with dynamic metrics)
router.get('/cohorts', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohorts = db.getAllCohorts();
        return res.json({ count: cohorts.length, cohorts });
    } catch (err) {
        console.error('Error fetching cohorts:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الدفعات التدريبية', details: err.message });
    }
});

// GET /api/admin/cohorts/:id (Single cohort with full roster details)
router.get('/cohorts/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const cohort = db.getCohortById(cohortId);
        if (!cohort) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });
        return res.json({ cohort });
    } catch (err) {
        console.error('Error fetching cohort:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الدفعة', details: err.message });
    }
});

// POST /api/admin/cohorts (Create new cohort with baseline targets)
router.post('/cohorts', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { code, name, description, startDate, endDate, status, maxCoaches, targets } = req.body;
        if (!code || !name || !startDate) {
            return res.status(400).json({ error: 'كود الدفعة واسمها وتاريخ البدء حقول إلزامية' });
        }

        const dbConn = db.getDb();
        const existing = dbConn.prepare('SELECT id FROM cohorts WHERE code = ?').get(code.trim());
        if (existing) {
            return res.status(400).json({ error: 'كود الدفعة مسجل بالفعل، يرجى اختيار كود فريد' });
        }

        const cohort = db.createCohort({
            code,
            name,
            description,
            startDate,
            endDate,
            status: status || 'active',
            maxCoaches: maxCoaches ? parseInt(maxCoaches, 10) : 30,
            targets,
            adminUserId: req.user.id,
            adminName: req.user.name
        });

        return res.status(201).json({
            message: 'تم تدشين الدفعة التدريبية وتخصيص ديوان المحادثة بنجاح',
            cohort
        });
    } catch (err) {
        console.error('Error creating cohort:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إنشاء الدفعة التدريبية' });
    }
});

// PUT /api/admin/cohorts/:id (Update cohort info & targets)
router.put('/cohorts/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const { code, name, description, startDate, endDate, status, maxCoaches, targets } = req.body;
        const updated = db.updateCohort(cohortId, {
            code,
            name,
            description,
            startDate,
            endDate,
            status,
            maxCoaches: maxCoaches ? parseInt(maxCoaches, 10) : undefined,
            targets,
            adminUserId: req.user.id,
            adminName: req.user.name
        });

        if (!updated) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });

        return res.json({
            message: 'تم تحديث بيانات ومستهدفات الدفعة بنجاح',
            cohort: updated
        });
    } catch (err) {
        console.error('Error updating cohort:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تعديل بيانات الدفعة' });
    }
});

// DELETE /api/admin/cohorts/:id (Archive/Delete cohort)
router.delete('/cohorts/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const success = db.deleteCohort(cohortId, req.user.id, req.user.name);
        if (!success) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });

        return res.json({
            message: 'تمت أرشفة/حذف الدفعة التدريبية بنجاح وفصل ارتباط الكوتشز المسجلين',
            deletedCohortId: cohortId
        });
    } catch (err) {
        console.error('Error deleting cohort:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء حذف الدفعة' });
    }
});

function findCoachByIdentifier(dbConn, queryTerm) {
    const q = (queryTerm || '').toString().trim();
    if (!q) return null;
    const isPureDigits = /^\d+$/.test(q);
    const num = isPureDigits ? parseInt(q, 10) : -1;
    const padded = isPureDigits ? String(num).padStart(3, '0') : '';

    return dbConn.prepare(`
        SELECT c.id, c.candidate_code, c.cohort_id, u.name, u.email 
        FROM coaches c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.candidate_code COLLATE NOCASE = ? 
           OR (? != '' AND (c.candidate_code LIKE '%-' || ? OR c.candidate_code LIKE '%-' || ?))
           OR (NOT ? AND c.candidate_code LIKE '%' || ? || '%')
           OR u.name COLLATE NOCASE = ? 
           OR NORMALIZE_ARABIC(u.name) LIKE '%' || NORMALIZE_ARABIC(?) || '%'
           OR c.id = ?
        ORDER BY 
            CASE 
                WHEN c.candidate_code COLLATE NOCASE = ? THEN 1
                WHEN u.name COLLATE NOCASE = ? THEN 2
                WHEN c.id = ? THEN 3
                ELSE 4
            END ASC
        LIMIT 1
    `).get(
        q,
        padded, q, padded,
        isPureDigits ? 1 : 0, q,
        q,
        q,
        num,
        q,
        q,
        num
    );
}

// POST /api/admin/cohorts/:id/assign-coaches (Assign coaches to cohort by ID, candidateCode, or name)
router.post('/cohorts/:id/assign-coaches', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        let { coachIds, candidateCodes, coachIdentifiers, coachNames } = req.body;
        const dbConn = db.getDb();

        const cohort = dbConn.prepare('SELECT id, name FROM cohorts WHERE id = ?').get(cohortId);
        if (!cohort) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });

        const resolvedIds = new Set();

        if (Array.isArray(coachIds)) {
            coachIds.map(Number).filter(n => !isNaN(n) && n > 0).forEach(id => resolvedIds.add(id));
        }

        const identifierLists = [candidateCodes, coachIdentifiers, coachNames].filter(Boolean);
        for (const rawList of identifierLists) {
            const items = Array.isArray(rawList) ? rawList : [rawList];
            for (const item of items) {
                const term = String(item).trim();
                if (!term) continue;
                const match = findCoachByIdentifier(dbConn, term);
                if (match) {
                    resolvedIds.add(match.id);
                }
            }
        }

        if (resolvedIds.size === 0) {
            return res.status(400).json({ error: 'يرجى تحديد مصفوفة معرفات الكوتشز المراد تعيينهم (coachIds) أو أرقامهم التدريبية/أسمائهم' });
        }

        const numericIds = Array.from(resolvedIds);
        const updatedCohort = db.assignCoachesToCohort(cohortId, numericIds, req.user.id, req.user.name);
        return res.json({
            message: `تم تعيين ${numericIds.length} كوتش في الدفعة وإدراجهم في ديوان المحادثة بنجاح`,
            assignedCount: numericIds.length,
            assignedCoachIds: numericIds,
            cohort: updatedCohort
        });
    } catch (err) {
        console.error('Error assigning coaches to cohort:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تعيين الكوتشز في الدفعة' });
    }
});

// POST /api/admin/cohorts/:id/add-coach (Quick-enroll single coach by Candidate ID or Name)
router.post('/cohorts/:id/add-coach', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const { identifier, candidateCode, name, coachId } = req.body;
        const queryTerm = (identifier || candidateCode || name || coachId || '').toString().trim();
        if (!queryTerm) {
            return res.status(400).json({ error: 'يرجى إدخال الرقم التدريبي الأكاديمي أو اسم الكوتش' });
        }

        const dbConn = db.getDb();
        const cohort = dbConn.prepare('SELECT id, name FROM cohorts WHERE id = ?').get(cohortId);
        if (!cohort) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });

        const coach = findCoachByIdentifier(dbConn, queryTerm);
        if (!coach) {
            return res.status(404).json({ error: `لم يتم العثور على كوتش مطابق لـ: "${queryTerm}". يرجى التحقق من الرقم التدريبي أو الاسم.` });
        }

        const existingMembers = dbConn.prepare('SELECT id FROM coaches WHERE cohort_id = ?').all(cohortId).map(r => r.id);
        if (!existingMembers.includes(coach.id)) {
            existingMembers.push(coach.id);
        }

        const updatedCohort = db.assignCoachesToCohort(cohortId, existingMembers, req.user.id, req.user.name);
        const updatedCoach = dbConn.prepare(`
            SELECT c.id, c.candidate_code, c.cohort_id, u.name, u.email 
            FROM coaches c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?
        `).get(coach.id);

        return res.json({
            message: `تم إلحاق الكوتش (${coach.name} - ${coach.candidate_code}) بالدفعة بنجاح`,
            coach: updatedCoach,
            cohort: updatedCohort
        });
    } catch (err) {
        console.error('Error adding coach to cohort:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إلحاق الكوتش بالدفعة' });
    }
});

// POST /api/admin/cohorts/:id/sync-targets (Sync baseline targets to all enrolled coaches)
router.post('/cohorts/:id/sync-targets', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const result = db.syncCohortTargetsToCoaches(cohortId, req.user.id, req.user.name);
        return res.json({
            message: `تمت مزامنة وتعميم مستهدفات الدفعة على ${result.syncedCoachesCount} كوتش بنجاح`,
            updatedCoachesCount: result.syncedCoachesCount,
            result
        });
    } catch (err) {
        console.error('Error syncing cohort targets:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء مزامنة مستهدفات الدفعة' });
    }
});

// GET /api/admin/cohorts/:id/export-report (Cohort Executive Report Export)
router.get('/cohorts/:id/export-report', authenticate, requireRole('admin'), (req, res) => {
    try {
        const cohortId = parseInt(req.params.id, 10);
        const report = db.getCohortExecutiveReport(cohortId);
        if (!report) return res.status(404).json({ error: 'الدفعة التدريبية غير موجودة' });
        return res.json({ success: true, report, ...report });
    } catch (err) {
        console.error('Error generating cohort report:', err);
        return res.status(500).json({ error: err.message || 'حدث خطأ أثناء استخراج التقرير التنفيذي للدفعة' });
    }
});

// GET /api/admin/audit-logs (Administrative Audit Trail)
router.get('/audit-logs', authenticate, requireRole('admin'), (req, res) => {
    try {
        const { limit, action, targetType, targetId } = req.query;
        const logs = db.getAuditLogs({ limit, action, targetType, targetId });
        return res.json({ count: logs.length, logs });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل التدقيق الإداري', details: err.message });
    }
});

module.exports = router;
