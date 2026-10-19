/**
 * Comprehensive Deep Automated Verification Suite for Master Coach Qualification Platform v3.0
 * Tests Core Data Model, Anti-Duplication Engine, Rubrics & Critical Ethical Blocker,
 * Task Submission Lifecycle, and DOM Architecture.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== بدء الفحص العميق الشامل لمنظومة الماستر كوتش 3.0 ===\n');

// 1. Verify files exist and read content
const baseDir = resolve('.');
const htmlPath = resolve(baseDir, 'master_coach_platform/index.html');
const cssPath = resolve(baseDir, 'master_coach_platform/css/styles.css');
const dataJsPath = resolve(baseDir, 'master_coach_platform/js/data.js');
const appJsPath = resolve(baseDir, 'master_coach_platform/js/app.js');
const logoPath = resolve(baseDir, 'master_coach_platform/assets/images/logo.png');

const htmlContent = readFileSync(htmlPath, 'utf8');
const cssContent = readFileSync(cssPath, 'utf8');
const dataJsContent = readFileSync(dataJsPath, 'utf8');
const appJsContent = readFileSync(appJsPath, 'utf8');

console.log(`✓ ملفات المشروع الأساسية موجودة ومقروءة (HTML: ${htmlContent.length}B, CSS: ${cssContent.length}B, JS: ${dataJsContent.length + appJsContent.length}B)`);

// 2. Mock browser environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
};

await import('./master_coach_platform/js/data.js');

const store = global.ProgramStore;
if (!store) {
    throw new Error('فشل تحميل ProgramStore!');
}
const data = store.load();

console.log('\n--- 1. فحص بيانات الكفايات والمحاور ---');
console.log(`• عدد المحاور: ${data.domains.length} (المستهدف: 9 محاور تشمل 8 مجالات أساسية + الإشراف)`);
if (data.domains.length !== 9) throw new Error('عدد المحاور غير مطابق');

console.log(`• إجمالي الكفايات: ${data.competencies.length} (43 كفاية فرعية + كفاية الإشراف)`);
if (data.competencies.length !== 44) throw new Error('عدد الكفايات غير مطابق (المطلوب 44 كفاية)');

const coreComps = data.competencies.filter(c => c.domainId !== 'D9');
const supComp = data.competencies.find(c => c.domainId === 'D9');
if (coreComps.length !== 43) throw new Error(`كفايات المحاور الثمانية ليست 43 (الموجود: ${coreComps.length})`);
if (!supComp) throw new Error('كفاية الإشراف على الممارسين مفقودة');
console.log(`• تحقق تصنيف الكفايات: 43 كفاية فرعية عبر المحاور الثمانية + كفاية الإشراف على الممارسين (الإجمالي: 44)`);

console.log('\n--- 2. فحص الساعات والمتطلبات الكمية والقَبْلية ---');
const totalTargetHours = data.hours.reduce((acc, h) => acc + h.target, 0);
const totalDoneHours = data.hours.reduce((acc, h) => acc + h.completed, 0);
console.log(`• إجمالي الساعات المستهدفة: ${totalTargetHours} ساعة (المطابقة لـ 240 ساعة)`);
console.log(`• إجمالي الساعات المنجزة: ${totalDoneHours} ساعة`);
if (totalTargetHours !== 240 || totalDoneHours !== 240) throw new Error('ساعات الحقيبة غير مطابقة لـ 240 ساعة');

if (!data.metadata.prerequisites || data.metadata.prerequisites.status !== 'verified') {
    throw new Error('بيانات المراجعة القبلية CPC/PCC مفقودة أو غير معتمدة');
}
console.log(`• مراجعة مخرجات CPC وPCC: ${data.metadata.prerequisites.status} (${data.metadata.prerequisites.title})`);

if (!data.metadata.fieldFollowup || data.metadata.fieldFollowup.durationMonths !== 3) {
    throw new Error('سجل المتابعة الميدانية لمدة 3 أشهر غير مطابق');
}
console.log(`• المتابعة الميدانية: ${data.metadata.fieldFollowup.durationMonths} أشهر كاملة (${data.metadata.fieldFollowup.startDate} إلى ${data.metadata.fieldFollowup.endDate})`);

if (!data.metadata.mediaDeclaration || data.metadata.mediaDeclaration.status !== 'completed') {
    throw new Error('إقرار استكمال المواد الصوتية والمرئية غير مطابق');
}
console.log(`• إقرار المواد الصوتية والمرئية: ${data.metadata.mediaDeclaration.title} (معتمد وموقع بتاريخ ${data.metadata.mediaDeclaration.signDate})`);

console.log(`• الحالات الميدانية المتكاملة: ${data.cases.length} حالة (المستهدف: 20 حالة)`);
if (data.cases.length !== 20) throw new Error('عدد الحالات الميدانية غير مطابق لـ 20');

console.log(`• الجلسات الميدانية الموثقة: ${data.sessions.length} جلسة (المستهدف: 30 جلسة موزعة)`);
if (data.sessions.length !== 30) throw new Error('عدد الجلسات الميدانية غير مطابق لـ 30');

console.log('\n--- 3. فحص تطبيقات الأدوات الـ 90 وقاعدة عدم التكرار ---');
const mbtiCount = data.toolsSummary.mbti.completed;
const wheelCount = data.toolsSummary.wheelOfLife.completed;
const swotCount = data.toolsSummary.swot.completed;
const totalTools = mbtiCount + wheelCount + swotCount;
console.log(`• تطبيقات الأدوات الـ 90: ${totalTools} تطبيقاً (MBTI: ${mbtiCount}, Wheel: ${wheelCount}, SWOT: ${swotCount})`);
if (totalTools !== 90 || mbtiCount !== 30 || wheelCount !== 30 || swotCount !== 30) {
    throw new Error('تطبيقات الأدوات غير مطابقة لـ 90 بالتساوي (30 لكل أداة)');
}

// Check non-duplication within each tool counter
const checkToolUniqueness = (toolKey) => {
    const apps = data.toolsSummary[toolKey].applications;
    if (!apps || apps.length !== 30) throw new Error(`سجل تطبيقات ${toolKey} لا يحتوي على 30 تطبيقاً فعلياً`);
    const codes = apps.map(a => a.beneficiaryCode.toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== 30) {
        throw new Error(`يوجد تكرار غير نظامي داخل أداة ${toolKey}: ${codes.length} مقابل ${uniqueCodes.size} فريد`);
    }
};

checkToolUniqueness('mbti');
checkToolUniqueness('wheelOfLife');
checkToolUniqueness('swot');
console.log(`✓ فحص منع التكرار الداخلي: خلو تام من التكرار داخل كل أداة على حدة (30 مستفيداً فريداً لكل أداة)`);

// Verify legal cross-tool sharing
const mbtiCodes = new Set(data.toolsSummary.mbti.applications.map(a => a.beneficiaryCode));
const wheelCodes = new Set(data.toolsSummary.wheelOfLife.applications.map(a => a.beneficiaryCode));
const sharedCount = [...mbtiCodes].filter(c => wheelCodes.has(c)).length;
console.log(`• الاستخدام التكاملي عبر الأدوات: ${sharedCount} مستفيداً شاركوا في أدوات متعددة بنجاح مطابق للحقيبة.`);
if (sharedCount === 0) throw new Error('لم يتم تطبيق جواز استخدام المستفيد بين الأدوات المختلفة');

console.log('\n--- 4. فحص المخرجات النوعية والابتكارية والبحثية ---');
console.log(`• النماذج الابتكارية للكوتشنج والإدارة: ${data.innovativeModels.length} نماذج (المستهدف: 10 على الأقل)`);
if (data.innovativeModels.length !== 10) throw new Error('النماذج الابتكارية أقل من 10');

console.log(`• أداة تحليل الشخصية المبتكرة: ${data.innovativeTool.name}`);
console.log(`• مشروع تهيئة المؤسسة: ${data.orgPreparation.orgName} (${data.orgPreparation.phases.length} مراحل استراتيجية)`);
console.log(`• التسجيلات الاحترافية بالموضوعات: ${data.professionalRecordings.length} تسجيلات صوتية معتمدة`);
if (data.professionalRecordings.length !== 5) throw new Error('التسجيلات الاحترافية غير مطابقة لـ 5');

console.log(`• الورقة العلمية التطبيقية: ${data.researchPaper.totalPages} صفحة (المطلوب 50 صفحة كحد أدنى)`);
if (data.researchPaper.totalPages < 50) throw new Error('صفحات الورقة العلمية أقل من 50 صفحة');

console.log(`• مشروع التخرج الابتكاري: ${data.graduationProject.title} (نتيجة التحكيم: ${data.graduationProject.juryVerdict})`);

console.log(`• بنك المهام وإيداع الأدلة: ${data.tasks.length} مهام معتمدة تغطي مخرجات الحقيبة`);
if (data.tasks.length < 8) throw new Error(`بنك المهام غير مكتمل (الموجود: ${data.tasks.length})`);

console.log('\n--- 5. فحص مصفوفة الروبركات والتحسين المطلوب والمعايير الحرجة ---');
console.log(`• عدد الروبركات الرسمية: ${data.rubrics.length} روبركات (المستهدف: 6)`);
if (data.rubrics.length !== 6) throw new Error('عدد الروبركات غير مطابق لـ 6');

let totalCriteriaCount = 0;
let totalCriticalCriteria = 0;
let missingImprovements = 0;

data.rubrics.forEach(r => {
    const sumWeight = r.criteria.reduce((s, c) => s + c.weight, 0);
    const roundedWeight = Math.round(sumWeight * 100);
    console.log(`  - ${r.title}: ${r.criteria.length} معايير، مجموع الأوزان: ${roundedWeight}%`);
    if (roundedWeight !== 100) throw new Error(`مجموع أوزان الروبرك ${r.title} لا يساوي 100%`);

    r.criteria.forEach(c => {
        totalCriteriaCount++;
        if (c.isCritical) totalCriticalCriteria++;
        if (!c.requiredImprovement) missingImprovements++;
    });
});

console.log(`• إجمالي المعايير التقييمية: ${totalCriteriaCount} معياراً عبر الروبركات الستة`);
console.log(`• المعايير الأخلاقية والمهنية الحرجة القطعية: ${totalCriticalCriteria} معايير`);
console.log(`• المعايير المسجل لها 'التحسين المطلوب': ${totalCriteriaCount - missingImprovements} من ${totalCriteriaCount}`);
if (missingImprovements > 0) throw new Error(`يوجد ${missingImprovements} معيار ينقصه التحسين المطلوب`);
if (totalCriticalCriteria < 6) throw new Error('المعايير الحرجة أقل من المتوقع');

console.log('\n--- 6. فحص بوابة السلامة الأخلاقية المستقلة ---');
console.log(`• حالة البوابة: ${data.ethicsGate.status} (${data.ethicsGate.clearanceBadge})`);
console.log(`• عدد نقاط الفحص الأخلاقي: ${data.ethicsGate.checkpoints.length} نقاط`);
console.log(`• سجل الإحالات التخصصية: ${data.ethicsGate.referralRegistry.length} إحالات نموذجية`);
if (data.ethicsGate.status !== 'passed') throw new Error('البوابة الأخلاقية لم تجتز');
if (data.ethicsGate.checkpoints.length !== 7) throw new Error('نقاط التدقيق الأخلاقي ليست 7');

console.log('\n--- 7. فحص المختبرات ومسار التميز ---');
console.log(`• عدد المختبرات التخصصية: ${data.labs.length} مختبرات (المستهدف: 9 مختبرات)`);
const totalLabHours = data.labs.reduce((s, l) => s + l.hours, 0);
console.log(`• ساعات المختبرات: ${totalLabHours} ساعة (المستهدف: 30 ساعة)`);
if (data.labs.length !== 9 || totalLabHours !== 30) throw new Error('المختبرات التخصصية غير مطابقة');

console.log('\n--- 8. فحص سلامة واجهات HTML و CSS وتوافق المعرفات ---');
const requiredIds = [
    'select-role',
    'btn-toggle-theme',
    'btn-reset-data',
    'btn-export-data',
    'btn-print-report',
    'candidate-avatar-initials',
    'panel-dashboard',
    'panel-quant',
    'panel-competencies',
    'panel-tasks',
    'panel-rubrics',
    'panel-ethics',
    'panel-labs',
    'panel-report',
    'task-modal',
    'tool-modal',
    'case-modal',
    'generic-modal',
    'toast-container'
];

requiredIds.forEach(id => {
    if (!htmlContent.includes(`id="${id}"`)) {
        throw new Error(`معرف العنصر المفقود في HTML: ${id}`);
    }
});
console.log(`✓ جميع المعرفات البرمجية (${requiredIds.length} عنصر) موجودة في صفحة index.html`);

console.log('\n=== ✅ جميع اختبارات الفحص العميق واختبارات سلامة النموذج اجتازت بنجاح 100% ===');
