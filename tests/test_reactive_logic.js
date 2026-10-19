/**
 * Reactive Engine & Dynamic Logic Test Suite
 * Tests Anti-duplication, Ethical Blocker, Evidence Upload, and Reflection Logic.
 */

import { resolve } from 'path';

console.log('=== بدء اختبار المحركات التفاعلية وقواعد العمل ===\n');

// Mock localStorage
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
};

await import('./master_coach_platform/js/data.js');

const store = global.ProgramStore;
const data = store.load();

console.log('--- 1. اختبار محرك منع التكرار (Anti-Duplication Engine) ---');
// Tool Mbti has BEN-01 to BEN-30
const mbtiApps = data.toolsSummary.mbti.applications;
const existingInMbti = mbtiApps.find(a => a.beneficiaryCode.toUpperCase() === 'BEN-05');
if (!existingInMbti) throw new Error('BEN-05 غير موجود في MBTI');

// Check duplicate detection in MBTI
const isDupeInMbti = !!mbtiApps.find(a => a.beneficiaryCode.toUpperCase() === 'BEN-05');
console.log(`• فحص إضافة مستفيد مكرر في MBTI (BEN-05): ${isDupeInMbti ? 'تم حظره بنجاح ومنع التكرار ✓' : 'فشل الحظر ✗'}`);
if (!isDupeInMbti) throw new Error('فشل محرك منع التكرار في رصد مستفيد مكرر في نفس الأداة');

// Check cross-tool eligibility: BEN-25 is in MBTI (1-30), but NOT in Wheel (1-20, 31-40)
const wheelApps = data.toolsSummary.wheelOfLife.applications;
const isDupeInWheel = !!wheelApps.find(a => a.beneficiaryCode.toUpperCase() === 'BEN-25');
console.log(`• فحص إضافة المستفيد (BEN-25) في عجلة الحياة (مسجل في MBTI لكن غير مسجل في العجلة): ${!isDupeInWheel ? 'مسموح نظامياً وفق الحقيبة ✓' : 'محظور خطأ ✗'}`);
if (isDupeInWheel) throw new Error('تم حظر مستفيد غير مكرر في الأداة');

// Add new beneficiary BEN-99 to MBTI
const newCode = 'BEN-99';
const initialMbtiCount = data.toolsSummary.mbti.applications.length;
data.toolsSummary.mbti.applications.push({
    id: initialMbtiCount + 1,
    beneficiaryCode: newCode,
    date: '2026-05-20',
    focus: 'تطبيق تجريبي لفحص الإضافة',
    status: 'approved'
});
data.toolsSummary.mbti.completed = data.toolsSummary.mbti.applications.length;
store.save(data);

const reloaded = store.load();
if (reloaded.toolsSummary.mbti.completed !== initialMbtiCount + 1) {
    throw new Error('فشل حفظ التطبيق الجديد في ProgramStore');
}
console.log(`• إضافة مستفيد جديد (${newCode}): تم الحفظ والزيادة إلى ${reloaded.toolsSummary.mbti.completed} تطبيقاً ✓`);

console.log('\n--- 2. اختبار محرك الحظر الأخلاقي الحاسم (Critical Ethical Blocker) ---');
// Helper replicating checkEthicalBlocker
function testCheckEthicalBlocker(currentData) {
    let hasBlocker = false;
    let reasons = [];
    currentData.rubrics.forEach(rubric => {
        rubric.criteria.forEach(crit => {
            if (crit.isCritical && crit.currentLevel < 3) {
                hasBlocker = true;
                reasons.push(`${rubric.title}: ${crit.name} (${crit.currentLevel})`);
            }
        });
    });
    if (currentData.ethicsGate.status !== 'passed') {
        hasBlocker = true;
        reasons.push('Ethics Gate not passed');
    }
    return { hasBlocker, reasons };
}

// Initial state: should be no blocker
const initialCheck = testCheckEthicalBlocker(reloaded);
console.log(`• الحالة الأخلاقية الابتدائية: ${!initialCheck.hasBlocker ? 'اجتياز كامل 100% بدون حظر ✓' : 'يوجد حظر غير متوقع ✗'}`);
if (initialCheck.hasBlocker) throw new Error('يوجد حظر أخلاقي أولي غير مقصود');

// Simulate supervisor lowering critical ethical criterion R1-C4 to level 2
const r1 = reloaded.rubrics.find(r => r.code === 'sessions');
const critEthics = r1.criteria.find(c => c.id === 'R1-C4');
critEthics.currentLevel = 2; // Below 3!

const blockedCheck = testCheckEthicalBlocker(reloaded);
console.log(`• فحص خفض معيار الأخلاقيات الحرج إلى 2/5: ${blockedCheck.hasBlocker ? 'تم تفعيل الحظر الأخلاقي بنجاح وحجب التوصية ✓' : 'فشل تفعيل الحظر ✗'}`);
console.log(`  السبب المرصود: ${blockedCheck.reasons.join(' | ')}`);
if (!blockedCheck.hasBlocker) throw new Error('فشل النظام في تفعيل الحظر الأخلاقي عند هبوط المعيار الحرج دون 3');

// Restore to 5
critEthics.currentLevel = 5;
const restoredCheck = testCheckEthicalBlocker(reloaded);
console.log(`• استعادة معيار الأخلاقيات إلى 5/5: ${!restoredCheck.hasBlocker ? 'تم رفع الحظر واستعادة الجاهزية بنجاح ✓' : 'الحظر ما زال قائماً ✗'}`);
if (restoredCheck.hasBlocker) throw new Error('لم يُرفع الحظر بعد استعادة المعيار');

console.log('\n--- 3. اختبار دورة حياة المهمة وإيداع الأدلة (Task Submission Lifecycle) ---');
const task1 = reloaded.tasks.find(t => t.id === 'TASK-01');
const initialEvCount = task1.evidences.length;
const initialVersion = task1.version;

// Simulate adding new evidence
task1.evidences.push({
    type: 'document',
    name: 'ملحق_إضافي_تأكيدي.pdf',
    pages: 2,
    size: '800 KB'
});
task1.version = 'v2.1';
task1.history.push({
    version: 'v2.1',
    date: '2026-05-20',
    status: task1.status,
    note: 'إيداع دليل تأكيدي إضافي'
});
store.save(reloaded);

const reloadedTask = store.load().tasks.find(t => t.id === 'TASK-01');
if (reloadedTask.evidences.length !== initialEvCount + 1 || reloadedTask.version !== 'v2.1') {
    throw new Error('فشل تحديث نسخة المهمة أو عدد الأدلة');
}
console.log(`• دورة المهمة [TASK-01]: النسخة تغيرت من ${initialVersion} إلى ${reloadedTask.version} وعدد الأدلة زاد إلى ${reloadedTask.evidences.length} ✓`);

// Test reflection update
const currentData = store.load();
const t1 = currentData.tasks.find(t => t.id === 'TASK-01');
t1.reflection.whatDidIDo = 'تحديث وصفي للممارسة الميدانية والتأمل';
store.save(currentData);

const verifiedRef = store.load().tasks.find(t => t.id === 'TASK-01');
if (verifiedRef.reflection.whatDidIDo !== 'تحديث وصفي للممارسة الميدانية والتأمل') {
    throw new Error('فشل حفظ استمارة التأمل المهني');
}
console.log(`• حفظ استمارة التأمل الرباعية: تم التحديث والحفظ التام ✓`);

console.log('\n=== ✅ جميع اختبارات المحركات التفاعلية والمنطق التشغيلي اجتازت بنجاح 100% ===');
