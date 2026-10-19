const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../middleware/auth');

function resolveCoachId(req) {
    if (req.user && req.user.role === 'admin') {
        const queryId = (req.query && req.query.coachId) || (req.body && req.body.coachId);
        return queryId ? parseInt(queryId, 10) : 1;
    }
    return req.coach ? req.coach.id : null;
}

// ==========================================
// 1. Professional Recordings (التسجيلات المهنية الـ 5)
// ==========================================
router.get('/recordings', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({
            total: (state.professionalRecordings || []).length,
            target: 5,
            recordings: state.professionalRecordings || []
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب التسجيلات', details: err.message });
    }
});

router.post('/recordings', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { title, topic, duration, beneficiaryCode, reflection, isAnonymous, audioSimulatorId } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'عنوان التسجيل المهني مطلوب' });
        }
        if (isAnonymous === false || isAnonymous === 'false') {
            return res.status(400).json({ error: 'يجب الإقرار بنزع الهوية والالتزام بالسرية التامة' });
        }

        if (!Array.isArray(state.professionalRecordings)) state.professionalRecordings = [];
        const nextId = state.professionalRecordings.length > 0
            ? Math.max(...state.professionalRecordings.map(r => parseInt(r.id, 10) || 0)) + 1
            : 1;

        const newRec = {
            id: nextId,
            title: title.trim(),
            topic: topic || 'كوتشنج القيادة والتحول المؤسسي',
            duration: duration || '48:00',
            audioSimulatorId: audioSimulatorId || `rec_${nextId}`,
            beneficiaryCode: beneficiaryCode || `BEN-REC-${nextId.toString().padStart(2, '0')}`,
            supervisorNotes: 'تم استلام التسجيل المهني وتوثيقه، قيد المراجعة الإشرافية وربط الطوابع بالروبرك.',
            timestamps: [
                { time: '02:30', note: 'الافتتاح، استيفاء شروط التعاقد والسرية ونزع الهوية.' },
                { time: '18:15', note: 'طرح أسئلة التمكين وتوليد الاستبصار الذاتي.' },
                { time: '36:45', note: 'تثبيت خطة العمل ومؤشرات القياس العملية.' }
            ],
            appliedImprovement: reflection || 'الالتزام بميثاق الكوتشنج، ممارسة الصمت الاستراتيجي، وخفض المقاطعة.',
            status: 'submitted',
            createdAt: new Date().toISOString()
        };

        state.professionalRecordings.push(newRec);

        // Also sync with TASK-06
        const task6 = (state.tasks || []).find(t => t.id === 'TASK-06');
        if (task6) {
            if (!Array.isArray(task6.evidences)) task6.evidences = [];
            task6.evidences.push({
                id: Date.now(),
                name: newRec.title,
                type: 'audio',
                duration: newRec.duration,
                isAnonymous: true,
                createdAt: new Date().toISOString()
            });
            const parts = (task6.version || 'v1.0').split('.');
            task6.version = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
        }

        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم حفظ وتوثيق التسجيل المهني بنجاح',
            recording: newRec,
            totalRecordings: state.professionalRecordings.length
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في حفظ التسجيل المهني', details: err.message });
    }
});

// ==========================================
// 2. Innovative Models (النماذج الابتكارية الـ 10)
// ==========================================
router.get('/models', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({
            total: (state.innovativeModels || []).length,
            target: 10,
            models: state.innovativeModels || []
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب النماذج الابتكارية', details: err.message });
    }
});

router.post('/models', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { title, problemAddressed, theoreticalReference, addedValue, feasibilityTest } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'عنوان النموذج الابتكاري مطلوب' });
        }

        if (!Array.isArray(state.innovativeModels)) state.innovativeModels = [];
        const nextId = state.innovativeModels.length > 0
            ? Math.max(...state.innovativeModels.map(m => parseInt(m.id, 10) || 0)) + 1
            : 1;

        const newModel = {
            id: nextId,
            title: title.trim(),
            problemAddressed: problemAddressed || 'معالجة فجوات الأداء والتشوهات المعرفية القيادية.',
            theoreticalReference: theoreticalReference || 'علم النفس الإيجابي ونظرية النظم المعقدة.',
            addedValue: addedValue || 'تسريع الوصول إلى الاستبصار وتحقيق نتائج قابلة للقياس.',
            feasibilityTest: feasibilityTest || 'تم اختباره ميدانياً وأثبت كفاءة ومرونة عالية.',
            status: 'approved',
            createdAt: new Date().toISOString()
        };

        state.innovativeModels.push(newModel);

        // Also sync with TASK-03
        const task3 = (state.tasks || []).find(t => t.id === 'TASK-03');
        if (task3) {
            if (!Array.isArray(task3.evidences)) task3.evidences = [];
            task3.evidences.push({
                id: Date.now(),
                name: `توثيق نموذج: ${newModel.title}`,
                type: 'document',
                pages: 5,
                isAnonymous: true,
                createdAt: new Date().toISOString()
            });
            const parts = (task3.version || 'v1.0').split('.');
            task3.version = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
        }

        db.updateCoachState(coachId, state);

        return res.status(201).json({
            message: 'تم إيداع وتوثيق النموذج الابتكاري بنجاح',
            model: newModel,
            totalModels: state.innovativeModels.length
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في توثيق النموذج الابتكاري', details: err.message });
    }
});

// ==========================================
// 3. Innovative Personality Assessment Tool (أداة تحليل الشخصية المبتكرة)
// ==========================================
router.get('/innovative-tool', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({ tool: state.innovativeTool || state.personalityTool || null });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب بيانات الأداة المبتكرة', details: err.message });
    }
});

router.post('/innovative-tool', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { name, purpose, boundaries, verificationMechanism, dimensions } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'اسم ومؤشر الأداة المبتكرة مطلوب' });
        }

        state.innovativeTool = {
            name: name.trim(),
            purpose: purpose || 'قياس النضج المهني والدافعية القيادية في البيئات المؤسسية.',
            boundaries: boundaries || 'أداة تطويرية كوتشنجية غير عيادية، تقتصر على بيئات العمل والنمو التنفيذي.',
            verificationMechanism: verificationMechanism || 'اختبار الصدق الظاهري والمحتوى وتطبيق تجريبي على عينة ضابطة.',
            dimensions: dimensions || 'الوعي الذاتي، الاتزان الانفعالي، المرونة التكيفية، وتوجيه الإنجاز.',
            status: 'approved',
            updatedAt: new Date().toISOString()
        };
        state.personalityTool = state.innovativeTool;

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم توثيق واعتماد ملف الأداة المبتكرة بنجاح',
            tool: state.innovativeTool
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في تحديث ملف الأداة المبتكرة', details: err.message });
    }
});

// ==========================================
// 4. Organizational Readiness Project (تهيئة مؤسسة للكوتشنج)
// ==========================================
router.get('/org-preparation', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({ orgPreparation: state.orgPreparation || null });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب بيانات مشروع تهيئة المؤسسة', details: err.message });
    }
});

router.post('/org-preparation', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { orgName, sector, phases } = req.body;
        if (!orgName || !orgName.trim()) {
            return res.status(400).json({ error: 'اسم المؤسسة المستهدفة مطلوب' });
        }

        const defaultPhases = [
            { phase: "المرحلة 1: التهيئة والتشخيص الميداني", duration: "4 أسابيع", output: "مسح الجاهزية الثقافية وتحديد الفجوات ومؤشرات النجاح." },
            { phase: "المرحلة 2: تصميم منظومة الكوتشنج", duration: "6 أسابيع", output: "هندسة المسارات الثلاثة (القيادة، الموارد البشرية، والفرق) وحقيبة التدخل." },
            { phase: "المرحلة 3: التطبيق التجريبي والرعاية الإشرافية", duration: "8 أسابيع", output: "إطلاق الدفعة التجريبية وتوثيق جلسات الكوتشنج والإشراف الميداني." },
            { phase: "المرحلة 4: التقييم المؤسسي والأثر المستدام", duration: "4 أسابيع", output: "قياس العائد المؤسسي وتأسيس وحدة الكوتشنج الداخلية المستدامة." }
        ];

        state.orgPreparation = {
            orgName: orgName.trim(),
            sector: sector || 'القطاع المؤسسي والحلول التقنية',
            status: 'approved',
            phases: Array.isArray(phases) && phases.length > 0 ? phases : defaultPhases,
            updatedAt: new Date().toISOString()
        };

        // Sync with TASK-04
        const task4 = (state.tasks || []).find(t => t.id === 'TASK-04');
        if (task4) {
            if (!Array.isArray(task4.evidences)) task4.evidences = [];
            task4.evidences.push({
                id: Date.now(),
                name: `مشروع تهيئة: ${orgName}`,
                type: 'document',
                pages: 28,
                isAnonymous: true,
                createdAt: new Date().toISOString()
            });
            const parts = (task4.version || 'v1.0').split('.');
            task4.version = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
        }

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم إيداع وتحديث خطة تهيئة المؤسسة بنجاح',
            orgPreparation: state.orgPreparation
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في تحديث مشروع تهيئة المؤسسة', details: err.message });
    }
});

// ==========================================
// 5. Applied Research Paper (الورقة العلمية التطبيقية 50+ صفحة)
// ==========================================
router.get('/research-paper', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({ researchPaper: state.researchPaper || null });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب بيانات الورقة العلمية', details: err.message });
    }
});

router.post('/research-paper', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { title, totalPages, abstract, keywords, apa7Compliant } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'عنوان الورقة العلمية مطلوب' });
        }

        const pages = parseInt(totalPages, 10) || 52;
        state.researchPaper = {
            title: title.trim(),
            totalPages: pages,
            abstract: abstract || 'بحث تطبيقي رصين يربط نظريات الكوتشنج بالممارسة الميدانية والمؤشرات الكمية.',
            keywords: keywords || 'كوتشنج، نضج قيادي، روبركات، APA 7',
            apa7Compliant: apa7Compliant !== false,
            status: pages >= 50 ? 'approved' : 'submitted',
            updatedAt: new Date().toISOString()
        };

        // Sync with TASK-05
        const task5 = (state.tasks || []).find(t => t.id === 'TASK-05');
        if (task5) {
            if (!Array.isArray(task5.evidences)) task5.evidences = [];
            task5.evidences.push({
                id: Date.now(),
                name: `مخطوطة البحث: ${title.trim()}`,
                type: 'document',
                pages: pages,
                isAnonymous: true,
                createdAt: new Date().toISOString()
            });
            const parts = (task5.version || 'v1.0').split('.');
            task5.version = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
        }

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم إيداع وتحديث الورقة العلمية التطبيقية بنجاح',
            researchPaper: state.researchPaper
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في تحديث الورقة العلمية', details: err.message });
    }
});

// ==========================================
// 6. Graduation Innovation Project (مشروع التخرج الابتكاري)
// ==========================================
router.get('/graduation-project', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });
        return res.json({ graduationProject: state.graduationProject || null });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في جلب بيانات مشروع التخرج', details: err.message });
    }
});

router.post('/graduation-project', authenticate, (req, res) => {
    try {
        const coachId = resolveCoachId(req);
        if (!coachId) return res.status(400).json({ error: 'تعذر تحديد حساب الكوتش' });
        const state = db.getCoachCompleteState(coachId);
        if (!state) return res.status(404).json({ error: 'بيانات الكوتش غير موجودة' });

        const { title, executiveSummary, juryVerdict } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'عنوان مشروع التخرج مطلوب' });
        }

        state.graduationProject = {
            title: title.trim(),
            executiveSummary: executiveSummary || 'منظومة كوتشنجية ابتكارية متكاملة تدمج الأدوات والنماذج والممارسة الميدانية.',
            juryVerdict: juryVerdict || 'مجاز بتقدير ممتاز والتوصية بالنشر والتطبيق المؤسسي',
            status: 'approved',
            updatedAt: new Date().toISOString()
        };

        // Sync with TASK-07
        const task7 = (state.tasks || []).find(t => t.id === 'TASK-07');
        if (task7) {
            if (!Array.isArray(task7.evidences)) task7.evidences = [];
            task7.evidences.push({
                id: Date.now(),
                name: `دوسييه التخرج: ${title.trim()}`,
                type: 'document',
                pages: 45,
                isAnonymous: true,
                createdAt: new Date().toISOString()
            });
            const parts = (task7.version || 'v1.0').split('.');
            task7.version = `${parts[0]}.${parseInt(parts[1] || '0', 10) + 1}`;
        }

        db.updateCoachState(coachId, state);

        return res.json({
            message: 'تم إيداع وتحديث مشروع التخرج الابتكاري بنجاح',
            graduationProject: state.graduationProject
        });
    } catch (err) {
        return res.status(500).json({ error: 'خطأ في تحديث مشروع التخرج', details: err.message });
    }
});

module.exports = router;
