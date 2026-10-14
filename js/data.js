/**
 * Tamkeen Al-Roaya Master Coach Qualification Program v3.0
 * Core Data Store & Domain Model
 * Based on Curriculum Specification 2026 - Master Coach Abdelkarim Al-Khelaifi
 */

const DEFAULT_PROGRAM_DATA = {
    metadata: {
        programTitle: "برنامج إعداد وتأهيل الماستر كوتش",
        version: "الإصدار 3.0 (النسخة التطويرية 2026)",
        provider: "شركة تمكين الرؤية للاستشارات المهنية",
        founder: "الماستر كوتش عبدالكريم الخليفي",
        platformUrl: "cyce52.com",
        durationWeeks: "20 - 24 أسبوعاً",
        totalTargetHours: 240,
        candidate: {
            id: "MC-2026-084",
            name: "كوتش أحمد بن صالح الشمري",
            title: "كوتش تنفيذي معتمد (PCC)",
            avatar: "assets/images/logo.png",
            email: "candidate@cyce52.com",
            phone: "+966 50 123 4567",
            enrollmentDate: "2026-01-15",
            supervisorName: "الماستر كوتش عبدالكريم الخليفي",
            committeeChair: "د. عبدالكريم الخليفي",
            currentStanding: "مؤهل للمناقشة الختامية مع استكمال الأدلة المتبقية"
        },
        prerequisites: {
            status: "verified",
            title: "مراجعة مخرجات CPC وPCC أو ما يعادلهما",
            evidence: "سجل التدقيق المهني لاعتماد PCC والاطلاع الموثق على التسجيلات السابقة",
            auditDate: "2026-01-18",
            auditor: "الماستر كوتش عبدالكريم الخليفي"
        },
        fieldFollowup: {
            durationMonths: 3,
            startDate: "2026-02-01",
            endDate: "2026-04-30",
            status: "completed",
            evidence: "سجل الممارسة الميدانية والمتابعة الزمنية المستمرة لمدة 3 أشهر كاملة"
        },
        mediaDeclaration: {
            status: "completed",
            title: "المواد الصوتية والمرئية المقررة بالحقيبة",
            details: "تم الاستماع والمشاهدة لكافة المحاضرات والمواد المسجلة المعتمدة",
            statementSigned: true,
            signDate: "2026-05-02"
        },
        periodicAssessments: {
            status: "passed",
            title: "التقييمات النظرية والتطبيقية والمرحلية",
            averageScore: 96.5,
            verdict: "اجتياز بتفوق لكافة الاختبارات المرحلية ومحطات التحقق المعرفي"
        }
    },

    // 8 Domains + Supervision
    domains: [
        {
            id: "D1",
            code: "core_prof",
            title: "الكفايات المهنية الأساسية",
            count: 6,
            icon: "compass",
            color: "#1D4ED8",
            bgColor: "rgba(29, 78, 216, 0.1)",
            description: "ممارسة الكوتشنج الاحترافي وفق المعايير الأخلاقية، إدارة التعاقد، الحضور والإنصات العميق، والتغذية الراجعة وإنهاء العلاقة."
        },
        {
            id: "D2",
            code: "analytical",
            title: "الكفايات التحليلية",
            count: 5,
            icon: "microscope",
            color: "#0284C7",
            bgColor: "rgba(2, 132, 199, 0.1)",
            description: "التحليل المنهجي للحالات، تشخيص الفرص والتحديات، التفريق بين الأعراض والأسباب، واختيار النموذج الملائم وتبرير القرارات."
        },
        {
            id: "D3",
            code: "applied",
            title: "الكفايات التطبيقية",
            count: 5,
            icon: "tools",
            color: "#059669",
            bgColor: "rgba(5, 150, 105, 0.1)",
            description: "تصميم التدخلات، وتوظيف النماذج، وإدارة الحالات المركبة، وتكييف الأدوات لاحتياجات المستفيد وتوثيق الممارسة الميدانية."
        },
        {
            id: "D4",
            code: "leadership",
            title: "كفايات التفكير والقيادة المهنية",
            count: 6,
            icon: "brain",
            color: "#7C3AED",
            bgColor: "rgba(124, 58, 237, 0.1)",
            description: "التفكير النقدي، المنظومي، والتأملي، الإشراف الذاتي، قيادة المبادرات التنموية، وإدارة فرق العمل التطويرية."
        },
        {
            id: "D5",
            code: "research",
            title: "الكفايات البحثية",
            count: 5,
            icon: "book-open",
            color: "#D97706",
            bgColor: "rgba(217, 119, 6, 0.1)",
            description: "قراءة الأدبيات، وتوظيف نتائج البحوث في الممارسة، وإعداد الورقة العلمية وتوثيق APA7، وعرض النتائج في محفل معتمد."
        },
        {
            id: "D6",
            code: "innovation",
            title: "كفايات الابتكار",
            count: 5,
            icon: "lightbulb",
            color: "#EA580C",
            bgColor: "rgba(234, 88, 12, 0.1)",
            description: "تطوير أدوات جديدة، وتحسين النماذج، وتصميم حلول للحالات المعقدة، ومشروع تخرج ابتكاري قابل للتطبيق وقياس أثره."
        },
        {
            id: "D7",
            code: "digital_ai",
            title: "الكفايات الرقمية والذكاء الاصطناعي",
            count: 4,
            icon: "cpu",
            color: "#06B6D4",
            bgColor: "rgba(6, 182, 212, 0.1)",
            description: "التوظيف المسؤول للذكاء الاصطناعي مع التحقق البشري، والتحليل الرقمي للبيانات منزوعة الهوية، وضمان أمن وسرية المعلومات."
        },
        {
            id: "D8",
            code: "ethical",
            title: "الكفايات الأخلاقية وضوابط الممارسة",
            count: 7,
            icon: "shield-check",
            color: "#DC2626",
            bgColor: "rgba(220, 38, 38, 0.1)",
            isIndependentGate: true,
            description: "بوابة عبور حاسمة ومستقلة: الكرامة، السرية، حدود الاختصاص، تجنب تضارب المصالح، الميثاق الأخلاقي، وإحالة الحالات المتجاوزة."
        },
        {
            id: "D9",
            code: "supervision",
            title: "كفاية الإشراف على الممارسين",
            count: 1,
            icon: "user-check",
            color: "#4F46E5",
            bgColor: "rgba(79, 70, 229, 0.1)",
            description: "أداء دور المشرف: ملاحظة ممارسة الأقران، وتحليل الأداء، وتقديم تغذية راجعة تطويرية رصينة ووضع خطط التحسين."
        }
    ],

    // 43 Competencies + 1 Supervision = 44 total items
    competencies: [
        // D1: Core Professional (6)
        {
            id: "C101",
            domainId: "D1",
            code: "D1-1",
            title: "ممارسة الكوتشنج وفق المعايير المهنية والأخلاقية",
            evaluationMethod: "تسجيل جلسة كاملة + روبرك الجلسات المهنية (معيار الأخلاقيات)",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["تسجيل الجلسة #03", "عقد الكوتشنج المعتمد لـ BEN-04", "تقرير الجلسة #07", "استمارة التأمل المهني #03"],
            description: "الالتزام الصارم بالسلوك المهني وتحديد الهوية المهنية للكوتش وتطبيق ميثاق الشرف الأخلاقي."
        },
        {
            id: "C102",
            domainId: "D1",
            code: "D1-2",
            title: "بناء العلاقة وإدارة التعاقد",
            evaluationMethod: "وثائق التعاقد المكتوبة + تحليل الاتفاقيات في الحالات الميدانية",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["عقود التعاقد الثلاثية للمؤسسة A", "اتفاقية السرية BEN-12", "ملف تأسيس التحالف الكوتشنجي"],
            description: "تأسيس الشراكة والوضوح التام في الأهداف والمخرجات والحدود والمسؤوليات المتبادلة بين الكوتش والمستفيد."
        },
        {
            id: "C103",
            domainId: "D1",
            code: "D1-3",
            title: "إدارة الجلسات وضبط مسار الحوار",
            evaluationMethod: "تسجيلات الجلسات وتقارير المتابعة + روبرك الجلسات المهنية",
            status: "mastered",
            score: 4,
            evidenceCount: 5,
            evidenceList: ["تسجيل الجلسة #11", "تسجيل الجلسة #18", "تقارير الجلسات الميدانية 1-10"],
            description: "الحفاظ على تركيز الجلسة نحو المخرج المحدد وإدارة الوقت وتيسير التدفق السلس دون توجيه أو فرض حلول."
        },
        {
            id: "C104",
            domainId: "D1",
            code: "D1-4",
            title: "الاستماع العميق والحضور والتساؤل الفعال",
            evaluationMethod: "تحليل التسجيل الصوتي مع علامات الطابع الزمني للأسئلة والاستماع",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["تسجيل الجلسة #05 مع الطوابع الزمنية 04:12 و 18:30", "تأمل حول الصمت المهني #02"],
            description: "الاستماع لما وراء الكلمات ونبرات الصوت واستخدام الأسئلة المفتوحة والمحفزة للاستبصار وتوليد الوعي."
        },
        {
            id: "C105",
            domainId: "D1",
            code: "D1-5",
            title: "تقديم التغذية الراجعة النوعية",
            evaluationMethod: "ملاحظات التغذية الراجعة المكتوبة والمقدمة للمستفيدين والأقران",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["تقرير تغذية راجعة للحالة BEN-08", "سجل التغذية الراجعة لجلسة الأقران في مختبر 4"],
            description: "صياغة تغذية راجعة وصفية غير تقييمية تركز على السلوك والمخرجات وتدعم النمو والوعي الذاتي."
        },
        {
            id: "C106",
            domainId: "D1",
            code: "D1-6",
            title: "إنهاء العلاقة وفق الضوابط الأخلاقية",
            evaluationMethod: "تقارير إغلاق الحالات + استمارات قياس الأثر واستطلاع الرأي",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["محضر إغلاق الحالة BEN-01", "تقرير التقييم البعدي للحالة BEN-05", "نموذج خطة الاستدامة الذاتية"],
            description: "تيسير ختام تمكيني يضمن استقلالية المستفيد واحتفاله بالإنجازات ووضع خطة الاستدامة المستقبلية."
        },

        // D2: Analytical (5)
        {
            id: "C201",
            domainId: "D2",
            code: "D2-1",
            title: "تحليل الحالات بصورة منهجية",
            evaluationMethod: "تقارير تحليل الحالات المستندة إلى الوقائع ومصفوفات التشخيص",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["تقرير التحليل المنهجي للحالة المركبة #02", "خريطة تفكيك الأنماط السلوكية BEN-14"],
            description: "تفكيك عناصر المشهد بأسلوب موضوعي يفصل الوقائع الصريحة عن التأويلات والافتراضات الشخصية."
        },
        {
            id: "C202",
            domainId: "D2",
            code: "D2-2",
            title: "تشخيص التحديات والفرص",
            evaluationMethod: "بطاقة تشخيص الحالة المكملة ومناقشة شفهية مع المشرف",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["مصفوفة تشخيص التحديات والفرص لـ 3 حالات قيادية", "سجل مناقشة الحالة مع المشرف #03"],
            description: "رصد نقاط القوة الكامنة والفرص الاستراتيجية للتطوير بجانب التحديات الهيكلية أو النفسية المصاحبة."
        },
        {
            id: "C203",
            domainId: "D2",
            code: "D2-3",
            title: "التمييز الدقيق بين الأعراض والأسباب الجذرية",
            evaluationMethod: "تطبيق تقنيات مثل 5 Whys وتحليل باريتو ومخططات السبب والأثر",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["تطبيق منهجية 5 Whys في الحالة BEN-09", "مخطط هيكل السمكة لعوائق الإنتاجية"],
            description: "العمق التحليلي في تجاوز المظاهر السطحية والوصول إلى المحركات الذهنية والمعتقدات المعيقة."
        },
        {
            id: "C204",
            domainId: "D2",
            code: "D2-4",
            title: "اختيار النموذج المناسب وتبريره",
            evaluationMethod: "مذكرات تبرير اختيار النماذج (3 مبررات على الأقل لكل اختيار)",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["مذكرة المفاضلة بين GROW و CLEAR للحالة BEN-03", "وثيقة تبرير نموذج عمر قرافي للمسارات"],
            description: "القدرة على المواءمة الدقيقة بين طبيعة المستفيد وأهدافه والنموذج الكوتشنجي الأنسب منطقياً وعلمياً."
        },
        {
            id: "C205",
            domainId: "D2",
            code: "D2-5",
            title: "تقييم البدائل واتخاذ القرار المهني",
            evaluationMethod: "سجلات قرارات التدخل ودفاع المقابلة الختامية",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["مصفوفة تقييم بدائل التدخل في الحالة BEN-17", "سجل قرارات تعديل خطة الكوتشنج"],
            description: "الموازنة العقلانية بين الخيارات المتاحة، وتقدير المخاطر والفرص، وحسم القرار المهني المبرر."
        },

        // D3: Applied (5)
        {
            id: "C301",
            domainId: "D3",
            code: "D3-1",
            title: "تصميم التدخلات الكوتشنجية المتكاملة",
            evaluationMethod: "خطط التدخل الشاملة للأهداف قصيرة وطويلة الأجل",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["خطة تدخل شاملة للحالة التنفيذية BEN-02", "برنامج تدخل كوتشنجي للمدراء التنفيذيين"],
            description: "صياغة خارطة طريق إجرائية مرنة تترجم الأهداف الاستبصارية إلى خطوات فعلية قابلة للتنفيذ والقياس."
        },
        {
            id: "C302",
            domainId: "D3",
            code: "D3-2",
            title: "توظيف النماذج بكفاءة عالية",
            evaluationMethod: "سجلات تطبيق نماذج GROW, OSKAR, CLEAR, Cognitive Coaching",
            status: "mastered",
            score: 5,
            evidenceCount: 5,
            evidenceList: ["سجل تطبيق نموذج CLEAR في 8 جلسات", "سجل تطبيق نموذج التناغم القيادي المبتكر"],
            description: "التطبيق السلس للمراحل والآليات دون جمود، والانتقال الواعي بين مراحل النموذج وفق نبض المستفيد."
        },
        {
            id: "C303",
            domainId: "D3",
            code: "D3-3",
            title: "إدارة الحالات المركبة والمعقدة",
            evaluationMethod: "ملفات دراسة حالات معقدة تتقاطع فيها أبعاد شخصية ووظيفية",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["ملف الحالة المركبة BEN-15 (صراع شراكة + احتراق وظيفي)", "تقارير إدارة الأزمات الكوتشنجية"],
            description: "التعامل بكفاءة مع التداخلات المعقدة والمتعددة الأطراف والضغوط العالية مع الحفاظ على التوازن النفسي."
        },
        {
            id: "C304",
            domainId: "D3",
            code: "D3-4",
            title: "تكييف الأدوات لاحتياجات المستفيد",
            evaluationMethod: "نماذج معدلة من عجلة الحياة وSWOT لتناسب السياق الثقافي",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["عجلة الحياة القيادية المكيفة للسياق الخليجي", "SWOT الشخصي المعدل للمديرات التنفيذيات"],
            description: "المرونة المنهجية في إعادة هندسة الأداة لتلائم الخصوصية الفردية والمؤسسية دون الإخلال بأسسها."
        },
        {
            id: "C305",
            domainId: "D3",
            code: "D3-5",
            title: "توثيق الممارسة الميدانية باحترافية",
            evaluationMethod: "سجل الممارسة الميدانية الكامل (30 جلسة + 20 حالة)",
            status: "mastered",
            score: 5,
            evidenceCount: 5,
            evidenceList: ["ملف الأرشيف الميداني المتكامل 2026", "سجلات توثيق الـ 30 جلسة الرسمية"],
            description: "أرشفة شاملة ومنظمة لكافة الجلسات والبيانات والملاحظات والاتفاقيات وفق أعلى معايير الحوكمة."
        },

        // D4: Cognitive & Leadership (6)
        {
            id: "C401",
            domainId: "D4",
            code: "D4-1",
            title: "التفكير النقدي وتمحيص الافتراضات",
            evaluationMethod: "التحليل النقدي لنماذج الكوتشنج العالمية في مختبر التفكير",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["ورقة التحليل النقدي لنموذج GROW وحدود تطبيقه", "مناقشة الافتراضات المضمرة في المقابلة"],
            description: "القدرة على فحص المسلمات، وتحدي التحيزات المعرفية، ومساءلة النماذج التقليدية بموضوعية."
        },
        {
            id: "C402",
            domainId: "D4",
            code: "D4-2",
            title: "التفكير المنظومي ورؤية الكل المترابط",
            evaluationMethod: "خريطة منظومية لحالة مؤسسية تبين حلقات التأثير والارتجاع",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["الخريطة المنظومية لبيئة الكوتشنج المؤسسي لشركة تمكين", "تحليل ديناميكيات المنظومة لـ BEN-11"],
            description: "إدراك العلاقات المتشابكة والتأثيرات المتبادلة والنتائج غير المقصودة في بيئة المستفيد الشاملة."
        },
        {
            id: "C403",
            domainId: "D4",
            code: "D4-3",
            title: "التفكير التأملي المستمر والواعي",
            evaluationMethod: "استمارات التأمل الرباعية لجميع الجلسات والتطبيقات الميدانية",
            status: "mastered",
            score: 5,
            evidenceCount: 6,
            evidenceList: ["سجل التأملات الرباعية الـ 30 الكامل", "مذكرات التطوير الذاتي الأسبوعية"],
            description: "التأمل الدوري العميق في الذات والممارسة واستخلاص الدروس المستفادة وتحويلها إلى سلوك مهني متجدد."
        },
        {
            id: "C404",
            domainId: "D4",
            code: "D4-4",
            title: "الإشراف الذاتي واليقظة الذهنية",
            evaluationMethod: "سجل الإشراف الذاتي ودلائل إدارة المشاعر ونقل العواطف",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["سجل الإشراف الذاتي لمواجهة الإسقاط العاطفي", "استراتيجيات الاستشفاء والتفريغ بعد الجلسات"],
            description: "رصد المشاعر الذاتية أثناء الجلسة، والتعامل مع التحويل والتحويل المقابل، وضمان الصفاء الذهني."
        },
        {
            id: "C405",
            domainId: "D4",
            code: "D4-5",
            title: "قيادة المبادرات وتطوير المجتمع المهني",
            evaluationMethod: "خطة وتوثيق مبادرة كوتشنج مجتمعية أو مهنية معتمدة",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["وثيقة مبادرة 'كوتشنج القادة الصاعدين'", "تقرير نتائج ورشة عمل الكوتشنج المنظومي"],
            description: "أخذ زمام المبادرة في نشر ثقافة الكوتشنج الأصيل والمساهمة في بناء بيئة مهنية متكاملة ومستدامة."
        },
        {
            id: "C406",
            domainId: "D4",
            code: "D4-6",
            title: "إدارة فرق العمل التطويرية والتنسيق المشترك",
            evaluationMethod: "سجلات قيادة جلسات مختبرات المحاكاة وتوزيع الأدوار",
            status: "mastered",
            score: 4,
            evidenceCount: 2,
            evidenceList: ["تقرير قيادة فريق مختبر الذكاء الاصطناعي #7", "مصفوفة توزيع المهام في مشروع التخرج"],
            description: "بناء التوافق وتوجيه الطاقات الجماعية وإدارة الخلافات التطويرية لتحقيق مخرجات فائقة الجودة."
        },

        // D5: Research (5)
        {
            id: "C501",
            domainId: "D5",
            code: "D5-1",
            title: "قراءة وتحليل الدراسات والأدبيات المحكمة",
            evaluationMethod: "المراجعة المنهجية لـ 25 دراسة في الورقة العلمية التطبيقية",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["الفصل الثاني من الورقة العلمية (الأدبيات)", "جدول تلخيص الدراسات المقارنة 2020-2026"],
            description: "استيعاب ونقد الأبحاث الحديثة في الكوتشنج واستخلاص الاتجاهات العالمية المؤثرة."
        },
        {
            id: "C502",
            domainId: "D5",
            code: "D5-2",
            title: "توظيف نتائج البحوث في الممارسة الميدانية",
            evaluationMethod: "توثيق استناد القرارات الكوتشنجية إلى براهين علمية مسندة",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["مذكرة تطبيق نتائج دراسات أثر الأسئلة القوية في الجلسات", "تقرير تفعيل نظرية النضج القيادي"],
            description: "جسر الهوة بين النظرية والتطبيق عبر ممارسة قائمة على الأدلة والبراهين التجريبية."
        },
        {
            id: "C503",
            domainId: "D5",
            code: "D5-3",
            title: "إعداد الورقة العلمية التطبيقية (50+ صفحة)",
            evaluationMethod: "النسخة النهائية من الورقة العلمية + روبرك الورقة العلمية",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["الورقة العلمية الكاملة (58 صفحة) بصيغة PDF", "مخطط البحث المعتمد", "تقرير التحكيم المبدئي"],
            description: "بحث رصين ومفصل لا يقل عن 50 صفحة وفق قالب البرنامج يحل إشكالية واقعية في الممارسة."
        },
        {
            id: "C504",
            domainId: "D5",
            code: "D5-4",
            title: "توثيق المراجع بنظام APA الإصدار السابع",
            evaluationMethod: "فحص قائمة المراجع في الورقة العلمية وبطاقات النماذج",
            status: "mastered",
            score: 5,
            evidenceCount: 2,
            evidenceList: ["قائمة مراجع الورقة العلمية (42 مرجعاً موثقاً)", "تقرير التدقيق المرجعي"],
            description: "الدقة الصارمة في الاستشهاد والتوثيق الببليوجرافي للمراجع العربية والأجنبية بنظام APA 7."
        },
        {
            id: "C505",
            domainId: "D5",
            code: "D5-5",
            title: "عرض نتائج البحث في فعالية علمية معتمدة",
            evaluationMethod: "دليل العرض المرئي وشهادة/محضر المشاركة في الملتقى",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["تسجيل العرض المرئي في ملتقى تمكين 2026", "العرض التقديمي للورقة (Slide Deck)", "شهادة تقديم العرض"],
            description: "تقديم دفاع علمي وإلقاء مؤثر يبرز القيمة المضافة للبحث ويجيب عن تساؤلات المتخصصين."
        },

        // D6: Innovation (5)
        {
            id: "C601",
            domainId: "D6",
            code: "D6-1",
            title: "تطوير أدوات كوتشنج جديدة",
            evaluationMethod: "بطاقات الأدوات الابتكارية المعتمدة واختبار قابليتها",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["بطاقة أداة 'بوصلة النضج التنفيذي LMMI'", "دليل استخدام الأداة والتجربة الميدانية"],
            description: "ابتكار مقاييس ونماذج عمل جديدة تسد ثغرة في السوق العربي للكوتشنج."
        },
        {
            id: "C602",
            domainId: "D6",
            code: "D6-2",
            title: "تحسين وتطوير النماذج القائمة",
            evaluationMethod: "سجل النماذج الابتكارية العشرة (10 نماذج مطورة وموثقة)",
            status: "mastered",
            score: 5,
            evidenceCount: 10,
            evidenceList: ["سجل النماذج الابتكارية العشرة المعتمدة", "دراسة مقارنة للمدخل التطويري لكل نموذج"],
            description: "إدخال تحسينات نوعية على نماذج شهيرة مثل SWOT وعجلة الحياة لرفع دقتها وعمقها."
        },
        {
            id: "C603",
            domainId: "D6",
            code: "D6-3",
            title: "ابتكار حلول منهجية للحالات المعقدة",
            evaluationMethod: "دراسات التدخل الابتكاري في الحالات المقاومة للتغيير",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["بروتوكول تفكيك الجمود الذهني للحالة BEN-19", "مخطط الحلول غير التقليدية للأزمات"],
            description: "صياغة مداخل غير مألوفة مبنية على قواعد الكوتشنج لفك عقد الجمود في الحالات الصعبة."
        },
        {
            id: "C604",
            domainId: "D6",
            code: "D6-4",
            title: "تصميم مشروع ابتكاري قابل للتطبيق الميداني",
            evaluationMethod: "وثيقة مشروع التخرج الابتكاري وخطة التنفيذ والجدوى",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["دوسييه مشروع التخرج 'منظومة تمكين للذكاء الكوتشنجي'", "خطة الاستدامة والجدوى الاقتصادية"],
            description: "تطوير أحد المخرجات إلى مشروع تطبيقي متكامل له نموذج عمل وجدوى واضحة."
        },
        {
            id: "C605",
            domainId: "D6",
            code: "D6-5",
            title: "تقييم وقياس أثر الابتكار",
            evaluationMethod: "مؤشرات قياس الأثر قبل وبعد التدخل الابتكاري",
            status: "mastered",
            score: 4,
            evidenceCount: 3,
            evidenceList: ["تقرير قياس العائد على الاستثمار ROI في الحالة BEN-06", "مؤشرات التحسن في دراسة الأداة المبتكرة"],
            description: "الاعتماد على مقاييس دقيقة لإثبات فاعلية الابتكار كمياً ونوعياً على أداء المستفيدين."
        },

        // D7: Digital & AI (4)
        {
            id: "C701",
            domainId: "D7",
            code: "D7-1",
            title: "توظيف التقنيات والمنصات الرقمية بكفاءة",
            evaluationMethod: "ملف الإنجاز الإلكتروني التفاعلي وإدارة جلسات الكوتشنج عن بعد",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["استخدام منصة cyce52 لإدارة المواعيد", "أدوات التوثيق السحابي المشفرة"],
            description: "إتقان المنصات التفاعلية الرقمية لتيسير رحلة الكوتشينج والتواصل الآمن."
        },
        {
            id: "C702",
            domainId: "D7",
            code: "D7-2",
            title: "الاستفادة المسؤولة من الذكاء الاصطناعي مع التحقق البشري",
            evaluationMethod: "مهمة عملية لتنظيم بيانات منزوعة الهوية مع بيان التعديل البشري الصارم",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["مهمة تحليل بيانات المستفيدين بالذكاء الاصطناعي مع سجل التدقيق البشري", "إقرار الشفافية والمسؤولية في AI"],
            description: "توظيف الذكاء الاصطناعي كأداة مساندة مع التحقق النقدي البشري وعدم الاعتماد الأعمى على المقترحات."
        },
        {
            id: "C703",
            domainId: "D7",
            code: "D7-3",
            title: "التحليل والتوثيق الرقمي للممارسة",
            evaluationMethod: "لوحات البيانات والتقارير الرقمية المؤتمتة لحالات الكوتشنج",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["لوحة تحليلات اتجاهات المستفيدين 2026", "تقرير التحليل الإحصائي لـ 90 أداة مطبقة"],
            description: "تحويل السجلات الورقية إلى مستودع رقمي منظم يسهل استخراج المؤشرات والأنماط."
        },
        {
            id: "C704",
            domainId: "D7",
            code: "D7-4",
            title: "أمن المعلومات وسرية البيانات الرقمية",
            evaluationMethod: "فحص بروتوكولات حماية السجلات الرقمية وإجراءات نزع الهوية",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["شهادة التشفير ونزع المعرفات المباشرة للمستفيدين", "بروتوكول حماية التسجيلات الصوتية"],
            description: "الحفاظ الصارم على خصوصية البيانات، وتشفير التسجيلات، ومنع أي تسريب لمعلومات المستفيدين الرقمية."
        },

        // D8: Ethical Safeguards Gate (7) - Non-Compensable Gate!
        {
            id: "C801",
            domainId: "D8",
            code: "D8-1",
            title: "احترام الكرامة الإنسانية والخصوصية الفردية",
            evaluationMethod: "مراجعة شاملة لجميع تسجيلات الجلسات والعقود الميدانية",
            status: "mastered",
            score: 5,
            evidenceCount: 5,
            evidenceList: ["نماذج الموافقة المستنيرة الموقعة لـ 20 حالة", "سجل التقييم الأخلاقي للجلسات"],
            description: "معاملة كل مستفيد بتقدير واحترام غير مشروط، والابتعاد التام عن الأحكام المسبقة والتنميط."
        },
        {
            id: "C802",
            domainId: "D8",
            code: "D8-2",
            title: "السرية التامة وحماية بيانات المستفيدين",
            evaluationMethod: "إقرار أمن البيانات والتعاقدات الموقعة مع بنك السجلات منزوعة الهوية",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["اتفاقيات السرية لـ 20 حالة", "سجل إتلاف المسودات الورقية والبيانات المؤقتة"],
            description: "حفظ أسرار الجلسات والبيانات الحساسة كأمانة مهنية وقانونية لا تقبل المساومة."
        },
        {
            id: "C803",
            domainId: "D8",
            code: "D8-3",
            title: "الالتزام بحدود الاختصاص المهني للكوتشنج",
            evaluationMethod: "سيناريوهات فحص حدود الكوتشنج والتمييز عن العلاج النفسي والاستشارة",
            status: "mastered",
            score: 5,
            evidenceCount: 4,
            evidenceList: ["تقرير تمييز نطاق الممارسة للحالة BEN-13", "مذكرة التمييز بين الكوتشنج والإرشاد النفسي"],
            description: "عدم ادعاء خبرات علاجية أو طبية أو استشارية خارج نطاق الكوتشنج وتمكين المستفيد."
        },
        {
            id: "C804",
            domainId: "D8",
            code: "D8-4",
            title: "تجنب وحظر تضارب المصالح",
            evaluationMethod: "إقرارات الإفصاح المالي والعلائقي لكل حالة ميدانية ومؤسسية",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["نموذج الإفصاح عن العلاقات لشركة A", "سجل تجنب المنافع المزدوجة في الكوتشنج الداخلي"],
            description: "الامتناع عن تقديم الكوتشنج لأشخاص تجمعهم بالكوتش مصالح مالية أو إدارية مباشرة تعيق الحياد."
        },
        {
            id: "C805",
            domainId: "D8",
            code: "D8-5",
            title: "الإفصاح والشفافية عند الضرورة",
            evaluationMethod: "بروتوكول التعامل مع حالات الخطر والإفصاح الإلزامي القانوني",
            status: "mastered",
            score: 5,
            evidenceCount: 2,
            evidenceList: ["سياسة الإفصاح القانوني المعتمدة في العقود", "مذكرة فحص سيناريو الخطر الداهم"],
            description: "البيان المسبق للمستفيد بالحالات الاستثنائية التي يفرض فيها القانون أو المصلحة الكبرى الإفصاح."
        },
        {
            id: "C806",
            domainId: "D8",
            code: "D8-6",
            title: "الالتزام بميثاق شرف المهنة والبرنامج",
            evaluationMethod: "التعهد الكتابي المعتمد + عدم وجود أي بلاغ أو مخالفة خلال التدريب",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["وثيقة التعهد الأخلاقي الموقعة للماستر كوتش", "سجل النزاهة المهنية الخالي من الملاحظات"],
            description: "التمسك بميثاق الشرف لشركة تمكين الرؤية والاتحادات الدولية للكوتشنج قولاً وعملاً."
        },
        {
            id: "C807",
            domainId: "D8",
            code: "D8-7",
            title: "إحالة الحالات المتجاوزة لحدود الممارسة بنجاح",
            evaluationMethod: "سجل الإحالات المعتمد (بروتوكول إحالة رسمي لطبيب أو معالج نفسي)",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["نموذج إحالة رسمي للحالة REF-2026-01 (مؤشرات اكتئاب حاد)", "بروتوكول التواصل مع الاختصاصي النفسي"],
            description: "الشجاعة واليقظة في إنهاء الكوتشنج وتحويل الحالات التي تحتاج تدخلاً نفسياً أو طبياً للمختصين فوراً."
        },

        // D9: Supervision Competency (1)
        {
            id: "CS01",
            domainId: "D9",
            code: "D9-1",
            title: "ممارسة الإشراف المهني وتقديم التغذية الراجعة للأقران",
            evaluationMethod: "ملاحظة أداء المشارك لدور المشرف في مختبر 5 مع تقرير التغذية",
            status: "mastered",
            score: 5,
            evidenceCount: 3,
            evidenceList: ["تقرير الإشراف المهني المقدم للمتدرب B", "تسجيل جلسة الملاحظة الإشرافية في مختبر 5", "خطة التطوير المقترحة للممارس"],
            description: "تحليل ممارسات الكوتشز الأقل خبرة وتزويدهم بتغذية راجعة بناءة تسهم في ترقية أدائهم."
        }
    ],

    // Quantitative Requirements: 240 Hours
    hours: [
        {
            id: "H1",
            component: "التدريب المباشر",
            target: 100,
            completed: 100,
            status: "completed",
            details: "100 ساعة تدريبية تفاعلية مباشرة مع الماستر كوتش عبدالكريم الخليفي والخبراء المعتمدين."
        },
        {
            id: "H2",
            component: "المختبرات المهنية (9 مختبرات)",
            target: 30,
            completed: 30,
            status: "completed",
            details: "30 ساعة تطبيقية في 9 مختبرات تخصصية: الجاهزية، الحالات، المحاكاة، الإشراف، التوثيق، الذكاء الاصطناعي، وغيرها."
        },
        {
            id: "H3",
            component: "الممارسة الميدانية الموجهة",
            target: 40,
            completed: 40,
            status: "completed",
            details: "40 ساعة ممارسة كوتشنج فعلية موثقة وموزعة على الحالات الميدانية."
        },
        {
            id: "H4",
            component: "الإشراف المهني (فردي وجماعي)",
            target: 20,
            completed: 20,
            status: "completed",
            details: "20 ساعة إشراف مباشر تشمل فحص الحالات، وعيوب الممارسة، وملاحظة الأداء وتقديم التغذية الراجعة."
        },
        {
            id: "H5",
            component: "ملف الإنجاز المهني والتأملات",
            target: 10,
            completed: 10,
            status: "completed",
            details: "10 ساعات عمل موجهة في بناء وتدقيق وتأطير ملف الإنجاز الشامل والتأملات الرباعية."
        },
        {
            id: "H6",
            component: "إعداد الورقة العلمية التطبيقية",
            target: 20,
            completed: 20,
            status: "completed",
            details: "20 ساعة بحثية موجهة في إعداد وتحرير ومراجعة الورقة العلمية لا تقل عن 50 صفحة بنظام APA 7."
        },
        {
            id: "H7",
            component: "مشروع التخرج الابتكاري والدفاع",
            target: 20,
            completed: 20,
            status: "completed",
            details: "20 ساعة عمل في تطوير النموذج الابتكاري وتحكيمه والاستعداد للدفاع العلمي أمام اللجنة."
        }
    ],

    // 20 Integrated Field Cases
    cases: [
        { id: 1, code: "BEN-01", title: "كوتشنج التحول القيادي لمدير عمليات", sessionsCount: 2, totalMinutes: 120, status: "closed", models: ["GROW", "عجلة الحياة القيادية"], anonymized: true, notes: "إنجاز 2 جلسة متكاملة وتقرير إغلاق وقياس أثر." },
        { id: 2, code: "BEN-02", title: "تطوير الكفاءة الاستراتيجية لرائدة أعمال", sessionsCount: 2, totalMinutes: 130, status: "closed", models: ["CLEAR", "SWOT المطور"], anonymized: true, notes: "تحقيق هدف رفع كفاءة توزيع المهام بنسبة 35%." },
        { id: 3, code: "BEN-03", title: "إدارة الضغوط وتوازن الحياة المهنية", sessionsCount: 2, totalMinutes: 115, status: "closed", models: ["عجلة الحياة", "OSKAR"], anonymized: true, notes: "تطبيق خطة الاستدامة وتخفيض مؤشرات الإجهاد." },
        { id: 4, code: "BEN-04", title: "تفعيل الرؤية القيادية لمدير تنفيذي جديد", sessionsCount: 2, totalMinutes: 125, status: "closed", models: ["GROW", "نموذج بوصلة التمكين الخماسي"], anonymized: true, notes: "صياغة الميثاق القيادي واستبصار العوائق الذهنية." },
        { id: 5, code: "BEN-05", title: "كوتشنج تحسين التواصل الفعال لفريق تقني", sessionsCount: 1, totalMinutes: 65, status: "closed", models: ["MBTI", "التغذية الراجعة الوصفية"], anonymized: true, notes: "اكتشاف نمط الشخصية وتكييف لغة الحوار الداخلي." },
        { id: 6, code: "BEN-06", title: "تجاوز متلازمة المحتال لدى قائدة واعدة", sessionsCount: 2, totalMinutes: 130, status: "closed", models: ["GROW", "تفكيك المعتقدات المعيقة"], anonymized: true, notes: "رفع الثقة المهنية وتقييم أثر مالي ملحوظ." },
        { id: 7, code: "BEN-07", title: "إعادة رسم المسار المهني بعد 15 سنة خبرة", sessionsCount: 2, totalMinutes: 120, status: "closed", models: ["SWOT", "مسار عمر قرافي"], anonymized: true, notes: "تحديد الأولويات والانتقال لقطاع الاستشارات." },
        { id: 8, code: "BEN-08", title: "كوتشنج تفويض الصلاحيات لمدير عائلي", sessionsCount: 2, totalMinutes: 120, status: "closed", models: ["CLEAR", "مصفوفة أيزنهاور الكوتشنجية"], anonymized: true, notes: "تطبيق أول مصفوفة تفويض وتخفيف ساعات الدوام." },
        { id: 9, code: "BEN-09", title: "بناء ثقافة التحفيز والإنتاجية لقسم المبيعات", sessionsCount: 2, totalMinutes: 135, status: "closed", models: ["5 Whys", "GROW"], anonymized: true, notes: "الوصول للجذر الحقيقي للمقاومة وتحقيق المستهدفات." },
        { id: 10, code: "BEN-10", title: "تحسين مهارات إدارة النزاع لمدير موارد بشرية", sessionsCount: 1, totalMinutes: 60, status: "closed", models: ["توماس-كيلمان", "الاستماع العميق"], anonymized: true, notes: "تطبيق نموذج إدارة النزاع في 3 قضايا داخلية." },
        { id: 11, code: "BEN-11", title: "كوتشنج قيادة التغيير في اندماج شركتين", sessionsCount: 2, totalMinutes: 140, status: "closed", models: ["التفكير المنظومي", "SWOT"], anonymized: true, notes: "خريطة منظومية لمقاومة التغيير وتخفيف الصدمة." },
        { id: 12, code: "BEN-12", title: "تطوير الذكاء العاطفي لمدير مشاريع كبرى", sessionsCount: 1, totalMinutes: 65, status: "closed", models: ["عجلة الحياة", "MBTI"], anonymized: true, notes: "تطبيق خطة الوعي بالانفعالات وتأثيرها على الفريق." },
        { id: 13, code: "BEN-13", title: "فحص الاحتراق الوظيفي وإحالة أعراض الاكتئاب", sessionsCount: 1, totalMinutes: 50, status: "referred", models: ["حدود الممارسة المهنية"], anonymized: true, notes: "تم إنهاء الكوتشنج وإحالة الحالة لطبيب نفسي مرخص بنجاح REF-2026-01." },
        { id: 14, code: "BEN-14", title: "تحفيز الابتكار لدى فريق تطوير منتجات", sessionsCount: 2, totalMinutes: 120, status: "closed", models: ["GROW", "SCAMPER الكوتشنجي"], anonymized: true, notes: "إطلاق منتجين جديدين ومتابعة مؤشرات القبول." },
        { id: 15, code: "BEN-15", title: "إدارة الشراكة المهنية وفض التداخل الصلاحياتي", sessionsCount: 1, totalMinutes: 70, status: "closed", models: ["CLEAR", "عقد الشراكة الموجه"], anonymized: true, notes: "تحديد المسؤوليات والحدود بين الشريكين المؤسسين." },
        { id: 16, code: "BEN-16", title: "كوتشنج التحول الرقمي لقائد تقليدي", sessionsCount: 1, totalMinutes: 60, status: "closed", models: ["GROW", "نموذج تقبل التقنية"], anonymized: true, notes: "تبني نظام ERP الجديد ومتابعة تدريب الفريق." },
        { id: 17, code: "BEN-17", title: "التخطيط الاستراتيجي الشخصي لمدير عام", sessionsCount: 2, totalMinutes: 125, status: "closed", models: ["Pfeiffer المعدل", "عجلة الحياة"], anonymized: true, notes: "خطة خمسية متوازنة تغطي 8 أبعاد حياتية ومهنية." },
        { id: 18, code: "BEN-18", title: "بناء ثقة التحدث العام لمتحدث مؤسسي", sessionsCount: 1, totalMinutes: 60, status: "closed", models: ["التغذية الراجعة", "إدارة التوتر"], anonymized: true, notes: "تقديم 3 عروض رسمية دون نوبات ذعر." },
        { id: 19, code: "BEN-19", title: "إدارة الوقت والأولويات لطبيب استشاري", sessionsCount: 1, totalMinutes: 65, status: "closed", models: ["عجلة الحياة", "مصفوفة الوقت"], anonymized: true, notes: "استعادة 8 ساعات أسبوعياً للأنشطة البحثية والأسرية." },
        { id: 20, code: "BEN-20", title: "كوتشنج التقاعد الإيجابي لمستشار حكومي", sessionsCount: 2, totalMinutes: 120, status: "closed", models: ["GROW", "مسارات العطاء المجتمعي"], anonymized: true, notes: "تصميم مشروع استشاري خاص ومبادرة وقفية." }
    ],

    // 30 Field Sessions Log (Distributed over the 20 Cases)
    sessions: [
        { id: 1, caseId: 1, caseCode: "BEN-01", date: "2026-02-01", duration: 60, focus: "استكشاف التحديات القيادية وصياغة العقد", rubricsScore: 4.6, recordingUrl: "mock_session_01.mp3", status: "approved" },
        { id: 2, caseId: 1, caseCode: "BEN-01", date: "2026-02-15", duration: 60, focus: "تطبيق نموذج GROW وتحديد خطة الإجراءات", rubricsScore: 4.8, recordingUrl: "mock_session_02.mp3", status: "approved" },
        { id: 3, caseId: 2, caseCode: "BEN-02", date: "2026-02-05", duration: 65, focus: "تشخيص عوائق نمو الشركة والتحالف المهني", rubricsScore: 4.7, recordingUrl: "mock_session_03.mp3", status: "approved" },
        { id: 4, caseId: 2, caseCode: "BEN-02", date: "2026-02-20", duration: 65, focus: "تطبيق نموذج CLEAR وبناء مصفوفة المسؤوليات", rubricsScore: 4.9, recordingUrl: "mock_session_04.mp3", status: "approved" },
        { id: 5, caseId: 3, caseCode: "BEN-03", date: "2026-02-10", duration: 55, focus: "تطبيق عجلة الحياة وتشخيص مؤشرات الإجهاد", rubricsScore: 4.5, recordingUrl: "mock_session_05.mp3", status: "approved" },
        { id: 6, caseId: 3, caseCode: "BEN-03", date: "2026-02-24", duration: 60, focus: "تطبيق نموذج OSKAR وترسيخ الحلول المستدامة", rubricsScore: 4.7, recordingUrl: "mock_session_06.mp3", status: "approved" },
        { id: 7, caseId: 4, caseCode: "BEN-04", date: "2026-02-18", duration: 60, focus: "بناء الرؤية الشخصية وتفكيك القناعات المسبقة", rubricsScore: 4.8, recordingUrl: "mock_session_07.mp3", status: "approved" },
        { id: 8, caseId: 4, caseCode: "BEN-04", date: "2026-03-04", duration: 65, focus: "تطبيق بوصلة التمكين الخماسي المبتكر", rubricsScore: 5.0, recordingUrl: "mock_session_08.mp3", status: "approved" },
        { id: 9, caseId: 5, caseCode: "BEN-05", date: "2026-02-22", duration: 65, focus: "تحليل مؤشرات MBTI وأنماط التفاعل الفريقي", rubricsScore: 4.6, recordingUrl: "mock_session_09.mp3", status: "approved" },
        { id: 10, caseId: 6, caseCode: "BEN-06", date: "2026-03-01", duration: 65, focus: "تفكيك متلازمة المحتال ومساءلة الأدلة الذاتية", rubricsScore: 4.9, recordingUrl: "mock_session_10.mp3", status: "approved" },
        { id: 11, caseId: 6, caseCode: "BEN-06", date: "2026-03-15", duration: 65, focus: "تثبيت الهوية القيادية وقياس الأثر التمكيني", rubricsScore: 5.0, recordingUrl: "mock_session_11.mp3", status: "approved" },
        { id: 12, caseId: 7, caseCode: "BEN-07", date: "2026-03-05", duration: 60, focus: "تطبيق تحليل SWOT لمسار مهني استشاري جديد", rubricsScore: 4.7, recordingUrl: "mock_session_12.mp3", status: "approved" },
        { id: 13, caseId: 7, caseCode: "BEN-07", date: "2026-03-20", duration: 60, focus: "تطبيق نموذج عمر قرافي للمسارات الثلاثة", rubricsScore: 4.8, recordingUrl: "mock_session_13.mp3", status: "approved" },
        { id: 14, caseId: 8, caseCode: "BEN-08", date: "2026-03-08", duration: 60, focus: "تشخيص صعوبة التفويض ومخاوف فقد السيطرة", rubricsScore: 4.5, recordingUrl: "mock_session_14.mp3", status: "approved" },
        { id: 15, caseId: 8, caseCode: "BEN-08", date: "2026-03-22", duration: 60, focus: "تطبيق مصفوفة التفويض والمساءلة الواضحة", rubricsScore: 4.8, recordingUrl: "mock_session_15.mp3", status: "approved" },
        { id: 16, caseId: 9, caseCode: "BEN-09", date: "2026-03-12", duration: 65, focus: "تطبيق تقنية 5 Whys للوصول لجذر تدني المبيعات", rubricsScore: 4.9, recordingUrl: "mock_session_16.mp3", status: "approved" },
        { id: 17, caseId: 9, caseCode: "BEN-09", date: "2026-03-26", duration: 70, focus: "بناء خطة التحفيز الداخلي وتأطير الأهداف", rubricsScore: 4.8, recordingUrl: "mock_session_17.mp3", status: "approved" },
        { id: 18, caseId: 10, caseCode: "BEN-10", date: "2026-03-18", duration: 60, focus: "تطبيق أداة إدارة النزاع والإنصات العميق", rubricsScore: 4.7, recordingUrl: "mock_session_18.mp3", status: "approved" },
        { id: 19, caseId: 11, caseCode: "BEN-11", date: "2026-04-02", duration: 70, focus: "رسم الخريطة المنظومية لمقاومة الاندماج", rubricsScore: 5.0, recordingUrl: "mock_session_19.mp3", status: "approved" },
        { id: 20, caseId: 11, caseCode: "BEN-11", date: "2026-04-16", duration: 70, focus: "صياغة خطة التدخل الكوتشنجي للقيادات الوسيطة", rubricsScore: 4.9, recordingUrl: "mock_session_20.mp3", status: "approved" },
        { id: 21, caseId: 12, caseCode: "BEN-12", date: "2026-04-05", duration: 65, focus: "تقييم أبعاد الذكاء العاطفي وإدارة الغضب المهني", rubricsScore: 4.6, recordingUrl: "mock_session_21.mp3", status: "approved" },
        { id: 22, caseId: 13, caseCode: "BEN-13", date: "2026-04-08", duration: 50, focus: "رصد أعراض خارج نطاق الكوتشنج وبروتوكول الإحالة", rubricsScore: 5.0, recordingUrl: "mock_session_22.mp3", status: "approved" },
        { id: 23, caseId: 14, caseCode: "BEN-14", date: "2026-04-11", duration: 60, focus: "جلسة العصف الذهني الكوتشنجي لفرق الابتكار", rubricsScore: 4.7, recordingUrl: "mock_session_23.mp3", status: "approved" },
        { id: 24, caseId: 14, caseCode: "BEN-14", date: "2026-04-25", duration: 60, focus: "تقييم الأفكار ومتابعة نماذج العمل المبتكرة", rubricsScore: 4.8, recordingUrl: "mock_session_24.mp3", status: "approved" },
        { id: 25, caseId: 15, caseCode: "BEN-15", date: "2026-04-14", duration: 70, focus: "حوار الشفافية المؤسسية ورسم حدود الشراكة", rubricsScore: 4.9, recordingUrl: "mock_session_25.mp3", status: "approved" },
        { id: 26, caseId: 16, caseCode: "BEN-16", date: "2026-04-19", duration: 60, focus: "تفكيك الخوف من التقنية وبناء عقلية التعلم", rubricsScore: 4.6, recordingUrl: "mock_session_26.mp3", status: "approved" },
        { id: 27, caseId: 17, caseCode: "BEN-17", date: "2026-04-22", duration: 60, focus: "صياغة الغايات الاستراتيجية الشخصية لـ Pfeiffer", rubricsScore: 4.8, recordingUrl: "mock_session_27.mp3", status: "approved" },
        { id: 28, caseId: 17, caseCode: "BEN-17", date: "2026-05-06", duration: 65, focus: "المراجعة الإشرافية لمسودة الخطة الاستراتيجية", rubricsScore: 4.9, recordingUrl: "mock_session_28.mp3", status: "approved" },
        { id: 29, caseId: 18, caseCode: "BEN-18", date: "2026-04-28", duration: 60, focus: "تفكيك رهاب الإلقاء وممارسة التخيل التمكيني", rubricsScore: 4.7, recordingUrl: "mock_session_29.mp3", status: "approved" },
        { id: 30, caseId: 20, caseCode: "BEN-20", date: "2026-05-02", duration: 60, focus: "تخطيط مرحلة ما بعد الوظيفة وتصميم الأثر الوقفي", rubricsScore: 4.9, recordingUrl: "mock_session_30.mp3", status: "approved" }
    ],

    // 90 Tool Applications (30 MBTI, 30 Wheel of Life, 30 SWOT)
    // Rule: Strict Non-Duplication within each tool counter
        toolsSummary: {
        mbti: {
            target: 30,
            completed: 30,
            label: "اختبار MBTI لنمط الشخصية",
            description: "30 مستفيداً مختلفاً مع نتائج وتأملات مهنية موثقة",
            applications: [
          {
                    "id": 1,
                    "beneficiaryCode": "BEN-01",
                    "date": "2026-02-01",
                    "sector": "القطاع الصحي",
                    "resultType": "INTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 2,
                    "beneficiaryCode": "BEN-02",
                    "date": "2026-02-02",
                    "sector": "القطاع المصرفي",
                    "resultType": "ENTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 3,
                    "beneficiaryCode": "BEN-03",
                    "date": "2026-02-03",
                    "sector": "الاستشارات",
                    "resultType": "INFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 4,
                    "beneficiaryCode": "BEN-04",
                    "date": "2026-02-04",
                    "sector": "التعليم والتدريب",
                    "resultType": "ENFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 5,
                    "beneficiaryCode": "BEN-05",
                    "date": "2026-02-05",
                    "sector": "الاتصالات وتقنية المعلومات",
                    "resultType": "ISTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 6,
                    "beneficiaryCode": "BEN-06",
                    "date": "2026-02-06",
                    "sector": "القطاع الحكومي",
                    "resultType": "ESTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 7,
                    "beneficiaryCode": "BEN-07",
                    "date": "2026-02-07",
                    "sector": "التجارة الإلكترونية",
                    "resultType": "INTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 8,
                    "beneficiaryCode": "BEN-08",
                    "date": "2026-02-08",
                    "sector": "المصانع واللوجستيات",
                    "resultType": "ENTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 9,
                    "beneficiaryCode": "BEN-09",
                    "date": "2026-02-09",
                    "sector": "القطاع الصحي",
                    "resultType": "INTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 10,
                    "beneficiaryCode": "BEN-10",
                    "date": "2026-02-10",
                    "sector": "القطاع المصرفي",
                    "resultType": "ENTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 11,
                    "beneficiaryCode": "BEN-11",
                    "date": "2026-03-11",
                    "sector": "الاستشارات",
                    "resultType": "INFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 12,
                    "beneficiaryCode": "BEN-12",
                    "date": "2026-03-12",
                    "sector": "التعليم والتدريب",
                    "resultType": "ENFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 13,
                    "beneficiaryCode": "BEN-13",
                    "date": "2026-03-13",
                    "sector": "الاتصالات وتقنية المعلومات",
                    "resultType": "ISTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 14,
                    "beneficiaryCode": "BEN-14",
                    "date": "2026-03-14",
                    "sector": "القطاع الحكومي",
                    "resultType": "ESTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 15,
                    "beneficiaryCode": "BEN-15",
                    "date": "2026-03-15",
                    "sector": "التجارة الإلكترونية",
                    "resultType": "INTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 16,
                    "beneficiaryCode": "BEN-16",
                    "date": "2026-03-16",
                    "sector": "المصانع واللوجستيات",
                    "resultType": "ENTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 17,
                    "beneficiaryCode": "BEN-17",
                    "date": "2026-03-17",
                    "sector": "القطاع الصحي",
                    "resultType": "INTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 18,
                    "beneficiaryCode": "BEN-18",
                    "date": "2026-03-18",
                    "sector": "القطاع المصرفي",
                    "resultType": "ENTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 19,
                    "beneficiaryCode": "BEN-19",
                    "date": "2026-03-19",
                    "sector": "الاستشارات",
                    "resultType": "INFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 20,
                    "beneficiaryCode": "BEN-20",
                    "date": "2026-03-20",
                    "sector": "التعليم والتدريب",
                    "resultType": "ENFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 21,
                    "beneficiaryCode": "BEN-21",
                    "date": "2026-04-21",
                    "sector": "الاتصالات وتقنية المعلومات",
                    "resultType": "ISTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 22,
                    "beneficiaryCode": "BEN-22",
                    "date": "2026-04-22",
                    "sector": "القطاع الحكومي",
                    "resultType": "ESTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 23,
                    "beneficiaryCode": "BEN-23",
                    "date": "2026-04-23",
                    "sector": "التجارة الإلكترونية",
                    "resultType": "INTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 24,
                    "beneficiaryCode": "BEN-24",
                    "date": "2026-04-24",
                    "sector": "المصانع واللوجستيات",
                    "resultType": "ENTP",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 25,
                    "beneficiaryCode": "BEN-25",
                    "date": "2026-04-25",
                    "sector": "القطاع الصحي",
                    "resultType": "INTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 26,
                    "beneficiaryCode": "BEN-26",
                    "date": "2026-04-01",
                    "sector": "القطاع المصرفي",
                    "resultType": "ENTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 27,
                    "beneficiaryCode": "BEN-27",
                    "date": "2026-04-02",
                    "sector": "الاستشارات",
                    "resultType": "INFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 28,
                    "beneficiaryCode": "BEN-28",
                    "date": "2026-04-03",
                    "sector": "التعليم والتدريب",
                    "resultType": "ENFJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 29,
                    "beneficiaryCode": "BEN-29",
                    "date": "2026-04-04",
                    "sector": "الاتصالات وتقنية المعلومات",
                    "resultType": "ISTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          },
          {
                    "id": 30,
                    "beneficiaryCode": "BEN-30",
                    "date": "2026-04-05",
                    "sector": "القطاع الحكومي",
                    "resultType": "ESTJ",
                    "focus": "تحديد نمط الشخصية المهنية وتحسين التفاعل مع الفريق",
                    "reflection": "استبصار عميق بنقاط القوة والعمى السلوكي ووضع خطة تواصل مخصصة.",
                    "status": "approved"
          }
]
        },
        wheelOfLife: {
            target: 30,
            completed: 30,
            label: "عجلة الحياة (Wheel of Life)",
            description: "30 خطة لكل تطبيق تشمل الأولويات والأهداف والإجراءات ومؤشرات المتابعة",
            applications: [
          {
                    "id": 1,
                    "beneficiaryCode": "BEN-01",
                    "date": "2026-02-03",
                    "baselineScore": "62%",
                    "targetScore": "94%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 2,
                    "beneficiaryCode": "BEN-02",
                    "date": "2026-02-04",
                    "baselineScore": "60%",
                    "targetScore": "94%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 3,
                    "beneficiaryCode": "BEN-03",
                    "date": "2026-02-05",
                    "baselineScore": "52%",
                    "targetScore": "81%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 4,
                    "beneficiaryCode": "BEN-04",
                    "date": "2026-02-06",
                    "baselineScore": "45%",
                    "targetScore": "91%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 5,
                    "beneficiaryCode": "BEN-05",
                    "date": "2026-02-07",
                    "baselineScore": "64%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 6,
                    "beneficiaryCode": "BEN-06",
                    "date": "2026-02-08",
                    "baselineScore": "51%",
                    "targetScore": "81%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 7,
                    "beneficiaryCode": "BEN-07",
                    "date": "2026-02-09",
                    "baselineScore": "59%",
                    "targetScore": "93%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 8,
                    "beneficiaryCode": "BEN-08",
                    "date": "2026-02-10",
                    "baselineScore": "53%",
                    "targetScore": "81%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 9,
                    "beneficiaryCode": "BEN-09",
                    "date": "2026-02-11",
                    "baselineScore": "57%",
                    "targetScore": "81%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 10,
                    "beneficiaryCode": "BEN-10",
                    "date": "2026-02-12",
                    "baselineScore": "46%",
                    "targetScore": "83%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 11,
                    "beneficiaryCode": "BEN-11",
                    "date": "2026-03-13",
                    "baselineScore": "57%",
                    "targetScore": "87%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 12,
                    "beneficiaryCode": "BEN-12",
                    "date": "2026-03-14",
                    "baselineScore": "45%",
                    "targetScore": "88%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 13,
                    "beneficiaryCode": "BEN-13",
                    "date": "2026-03-15",
                    "baselineScore": "61%",
                    "targetScore": "80%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 14,
                    "beneficiaryCode": "BEN-14",
                    "date": "2026-03-16",
                    "baselineScore": "63%",
                    "targetScore": "86%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 15,
                    "beneficiaryCode": "BEN-15",
                    "date": "2026-03-17",
                    "baselineScore": "49%",
                    "targetScore": "90%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 16,
                    "beneficiaryCode": "BEN-16",
                    "date": "2026-03-18",
                    "baselineScore": "63%",
                    "targetScore": "85%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 17,
                    "beneficiaryCode": "BEN-17",
                    "date": "2026-03-19",
                    "baselineScore": "60%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 18,
                    "beneficiaryCode": "BEN-18",
                    "date": "2026-03-20",
                    "baselineScore": "47%",
                    "targetScore": "88%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 19,
                    "beneficiaryCode": "BEN-19",
                    "date": "2026-03-21",
                    "baselineScore": "49%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 20,
                    "beneficiaryCode": "BEN-20",
                    "date": "2026-03-22",
                    "baselineScore": "57%",
                    "targetScore": "80%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 21,
                    "beneficiaryCode": "BEN-31",
                    "date": "2026-04-23",
                    "baselineScore": "46%",
                    "targetScore": "89%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 22,
                    "beneficiaryCode": "BEN-32",
                    "date": "2026-04-24",
                    "baselineScore": "48%",
                    "targetScore": "81%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 23,
                    "beneficiaryCode": "BEN-33",
                    "date": "2026-04-25",
                    "baselineScore": "64%",
                    "targetScore": "90%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 24,
                    "beneficiaryCode": "BEN-34",
                    "date": "2026-04-26",
                    "baselineScore": "45%",
                    "targetScore": "91%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 25,
                    "beneficiaryCode": "BEN-35",
                    "date": "2026-04-27",
                    "baselineScore": "58%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 26,
                    "beneficiaryCode": "BEN-36",
                    "date": "2026-04-03",
                    "baselineScore": "49%",
                    "targetScore": "90%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 27,
                    "beneficiaryCode": "BEN-37",
                    "date": "2026-04-04",
                    "baselineScore": "54%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 28,
                    "beneficiaryCode": "BEN-38",
                    "date": "2026-04-05",
                    "baselineScore": "56%",
                    "targetScore": "91%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 29,
                    "beneficiaryCode": "BEN-39",
                    "date": "2026-04-06",
                    "baselineScore": "60%",
                    "targetScore": "84%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          },
          {
                    "id": 30,
                    "beneficiaryCode": "BEN-40",
                    "date": "2026-04-07",
                    "baselineScore": "58%",
                    "targetScore": "82%",
                    "focus": "موازنة 8 أبعاد حياتية ومهنية وإدارة الطاقة والأولويات",
                    "plan": "خطة عمل متكاملة تشمل الأولويات، الأهداف، والإجراءات ومؤشرات المتابعة.",
                    "status": "approved"
          }
]
        },
        swot: {
            target: 30,
            completed: 30,
            label: "تحليل SWOT الشخصي والمهني",
            description: "30 تحليلاً وتوصيات وخطط تطوير قابلة للمتابعة الميدانية",
            applications: [
          {
                    "id": 1,
                    "beneficiaryCode": "BEN-01",
                    "date": "2026-02-05",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 2,
                    "beneficiaryCode": "BEN-02",
                    "date": "2026-02-06",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 3,
                    "beneficiaryCode": "BEN-03",
                    "date": "2026-02-07",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 4,
                    "beneficiaryCode": "BEN-04",
                    "date": "2026-02-08",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 5,
                    "beneficiaryCode": "BEN-05",
                    "date": "2026-02-09",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 6,
                    "beneficiaryCode": "BEN-06",
                    "date": "2026-02-10",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 7,
                    "beneficiaryCode": "BEN-07",
                    "date": "2026-02-11",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 8,
                    "beneficiaryCode": "BEN-08",
                    "date": "2026-02-12",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 9,
                    "beneficiaryCode": "BEN-09",
                    "date": "2026-02-13",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 10,
                    "beneficiaryCode": "BEN-10",
                    "date": "2026-02-14",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 11,
                    "beneficiaryCode": "BEN-11",
                    "date": "2026-03-15",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 12,
                    "beneficiaryCode": "BEN-12",
                    "date": "2026-03-16",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 13,
                    "beneficiaryCode": "BEN-13",
                    "date": "2026-03-17",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 14,
                    "beneficiaryCode": "BEN-14",
                    "date": "2026-03-18",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 15,
                    "beneficiaryCode": "BEN-15",
                    "date": "2026-03-19",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 16,
                    "beneficiaryCode": "BEN-16",
                    "date": "2026-03-20",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 17,
                    "beneficiaryCode": "BEN-17",
                    "date": "2026-03-21",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 18,
                    "beneficiaryCode": "BEN-18",
                    "date": "2026-03-22",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 19,
                    "beneficiaryCode": "BEN-19",
                    "date": "2026-03-23",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 20,
                    "beneficiaryCode": "BEN-20",
                    "date": "2026-03-24",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 21,
                    "beneficiaryCode": "BEN-41",
                    "date": "2026-04-25",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 22,
                    "beneficiaryCode": "BEN-42",
                    "date": "2026-04-26",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 23,
                    "beneficiaryCode": "BEN-43",
                    "date": "2026-04-27",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 24,
                    "beneficiaryCode": "BEN-44",
                    "date": "2026-04-28",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 25,
                    "beneficiaryCode": "BEN-45",
                    "date": "2026-04-29",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 26,
                    "beneficiaryCode": "BEN-46",
                    "date": "2026-04-05",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 27,
                    "beneficiaryCode": "BEN-47",
                    "date": "2026-04-06",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 28,
                    "beneficiaryCode": "BEN-48",
                    "date": "2026-04-07",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 29,
                    "beneficiaryCode": "BEN-49",
                    "date": "2026-04-08",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          },
          {
                    "id": 30,
                    "beneficiaryCode": "BEN-50",
                    "date": "2026-04-09",
                    "matrixFocus": "تحليل نقاط القوة والضعف والفرص والمهددات المهنية والمؤسسية",
                    "recommendations": "3 توصيات استراتيجية قابلة للقياس الميداني وتقرير متابعة ربع سنوي.",
                    "status": "approved"
          }
]
        }
    },

    // 10 Coaching & Administrative Innovative Models
    innovativeModels: [
        {
            id: 1,
            title: "نموذج بوصلة التمكين الخماسي (5D-Empowerment Compass)",
            problemAddressed: "افتقار نماذج الكوتشنج التقليدية لربط الهوية المعنوية بالإنتاجية التنفيذية في البيئة العربية.",
            theoreticalReference: "مستند إلى نظرية تقرير المصير (Deci & Ryan) ومفاهيم الإتقان في التراث الإداري.",
            addedValue: "يقدم 5 أبعاد تفاعلية تدمج البوصلة القيمية، الجدارة الذاتية، الطاقة النفسية، الأثر، والتغذية الاستباقية.",
            applicationSteps: "1. التشخيص القيمي 2. معايرة الجدارة 3. شحن الطاقة 4. تحديد الأثر 5. قياس الاستباق.",
            feasibilityTest: "تم اختباره ميدانياً على 8 قيادات في شركة تمكين بنسبة رضا 94% وتحسن ملحوظ في اتخاذ القرار.",
            status: "approved"
        },
        {
            id: 2,
            title: "نموذج التناغم القيادي المنظومي (Systemic Leadership Harmony)",
            problemAddressed: "عزلة القائد التنفيذي عن شبكة التفاعلات غير المرئية لفريقه المؤسسي.",
            theoreticalReference: "نظرية النظم العامة (Bertalanffy) ونموذج كوتشنج العلاقات المنظومية (ORSC).",
            addedValue: "يكشف البؤر الخفية للاحتكاك في فرق العمل ويحول النزاع إلى طاقة دافعة دون شخصنة.",
            applicationSteps: "1. رسم الخريطة المنظومية 2. فحص بؤر التوتر 3. إعادة توزيع الأدوار 4. التغذية المشتركة.",
            feasibilityTest: "طبق في مشروع تهيئة شركة ريادة التقنية وأسهم في تقليل زمن تسليم المشاريع 20%.",
            status: "approved"
        },
        {
            id: 3,
            title: "نموذج تفكيك المقاومة الذهنية (Mental Resistance Deconstruction)",
            problemAddressed: "جمود المستفيدين عند مواجهة التحولات الاستراتيجية الكبرى والتمسك بمنطقة الراحة.",
            theoreticalReference: "العلاج المعرفي السلوكي (Beck) ونظرية مراحل التغيير (Prochaska).",
            addedValue: "منهجية تدريجية تفكك المخاوف الدفينة عبر أسئلة برهانية تعيد تشكيل الإدراك.",
            applicationSteps: "1. رصد المعتقد المعيق 2. مساءلة الأدلة 3. صياغة البديل التمكيني 4. التجربة الميدانية الصغرى.",
            feasibilityTest: "طبق على 5 حالات فردية مقاومة للتغيير وحقق اختراقاً إيجابياً كاملاً.",
            status: "approved"
        },
        {
            id: 4,
            title: "نموذج عجلة الجدارات التنفيذية المكيفة (Executive Competency Wheel)",
            problemAddressed: "عمومية عجلة الحياة التقليدية وعدم ملاءمتها لقياس التحديات المعقدة للمدراء التنفيذيين.",
            theoreticalReference: "إطار الكفايات القيادية للاتحاد الدولي للكوتشنج ونموذج هارفارد للقيادة.",
            addedValue: "8 محاور احترافية تشمل: التفكير الاستراتيجي، إدارة رأس المال البشري، الذكاء السياسي، إلخ.",
            applicationSteps: "1. التقييم الذاتي الرقمي 2. تقييم الأقران 3. تحديد فجوة الجدارة 4. خطة التطوير الربعية.",
            feasibilityTest: "طبق على 12 مديراً تنفيذياً ضمن الـ 30 تطبيقاً لعجلة الحياة بنجاح موثق.",
            status: "approved"
        },
        {
            id: 5,
            title: "نموذج الاستبصار السريع في الأزمات (Rapid Insight in Crisis - RIC)",
            problemAddressed: "طول زمن جلسات الكوتشنج الاعتيادية عندما يحتاج القائد لاتخاذ قرار حاسم خلال ساعات.",
            theoreticalReference: "الكوتشنج الموجه نحو الحلول (SFBC) ونظرية القرار في ظل عدم اليقين.",
            addedValue: "بروتوكول مكثف من 30 دقيقة يركز على استحضار الموارد وتقليل الضجيج وحسم الأولويات.",
            applicationSteps: "1. عزل الضجيج 2. استدعاء المورد الأقوى 3. فحص الخيار الأقل خطراً 4. الإلزام الفوري.",
            feasibilityTest: "جرى اختباره في 3 أزمات تشغيلية واقعية وأثبت قدرته على خفض التوتر وتسريع القرار.",
            status: "approved"
        },
        {
            id: 6,
            title: "نموذج مصفوفة SWOT الديناميكية التفاعلية",
            problemAddressed: "جمود تحليل SWOT الكلاسيكي واقتصاره على مصفوفة ثابتة دون ربط القوة بالفرص إجرائياً.",
            theoreticalReference: "التخطيط الاستراتيجي التكيفي ونظرية الموارد الداخلية (Resource-Based View).",
            addedValue: "يحول كل تقاطع (قوة × فرصة) و(ضعف × تهديد) إلى مبادرة كوتشنجية فورية ذات مؤشر أداء.",
            applicationSteps: "1. جرد العناصر 2. التزاوج الاستراتيجي 3. توليد إجراءات الكوتشنج 4. المتابعة الأسبوعية.",
            feasibilityTest: "اعتمد في جميع تطبيقات SWOT الثلاثين الموثقة في ملف الإنجاز.",
            status: "approved"
        },
        {
            id: 7,
            title: "نموذج كوتشنج التعاقب القيادي (Succession Readiness Framework)",
            problemAddressed: "صعوبة تهيئة الصف الثاني من القيادات دون إثارة الحساسيات الإدارية.",
            theoreticalReference: "نظريات التوجيه المهني التمكيني والقيادة الخادمة (Greenleaf).",
            addedValue: "منصة حوار كوتشنجي ثلاثي الأطراف تجمع القائد والمفوض والمشرف لضمان نقل الخبرة بسلاسة.",
            applicationSteps: "1. ميثاق التعاقب 2. جلسات الظل والملاحظة 3. التفويض التدريجي 4. التقييم المشترك.",
            feasibilityTest: "طبق في مؤسسة شبه حكومية وحقق جاهزية 4 قيادات للصف الأول.",
            status: "approved"
        },
        {
            id: 8,
            title: "نموذج الحضور والكوتشنج الصامت (Silent Presence Protocol)",
            problemAddressed: "إفراط الكوتشز المبتدئين في الكلام والأسئلة وحرمان المستفيد من فرصة التوليد الذاتي.",
            theoreticalReference: "علم الأعصاب المعرفي (Neuro-coaching) ودراسات هدوء الموجات الدماغية ألفا.",
            addedValue: "أدلة زمنية محددة لفترات الصمت التمكيني (15-45 ثانية) وكيفية الحفاظ على الاتصال البصري الآمن.",
            applicationSteps: "1. طرح السؤال المحوري 2. الصمت المهني الواعي 3. رصد إشارات الجسد 4. التقاط لحظة التحول.",
            feasibilityTest: "تم توثيقه في تسجيلات الجلسات 5 و 11 ونال إشادة خاصة من المشرف.",
            status: "approved"
        },
        {
            id: 9,
            title: "نموذج كوتشنج ثقافة الإنتاجية بلا احتراق (Sustainable Energy Model)",
            problemAddressed: "خلط القادة بين الإنجاز المرتفع وبين الإرهاق المستمر واستنزاف الموارد البشرية.",
            theoreticalReference: "نموذج جيم لوهر لإدارة الطاقة الشخصية (The Power of Full Engagement).",
            addedValue: "موازنة الطاقة البدنية، العاطفية، العقلية، والمعنوية داخل منظومة أهداف العمل.",
            applicationSteps: "1. قياس منسوب الطاقة 2. تحديد ثقوب التسريب 3. بناء طقوس الاسترجاع 4. ربط الطاقة بالهدف.",
            feasibilityTest: "طبق على 6 قيادات تنفيذية مع انخفاض ملحوظ في الغياب والتوتر بنسبة 30%.",
            status: "approved"
        },
        {
            id: 10,
            title: "نموذج التكامل الثلاثي (عمر قرافي المعدل) للكوتشنج المؤسسي",
            problemAddressed: "تشتت مبادرات الكوتشنج داخل المنظمات وغياب الربط بين المسار الفردي والمؤسسي.",
            theoreticalReference: "نموذج عمر قرافي للمسارات الثلاثة + نظرية المواءمة الاستراتيجية.",
            addedValue: "تزامن مسار تمكين القائد، مع مسار تطوير فريقه المباشر، ومسار تحقيق المستهدف الاستراتيجي للمؤسسة.",
            applicationSteps: "1. التشخيص المؤسسي 2. مواءمة المسارات الثلاثة 3. التدخل المزدوج 4. لوحة قيادة الأثر.",
            feasibilityTest: "شكل الأساس المعتمد لمشروع تهيئة المؤسسة الكامل لشركة تمكين الرؤية.",
            status: "approved"
        }
    ],

    // 1 Innovative Personality Assessment Tool
    innovativeTool: {
        id: "TOOL-LMMI",
        name: "مقياس مؤشرات النضج القيادي والدافعية المهنية (LMMI - Leadership Maturity & Motivation Index)",
        purpose: "تشخيص المستوى النضجي للقادة التنفيذيين وفهم دوافعهم الجوهرية قبل وأثناء رحلة الكوتشنج لتخصيص التدخلات بدقة بالغة.",
        boundaries: "أداة كوتشنجية تطويرية بحتة، وليست أداة تشخيص نفسي أو إكلينيكي ولا تستخدم لاختبارات التوظيف الإقصائية.",
        verificationMechanism: "تم التحقق السيكومتري الأولي عبر الاتساق الداخلي (ألفا كرونباخ 0.86) وتطبيقه على عينة استطلاعية من 40 ممارساً.",
        status: "approved",
        evidenceDoc: "دليل_مقياس_LMMI_الابتكاري_2026.pdf"
    },

    // 1 Organization Prepared for Coaching
    orgPreparation: {
        orgName: "شركة ريادة التقنية للاستشارات والحلول السحابية",
        sector: "قطاع الاتصالات وتقنية المعلومات (الرياض)",
        phases: [
            { phase: "المرحلة الأولى: التشخيص والجاهزية", duration: "3 أسابيع", status: "completed", output: "تقرير استطلاع ثقافة الكوتشنج المؤسسي ونموذج قرافي للمسارات الثلاثة" },
            { phase: "المرحلة الثانية: بناء الخطة الاستراتيجية", duration: "4 أسابيع", status: "completed", output: "تطبيق نموذج Pfeiffer المعدل وإقرار مؤشرات الأثر من مجلس الإدارة" },
            { phase: "المرحلة الثالثة: الإطلاق والتدخل الميداني", duration: "6 أسابيع", status: "completed", output: "كوتشنج 6 قيادات تنفيذية وتدريب 25 مديراً وسيطاً على المهارات الكوتشنجية" },
            { phase: "المرحلة الرابعة: المراجعة وقياس العائد", duration: "2 أسبوعين", status: "completed", output: "تقرير ختامي وتوصيات التحسين وخطة الاستدامة السنوية" }
        ],
        supervisorSignoff: true,
        status: "approved",
        dossierPdf: "مشروع_تهيئة_شركة_ريادة_التقنية_للكوتشنج_المؤسسي.pdf"
    },

    // 5 Professional Audio Recordings on Coaching Topics
    professionalRecordings: [
        {
            id: 1,
            title: "التسجيل 1: فنون إدارة الصمت المهني وتوليد الاستبصار الذاتي",
            topic: "مهارات الحضور والإنصات المتقدم",
            duration: "24:15",
            audioSimulatorId: "audio_01",
            supervisorNotes: "أداء ناضج واستخدام متمكن لطبقات الصوت وتدرج رائع في عمق الأسئلة.",
            timestamps: [
                { time: "03:40", note: "بداية ممتازة في تأطير الجلسة وتحديد المخرج المطلوب بدقة." },
                { time: "11:20", note: "صمت مهني استمر 28 ثانية أتاح للمستفيد استحضار الجذر الحقيقي للمشكلة." },
                { time: "19:15", note: "سؤال قوي محول للوعي: 'ما الذي تخشى فقدانه إذا نجحت في هذه الترقية؟'" }
            ],
            appliedImprovement: "تم تقليل مقاطعة المستفيد بنسبة 100% وتطبيق الصمت كأداة ارتكاز.",
            status: "approved"
        },
        {
            id: 2,
            title: "التسجيل 2: هندسة العقود الكوتشنجية الثلاثية في بيئة الشركات",
            topic: "التعاقد الأخلاقي والمؤسسي",
            duration: "28:30",
            audioSimulatorId: "audio_02",
            supervisorNotes: "توضيح بارع للحدود الفاصلة بين رغبات الإدارة العليا وأهداف المستفيد الشخصية.",
            timestamps: [
                { time: "05:15", note: "حسم مسألة السرية مع ممثل الموارد البشرية بكل ثقة واحترافية." },
                { time: "16:40", note: "صياغة المخرجات القابلة للقياس دون التعهد بنتائج خارج نطاق تحكم المستفيد." },
                { time: "24:00", note: "إقرار آلية الإحالة وإنهاء التعاقد بشفافية تامة." }
            ],
            appliedImprovement: "إضافة ملحق اتفاقية حفظ البيانات المشفرة إلى نماذج التعاقد.",
            status: "approved"
        },
        {
            id: 3,
            title: "التسجيل 3: تفكيك التشوهات المعرفية والمعتقدات المقيدة للقادة",
            topic: "الكوتشنج المعرفي المتقدم",
            duration: "31:45",
            audioSimulatorId: "audio_03",
            supervisorNotes: "تطبيق منهجي رصين لفصل الحقائق عن التأويلات مع الحفاظ الكامل على التحالف الآمن.",
            timestamps: [
                { time: "07:30", note: "التقاط فوري لتشوه التعميم المطلق ('الكل لا يتعاون معي')." },
                { time: "14:50", note: "تحدي الافتراض بأسلوب سقراطي مرن دون استفزاز المستفيد." },
                { time: "27:10", note: "إعادة صياغة المعتقد بطريقة تمكينية عززت دافعية القائد." }
            ],
            appliedImprovement: "استخدام تمارين التوثيق الكتابي الفوري أثناء الحوار لتثبيت الوعي الجديد.",
            status: "approved"
        },
        {
            id: 4,
            title: "التسجيل 4: بروتوكول الكوتشنج المنظومي وإدارة أطراف النزاع",
            topic: "الكوتشنج المنظومي والعلاقاتي",
            duration: "26:50",
            audioSimulatorId: "audio_04",
            supervisorNotes: "إتقان توجيه الحوار نحو النظام ككيان مستقل بدلاً من إلقاء اللوم على الأفراد.",
            timestamps: [
                { time: "04:10", note: "تحديد صوت النظام الغائب وتوجيه السؤال حوله." },
                { time: "15:20", note: "مواءمة الاحتياجات الفردية مع المصلحة المنظومية الكبرى." },
                { time: "22:45", note: "إنهاء الجلسة بالتزام متبادل مكتوب يضمن التناغم التشغيلي." }
            ],
            appliedImprovement: "رسم الخريطة المنظومية على لوح تفاعلي مشترك مع المستفيدين.",
            status: "approved"
        },
        {
            id: 5,
            title: "التسجيل 5: الأخلاقيات التطبيقية وحدود الإحالة في الكوتشنج",
            topic: "الأخلاقيات والممارسة المحمية",
            duration: "25:10",
            audioSimulatorId: "audio_05",
            supervisorNotes: "مرجع تدريبي استثنائي في كيفية التعامل الحازم والرحيم مع علامات الإجهاد الشديد.",
            timestamps: [
                { time: "06:05", note: "رصد علامات التحويل السلبي والإفصاح عنها بلباقة مهنية." },
                { time: "13:30", note: "إيضاح الفرق بين أعراض الصدمة النفسية والتحديات الإدارية." },
                { time: "21:15", note: "تنفيذ إحالة نموذجية إلى اختصاصي نفسي معتمد مع دعم المستفيد إنسانياً." }
            ],
            appliedImprovement: "اعتماد دليل الإحالة السريعة كملحق دائم في حقيبة الماستر كوتش.",
            status: "approved"
        }
    ],

    // 50-Page Applied Research Paper
    researchPaper: {
        title: "فاعلية نموذج الكوتشنج المنظومي المدمج بالذكاء الاصطناعي في تسريع النضج القيادي لدى قادة التحول في المملكة العربية السعودية",
        totalPages: 58,
        minPagesRequired: 50,
        font: "قالب البرنامج الرسمي - خط 14 Tajawal مع توثيق APA 7",
        milestones: [
            { step: 1, name: "المشكلة البحثية ومراجعة الأدبيات", status: "completed", date: "2026-02-15", grade: "ممتاز (5/5)" },
            { step: 2, name: "المنهجية العلمية وأدوات الدراسة", status: "completed", date: "2026-03-10", grade: "ممتاز (5/5)" },
            { step: 3, name: "التحليل الإحصائي ومناقشة النتائج", status: "completed", date: "2026-04-05", grade: "ممتاز (5/5)" },
            { step: 4, name: "الصياغة النهائية والمراجع بنظام APA 7", status: "completed", date: "2026-04-25", grade: "ممتاز (5/5)" }
        ],
        presentationEvent: {
            eventName: "الملتقى السنوي الثاني لتمكين الرؤية للكوتشنج القيادي 2026",
            date: "2026-05-10",
            status: "presented",
            evidenceDoc: "شهادة_وتسجيل_عرض_الورقة_العلمية_الملتقى_2026.pdf"
        },
        rubricScore: 4.95,
        status: "approved"
    },

    // Graduation Innovation Project
    graduationProject: {
        title: "منظومة 'تمكين 360' للذكاء الكوتشنجي: إطار تطبيقي يدمج مقياس LMMI ونموذج بوصلة التمكين الخماسي في البيئات المؤسسية المعقدة",
        relationToModels: "يطور النموذج الابتكاري الأول (بوصلة التمكين) والأداة الابتكارية المعتمدة (LMMI)",
        defenseDate: "2026-05-20",
        juryChair: "الماستر كوتش عبدالكريم الخليفي",
        juryMembers: ["د. عبدالكريم الخليفي (رئيساً)", "أ.د. فهد السبيعي (عضواً علمياً)", "كوتش منى التميمي (عضواً مهنياً MCC)"],
        juryVerdict: "مجاز بتقدير ممتاز مع مرتبة الشرف الأولى والتوصية بالنشر والتطبيق المؤسسي",
        score: 4.90,
        status: "approved"
    },

    // 9 Specialized Labs
    labs: [
        { id: 1, name: "مختبر الجاهزية المهنية والتحقق القبلي", hours: 3.5, date: "2026-01-20", status: "completed", topics: "فحص متطلبات PCC/CPC، واستطلاع التوقعات، وبناء خطة التطوير الفردية." },
        { id: 2, name: "مختبر إدارة الجلسات المتقدمة والتيسير", hours: 3.5, date: "2026-01-27", status: "completed", topics: "الحوار السقراطي، التساؤل المولد للوعي، والسيطرة على الوقت وتدفق الجلسة." },
        { id: 3, name: "مختبر تحليل الحالات وتفكيك المشكلات", hours: 3.5, date: "2026-02-03", status: "completed", topics: "منهجية 5 Whys، شجرة القرارات، وفصل الوقائع عن المشاعر والتأويلات." },
        { id: 4, name: "مختبر المحاكاة وتبادل الأدوار الرباعي", hours: 4.0, date: "2026-02-17", status: "completed", topics: "تبادل أدوار: ماستر كوتش، مستفيد، ملاحظ خبير، ومشرف في حالات حية معقدة." },
        { id: 5, name: "مختبر الإشراف وتطوير الممارسين والأقران", hours: 3.5, date: "2026-03-02", status: "completed", topics: "تقديم التغذية الراجعة المهنية، التعامل مع المقاومة، وبناء خطط الإشراف الفردي." },
        { id: 6, name: "مختبر التوثيق والأرشفة المعيارية للممارسة", hours: 3.0, date: "2026-03-16", status: "completed", topics: "حوكمة السجلات، استمارات الجلسات، بنك الأدلة، وتصميم ملف الإنجاز الشامل." },
        { id: 7, name: "مختبر توظيف الذكاء الاصطناعي المسؤول في الكوتشنج", hours: 3.0, date: "2026-03-30", status: "completed", topics: "تحليل البيانات منزوعة الهوية، هندسة الأوامر الكوتشنجية، وضمان التدقيق البشري والسرية." },
        { id: 8, name: "مختبر ضبط الجودة والمعايير المهنية والروبركات", hours: 3.0, date: "2026-04-13", status: "completed", topics: "فهم واستخدام الروبركات الستة، تقييم الأداء، وتفادي فخاخ التقييم السطحي." },
        { id: 9, name: "مختبر التفكير التأملي والإشراف الذاتي واليقظة", hours: 3.0, date: "2026-04-27", status: "completed", topics: "التأمل الرباعي، التعامل مع الإرهاق والتحويل العاطفي، واليقظة الذهنية للكوتش." }
    ],

    // The 6 Official Rubrics (5 Performance Levels: 1=ضعيف, 2=مقبول, 3=جيد, 4=جيد جداً, 5=ممتاز)
    rubrics: [
        {
            id: "R1",
            code: "sessions",
            title: "روبرك الجلسات المهنية الميدانية",
            targetWeight: 100,
            criteria: [
                {
                    id: "R1-C1",
                    name: "هيكل الجلسة وإدارة الوقت",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "تسجيل الجلسة #08 ودقة الالتزام بالوقت والمخرج",
                    supervisorFeedback: "بداية محكمة وانتقال سلس ومخرج واضح ومتفق عليه.",
                    requiredImprovement: "مواصلة الحفاظ على الإيقاع الزمني وضبط دقة الانتقال بين مرحلة الاستكشاف ومرحلة الإجراءات.",
                    levelsDesc: {
                        1: "ضعيف: عشوائية في إدارة الوقت وغياب الهيكل الواضح أو سيطرة الكوتش على الحديث.",
                        2: "مقبول: وجود هيكل عام للجلسة لكن مع ارتباك في الانتقالات أو تجاوز ملحوظ للوقت.",
                        3: "جيد: التزام جيد بهيكل الجلسة والوقت مع وضوح نسبي في صياغة المخرج المرغوب.",
                        4: "جيد جداً: إدارة ممتازة للهيكل وتدفق مرن ومخرج متفق عليه ومحدد بدقة.",
                        5: "ممتاز: احترافية متناهية، مخرج دقيق، تدفق طبيعي بارع وتوزيع متوازن للوقت دون أي توجيه."
                    }
                },
                {
                    id: "R1-C2",
                    name: "ملاءمة النموذج وتبريره المنهجي",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "تقرير تبرير اختيار نموذج بوصلة التمكين للجلسة #08",
                    supervisorFeedback: "مبررات رصينة ربطت بين نمط المستفيد والنموذج بشكل علمي مبهر.",
                    requiredImprovement: "توثيق بديلين منهجيين إضافيين عند تكييف النموذج في الحالات القيادية المركبة.",
                    levelsDesc: {
                        1: "ضعيف: فرض نموذج جاهز لا يناسب احتياج المستفيد أو جمود في التطبيق.",
                        2: "مقبول: استخدام نموذج مألوف دون تبرير واضح لسبب اختياره في هذه الحالة.",
                        3: "جيد: اختيار نموذج مناسب مع تقديم مبررين مقنعين على الأقل لطبيعة الحالة.",
                        4: "جيد جداً: مواءمة عالية للنموذج مع تقديم 3 مبررات منهجية رصينة ومرونة في التعديل.",
                        5: "ممتاز: تكامل منهجي بديع، تبرير متعدد الأبعاد، وتكييف استثنائي للنموذج يخدم المستفيد."
                    }
                },
                {
                    id: "R1-C3",
                    name: "التوثيق والتحليل والربط الاستبصاري",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "تقرير جلسة تفصيلي يفصل بين أقوال المستفيد وتحليل الكوتش",
                    supervisorFeedback: "توثيق معياري يعكس عمق الفهم دون أي تنظير زائد.",
                    requiredImprovement: "تعزيز الربط بين الاستبصارات الذهنية وتطبيقات المستفيد اليومية في بيئة العمل.",
                    levelsDesc: {
                        1: "ضعيف: توثيق ناقص أو خلط تام بين الوقائع والانطباعات الشخصية.",
                        2: "مقبول: توثيق سطحي يلخص الجلسة دون تحليل استبصاري أو تتبع للأنماط.",
                        3: "جيد: توثيق منظم يفصل الوقائع عن التحليلات مع رصد أهم الاستبصارات.",
                        4: "جيد جداً: توثيق متقدم يربط بين الجلسات السابقة ويرصد تحولات التفكير والسلوك.",
                        5: "ممتاز: توثيق نموذجي رصين، تحليل منظومي للأفكار والمشاعر، ورؤية تكاملية مبهرة."
                    }
                },
                {
                    id: "R1-C4",
                    name: "الأخلاقيات وحماية الخصوصية (معيار حرج)",
                    weight: 0.20,
                    isCritical: true,
                    currentLevel: 5,
                    evidence: "إقرار السرية المستنير ونزع الهوية الرقمية في التسجيل",
                    supervisorFeedback: "حماية تامة للمعلومات والتزام صارم بحدود الاختصاص.",
                    requiredImprovement: "الحفاظ الصارم والمستمر على بروتوكول نزع الهوية والتأكد من إخفاء أي ملامح صوتية دالة.",
                    levelsDesc: {
                        1: "ضعيف (إخفاق مباشر): أي انتهاك للسرية أو تجاوز لحدود الممارسة أو تضارب مصالح.",
                        2: "مقبول: التزام سطحي مع غفلة عن بعض تفاصيل حماية البيانات أو التنبيه المبكر.",
                        3: "جيد: التزام صريح بالمعايير الأخلاقية ونزع المعرفات وتطبيق الميثاق المعتمد.",
                        4: "جيد جداً: يقظة أخلاقية عالية، ميثاق موقع، وتحديد فوري لأي شبهة تضارب مصالح.",
                        5: "ممتاز: مناعة أخلاقية مطلقة، بيئة أمان نفسي استثنائية، وشفافية وحوكمة صارمة."
                    }
                },
                {
                    id: "R1-C5",
                    name: "الأثر الملحوظ والتحول لدى المستفيد",
                    weight: 0.20,
                    currentLevel: 4,
                    evidence: "استمارة الأثر البعدي وشهادة المستفيد في جلسة الإغلاق",
                    supervisorFeedback: "تحول ملموس في سلوك المستفيد وقراراته التنفيذية.",
                    requiredImprovement: "متابعة قياس الأثر بعد 3 أشهر من جلسة الإغلاق للتأكد من استدامة العادات القيادية الجديدة.",
                    levelsDesc: {
                        1: "ضعيف: لا يوجد أثر ملحوظ أو خروج المستفيد بحالة إحباط وتشتت.",
                        2: "مقبول: ارتياح عاطفي عام دون توليد التزامات سلوكية أو خطة عمل واضحة.",
                        3: "جيد: استبصار واضح وخروج بخطوات إجرائية يلتزم المستفيد بتطبيقها وقياسها.",
                        4: "جيد جداً: تحول سلوكي مقاس، اتخاذ قرارات شجاعة، ونتائج إيجابية موثقة في بيئة العمل.",
                        5: "ممتاز: تحول جوهري في العقلية والأداء مع وجود ما لا يقل عن 3 مؤشرات أثر نوعية ومقاسة."
                    }
                }
            ]
        },
        {
            id: "R2",
            code: "portfolio",
            title: "روبرك ملف الإنجاز المهني الشامل",
            targetWeight: 100,
            criteria: [
                {
                    id: "R2-C1",
                    isCritical: true,
                    name: "الاكتمال والشمولية لجميع متطلبات البرنامج",
                    weight: 0.25,
                    currentLevel: 5,
                    evidence: "استيفاء 240 ساعة، 20 حالة، 30 جلسة، 90 أداة، 10 نماذج، وغيرها",
                    supervisorFeedback: "الملف مستوفٍ لجميع المكونات دون أي نقص كمي أو نوعي.",
                    requiredImprovement: "استمرار المراجعة الدورية للأدلة المرفوعة ومطابقتها لضوابط الاعتماد الصادرة من تمكين.",
                    levelsDesc: {
                        1: "ضعيف: نقص حاد في ملفات المهام الرئيسية أو غياب الأقسام المحورية.",
                        2: "مقبول: وجود معظم الأقسام مع نقص ملحوظ في الأدلة الثبوتية أو الساعات.",
                        3: "جيد: اكتمال الأقسام الرئيسية والأعداد الأساسية مع بعض الثغرات البسيطة.",
                        4: "جيد جداً: اكتمال شامل لكافة متطلبات الحقيبة ببيانات دقيقة ومنظمة.",
                        5: "ممتاز: شمولية فائقة، وفاء كامل بكافة المتطلبات الأساسية والمسارات الداعمة بأعلى تنظيم."
                    }
                },
                {
                    id: "R2-C2",
                    name: "جودة التوثيق والتنظيم المنهجي",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "هيكلية الملف الرقمي، الفهرسة، والترميز الموحد للملفات",
                    supervisorFeedback: "تنظيم إلكتروني فائق السلاسة يسهل فحص الأدلة والوصول إليها.",
                    requiredImprovement: "تضمين فهرس تشعيبي تفاعلي يتيح التنقل المباشر بين الأدلة المتقاطعة.",
                    levelsDesc: {
                        1: "ضعيف: فوضى في الملفات وصعوبة تتبع الأدلة وأخطاء جسيمة في التسميات.",
                        2: "مقبول: تنظيم بدائي يفي بالغرض بصعوبة ويحتاج إلى إعادة تصنيف وتنسيق.",
                        3: "جيد: توثيق مرتب وواضح مع فهرس يربط المستندات بأسلوب مقبول.",
                        4: "جيد جداً: تنظيم احترافي عالي الدقة وسهولة متناهية في التتبع والمراجعة.",
                        5: "ممتاز: تحفة توثيقية إلكترونية، واجهات منظمة، ترقيم موحد ومعايير حوكمة رفيعة."
                    }
                },
                {
                    id: "R2-C3",
                    name: "عمق التأمل المهني واستخلاص الدروس",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "استمارات التأمل الرباعية المعتمدة لجميع الممارسات",
                    supervisorFeedback: "تأملات ناضجة تظهر شجاعة الاعتراف بالثغرات والتحسين المستمر.",
                    requiredImprovement: "التركيز على مساءلة الافتراضات المسبقة في مواقف التردد الكوتشنجي.",
                    levelsDesc: {
                        1: "ضعيف: تأمل سطحي مقتضب يكرر سرد ما حدث دون تحليل أو مساءلة ذاتية.",
                        2: "مقبول: تأمل تقليدي يجيب على الأسئلة دون عمق في بيان 'لماذا' أو التحسين المستقبلي.",
                        3: "جيد: تأمل منظم يجيب بوعي على الأسئلة الأربعة ويستخلص دروساً واقعية.",
                        4: "جيد جداً: عمق تأملي متقدم، شفافية في نقد الممارسة، وربط التحسين بالأثر المستقبلي.",
                        5: "ممتاز: نضج فكري واستبصار ذاتي استثنائي يمثل عقلية الماستر كوتش في التطوير المستمر."
                    }
                },
                {
                    id: "R2-C4",
                    isCritical: true,
                    name: "الربط المنهجي المحكم بالكفايات الـ 43",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "جدول مصفوفة الكفايات وربط كل دليل بكفايته المعتمدة",
                    supervisorFeedback: "مصفوفة جدارات نموذجية توضح أين وكيف تحققت كل كفاية.",
                    requiredImprovement: "تحديث مصفوفة الربط دورياً مع كل إعادة تسليم أو استكمال لأدلة المحاور المتقدمة.",
                    levelsDesc: {
                        1: "ضعيف: إيداع الأدلة عشوائياً دون أي ربط بمصفوفة الكفايات المعتمدة.",
                        2: "مقبول: ربط عام بالمحاور دون تحديد الكفايات الفرعية أو أسلوب إثباتها.",
                        3: "جيد: ربط صحيح لأغلب الأدلة بالكفايات المحددة مع وضوح العلاقة.",
                        4: "جيد جداً: ربط محكم وشامل يغطي المحاور الثمانية بأدلة متطابقة مع التوصيف.",
                        5: "ممتاز: تكامل منهجي بديع يبرهن تحقق الكفايات الـ 43 بأدلة متقاطعة وموثوقة."
                    }
                },
                {
                    id: "R2-C5",
                    name: "جودة وموثوقية الأدلة وصحتها الميدانية",
                    weight: 0.15,
                    currentLevel: 5,
                    evidence: "تسجيلات صوتية حقيقية، نماذج موقعة، وتقارير مختومة",
                    supervisorFeedback: "أدلة حية وملموسة وموثقة تثبت الممارسة الواقعية الرصينة.",
                    requiredImprovement: "أرشفة كافة المستندات الورقية الممسوحة ضوئياً بجودة عالية وشهادات إيداع رقمية.",
                    levelsDesc: {
                        1: "ضعيف: أدلة مشكوك في صحتها أو نماذج افتراضية غير واقعية أو منسوخة.",
                        2: "مقبول: أدلة مقبولة لكن تفتقر لبيانات التأكيد كالتواريخ والتوقيعات والموافقات.",
                        3: "جيد: أدلة موثوقة ومكتملة تثبت الممارسة الفعلية مع المستفيدين.",
                        4: "جيد جداً: أدلة متقدمة وموثقة بمحاضر وإقرارات ومخرجات عمل ميدانية حقيقية.",
                        5: "ممتاز: أدلة دامغة فائقة الرصانة، تسجيلات صوتية متمكنة، وتقارير أثر مؤسسية معتمدة."
                    }
                }
            ]
        },
        {
            id: "R3",
            code: "research_paper",
            title: "روبرك الورقة العلمية التطبيقية",
            targetWeight: 100,
            criteria: [
                {
                    id: "R3-C1",
                    name: "وضوح المشكلة البحثية وأهميتها التطبيقية",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "الفصل الأول من البحث وتأطير فجوة النضج القيادي في بيئات التحول",
                    supervisorFeedback: "مشكلة بحثية ذات صلة وثيقة وواقعية بسوق الكوتشنج السعودي.",
                    requiredImprovement: "توسيع العينة الاستطلاعية في الدراسات المستقبلية لتشمل قطاعات غير ربحية.",
                    levelsDesc: {
                        1: "ضعيف: مشكلة غامضة أو عامة مكررة لا تقدم أي إضافة ميدانية للكوتشنج.",
                        2: "مقبول: مشكلة واضحة لكن تفتقر للربط الميداني بالممارسة المعاصرة.",
                        3: "جيد: صياغة دقيقة للمشكلة البحثية مع بيان أهميتها التطبيقية لمهنة الكوتشنج.",
                        4: "جيد جداً: مشكلة محددة ومؤطرة إحصائياً وتطبيقياً مع وضوح الفجوة المعرفية.",
                        5: "ممتاز: طرح إشكالي استثنائي، تشخيص دقيق لفجوة حيوية وإسهام نوعي في الميدان."
                    }
                },
                {
                    id: "R3-C2",
                    name: "عمق الأساس النظري ومراجعة الأدبيات الحديثة",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "مراجعة 42 مرجعاً حديثاً (2020-2026) في الكوتشنج والقيادة",
                    supervisorFeedback: "مسح أدبي رصين يجمع بين التراث القيادي وأحدث دراسات الأعصاب.",
                    requiredImprovement: "متابعة أحدث الأوراق المحكمة المنشورة في عام 2026 حول الذكاء الاصطناعي في الكوتشنج.",
                    levelsDesc: {
                        1: "ضعيف: فقر في المراجع واعتماد على مقالات عامة غير محكمة وتاريخ قديم.",
                        2: "مقبول: مراجعة سطحية لعدد محدود من الأدبيات دون نقد أو مقارنة منهجية.",
                        3: "جيد: مسح جيد للأدبيات ذات الصلة مع توظيف مراجع محكمة وحديثة.",
                        4: "جيد جداً: عمق نظري متميز ومقارنة نقدية بين النماذج والمدارس المختلفة.",
                        5: "ممتاز: إحاطة شمولية واسعة، تحليل نقدي مقارن متطور، واستناد لأحدث ما وصل إليه العلم."
                    }
                },
                {
                    id: "R3-C3",
                    name: "رصانة المنهجية والأدوات وتكاملها",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "المنهج المختلط (Mixed Methods) والاستبانة الموزونة والمقابلات المقننة",
                    supervisorFeedback: "تصميم منهجي متقن يضمن صدق وثبات النتائج وتطبيقها.",
                    requiredImprovement: "توثيق إجراءات الصدق والثبات للأدوات النوعية المكملة في ملاحق البحث.",
                    levelsDesc: {
                        1: "ضعيف: منهجية عشوائية أو أدوات تفتقر لأبسط معايير الصدق والثبات.",
                        2: "مقبول: منهجية تقليدية ذات أدوات بسيطة لا تغطي كافة تساؤلات البحث.",
                        3: "جيد: تصميم منهجي ملائم مع توضيح أدوات جمع البيانات وإجراءات التطبيق.",
                        4: "جيد جداً: منهجية رصينة ومحكمة وتكامل دقيق بين الأدوات والتحليل.",
                        5: "ممتاز: تصميم منهجي إبداعي، ضبط كامل للمتغيرات، وأدوات محكمة وموثوقة إحصائياً."
                    }
                },
                {
                    id: "R3-C4",
                    name: "جودة التحليل ومناقشة النتائج واستخلاص التوصيات",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "الفصل الرابع ومناقشة تقاطعات الأثر وتوصيات التطبيق للمنظمات",
                    supervisorFeedback: "تحليل ناضج يربط الأرقام بالسلوك الكوتشنجي والواقع التنظيمي.",
                    requiredImprovement: "تعميق المقارنة بين نتائج التطبيق المحلي والدراسات العالمية المشابهة.",
                    levelsDesc: {
                        1: "ضعيف: تحليل سطحي أو قراءة مجردة للأرقام دون تفسير علمي مقنع.",
                        2: "مقبول: عرض للنتائج مع مناقشة محدودة وتوصيات عامة غير قابلة للتطبيق.",
                        3: "جيد: تحليل سليم يربط النتائج بتساؤلات البحث ويقدم توصيات محددة.",
                        4: "جيد جداً: مناقشة عميقة تربط النتائج بالأدبيات وتقدم مقترحات إجرائية واعدة.",
                        5: "ممتاز: مناقشة فذة، استبصار تحليلي مبهر، وما لا يقل عن 3 توصيات استراتيجية قابلة للتنفيذ."
                    }
                },
                {
                    id: "R3-C5",
                    isCritical: true,
                    name: "سلامة التوثيق الأكاديمي بنظام APA 7 والالتزام بالقالب",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "استيفاء 58 صفحة، قالب الخط 14 الرسمي، والتوثيق المرجعي الدقيق",
                    supervisorFeedback: "تنسيق أكاديمي خلو من الأخطاء وتوثيق ببليوجرافي منضبط.",
                    requiredImprovement: "الحفاظ على دقة التوثيق المرجعي الإلكتروني (DOI) لكافة المصادر الرقمية.",
                    levelsDesc: {
                        1: "ضعيف: خروقات جسيمة لأسس التوثيق أو انتحال علمي أو تجاهل تام لقالب البرنامج.",
                        2: "مقبول: محاولة توثيق لكن مع كثرة الأخطاء التنسيقية وعدم الالتزام بصفحات الحد الأدنى.",
                        3: "جيد: التزام جيد بنظام APA 7 واستيفاء حجم الصفحات المقرر مع أخطاء طفيفة.",
                        4: "جيد جداً: دقة أكاديمية عالية في التوثيق الداخلي وقائمة المراجع وتنسيق القالب.",
                        5: "ممتاز: خلو تام من أي هفوات، انضباط مطلق بنظام APA الإصدار السابع وقالب تمكين."
                    }
                }
            ]
        },
        {
            id: "R4",
            code: "innovation_project",
            title: "روبرك المشروع الابتكاري (مشروع التخرج)",
            targetWeight: 100,
            criteria: [
                {
                    id: "R4-C1",
                    name: "الأصالة والجدة والقيمة المضافة",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "دمج مقياس LMMI مع بوصلة التمكين الخماسي في منظومة تمكين 360",
                    supervisorFeedback: "ابتكار عربي خالص يسد ثغرة حقيقية في سوق الكوتشنج المؤسسي.",
                    requiredImprovement: "استكمال إجراءات تسجيل الملكية الفكرية لدى الهيئة السعودية للملكية الفكرية.",
                    levelsDesc: {
                        1: "ضعيف: فكرة منسوخة أو مكررة دون أي لمسة إبداعية أو قيمة مضافة.",
                        2: "مقبول: تطوير طفيف جداً لأداة معروفة دون مبرر ابتكاري كافٍ.",
                        3: "جيد: مشروع يتمتع بأصالة جيدة ويقدم إضافة ملموسة للممارسة.",
                        4: "جيد جداً: ابتكار واضح المعالم يجمع بين الأصالة وحل مشكلة مهنية مستعصية.",
                        5: "ممتاز: ابتكار ريادي فارق، أصالة متكاملة، وقيمة مضافة كبرى لمنظومة الكوتشنج."
                    }
                },
                {
                    id: "R4-C2",
                    name: "الجدوى والقابلية للتطبيق الميداني والتوسع",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "دراسة الجدوى الميدانية وتطبيقه الأولي على شركة تقنية رائدة",
                    supervisorFeedback: "مشروع قابل للنمو والتحول إلى منتج مرخص SaaS أو تدريبي.",
                    requiredImprovement: "تطوير دليل استخدام مبسط يمكن المنظمات من تبني المنظومة ذاتياً.",
                    levelsDesc: {
                        1: "ضعيف: مشروع نظري بحت أو معقد جداً يستحيل تطبيقه على أرض الواقع.",
                        2: "مقبول: قابلية تطبيق محدودة في ظروف مثالية دون جاهزية للتوسع المؤسسي.",
                        3: "جيد: قابلية تطبيق مؤكدة مع وضوح المتطلبات والموارد اللازمة للتشغيل.",
                        4: "جيد جداً: نموذج عمل مرن وسهل التبني من قبل المنظمات والممارسين.",
                        5: "ممتاز: جاهزية إنتاجية كاملة، مرونة استثنائية وقابلية فورية للانتشار والتمويل."
                    }
                },
                {
                    id: "R4-C3",
                    name: "دقة التخطيط ومراحل التنفيذ ومؤشرات الأداء",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "مخطط جانت التفصيلي، مصفوفة المخاطر، ولوحة مؤشرات الأداء",
                    supervisorFeedback: "إدارة مشاريع احترافية ترتقي لمستوى الشركات الاستشارية الكبرى.",
                    requiredImprovement: "وضع خطة إدارة مخاطر تفصيلية لمراحل التوسع المؤسسي للمشروع.",
                    levelsDesc: {
                        1: "ضعيف: غياب خطة العمل أو غموض تام في المراحل والمسؤوليات والمواعيد.",
                        2: "مقبول: خطة عمل عامة تفتقر لمؤشرات أداء واضحة أو آلية لإدارة المخاطر.",
                        3: "جيد: تخطيط منظم يحدد المراحل والمخرجات والمدد الزمنية المتوقعة.",
                        4: "جيد جداً: خطة محكمة بمؤشرات أداء مقاسة (KPIs) وبدائل واضحة لإدارة المخاطر.",
                        5: "ممتاز: خارطة طريق استراتيجية متقنة ومؤشرات كمية ونوعية دقيقة وحوكمة صارمة."
                    }
                },
                {
                    id: "R4-C4",
                    name: "قياس الأثر الميداني ونتائج التجربة الفعلية",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "نتائج التجربة الاستطلاعية وشهادات قيادات المنظمة المستفيدة",
                    supervisorFeedback: "أثر ملموس بالبيانات يثبت العائد التطويري للمنظومة.",
                    requiredImprovement: "بناء مؤشرات أداء نوعية تقيس التحول الثقافي بعيد المدى في المؤسسة المستفيدة.",
                    levelsDesc: {
                        1: "ضعيف: لا يوجد أي اختبار ميداني أو إثبات للأثر الفعلي على المستفيدين.",
                        2: "مقبول: تجربة أولية محدودة دون قياس علمي للأثر أو استطلاع منهجي للرأي.",
                        3: "جيد: اختبار ميداني موثق يثبت نتائج إيجابية ملحوظة على عينة مستفيدة.",
                        4: "جيد جداً: قياس كمي ونوعي للأثر بمؤشرات مقارنة قبل وبعد تطبيق المشروع.",
                        5: "ممتاز: نتائج ميدانية باهرة مدعومة بما لا يقل عن 3 مؤشرات أثر نوعية موثقة."
                    }
                },
                {
                    id: "R4-C5",
                    isCritical: true,
                    name: "الدفاع الرصين أمام اللجنة العلمية والتحكيم",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "عرض الدفاع المرئي أمام لجنة تمكين برئاسة الماستر كوتش الخليفي",
                    supervisorFeedback: "ثبات علمي وتمكن حواري وقدرة فائقة على تفكيك الأسئلة المعقدة.",
                    requiredImprovement: "تعزيز مهارات الإيجاز البصري في الشرائح أثناء العروض العلمية أمام اللجان.",
                    levelsDesc: {
                        1: "ضعيف: ارتباك وعجز عن تبرير خطوات المشروع أو الإجابة على استفسارات اللجنة.",
                        2: "مقبول: إجابات مترددة أو دفاع دفاعي غير موضوعي في مواجهة الملاحظات.",
                        3: "جيد: عرض واضح واستيعاب لملاحظات اللجنة والرد بثقة مقبولة.",
                        4: "جيد جداً: تمكن ملحوظ وإجابات رصينة مبنية على البيانات والحجج المنهجية.",
                        5: "ممتاز: إبهار علمي وحضور قيادي استثنائي ورصانة بالغة في تفنيد التحديات."
                    }
                }
            ]
        },
        {
            id: "R5",
            code: "final_interview",
            title: "روبرك المقابلة الختامية للماستر كوتش",
            targetWeight: 100,
            criteria: [
                {
                    id: "R5-C1",
                    name: "الفهم المهني الشامل والتمكن النظري والمنهجي",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "محضر المقابلة الشفهية واختبار المفاهيم المتقدمة",
                    supervisorFeedback: "عمق موسوعي واستحضار فوري لمدارس ونظريات الكوتشنج العالمية.",
                    requiredImprovement: "مواصلة الاطلاع على التطورات المعيارية للاتحاد الدولي للكوتشنج لعام 2026.",
                    levelsDesc: {
                        1: "ضعيف: معرفة سطحية بالمفاهيم الأساسية أو تخبط في توضيح فلسفة الكوتشنج.",
                        2: "مقبول: استيعاب للمفاهيم العامة دون إحاطة بالنظريات المتقدمة وأبعادها.",
                        3: "جيد: فهم نظري رصين وقدرة على الشرح الواضح لأهم المدارس والنماذج.",
                        4: "جيد جداً: تمكن معرفي متقدم والقدرة على المقارنة والربط بين النظريات وتطبيقاتها.",
                        5: "ممتاز: مرجعية معرفية فائقة واستيعاب فلسفي عميق يعكس استحقاق لقب الماستر."
                    }
                },
                {
                    id: "R5-C2",
                    name: "التفكير النقدي وسرعة البديهة في تفكيك الأسئلة",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "التعامل مع السيناريوهات المفاجئة والمعقدة التي طرحتها اللجنة",
                    supervisorFeedback: "تحليل منهجي هادئ قبل الإجابة وعدم التسرع في إطلاق الأحكام.",
                    requiredImprovement: "تعميق تبرير المفاضلة بين المدارس الاستشارية المختلفة في الحالات الشائكة.",
                    levelsDesc: {
                        1: "ضعيف: تسرع في الإجابة أو عجز عن فهم المقصد الكامن وراء تساؤلات اللجنة.",
                        2: "مقبول: إجابات نمطية مكررة تفتقر للتحليل النقدي وعمق المعالجة.",
                        3: "جيد: تفكيك واعي للسؤال وطرح إجابات عقلانية متزنة تعكس تفكيراً نقدياً.",
                        4: "جيد جداً: قدرة عالية على فحص الافتراضات وتقديم حلول نقدية متماسكة.",
                        5: "ممتاز: ذكاء حواري استثنائي، تفكيك منهجي رصين، وبديهة حاضرة في أعقد القضايا."
                    }
                },
                {
                    id: "R5-C3",
                    name: "النزاهة والوعي الأخلاقي العميق (معيار حرج)",
                    weight: 0.20,
                    isCritical: true,
                    currentLevel: 5,
                    evidence: "حل سيناريو الإفصاح وحدود تضارب المصالح المطروح في المقابلة",
                    supervisorFeedback: "موقف أخلاقي مبدئي حاسم لا يقبل التهاون مع مراعاة الحكمة.",
                    requiredImprovement: "تحديث سجل الإحالات بصفة مستمرة لضمان سرعة التصرف في المواقف الطارئة.",
                    levelsDesc: {
                        1: "ضعيف (إخفاق مباشر): أي تساهل أو تخبط في المعايير الأخلاقية أو تبرير الانتهاكات.",
                        2: "مقبول: إدراك للميثاق العام مع تردد في السيناريوهات الرمادية المعقدة.",
                        3: "جيد: التزام أخلاقي صريح وحسم السيناريوهات بما يوافق ميثاق المهنة.",
                        4: "جيد جداً: حساسية أخلاقية فائقة وتبرير دقيق للقرارات في الحالات الشائكة.",
                        5: "ممتاز: صمام أمان أخلاقي مطلق وقدوة مهنية تحتذى في النزاهة وحماية المستفيد."
                    }
                },
                {
                    id: "R5-C4",
                    name: "تبرير القرارات والتدخلات الكوتشنجية الميدانية",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "الدفاع عن القرارات المتخذة في الحالات الميدانية العشرين",
                    supervisorFeedback: "حجج علمية منطقية وراء كل خطوة تم اتخاذها مع المستفيدين.",
                    requiredImprovement: "توثيق خلفية القرارات غير التقليدية المتخذة أثناء الجلسات المعقدة.",
                    levelsDesc: {
                        1: "ضعيف: عجز عن تبرير أسباب استخدام أداة أو تغيير مسار جلسة سابقة.",
                        2: "مقبول: تبريرات عامة تعتمد على الحدس والانطباع دون سند منهجي واضح.",
                        3: "جيد: تقديم تبريرات منطقية مستندة إلى استجابات المستفيد وسياق الحالة.",
                        4: "جيد جداً: دفاع علمي متين يربط كل تدخل بنظرية معتمدة ومؤشر تقدم واقعي.",
                        5: "ممتاز: انسجام منهجي خارق، تبريرات مدعمة بالأدلة، وتفسير متقن لأدق التفاصيل."
                    }
                },
                {
                    id: "R5-C5",
                    name: "الجاهزية الشاملة للقيادة المهنية والاعتماد",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "تقييم أعضاء اللجنة العلمية لسمات الماستر كوتش والاتزان الانفعالي",
                    supervisorFeedback: "جاهزية كاملة لتمثيل المنظومة محلياً وإقليمياً وقيادة الممارسين.",
                    requiredImprovement: "الاستعداد لقيادة برامج الإشراف والمساهمة في بناء أجيال الكوتشز القادمة.",
                    levelsDesc: {
                        1: "ضعيف: تشتت وافتقار للسمات القيادية أو النضج الانفعالي المطلوب للماستر كوتش.",
                        2: "مقبول: جاهزية جزئية تتطلب إشرافاً مكثفاً ومزيداً من النضج قبل الاعتماد الكامل.",
                        3: "جيد: جاهزية طيبة تؤهله للممارسة المستقلة وإرشاد الكوتشز المبتدئين.",
                        4: "جيد جداً: حضور قيادي واثق، اتزان انفعالي عالٍ، واستحقاق واضح للاعتماد.",
                        5: "ممتاز: كفاءة قيادية ملهمة، نضج شخصي ومهني متكامل وجدارة تامة بمرتبة الماستر."
                    }
                }
            ]
        },
        {
            id: "R6",
            code: "supervision_rubric",
            title: "روبرك الإشراف المهني الفردي والجماعي",
            targetWeight: 100,
            criteria: [
                {
                    id: "R6-C1",
                    name: "الانتظام والمشاركة الفعالة والالتزام بالساعات",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "سجل الحضور لـ 20 ساعة إشراف كاملة دون أي غياب",
                    supervisorFeedback: "انضباط مهني يحتذى به وتفاعل إيجابي يثري جلسات الإشراف.",
                    requiredImprovement: "الحفاظ على وتيرة الحضور النشط وإثراء النقاشات الجمعية بخبرات الميدان.",
                    levelsDesc: {
                        1: "ضعيف: تكرار الغياب أو التأخر وسلبية تامة أثناء مناقشة الحالات.",
                        2: "مقبول: حضور رسمي دون إسهام فاعل أو استعداد مسبق للحالات المطروحة.",
                        3: "جيد: التزام بالموعد ومشاركة إيجابية في استعراض الحالات والملاحظات.",
                        4: "جيد جداً: تحضير ممتاز، حضور مبكر، وإثراء نوعي للنقاشات الإشرافية.",
                        5: "ممتاز: شغف معرفي وانضباط نموذجي، ومبادرة مستمرة لطرح التحديات العميقة."
                    }
                },
                {
                    id: "R6-C2",
                    name: "رصانة عرض الحالات والتحديات الميدانية والشفافية",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "ملفات عرض الحالات في جلسات الإشراف الفردي والجماعي",
                    supervisorFeedback: "شفافية عالية وشجاعة في عرض اللحظات الصعبة دون تلميع.",
                    requiredImprovement: "استمرار المبادرة بعرض التحديات الأكثر حساسية دون تردد.",
                    levelsDesc: {
                        1: "ضعيف: إخفاء التحديات أو تقديم عروض مشوهة تبرز فقط النجاحات المصطنعة.",
                        2: "مقبول: عرض سطحي للحالات يغفل التفاصيل المعقدة ونقاط الضعف الحقيقية.",
                        3: "جيد: عرض منظم وشفاف للحالة مع تحديد السؤال الإشرافي بدقة ووضوح.",
                        4: "جيد جداً: تفكيك احترافي لعناصر الحالة وتقديم تسجيلات للمواضع الحرجة للمراجعة.",
                        5: "ممتاز: شجاعة وشفافية مطلقة، وعي مسبق بنقاط العماء، وصياغة بارعة للأسئلة الإشرافية."
                    }
                },
                {
                    id: "R6-C3",
                    name: "تقبل التغذية الراجعة والعمى الإشرافي بمرونة",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "سجلات التغذية الراجعة وعدم تسجيل أي دفاعية في الجلسات",
                    supervisorFeedback: "تقبل رحب وتواضع علمي وامتصاص واعي لملاحظات المشرف.",
                    requiredImprovement: "توثيق الأثر النفسي للتغذية الإشرافية في استمارة التأمل الذاتي.",
                    levelsDesc: {
                        1: "ضعيف: دفاعية حادة وتبرير دائم ورفض الاعتراف بالأخطاء أو الملاحظات.",
                        2: "مقبول: قبول ظاهري للتغذية الراجعة مصحوب ببرود أو مقاومة غير معلنة.",
                        3: "جيد: تقبل إيجابي لملاحظات المشرف وتدوينها لاستثمارها في الممارسة.",
                        4: "جيد جداً: ترحيب صادق بالنقد البناء وطلب استيضاحات لتعميق الفهم والتصحيح.",
                        5: "ممتاز: عقلية نمو مذهلة، تحويل كل ملاحظة إلى وقود للتطوير والارتقاء الذاتي."
                    }
                },
                {
                    id: "R6-C4",
                    name: "سرعة توظيف التغذية وإثبات التحسين اللاحق بالأدلة",
                    weight: 0.20,
                    currentLevel: 5,
                    evidence: "إثبات التحسين في التسجيلات اللاحقة للجلسات 04 و 08 و 11",
                    supervisorFeedback: "تطبيق فوري ودقيق لما تم الاتفاق عليه في الجلسات الإشرافية.",
                    requiredImprovement: "مقارنة التسجيلات قبل وبعد التغذية في ملف مرئي لتوثيق منحنى التعلم.",
                    levelsDesc: {
                        1: "ضعيف: تكرار نفس الأخطاء وتجاهل كامل للتوصيات الإشرافية السابقة.",
                        2: "مقبول: محاولات بطيئة وغير موثقة لتعديل السلوك الكوتشنجي دون أثر مقاس.",
                        3: "جيد: تطبيق ملحوظ للملاحظات في الجلسات التالية مع إشارة في تقرير التأمل.",
                        4: "جيد جداً: إثبات موثق لتحسن الأداء وتطبيق التغذية في التسجيلات والممارسات اللاحقة.",
                        5: "ممتاز: قفزة نوعية في الأداء، توثيق مقارن بين ما قبل وبعد التغذية الراجعة."
                    }
                },
                {
                    id: "R6-C5",
                    name: "الالتزام التام بالضوابط الأخلاقية أثناء الإشراف",
                    weight: 0.20,
                    isCritical: true,
                    currentLevel: 5,
                    evidence: "نزع أسماء المستفيدين وحماية الخصوصية في الجلسات الجماعية",
                    supervisorFeedback: "حفظ تام لسرية المستفيدين واحترام أقرانه في المجموعات الإشرافية.",
                    requiredImprovement: "الالتزام الدائم بحماية خصوصية الزملاء المستفيدين في المجموعات الإشرافية.",
                    levelsDesc: {
                        1: "ضعيف (إخفاق مباشر): تسريب أسماء أو بيانات تكشف هوية المستفيد أمام الأقران.",
                        2: "مقبول: التزام عام مع وجود إشارات قد تدل على هوية المستفيد عن غير قصد.",
                        3: "جيد: الالتزام الصارم بتشفير ونزع بيانات المستفيدين في كافة النقاشات الإشرافية.",
                        4: "جيد جداً: حرص بالغ على سرية المستفيدين ودعم الزملاء بأخلاقية مهنية عالية.",
                        5: "ممتاز: نموذج مثالي في النزاهة وحفظ الأمانات وإشاعة بيئة إشرافية آمنة ومحفزة."
                    }
                }
            ]
        }
    ],

    // Independent Ethical Safeguards Gate Checkpoints
    ethicsGate: {
        status: "passed", // 'passed' | 'review_required' | 'blocked'
        clearanceBadge: "اجتياز معتمد بنسبة 100% (بوابة مستقلة غير خاضعة للتعويض)",
        auditDate: "2026-05-18",
        leadAuditor: "الماستر كوتش عبدالكريم الخليفي",
        summary: "تم فحص كافة التعاقدات الـ 20، والتسجيلات الـ 30، والتأملات، وسجل الإحالات، وتأكدت اللجنة من النزاهة المطلقة وخلو السجل من أي مخالفة أو تضارب مصالح.",
        checkpoints: [
            { id: "ETH-01", title: "احترام الكرامة والخصوصية الفردية", requirement: "توقيع الموافقة المستنيرة وصون كرامة المستفيدين في 100% من الحالات", status: "verified", evidence: "20 نموذج تعاقد موقع وخالٍ من أي انتهاك" },
            { id: "ETH-02", title: "السرية التامة ونزع الهوية الرقمية", requirement: "تشفير التسجيلات وحذف المعرفات الشخصية قبل إدراجها بالملف", status: "verified", evidence: "شهادة التدقيق الأمني للأرشيف الرقمي" },
            { id: "ETH-03", title: "الالتزام الصارم بحدود الاختصاص المهني", requirement: "عدم ممارسة أي علاج نفسي أو تشخيص إكلينيكي أو تقديم حلول مفروضة", status: "verified", evidence: "سجل فحص التسجيلات العشوائية" },
            { id: "ETH-04", title: "تجنب وحظر تضارب المصالح", requirement: "الإفصاح المكتوب عن العلاقات السابقة أو المصالح المزدوجة", status: "verified", evidence: "إقرارات الحياد المؤسسي لجميع المشاريع" },
            { id: "ETH-05", title: "الشفافية والإفصاح الإلزامي عند الخطر الداهم", requirement: "تضمين شروط الإفصاح القانوني في العقود وتوعية المستفيد بها", status: "verified", evidence: "البند الرابع في عقد الكوتشنج المعتمد" },
            { id: "ETH-06", title: "الالتزام بميثاق تمكين الرؤية والاتحادات العالمية", requirement: "التعهد الأخلاقي الرسمي وعدم وجود أي شكوى سلوكية", status: "verified", evidence: "وثيقة التعهد الموقعة وسجل الشكاوى (0 شكوى)" },
            { id: "ETH-07", title: "نظام إحالة الحالات المتجاوزة لحدود الممارسة", requirement: "إحالة موثقة وناجحة لأي حالة تظهر عليها أعراض اكتئاب أو صدمة", status: "verified", evidence: "محضر الإحالة الطبي REF-2026-01 للحالة BEN-13" }
        ],
        referralRegistry: [
            {
                caseRef: "REF-2026-01",
                originalCaseId: 13,
                beneficiaryCode: "BEN-13",
                detectionDate: "2026-04-08",
                observedSymptoms: "أعراض اكتئاب حاد وأفكار إيذاء ذاتي خارج نطاق الكوتشنج",
                actionTaken: "إنهاء جلسة الكوتشنج فوراً بأسلوب رحيم وتفعيل بروتوكول الإحالة الطبية المعتمد",
                referredTo: "د. هاني القحطاني - استشاري الطب النفسي (عيادات الأمان بالرياض)",
                status: "مغلقة ومحالة بأمان وفق الميثاق المهني"
            }
        ]
    },

    // Optional Excellence Track
    excellenceTrack: {
        title: "مسار التميز المهني والاختصاص المتقدم (اختياري)",
        description: "متطلبات إضافية طوعية للمشاركين الراغبين في نيل وسام التميز المهني والتمهيد لمستوى الاحتراف الكامل.",
        items: [
            {
                id: "EX-01",
                title: "عرض تحليلي نقدي لكتاب مرجعي عالمي في الكوتشنج (5 صفحات)",
                targetBook: "Co-Active Coaching (4th Ed) - Laura Whitworth & Henry Kimsey-House",
                status: "completed",
                grade: "ممتاز (96%)",
                fileUrl: "دراسة_نقدية_لكتاب_الكوتشنج_المشترك_2026.pdf"
            },
            {
                id: "EX-02",
                title: "إعداد حقيبة تدريبية لمستوى الممارس وتنفيذ برنامج رسمي (10+ مشاركين)",
                bagTitle: "حقيبة 'أساسيات الكوتشنج التنفيذي للمشرفين' المعتمدة من تمكين",
                traineesCount: 14,
                status: "completed",
                completionDate: "2026-04-30",
                fileUrl: "حقيبة_الممارس_وسجل_تنفيذ_الدورة_14_مشاركا.pdf"
            }
        ]
    },

    // Actionable Tasks Repository (Task & Evidence Lifecycle)
    tasks: [
        {
            id: "TASK-01",
            title: "إيداع تسجيل الجلسة المهنية الأولى وتقرير التعاقد",
            category: "الجلسات الميدانية",
            linkedCompetencies: ["C101", "C102", "C103", "C801", "C802"],
            rubricCode: "sessions",
            status: "approved",
            version: "v2.0",
            dueDate: "2026-02-10",
            submissionDate: "2026-02-08",
            evidences: [
                { type: "audio", name: "تسجيل_الجلسة_الميدانية_01.mp3", duration: "60:00", size: "54 MB" },
                { type: "document", name: "عقد_الكوتشنج_الثلاثي_المعتمد.pdf", pages: 4, size: "1.2 MB" },
                { type: "document", name: "تقرير_الجلسة_الأولى_والتشخيص.pdf", pages: 3, size: "850 KB" }
            ],
            reflection: {
                whatDidIDo: "قمت بإجراء جلسة التعاقد التأسيسية مع المستفيد (BEN-01)، حيث وضحت ماهية الكوتشنج وحدوده الفاصلة عن الاستشارة والعلاج النفسي، وصغت معه الهدف الشامل للرحلة.",
                why: "استندت إلى معايير الاتحاد الدولي ونموذج تمكين في بناء التحالف الكوتشنجي الآمن؛ فالتعاقد الواضح يمنع توقعات غير واقعية ويحمي خصوصية المستفيد.",
                impact: "شعر المستفيد بأمان نفسي عالٍ وتلاشى قلقه من تقييم الإدارة العليا، وأبدى التزاماً كاملاً بالحضور والشفافية.",
                whatWillIChange: "سأخصص وقتاً إضافياً في نهاية الجلسة للاتفاق على آليات التواصل الطارئة وكيفية إدارة تأجيل المواعيد."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-02-12",
                grade: 4.8,
                audioNoteUrl: "audio_feedback_01.mp3",
                audioDuration: "03:45",
                notes: "أداء متمكن جداً يا أحمد، حضورك كان مطمئناً وصياغتك لبند السرية المؤسسية كانت حاسمة ورائعة.",
                timestamps: [
                    { time: "05:12", comment: "تأطير ممتاز لمسألة السرية مع ممثل الشركة." },
                    { time: "22:40", comment: "سؤال عميق أعاد المستفيد لمشاعره الحقيقية حيال الترقية." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-02-08", status: "submitted", note: "التسليم الأولي للتسجيل والتقرير." },
                { version: "v1.1", date: "2026-02-10", status: "revision_required", note: "طلب المشرف إرفاق ملحق إقرار نزع الهوية الرقمية." },
                { version: "v2.0", date: "2026-02-12", status: "approved", note: "تم اعتماد المهمة بعد استيفاء الإقرار." }
            ]
        },
        {
            id: "TASK-02",
            title: "تطبيق أدوات التقييم الـ 90 (MBTI 30, Wheel 30, SWOT 30)",
            category: "تطبيقات الأدوات",
            linkedCompetencies: ["C304", "C305", "C703", "C802"],
            rubricCode: "portfolio",
            status: "approved",
            version: "v1.0",
            dueDate: "2026-04-15",
            submissionDate: "2026-04-12",
            evidences: [
                { type: "document", name: "أرشيف_تطبيقات_MBTI_الثلاثين_الموثقة.pdf", pages: 35, size: "8.5 MB" },
                { type: "document", name: "خطط_عجلة_الحياة_الـ_30_مع_مؤشرات_المتابعة.pdf", pages: 42, size: "11 MB" },
                { type: "document", name: "تحليلات_SWOT_الشخصية_والمهنية_الـ_30.pdf", pages: 38, size: "9.2 MB" },
                { type: "spreadsheet", name: "سجل_التحقق_من_عدم_تكرار_المستفيدين.xlsx", size: "450 KB" }
            ],
            reflection: {
                whatDidIDo: "نفذت 90 تطبيقاً نوعياً موزعة بالتساوي: 30 اختبار نمط MBTI، 30 خطة عجلة حياة، و30 تحليل SWOT، مع الالتزام التام بعدم تكرار أي مستفيد داخل عداد الأداة الواحدة.",
                why: "لضمان تعريض الممارس لتنوع بشري وسلوكي واسع، واختبار مدى قدرة كل أداة على توليد استبصارات في سياقات مختلفة.",
                impact: "اكتسبت سرعة فائقة في قراءة المؤشرات وسد الفجوات، واستفاد الـ 90 مشاركاً من خطط عمل فردية واضحة المعالم.",
                whatWillIChange: "أوصي مستقبلاً بأتمتة استمارة الإدخال الرقمية لتقليل زمن معالجة التقارير اليدوية."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-04-16",
                grade: 5.0,
                audioNoteUrl: "audio_feedback_02.mp3",
                audioDuration: "02:50",
                notes: "إنجاز كمي ونوعي هائل يا أحمد. تدقيق السجلات أثبت سلامة شرط عدم التكرار وعمق التحليلات.",
                timestamps: [
                    { time: "01:10", comment: "ملاحظة: تنوع الشرائح في تطبيقات SWOT أظهر نضجاً استشارياً فائقاً." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-04-12", status: "approved", note: "تسليم السجل الكامل واعتماده مباشرة." }
            ]
        },
        {
            id: "TASK-03",
            title: "تسليم الورقة العلمية التطبيقية (58 صفحة) وعرضها العلمي",
            category: "البحث العلمي",
            linkedCompetencies: ["C501", "C502", "C503", "C504", "C505"],
            rubricCode: "research_paper",
            status: "approved",
            version: "v2.0",
            dueDate: "2026-05-01",
            submissionDate: "2026-04-28",
            evidences: [
                { type: "document", name: "الورقة_العلمية_النهائية_58_صفحة_APA7.pdf", pages: 58, size: "6.8 MB" },
                { type: "document", name: "العرض_المرئي_Slide_Deck_الملتقى_السنوي.pdf", pages: 25, size: "4.1 MB" },
                { type: "video", name: "تسجيل_العرض_والمناقشة_في_ملتقى_تمكين_2026.mp4", duration: "32:00", size: "180 MB" }
            ],
            reflection: {
                whatDidIDo: "أعددت ورقة بحثية رصينة من 58 صفحة حول فاعلية الكوتشنج المنظومي المدعوم بالذكاء الاصطناعي، وقدمت عرضاً علمياً أمام نخبة من الخبراء في ملتقى تمكين 2026.",
                why: "لإثراء المحتوى العربي بأبحاث ميدانية مسندة بالبراهين تثبت العائد الاستثماري للكوتشنج القيادي.",
                impact: "أشادت اللجنة بالمنهجية المختلطة وتلقت الورقة اهتماماً من 3 مؤسسات حكومية لتطبيق نتائجها.",
                whatWillIChange: "سأعمل على نشر ملخص تنفيذي باللغة الإنجليزية في مجلة دولية محكمة للكوتشنج."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-05-03",
                grade: 4.95,
                audioNoteUrl: "audio_feedback_03.mp3",
                audioDuration: "04:10",
                notes: "ورقة ترتقي لرسائل الماجستير المهنية في أعرق الجامعات. عرضك في الملتقى كان واثقاً ومقنعاً.",
                timestamps: [
                    { time: "02:15", comment: "المناقشة الإحصائية للفصل الرابع كانت استثنائية." },
                    { time: "03:40", comment: "التوصية بنشر البحث ككتيب إرشادي معتمد للشركاء." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-04-20", status: "revision_required", note: "تعديل بعض التوثيقات المرجعية وفق APA7 في الفصل الثاني." },
                { version: "v2.0", date: "2026-04-28", status: "approved", note: "الاعتماد النهائي بتقدير ممتاز." }
            ]
        },
        {
            id: "TASK-04",
            title: "إيداع الأداة الابتكارية والنماذج العشرة ومشروع التخرج",
            category: "الابتكار ومشروع التخرج",
            linkedCompetencies: ["C601", "C602", "C603", "C604", "C605"],
            rubricCode: "innovation_project",
            status: "approved",
            version: "v1.0",
            dueDate: "2026-05-10",
            submissionDate: "2026-05-08",
            evidences: [
                { type: "document", name: "دليل_مقياس_LMMI_الابتكاري_المعتمد.pdf", pages: 28, size: "3.5 MB" },
                { type: "document", name: "كتيب_النماذج_العشرة_للكوتشنج_والإدارة.pdf", pages: 48, size: "7.2 MB" },
                { type: "document", name: "مشروع_تخرج_منظومة_تمكين_360_والدفاع.pdf", pages: 64, size: "12 MB" }
            ],
            reflection: {
                whatDidIDo: "طورت 10 نماذج كوتشنج وإدارة ابتكارية، وصممت مقياس LMMI للنضج القيادي، ودمجتهما في مشروع التخرج التكاملي 'تمكين 360'.",
                why: "الماستر كوتش الحقيقي ليس مجرد ممارس لأدوات الآخرين، بل مطور يبتكر حلولاً نوعية تواكب متطلبات بيئته وبيئة مستفيديه.",
                impact: "تحقيق اعتراف مهني من اللجنة وموافقة شركة ريادة التقنية على تبني المنظومة رسمياً.",
                whatWillIChange: "تسجيل الملكية الفكرية للمقياس وحفظ الحقوق رسمياً لدى الهيئة السعودية للملكية الفكرية (SAIP)."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-05-12",
                grade: 4.90,
                audioNoteUrl: "audio_feedback_04.mp3",
                audioDuration: "03:30",
                notes: "إبداع حقيقي يمثل فخر برنامج الماستر كوتش. النماذج جاهزة للتدريب والتطبيق التجاري.",
                timestamps: [
                    { time: "01:45", comment: "بوصلة التمكين الخماسي فكرة أصيلة وغير مسبوقة في الأدبيات العربية." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-05-08", status: "approved", note: "اعتماد الحزمة الابتكارية كاملة." }
            ]
        },
        {
            id: "TASK-05",
            title: "مشروع تهيئة مؤسسة للكوتشنج (شركة ريادة التقنية)",
            category: "المشروعات المؤسسية",
            linkedCompetencies: ["C301", "C402", "C405", "C604"],
            rubricCode: "portfolio",
            status: "approved",
            version: "v1.0",
            dueDate: "2026-04-25",
            submissionDate: "2026-04-22",
            evidences: [
                { type: "document", name: "ملف_مشروع_تهيئة_شركة_ريادة_التقنية_كاملاً.pdf", pages: 52, size: "8.1 MB" },
                { type: "document", name: "مخطط_قرافي_للمسارات_الثلاثة_والتطبيق.pdf", pages: 18, size: "2.4 MB" },
                { type: "document", name: "الخطة_الاستراتيجية_وفق_Pfeiffer_المعدل.pdf", pages: 26, size: "3.9 MB" }
            ],
            reflection: {
                whatDidIDo: "قمت بتهيئة شاملة لشركة ريادة التقنية للاستشارات نحو ثقافة الكوتشنج، عبر تطبيق نموذج عمر قرافي للمسارات الثلاثة ونموذج Pfeiffer المعدل وتدريب القيادات.",
                why: "تحويل الكوتشنج من تدخلات فردية معزولة إلى منظومة مؤسسية تتناغم فيها الأهداف الفردية مع الاستراتيجية الكبرى للمنظمة.",
                impact: "تحسن في بيئة العمل، وانخفاض دوران الموظفين بنسبة 18% وتأسيس وحدة كوتشنج داخلية بالشركة.",
                whatWillIChange: "بناء مؤشرات قياس أثر رقمية مستمرة متصلة بنظام ERP الخاص بالشركة."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-04-26",
                grade: 4.85,
                audioNoteUrl: "audio_feedback_05.mp3",
                audioDuration: "02:40",
                notes: "تطبيق نموذجي للمشروع المؤسسي جمع بين الرؤية الاستراتيجية والتنفيذ العملي الدقيق.",
                timestamps: [
                    { time: "01:20", comment: "مواءمة Pfeiffer المعدل مع سياق الشركة كانت موفقة جداً." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-04-22", status: "approved", note: "اعتماد المشروع المؤسسي بكامل مخرجاته." }
            ]
        },
        {
            id: "TASK-06",
            title: "التحليل النقدي ومقارنة النماذج وتصميم برنامج كوتشنج مهني",
            category: "القيادة والتفكير النقدي",
            linkedCompetencies: ["C401", "C402", "C405", "C602"],
            rubricCode: "portfolio",
            status: "approved",
            version: "v1.1",
            dueDate: "2026-04-18",
            submissionDate: "2026-04-15",
            evidences: [
                { type: "document", name: "دراسة_التحليل_النقدي_والمقارنة_بين_4_نماذج_عالمية.pdf", pages: 32, size: "4.8 MB" },
                { type: "document", name: "وثيقة_تصميم_برنامج_الكوتشنج_التنفيذي_المتكامل.pdf", pages: 44, size: "6.5 MB" }
            ],
            reflection: {
                whatDidIDo: "أعددت دراسة نقدية مقارنة بين 4 نماذج كوتشنج عالمية (GROW, CLEAR, Solution-Focused, Co-Active)، وصممت برنامجاً تدريبياً وتطبيقياً متكاملاً لمنظمة صناعية كبرى.",
                why: "الماستر كوتش يحتاج إلى ترقية تفكيره من الممارسة الإجرائية إلى التصميم الهيكلي للبرامج الكوتشنجية المعقدة.",
                impact: "اعتمدت المنظمة البرنامج لتدريب 25 مديراً تنفيذياً مع تحقيق وفر مالي بنسبة 40% مقارنة بالبرامج المستوردة.",
                whatWillIChange: "تضمين أدوات قياس العائد على الاستثمار (ROI) وفق منهجية فيليبس في النسخة القادمة من التصميم."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-04-19",
                grade: 4.88,
                audioNoteUrl: "audio_feedback_06.mp3",
                audioDuration: "03:15",
                notes: "تحليل منهجي عميق جداً يا أحمد، وتصميم البرنامج يبرهن على جاهزيتك التامة لقيادة المشروعات الكبرى.",
                timestamps: [
                    { time: "01:05", comment: "مقارنة منهجية Solution-Focused مع GROW كانت محكمة ومبتكرة." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-04-15", status: "revision_required", note: "إضافة مصفوفة المفاضلة المعيارية." },
                { version: "v1.1", date: "2026-04-19", status: "approved", note: "الاعتماد النهائي بتقدير ممتاز." }
            ]
        },
        {
            id: "TASK-07",
            title: "ملف تقارير دراسات الحالات العشرين ومحاكاة الأدوار المتقدمة",
            category: "الممارسة الميدانية والمحاكاة",
            linkedCompetencies: ["C201", "C202", "C203", "C303", "C801"],
            rubricCode: "sessions",
            status: "approved",
            version: "v2.0",
            dueDate: "2026-05-05",
            submissionDate: "2026-05-02",
            evidences: [
                { type: "document", name: "الملف_الشامل_لتقارير_الحالات_العشرين_المتكاملة.pdf", pages: 110, size: "18.5 MB" },
                { type: "video", name: "تسجيل_جلسات_المحاكاة_الرباعية_في_المختبر_4.mp4", duration: "45:00", size: "220 MB" }
            ],
            reflection: {
                whatDidIDo: "وثقت ملفات الـ 20 حالة كاملة مع خطط التدخل وتقارير التشخيص، ونفذت جلسات المحاكاة التبادلية لأدوار (الماستر، المستفيد، الملاحظ، المشرف).",
                why: "المحاكاة وتبادل الأدوار يكشف زوايا الرؤية الخفية ويعزز التعاطف التكتيكي والحضور الكوتشنجي الرصين.",
                impact: "تلاشي أي ارتباك في التعامل مع الحالات الصعبة وإتقان الفصل بين دور المشرف ودور الممارس.",
                whatWillIChange: "تعميق التوثيق اللحظي للمشاعر والانفعالات أثناء جلسات المحاكاة."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-05-06",
                grade: 4.92,
                audioNoteUrl: "audio_feedback_07.mp3",
                audioDuration: "04:00",
                notes: "ملف الحالات العشرين ثروة مهنية حقيقية، وأداؤك في المحاكاة أظهر كوتشاً يمتلك أدواته بثقة بالغة.",
                timestamps: [
                    { time: "02:30", comment: "إدارتك للحالة المقاومة في المحاكاة كانت نموذجاً يُدرس." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-05-02", status: "submitted", note: "إيداع ملف الحالات والمحاكاة." },
                { version: "v2.0", date: "2026-05-06", status: "approved", note: "اعتماد الحالات بتقدير ممتاز." }
            ]
        },
        {
            id: "TASK-08",
            title: "سجل ممارسة دور المشرف على الأقران وتحليل الممارسات",
            category: "الإشراف على الممارسين",
            linkedCompetencies: ["C901", "C105", "C404", "C804"],
            rubricCode: "supervision",
            status: "approved",
            version: "v1.0",
            dueDate: "2026-05-15",
            submissionDate: "2026-05-12",
            evidences: [
                { type: "document", name: "سجل_جلسات_الإشراف_المقدمة_للأقران_وتحليل_الأداء.pdf", pages: 36, size: "5.2 MB" },
                { type: "audio", name: "تسجيل_جلسة_تغذية_راجعة_إشرافية_لمتدرب_PCC.mp3", duration: "40:00", size: "36 MB" }
            ],
            reflection: {
                whatDidIDo: "مارست دور المشرف المهني على ممارسات 3 زملاء كوتشز، وحللت تسجيلاتهم وقدمت تغذية راجعة وصفية غير توجيهية مع خطط تحسين.",
                why: "تحقيق متطلب ص26 في الحقيبة بالتحول من متلقٍ للإشراف إلى ممارس لدور المشرف الرشيد.",
                impact: "أعرب الزملاء عن استبصارات فارقة في علاقتهم مع المستفيدين وتحسن في دقة أسئلتهم في الجلسات اللاحقة.",
                whatWillIChange: "تطوير بطاقة متابعة سريعة للتحقق من التزام الممارس بتطبيق التغذية في أول جلسة تالية."
            },
            supervisorFeedback: {
                evaluator: "الماستر كوتش عبدالكريم الخليفي",
                date: "2026-05-16",
                grade: 4.95,
                audioNoteUrl: "audio_feedback_08.mp3",
                audioDuration: "03:50",
                notes: "أداء إشرافي ناضج جداً يا أحمد. لغتك كانت تمكينية واستبصارية وحافظت على مساحة نمو الزميل ببراعة.",
                timestamps: [
                    { time: "01:40", comment: "صياغة الملاحظة حول الصمت في الدقيقة 14 كانت راقية للغاية." }
                ]
            },
            history: [
                { version: "v1.0", date: "2026-05-12", status: "approved", note: "اعتماد سجل الإشراف بامتياز كامل." }
            ]
        }
    ]
};

// Storage helper functions
const STORAGE_KEY = "TAMKEEN_MASTER_COACH_DATA_V3";

function loadProgramData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn("Could not load from localStorage, using default data.", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PROGRAM_DATA));
}

function saveProgramData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error("Could not save to localStorage", e);
        return false;
    }
}

function resetToDefaultData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn(e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PROGRAM_DATA));
}

// Export to window / global / module
const ProgramStore = {
    DEFAULT_DATA: DEFAULT_PROGRAM_DATA,
    load: loadProgramData,
    save: saveProgramData,
    reset: resetToDefaultData
};

if (typeof window !== 'undefined') {
    window.ProgramStore = ProgramStore;
}
if (typeof global !== 'undefined') {
    global.ProgramStore = ProgramStore;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgramStore;
}
