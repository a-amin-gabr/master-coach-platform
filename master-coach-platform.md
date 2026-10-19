# Master Coach Professional Tracking & Portfolio Platform — AI System Specification (PRD)

This document contains the complete domain model, business logic, evaluation rubrics, competency mappings, and workflow requirements for building the **Master Coach Professional Tracking & Interactive Portfolio Platform (موقع المتابعة المهنية وملف الإنجاز التفاعلي للماستر كوتش)**.

---

## 1. Project Context & Governance Rules

* **Program Name:** Master Coach Preparation and Qualification Program (برنامج إعداد وتأهيل الماستر كوتش) — Version 3.0, Developmental Edition (2026).


* **Author & Organization:** Prepared by Master Coach Abdulkarim Al-Khelaifi (الماستر كوتش عبد الكريم الخليفي), Tamkeen Vision for Professional Consulting (شركة تمكين الرؤية للاستشارات المهنية), submitted to the Arab Coaching Federation (الاتحاد العربي للكوتشنج) for review and accreditation.


* **System Purpose:** An interactive professional portfolio and tracking web platform where participants track tasks and hours, upload performance evidence and reflections, receive evaluations and feedback, and document continuous improvement.


* **Supreme Reference Rule:** The Main Program Toolkit (الحقيبة الأساسية) is the supreme reference for objectives, competencies, learning outcomes, hours, graduation requirements, and mastery evidence. In case of any conflict between the operational evaluation appendix and the main toolkit, the main toolkit and the latest official directives from the Arab Coaching Federation prevail.


* **Scope of Evaluation Tools:** The evaluation rubrics and proposed electronic workflows organize assessment and standardize professional judgment, but they do not create new graduation requirements, extra hours, or unapproved activities.


* **Accreditation Disclaimer:** The toolkit is a developmental version submitted for accreditation, and the program completion certificate does not by itself grant final professional accreditation.



---

## 2. Core System Architecture & Business Logic

### 2.1. Dual Progress Tracking Engine (Crucial Requirement)

* **Separated Progress Indicators:** The platform must track and display two separate progress dimensions on the user dashboard:


1. **Quantitative Completion (استكمال المتطلبات والأعداد والساعات):** Tracking the number of submitted tasks, sessions, tool applications, and logged hours.


2. **Qualitative Competency Achievement (تحقق الكفايات وجودة الأداء):** Tracking whether the participant has demonstrated actual mastery, sound professional judgment, and ethical compliance through evaluated evidence.




* **Decoupling Rule:** Completing the required count of sessions, projects, or hours represents an opportunity to gather evidence, and does not automatically prove competency acquisition or fulfill hour requirements (e.g., completing 30 sessions does not by itself prove completing 40 field practice hours, and completing counts may still require performance improvement).



### 2.2. Scoring, Weights & Pass/Fail Logic

* **5-Point Performance Scale:** All rubrics use five performance levels: Weak (ضعيف = 1), Acceptable (مقبول = 2), Good (جيد = 3), Very Good (جيد جدًا = 4), and Excellent (ممتاز = 5).


* **Weighted Average Calculation:** For each rubric evaluation, the system calculates a weighted average out of 5 using the formula: $\text{Weighted Score} = \sum (\text{Criterion Score} \times \text{Criterion Weight})$.


* **No Hardcoded Arbitrary Passing Score:** The main toolkit does not define a unified numerical passing percentage for every competency; therefore, developers must **not** hardcode `70%` or `3/5` as a rigid, pre-approved graduation condition.


* **Ethical & Core Competency Veto (Mandatory Override):** Average scores **never** compensate for a failure to meet core professional or ethical competencies or for overstepping boundaries of expertise (تجاوز حدود الاختصاص). If a fundamental ethical violation occurs, the toolkit's failure/remediation rules apply regardless of high scores in other criteria.


* **Evidence-Based Evaluation:** Evaluators must select the performance level that matches actual behavior or tangible evidence (reports, recordings, outputs, portfolio, research paper, project, supervision reports) and log professional notes; evaluation cannot rely on general impression alone.


* **Interpretation of "Excellent (5)" Quantitative Descriptors:** Specific numbers mentioned inside the "Excellent (5)" rubric cells (such as providing 3 justifications for model selection, 3 KPIs, or 3 research recommendations) are descriptive benchmarks for achieving a score of 5, **not** mandatory graduation requirements imposed on all participants.



---

## 3. Program Hours & Duration Tracking

* **Total Program Duration:** 20 to 24 weeks.


* **Total Required Hours:** 240 hours, tracked independently from task counts.


* **Attendance & Supervision Split:** The toolkit does not numerically fix a mandatory attendance percentage or a rigid hour split between individual and group supervision (must be configurable by admins).



| Program Component (المكون) | Required Hours (الساعات) | System Tracking Notes |
| --- | --- | --- |
| **Direct Training (التدريب المباشر)** | 100

 | Synchronous live training sessions.

 |
| **Labs (المختبرات)** | 30

 | Covers 9 lab domains: Readiness (الجاهزية), Session Management (إدارة الجلسات), Case Analysis (تحليل الحالات), Simulation (المحاكاة), Supervision (الإشراف), Documentation (التوثيق), Artificial Intelligence (الذكاء الاصطناعي), Quality (الجودة), and Reflective Thinking (التفكير التأملي), followed by the Professional Practice Project (مشروع الممارسة المهنية). *Note: 9 lab domains does not mean only 9 sessions*.

 |
| **Field Practice (الممارسة الميدانية)** | 40

 | Tracked by actual time spent in field practice across 3 months (separate from the 30-session count).

 |
| **Supervision (الإشراف)** | 20

 | Covers both individual and group supervision.

 |
| **Professional Portfolio (ملف الإنجاز)** | 10

 | Time allocated to organizing, indexing, and reflecting on portfolio evidence.

 |
| **Applied Scientific Paper (الورقة العلمية)** | 20

 | Researching, writing, and documenting the applied paper.

 |
| **Graduation Project (مشروع التخرج)** | 20

 | Designing, testing, and defending the innovative graduation project.

 |
| **Total (الإجمالي)** | **240**<br> | Must be verified alongside task counts and competency mastery.

 |

---

## 4. Competency Framework & Mapping

The system must support a **Many-to-Many ($M:N$) relationship** between **Tasks/Evidence** and **Competencies**, allowing a single submitted piece of evidence to evaluate multiple competencies simultaneously rather than requiring a separate task per competency.

### 4.1. Primary Competency Architecture (8 Axes / 43 Sub-Competencies)

| Axis (المحور) | Sub-Competency Count | Included Sub-Competencies (الكفايات الفرعية) | Proposed System Evaluation & Supplementary Cards (التقييم المقترح والبطاقات المكملة) |
| --- | --- | --- | --- |
| **1. Core Professional Competencies (الكفايات المهنية الأساسية)** | 6

 | 1. Practicing coaching according to professional and ethical standards (ممارسة الكوتشنج وفق المعايير المهنية والأخلاقية)<br>

<br>2. Building relationships and managing contracting (بناء العلاقة وإدارة التعاقد)<br>

<br>3. Managing sessions (إدارة الجلسات)<br>

<br>4. Deep listening, presence, and effective questioning (الاستماع العميق والحضور والتساؤل الفعال)<br>

<br>5. Providing feedback (تقديم التغذية الراجعة)<br>

<br>6. Ending the relationship ethically (إنهاء العلاقة وفق الضوابط الأخلاقية)

 | **Evidence:** Session recording or live observation + contract + session report + follow-up plan.

<br>

<br>**Mechanism:** Evaluator marks performance timestamps inside the audio recording. Uses the *Sessions Rubric* plus supplementary indicators for relationship building, presence, listening, questioning, feedback, and closing.

 |
| **2. Analytical Competencies (الكفايات التحليلية)** | 5

 | 1. Systematic case analysis (تحليل الحالات بصورة منهجية)<br>

<br>2. Diagnosing challenges and opportunities (تشخيص التحديات والفرص)<br>

<br>3. Distinguishing symptoms from root causes (التمييز بين الأعراض والأسباب)<br>

<br>4. Selecting the appropriate model (اختيار النموذج المناسب)<br>

<br>5. Evaluating alternatives and decision-making (تقييم البدائل واتخاذ القرار)

 | **Evidence:** Case report separating facts from interpretations, showing root causes, alternatives, and decision justification + short audio discussion to verify understanding.

<br>

<br>**Mechanism:** Uses "Model Appropriateness" and "Documentation & Analysis" from the *Sessions Rubric*, "Critical Thinking" and "Decision Justification" from the *Final Interview Rubric*, plus a supplementary Case Analysis card.

 |
| **3. Applied Competencies (الكفايات التطبيقية)** | 5

 | 1. Designing interventions (تصميم التدخلات)<br>

<br>2. Employing models efficiently (توظيف النماذج بكفاءة)<br>

<br>3. Managing complex cases (إدارة الحالات المركبة)<br>

<br>4. Adapting tools to client needs (تكييف الأدوات لاحتياجات المستفيد)<br>

<br>5. Documenting practice (توثيق الممارسة)

 | **Evidence:** Intervention plan, execution evidence, follow-up results, and explanation of adjustments (includes MBTI, Wheel of Life, and SWOT applications).

<br>

<br>**Mechanism:** Uses *Sessions Rubric* and *Portfolio Rubric* plus a supplementary card for tool application accuracy and translating results into action items.

 |
| **4. Thinking & Professional Leadership Competencies (كفايات التفكير والقيادة المهنية)** | 6

 | 1. Critical thinking (التفكير النقدي)<br>

<br>2. Systems thinking (التفكير المنظومي)<br>

<br>3. Reflective thinking (التفكير التأملي)<br>

<br>4. Self-supervision (الإشراف الذاتي)<br>

<br>5. Leading initiatives (قيادة المبادرات)<br>

<br>6. Managing developmental teams when needed (إدارة فرق العمل التطويرية عند الحاجة)

 | **Evidence:** Systems map for a case, post-application reflection, evidence of post-supervision improvement, initiative plan, decision log, role distribution, and results.

<br>

<br>**Mechanism:** Uses *Portfolio*, *Supervision*, *Interview*, and *Project* rubrics, plus supplementary indicators for leadership, teamwork, and systems thinking.

<br>

<br>**Supervisor Role Note:** Evaluating the participant acting as a *Supervisor over practitioners* (ص26) requires observing their performance and evaluating their analysis of others' practice, feedback quality, and development plan.

 |
| **5. Research Competencies (الكفايات البحثية)** | 5

 | 1. Reading studies (قراءة الدراسات)<br>

<br>2. Employing research findings in practice (توظيف نتائج البحوث في الممارسة)<br>

<br>3. Preparing the scientific paper (إعداد الورقة)<br>

<br>4. Documenting references (توثيق المراجع)<br>

<br>5. Presenting research results (عرض نتائج البحث)

 | **Evidence:** Staged research delivery: (1) Problem & Literature, (2) Methodology & Tools, (3) Analysis, (4) Final Version, (5) Scientific Presentation Evidence.

<br>

<br>**Mechanism:** Uses *Scientific Paper Rubric* + supplementary presentation evaluation + evaluates use of research evidence in professional decisions.

 |
| **6. Innovation Competencies (كفايات الابتكار)** | 5

 | 1. Developing new tools (تطوير أدوات جديدة)<br>

<br>2. Improving models (تحسين النماذج)<br>

<br>3. Solutions for complex cases (حلول للحالات المعقدة)<br>

<br>4. Applicable project (مشروع قابل للتطبيق)<br>

<br>5. Evaluating innovation impact (تقييم أثر الابتكار)

 | **Evidence:** Structured card for each model/tool (problem, reference, value added, usage steps, boundaries, testing, results); one output is developed into the Graduation Project and defended.

<br>

<br>**Mechanism:** Uses *Innovative Project Rubric* and *Portfolio Rubric*.

 |
| **7. Digital Competencies (الكفايات الرقمية)** | 4

 | 1. Employing technologies (توظيف التقنيات)<br>

<br>2. Responsible use of AI (الاستفادة المسؤولة من الذكاء الاصطناعي)<br>

<br>3. Digital analysis and documentation (التحليل والتوثيق الرقمي)<br>

<br>4. Information security and data confidentiality (أمن المعلومات وسرية البيانات)

 | **Evidence:** Practical task organizing and analyzing anonymized data to prepare a report, explicitly stating what AI/technology suggested vs. what the participant verified and modified.

<br>

<br>**Mechanism:** No standalone rubric in toolkit; uses a supplementary evaluation card measuring output validity, human verification, traceability, and privacy.

 |
| **8. Ethical Competencies (الكفايات الأخلاقية)** | 7

 | 1. Respecting dignity and privacy (احترام الكرامة والخصوصية)<br>

<br>2. Confidentiality (السرية)<br>

<br>3. Boundaries of expertise (حدود الاختصاص)<br>

<br>4. Avoiding conflict of interest (تجنب تضارب المصالح)<br>

<br>5. Disclosure when necessary (الإفصاح عند الحاجة)<br>

<br>6. Adhering to the code of ethics (الالتزام بالميثاق)<br>

<br>7. Referring cases beyond practice boundaries (إحالة الحالات المتجاوزة لحدود الممارسة)

 | **Evidence:** Ethical scenarios, inspection of contracts, consents, actual evidence, and discussion of disclosure/referral decisions.

<br>

<br>**Mechanism:** Continuous evaluation across all tasks using *Sessions*, *Supervision*, and *Interview* rubrics, enforced as an independent mandatory passing condition.

 |

### 4.2. Extracted Functional Competencies & Onboarding Feature (14 Domains)

During Phase 1 onboarding, the system should display the following introductory prompt and interactive diagnostic exercise:

> **Onboarding Welcome Banner:** «المطلوب منكم في رحلة الزمالة أن تتمكنوا من إدارة الممارسة، وتحليل الحالات، واختيار النماذج والأدوات، وتبرير قراراتكم، وتطوير أدائكم، وإظهار أثره؛ ضمن التزام أخلاقي واضح. وسنجمع خلال الرحلة شواهد تساعد كل واحد منكم على معرفة ما أتقنه وما يحتاج إلى مواصلة تطويره.»
> 
> 

* **Phase 1 Diagnostic Selection Feature:** Each participant selects from the 14 functional competencies below:
1. One competency for which they currently possess evidence (كفاية يمتلك لها شاهدًا حاليًا).


2. One competency they want to develop (كفاية يريد تطويرها).


3. One piece of evidence they will work on building during Phase 1 (شاهد سيعمل على بنائه خلال المرحلة الأولى).





| # | Domain (المجال) | Required Competency (الكفاية المطلوب اكتسابها) | Observable Evidence (ما يُظهر اكتسابها) |
| --- | --- | --- | --- |
| 1 | الممارسة المهنية الأساسية

 | إدارة جلسات الكوتشنج، بما فيها الحالات المركبة، بصورة منظمة وملائمة لاحتياجات المستفيد

 | جلسات موثقة وتقييم الأداء في المحاكاة والممارسة

 |
| 2 | التحليل المهني

 | تحليل الحالات واحتياجات المستفيد قبل اختيار التدخل

 | دراسة حالة تربط المعطيات بالتحليل والتدخل المقترح

 |
| 3 | التفكير النقدي

 | مراجعة الافتراضات وتقييم التفسيرات والاختيارات المهنية وتبريرها

 | تحليل يميز بين الملاحظة والاستنتاج ويقارن البدائل

 |
| 4 | التفكير المنظومي

 | قراءة الحالة في ضوء العلاقات والسياق والعوامل المؤثرة

 | تحليل يوضح ترابط العوامل وانعكاسها على الممارسة

 |
| 5 | اختيار النماذج وتكاملها

 | اختيار النموذج المناسب وتوظيفه، ودمج النماذج عند الحاجة مع مراعاة حدود استخدامها

 | تبرير الاختيار وتوثيق التطبيق ومراجعة نتائجه

 |
| 6 | توظيف أدوات الاستكشاف

 | تطبيق الأدوات الواردة في الحقيبة وتفسير نتائجها وتحويلها إلى خطوات تطوير

 | تقارير تطبيق MBTI وعجلة الحياة وSWOT وتأملات مهنية وخطط متابعة

 |
| 7 | القيادة والتطبيق المؤسسي

 | دعم ثقافة التعلم والتغيير وتهيئة المؤسسة لتطبيق ممارسات الكوتشنج

 | مشروع مؤسسي يوثق التهيئة والتنفيذ والنتائج

 |
| 8 | التأمل والتطوير المهني

 | مراجعة الأداء، والاستفادة من الإشراف والتغذية الراجعة، وتحويلهما إلى تحسينات

 | سجل تأملي يوضح ما تغير في الممارسة بعد الإشراف

 |
| 9 | البحث العلمي التطبيقي

 | تناول مشكلة مهنية بمنهجية بحثية، واستخدام الأدبيات والتوثيق، وعرض النتائج ومناقشتها

 | ورقة علمية تطبيقية وعرضها ومناقشتها

 |
| 10 | الابتكار المهني

 | تطوير نماذج وأدوات وحلول تستجيب لاحتياج مهني محدد

 | نماذج وأداة مبتكرة ومشروع تخرج يوضح الفكرة والقيمة المضافة والتطبيق

 |
| 11 | الكفاية الرقمية

 | توظيف التقنية والذكاء الاصطناعي بصورة مسؤولة مع ممارسة الحكم المهني

 | تطبيق موثق يوضح كيفية مراجعة المخرجات وتبرير استخدامها

 |
| 12 | الأخلاقيات وحدود الاختصاص

 | الالتزام بالسرية والنزاهة، وإدارة تضارب المصالح، وتمييز حدود الدور والإحالة عند الحاجة

 | قرارات مبررة في حالات أخلاقية وسلوك متسق في الممارسة

 |
| 13 | قياس الأثر

 | تحديد مؤشرات مناسبة ومتابعة النتائج واستخدامها لتحسين الممارسة

 | تقرير يربط الأهداف بالمؤشرات والنتائج وخطوات التحسين

 |
| 14 | التوثيق والتواصل المهني

 | تنظيم أدلة الممارسة وعرضها وشرح القرارات والدفاع عنها

 | ملف إنجاز قابل للتحقق، وتقارير وتسجيلات وعرض مهني

 |

---

## 5. Required Tasks, Quotas & Validation Rules

### 5.1. Quantified Tasks & Deliverables (المهام ذات الأعداد المحددة)

| # | Task / Requirement (المهمة) | Quota / Duration (العدد أو المدة) | Required Evidence (الدليل) | Validation & Counting Rules (ضبط الاحتساب) |
| --- | --- | --- | --- | --- |
| 1 | **Review of CPC & PCC Outputs (مراجعة مخرجات CPC وPCC أو ما يعادلهما)** | Documented review of both levels upon admission

 | Review of approved recordings and educational materials

 | Prerequisite/onboarding verification task.

 |
| 2 | **Field Follow-up (المتابعة الميدانية)** | 3 Months

 | Time log of practice and follow-up

 | Tracks temporal duration of field engagement.

 |
| 3 | **Field Coaching Projects / Cases (مشروعات الكوتشنج الميدانية)** | 20 complete cases/projects

 | Case file including sessions, interventions, and results

 | **Crucial:** These are 20 complete coaching cases (حالة متكاملة), **not** 20 graduation projects.

 |
| 4 | **Field Sessions (الجلسات الميدانية)** | At least 30 sessions total

 | Report per session; all reports submitted and approved before the Final Interview

 | **Crucial:** 30 sessions is the **total** distributed across the 20 cases, **not** 30 sessions per case. Gatekeeper requirement before unlocking the Final Interview.

 |
| 5 | **MBTI Tool Applications (تطبيقات MBTI)** | 30 clients

 | Results and professional reflections

 | Cannot repeat the same client within the MBTI counter.

 |
| 6 | **Wheel of Life Applications (تطبيقات عجلة الحياة)** | 30 clients

 | Plan per application (priorities, goals, actions, follow-up indicators)

 | Cannot repeat the same client within the Wheel of Life counter.

 |
| 7 | **SWOT Applications (تطبيقات SWOT)** | 30 clients

 | Analysis and actionable recommendations or development plans

 | Cannot repeat the same client within the SWOT counter. *Note across tools 5–7:* Total is 90 documented applications (30 per tool); the toolkit does **not** require 90 distinct individuals across all 3 tools, only uniqueness within each single tool's counter.

 |
| 8 | **Innovative Coaching & Management Models (نماذج ابتكارية للكوتشنج والتطبيقات الإدارية)** | At least 10 models

 | Idea, added value, application mechanism, and usability testing

 | Structured innovation card per model.

 |
| 9 | **Innovative Personality Analysis Tool (أداة تحليل شخصية مبتكرة)** | At least 1 tool

 | Purpose, boundaries of use, and verification mechanism

 | Structured innovation card.

 |
| 10 | **Organizational Coaching Readiness (تهيئة مؤسسة للكوتشنج)** | At least 1 organization

 | Stages, results, recommendations, and improvement plan

 | Can be linked with institutional plans while keeping criteria distinct.

 |
| 11 | **Professional Audio Recordings (تسجيلات احترافية في موضوعات كوتشنج)** | 5 audio recordings

 | Audio files, feedback received, and documented improvements

 | **Crucial:** These are recordings on selected coaching topics; the toolkit does **not** require them to be recordings of live client field sessions.

 |
| 12 | **Audio & Video Educational Materials (المواد الصوتية والمرئية)** | All prescribed materials (no fixed count in toolkit)

 | Documented acknowledgment of completion

 | Admin-configurable checklist of media items.

 |
| 13 | **Applied Scientific Paper (الورقة العلمية التطبيقية)** | 1 paper ($\ge 50$ pages)

 | Program template, font size 14 (unless updated template approved), APA 7th ed. citations

 | Delivered in 4 stages + final presentation.

 |
| 14 | **Scientific Paper Presentation (عرض الورقة العلمية)** | 1 presentation at a program-approved event

 | Proof of presentation and participation

 | Linked to Research Competencies.

 |
| 15 | **Innovative Graduation Project (مشروع التخرج الابتكاري)** | 1 project

 | Evidence of application, arbitration, and defense before the evaluation committee

 | **Crucial:** Develops one of the previously created 10 models or the personality tool; it does **not** automatically count as an 11th model.

 |
| 16 | **Professional Portfolio (ملف الإنجاز المهني)** | 1 complete portfolio per participant

 | All logs, evidence, reflections, and outputs indexed and linked to competencies

 | Must be approved prior to scheduling the Final Interview.

 |
| 17 | **Final Professional Interview (المقابلة المهنية الختامية)** | 1 end-of-program interview

 | Committee evaluation using the Final Interview Rubric

 | **Gatekeeper Rule:** Cannot be held until all prerequisite evidence, session reports, and portfolio are completed and approved.

 |
| 18 | **Theoretical, Applied & Phased Assessments (التقييمات النظرية والتطبيقية والمرحلية)** | All prescribed assessments (no fixed count)

 | Passing results

 | Configurable per cohort/admin settings.

 |

### 5.2. Tasks Without Fixed Total Counts in Toolkit (مهام وأدلة غير محددة العدد إجماليًا)

The platform must support submission slots for these mandatory qualitative deliverables (counts configurable by system admins):

1. **Critical Analysis (التحليل النقدي):** Critical analysis of a professional coaching model.


2. **Model Comparison (مقارنة النماذج):** Comparative study between two or more coaching models.


3. **Integrative Application (تطبيق تكاملي):** Designing a systematic application combining multiple models.


4. **Multiple Global Models (نماذج عالمية متعددة):** Application, trade-off analysis, and justification of choice.


5. **Omar Qarafi Three-Track Model (نموذج عمر قرافي للمسارات الثلاثة):** Documented institutional plan for applying individual coaching inside organizations.


6. **Modified Pfeiffer Model with Omar Qarafi Modifications (Pfeiffer المعدل بتعديلات عمر قرافي):** Integrated strategic plan for an organization linked to coaching, reviewed under supervision.


7. **Professional Practice Project (مشروع الممارسة المهنية):** Integrated project presented before a committee; **passing it is a prerequisite to transition to the Leadership phase**.


8. **Professional Program Design (تصميم برنامج مهني):** Submitting an integrated professional program design project.


9. **Professional Leadership Project (مشروع القيادة المهنية):** An initiative or program combining innovation, research, impact measurement, and organizational readiness, presented before a scientific committee. *(Note: Items 5, 6, 8, 9, and Organizational Readiness can be grouped into a linked Institutional Dossier in the UI, provided each output's evaluation criteria remain visible and independent)*.


10. **Role-Play Simulations (المحاكاة):** Rotating roles between Master Coach, Client, Observer, and Supervisor.


11. **Case Analysis Reports (تقارير تحليل الحالات):** Analytical report for each case.


12. **Professional Reflection (التأمل المهني):** Logged after every applied experience.


13. **Individual & Group Supervision (الإشراف الفردي والجماعي):** Completing sessions and applying feedback in subsequent sessions.


14. **Supporting Portfolio Contents (محتويات الملف المساندة):** CV, practice log, session templates, case studies, analysis reports, supervision logs, reflections, feedback logs, and improvement plans.



### 5.3. Optional Excellence Track (مسار التميز الاختياري)

Must be separated in the UI as an optional module (not required for the basic completion certificate):

1. **Analytical Book Review (عرض تحليلي لكتاب مرجعي):** Approximately 5 pages analyzing an approved reference book.


2. **Practitioner Toolkit & Course Delivery (إعداد حقيبة لمستوى الممارس وتنفيذ دورة رسمية):** Preparing a Practitioner-level training toolkit and delivering an official course to at least 10 participants (described as a subsequent requirement for full professionalism rather than a graduation prerequisite).



---

## 6. Complete Evaluation Rubrics (Database Seed Data)

The platform operates **6 official rubrics**. Below are the exact criteria, weights, and 5-level descriptors for each rubric.

### 6.1. Rubric 1: Documented Professional Sessions (روبرك تقييم الجلسات المهنية الموثقة)

* **Purpose:** Verifies practice quality, professional decision-making, ethics, and impact through session reports and documentation.



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **الالتزام بهيكل الجلسة** (Adherence to Session Structure)

 | 20%

 | ينفذ مراحل الجلسة الثلاث بدقة ويُعدل مسار الحوار تلقائياً عند الحاجة.

 | يُطبق مراحل الجلسة كاملة ويستخدم عبارات ربط واضحة للانتقال بسلاسة.

 | يكمل الخطوات الأساسية للجلسة بالترتيب، ويُحقق الهدف التعاقدي المعلن.

 | يذكر مراحل الجلسة، لكنه ينتقل بينها بصورة مفاجئة تؤثر على التسلسل.

 | يتجاهل مرحلة الإغلاق تماماً، أو يُنهي الجلسة دون صياغة خطة عمل.

 |
| **ملاءمة النموذج وتبريره** (Model Appropriateness & Justification)

 | 20%

 | يدمج بين نموذجين أو أكثر بمرونة، ويكتب ثلاثة مبررات مهنية لاختياره.

 | يُطبق نموذجاً واحداً بنجاح ويوثق مبررين يربطان النموذج بالهدف.

 | يختار نموذجاً معتمداً، ويشرح سبب اختياره بشكل عام.

 | يستخدم النموذج، لكنه يعجز عن توضيح مبرر اختياره مهنياً بوضوح.

 | يُطبق نموذجاً لا يتوافق مع هدف الجلسة، أو يعمل بعشوائية.

 |
| **التوثيق والتحليل** (Documentation & Analysis)

 | 20%

 | يُقدم تحليلاً نقدياً متكاملاً يكشف نموه المهني ويترجمه لخطة تحسين.

 | يُحلل قراراته ويربطها بالنتائج، ويحدد فرصة تحسين قابلة للتطبيق.

 | يوثق مجريات الجلسة ويستخلص درساً مهنياً واضحاً مرتبطاً بأدائه.

 | يُسجل العناصر الأساسية فقط بوصف عام دون تحليل لقراراته.

 | يترك التقرير ناقصاً أو بدون أي مراجعة تأملية.

 |
| **الالتزام بالأخلاقيات** (Ethical Compliance)

 | 20%

 | يُدير حدود الاختصاص والتعارضات باحترافية استثنائية تحمي المستفيد.

 | يستبق المخاطر الأخلاقية ويعالجها بوعي، ويُبرر قراراته مهنياً.

 | يطبق ضوابط السرية وحدود الاختصاص بصورة ثابتة خلال الجلسة.

 | يلتزم بالأساسيات الأخلاقية، مع بعض الفجوات في تقدير الحدود المهنية.

 | يرتكب مخالفة أخلاقية صريحة أو يُخل بسرية الجلسة.

 |
| **الأثر الملحوظ** (Observed Impact)

 | 20%

 | يوثق ثلاثة مؤشرات أداء (KPIs) تثبت تحقيق المستفيد لهدفه بدقة.

 | يُسجل مؤشرين قياسيين يوضحان تقدم المستفيد وخطة متابعته.

 | يكتب إقرار المستفيد بالتقدم ويُحدد خطوة عملية واحدة قادمة.

 | يصف شعور المستفيد بالتحسن دون تحديد أي إجراءات.

 | لا يُسجل أي مخرجات تدل على حدوث تغيير لدى المستفيد.

 |

### 6.2. Rubric 2: Professional Portfolio (روبرك تقييم ملف الإنجاز المهني - Portfolio)

* **Purpose:** Verifies completeness of evidence, traceability, and alignment with competencies.



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **اكتمال المحتويات** (Completeness of Contents)

 | 25%

 | يسلم جميع المتطلبات والأدلة بنسبة 100% لتثبت الجاهزية المهنية.

 | يقدم ملفاً مكتملاً ومنظماً بدرجة تتيح المراجعة دون فجوات.

 | يكمل المتطلبات الأساسية، مع ملاحظات محدودة لا تمنع التقييم.

 | يسلم معظم العناصر، لكن مع نواقص واضحة تتطلب الاستكمال.

 | يغفل تسليم عدد جوهري من المتطلبات أو الأدلة الإلزامية للملف.

 |
| **جودة التوثيق** (Documentation Quality)

 | 20%

 | يفهرس الأدلة بروابط مباشرة ويوثقها بنظام يتيح الوصول الفوري.

 | ينظم الأدلة بتسلسل منطقي وتسميات دقيقة تربط بين المخرجات.

 | يُفهرس الملف بوضوح، ويرتب الأدلة بصورة تسهل تتبعها.

 | يُرتب الأدلة بشكل أساسي مع وجود فجوات في الفهرسة.

 | يقدم أدلة مبعثرة يصعب تحديد مصدرها أو تسلسلها الزمني.

 |
| **عمق التأمل الذاتي** (Depth of Self-Reflection)

 | 20%

 | يوثق مراجعة تأملية نقدية تبرز تطور كفاياته وترسم خطة قياس.

 | يربط التأملات بتغير ملموس في السلوك أو التفكير بعد التغذية الراجعة.

 | يُحلل التحديات والنجاحات ويربطها بمساره المهني بشكل مباشر.

 | يذكر الفوائد العامة دون ربطها بخطة تطوير واضحة للمستقبل.

 | يكتفي بالوصف السطحي للأحداث دون تحليل للتجربة.

 |
| **الربط بالكفايات** (Alignment with Competencies)

 | 20%

 | يبرهن بدقة على تحقق كل كفاية بصورة متكاملة من خلال الدليل المرفق.

 | يُفسر علاقة الأدلة بالكفايات بشكل منهجي يسهل مهمة المقيم.

 | يطابق كل دليل مهني بكفاية محددة ويشرح كيفية تحققها.

 | يربط بعض الأدلة بالكفايات بشكل عام ودون اتساق كامل.

 | يفشل في ربط محتويات الملف بالكفايات المستهدفة.

 |
| **جودة الأدلة** (Quality of Evidence)

 | 15%

 | يقدم أدلة عالية الجودة، أصلية وقابلة للتحقق الفوري وموثوقة.

 | يوثق ممارسات فعلية ومترابطة تعكس كفاءته وثقته في التطبيق.

 | يُوفر أدلة صحيحة وموثقة تثبت المتطلبات بصورة مستقلة.

 | يقدم أدلة تلبي الحد الأدنى وتحتاج لبعض الاستيضاح.

 | يرفق أدلة غير مكتملة أو غير قابلة للتحقق الفعلي.

 |

### 6.3. Rubric 3: Applied Scientific Paper (روبرك تقييم الورقة العلمية التطبيقية)

* **Purpose:** Verifies methodological soundness, research rigor, APA 7th documentation, and data analysis.



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **وضوح المشكلة** (Problem Clarity)

 | 20%

 | يصيغ المشكلة البحثية في تساؤل دقيق ويحدد أهدافاً قابلة للقياس.

 | يربط الأهداف والمشكلة بصورة وثيقة تدعم مسار البحث بقوة.

 | يصيغ المشكلة والأهداف بشكل منطقي وقابل للتطبيق والتتبع.

 | يحدد مشكلة بحثية، لكن صياغتها وأهدافها تحتاج لمزيد من الضبط.

 | يكتب مشكلة عامة وغير محددة بدون ربطها بأهداف واضحة.

 |
| **الأساس النظري** (Theoretical Foundation)

 | 20%

 | يبني إطاراً نظرياً متيناً يدمج الدراسات الحديثة وينقدها بأسلوب علمي.

 | يُحلل الدراسات السابقة ويربطها مباشرة بالتطبيق العملي للكوتشنج.

 | يستعرض أدبيات مناسبة تدعم الإطار النظري بصورة جيدة.

 | يستشهد بمراجع محدودة وتغطية سطحية للأدبيات العلمية.

 | يعتمد على مراجع قديمة أو ضعيفة الصلة بموضوع الدراسة.

 |
| **المنهجية والأدوات** (Methodology & Tools)

 | 20%

 | يبرر اختياره المنهجي بدقة ويطبق الأدوات بوعي أخلاقي وعلمي عال.

 | يشرح مبررات اختياره للمنهجية ويوظف الأدوات بوعي ودقة.

 | يُطبق أداة بحثية معتمدة ويشرح إجراءاتها بصورة مقبولة.

 | يذكر المنهجية بشكل عام، مع وجود ثغرات في تطبيق الأدوات.

 | يتجاهل وصف المنهجية بوضوح أو يطبق أدوات غير مناسبة.

 |
| **جودة التحليل** (Quality of Analysis)

 | 20%

 | يحلل البيانات إحصائياً أو نوعياً ويستخلص 3 توصيات قابلة للتطبيق.

 | يناقش النتائج بعمق نقدي ويربطها بالدراسات السابقة بمهارة.

 | يُحلل البيانات تحليلاً منطقياً ويستخلص نتائج واضحة.

 | يشرح النتائج سطحياً مع ربط جزئي ضعيف بواقع الكوتشنج.

 | يسرد النتائج دون أي مناقشة أو ربط بالأدبيات والممارسة.

 |
| **التوثيق (APA)** (APA Documentation)

 | 20%

 | يوثق جميع المصادر داخل النص والقائمة وفق الإصدار السابع لـ APA دون أخطاء.

 | يُطبق نظام APA بدقة عالية في معظم اقتباساته ومراجعه.

 | يلتزم بقواعد التوثيق الأساسية مع أخطاء شكلية بسيطة.

 | يوثق بأسلوب مختلط مع وجود عدة أخطاء في قوائم المراجع.

 | يتجاهل أسلوب التوثيق العلمي وتكثر الأخطاء الجوهرية ببحثه.

 |

### 6.4. Rubric 4: Innovative Graduation Project (روبرك تقييم المشروع الابتكاري - مشروع التخرج)

* **Purpose:** Verifies originality, feasibility, execution planning, expected impact, and defense before the evaluation committee.



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **أصالة الفكرة** (Originality of Idea)

 | 20%

 | يُقدم نموذجاً لا سابقة له، ويُثبت نقاط تميز تتفوق على القائم.

 | يطور أداة قائمة بإضافة مكونين جديدين، ويُبرهن على فاعليتها.

 | يُعدل على نموذج معروف بما يتناسب مع بيئة محددة، ويشرح التعديل.

 | يستخدم تصميماً مألوفاً مع تغييرات شكلية دون إضافة جوهرية.

 | ينسخ نموذجاً قائماً دون أي تعديل تطبيقي أو إضافة مهنية تذكر.

 |
| **الجدوى والقابلية** (Feasibility & Applicability)

 | 20%

 | ينفذ المشروع فعلياً ويُرفق تقريراً مالياً أو زمنياً يثبت كفاءة التشغيل.

 | يجرب المشروع في سياق محاكى، ويكتب خطة تنفيذية مجدولة زمنياً.

 | يُصمم خطوات قابلة للتطبيق منطقياً، ويُحدد الموارد الأساسية للمشروع.

 | يقترح فكرة نظرية، لكنه يفتقر لخطة توضح كيفية التطبيق الواقعي.

 | يقدم مشروعاً يستحيل تنفيذه لتعارضه مع الموارد أو المنطق.

 |
| **جودة التخطيط** (Planning Quality)

 | 20%

 | يُخطط ويدير المشروع باحترافية تامة مع إدارة مرنة للمخاطر وتوثيق شامل.

 | يدير المشروع بخطة محكمة ويوثق الاستجابة للتحديات التنفيذية.

 | ينظم خطة واضحة ويوثق تنفيذها بأدلة كافية للتقييم.

 | يضع خطة أولية لكن تنفيذها محدود ولا يثبت نجاح المشروع.

 | يفشل في تقديم خطة متماسكة أو توثيق خطوات التنفيذ.

 |
| **الأثر المتوقع** (Expected Impact)

 | 20%

 | يثبت أثراً قوياً بمؤشرات متعددة تدعم استدامة التحسين وقابلية التوسع.

 | يقيس أثراً ملموساً يربط المخرجات بنمو المستفيد وتطوير الممارسة.

 | يُحدد أثراً واضحاً مرتبطاً بأهداف المشروع ويدعمه بمؤشرات منطقية.

 | يذكر أثراً عاماً للمشروع بمؤشرات قياس ضعيفة أو غير مكتملة.

 | يغفل تحديد الأثر أو يصيغه بصورة غير قابلة للقياس والتحقق.

 |
| **جودة الدفاع** (Defense Quality)

 | 20%

 | يقدم عرضاً متألقاً ويدافع ببراعة تحليلية تثبت عمق إدراكه واحترافيته.

 | يُدافع عن اختياراته بثقة ويدعم إجاباته بالأدلة والشواهد المهنية.

 | يطرح مشروعه بوضوح ويجيب عن الأسئلة بشكل منطقي ومباشر.

 | يشرح المشروع عموماً لكن إجاباته عن أسئلة اللجنة تفتقر للعمق.

 | يرتبك أثناء العرض ويعجز عن تبرير القرارات الأساسية لمشروعه.

 |

### 6.5. Rubric 5: Final Professional Interview (روبرك المقابلة المهنية الختامية)

* **Purpose:** Verifies actual readiness for independent practice and professional decision-making (unlocked only after completing all prerequisite evidence).



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **الفهم المهني** (Professional Understanding)

 | 20%

 | يُجيب عن أسئلة المفاهيم بدقة ويطرح أمثلة تحليلية من ممارسته الفعلية بطلاقة.

 | يربط بين النماذج ويحلل الفروق بينها ويشرح متى يستخدم كل منها.

 | يشرح النماذج المهنية بدقة ويوضح طرق استخدامها بالسياقات المعتادة.

 | يذكر المفاهيم الأساسية دون قدرة على ربطها بالتطبيقات المعقدة.

 | يعجز عن تفسير المفاهيم الأساسية، ويخلط بين النماذج بوضوح.

 |
| **التفكير النقدي** (Critical Thinking)

 | 20%

 | يُحلل السيناريو المعطى ويقترح حلين بديلين مع ذكر مميزاتهما ويبني قراراً متوازناً.

 | يفحص الافتراضات ويقيم البدائل المعقدة في المواقف المهنية الصعبة.

 | يحلل المعطيات ويقارن بين بدائل منطقية للوصول إلى قرار.

 | يقترح حلاً عاماً للمشكلات، لكنه لا يقيم مخاطر اختياراته.

 | يقدم حلولاً متسرعة دون تحليل للبدائل أو فحص لمعطيات الحالة.

 |
| **الالتزام الأخلاقي** (Ethical Commitment)

 | 20%

 | يُحدد المخالفة في السيناريو المعطى بدقة ويصف إجراء الإحالة وإدارة الحدود ببراعة.

 | يوازن المصالح ويحل المعضلات الأخلاقية باحتراف وحماية للمستفيد.

 | يطبق ميثاق الأخلاقيات وحدود الاختصاص بصورة سليمة ومباشرة.

 | يعرف المبادئ العامة، لكنه يرتبك عند تطبيقها في السيناريوهات المركبة.

 | يجهل إجراءات الإحالة أو يتبنى موقفاً يعرض المستفيد للخطر.

 |
| **تبرير القرارات** (Decision Justification)

 | 20%

 | يشرح الأساس المنهجي لقراره بوضوح ويربطه بنتيجة متوقعة لمصلحة المستفيد.

 | يُناقش الخيارات المختلفة ويدافع عن قراره بحجج منطقية متماسكة.

 | يستند إلى المعايير المهنية وبيانات الحالة لتبرير قراراته بشكل جيد.

 | يقدم مبررات سطحية غير مرتبطة كفاية ببيانات وأدلة الحالة.

 | يبرر اختياراته بناءً على الانطباع الشخصي دون سند مهني.

 |
| **الجاهزية الفعلية** (Actual Readiness)

 | 20%

 | يُدير الحوار المهني بثقة عالية ويعكس استقلالية الماستر كوتش وقدرته القيادية.

 | يُدير الحوار باستقلالية ويدرك متى يجب عليه طلب الإشراف المهني.

 | يُبدي جاهزية مناسبة للممارسة المستقلة ضمن حدود الاختصاص.

 | يُظهر قدرة على الاستقلال في الحالات البسيطة ويحتاج دعماً بالمركبة.

 | يحتاج إلى توجيه مباشر ومستمر ولا يصلح للممارسة المستقلة.

 |

### 6.6. Rubric 6: Individual & Group Professional Supervision (روبرك الإشراف المهني الفردي والجماعي)

* **Purpose:** Evaluates commitment, case presentation, receptiveness to feedback, and subsequent improvement in practice.



| المعيار (Criterion) | الوزن (Weight) | ممتاز (5) | جيد جدًا (4) | جيد (3) | مقبول (2) | ضعيف (1) |
| --- | --- | --- | --- | --- | --- | --- |
| **عرض الحالات** (Case Presentation)

 | 20%

 | يطرح الحالة بوضوح تام ويفصل الوقائع عن التفسيرات ويحدد التساؤل الإشرافي بدقة.

 | يطرح الحالة مركزاً على تحليله الذاتي والبدائل التي فكر فيها.

 | يُنظم عرض الحالة ويوضح القرارات والتحدي الذي يواجهه.

 | يذكر تفاصيل الحالة بشكل عام لكنه لا يحدد سؤال الإشراف بدقة.

 | يسرد أحداث الجلسة بعشوائية دون تحديد للسياق أو التحدي الحقيقي.

 |
| **الانتظام والمشاركة** (Attendance & Participation)

 | 20%

 | يحضر 100% من الجلسات ويبادر بطرح أسئلة وتحليلات مهنية ترتقي بمستوى اللقاء.

 | يُثري النقاشات ويشارك زملاءه بتأملاته لدعم جودة جلسات الإشراف.

 | يُشارك بانتظام وفاعلية ويطرح تحدياته المهنية بصورة واضحة للمشرف.

 | يحضر الحد الأدنى المطلوب وتقتصر مشاركته على الاستماع غالباً.

 | يتغيب أو يتأخر بانتظام وتكون مشاركته سلبية أو معدومة.

 |
| **تقبل التغذية** (Receiving Feedback)

 | 20%

 | يدون التغذية الإشرافية بفضول مهني ويحللها لدمجها استراتيجياً في وعيه.

 | يُناقش المشرف بعمق لاختبار افتراضاته واستيعاب زوايا النظر الجديدة.

 | يتلقى التغذية باحترام ويستفسر بوضوح عما يمكن تطويره في ممارسته.

 | يستمع للملاحظات لكنه يحتاج دعماً كبيراً لاستيعاب كيفية تطبيقها.

 | يرفض الملاحظات أو يدافع عن نفسه فوراً دون تمعن في التوجيه.

 |
| **توظيف التغذية** (Applying Feedback)

 | 20%

 | يطبق التوجيهات في الجلسة التالية فوراً ويوثق التغيير الإيجابي في الأداء والمخرجات.

 | يوثق أثر التطبيق ويعدل مساره بمرونة بناءً على نتائج التجربة.

 | يُحسن ممارسته اللاحقة بناءً على الملاحظات الإشرافية بشكل مرئي.

 | يُطبق بعض التوجيهات بشكل متقطع دون أن تترك أثراً مستداماً.

 | يستمر بتكرار نفس الأخطاء في الجلسات اللاحقة دون أي تعديل.

 |
| **الالتزام بالأخلاقيات** (Ethical Compliance)

 | 20%

 | يُخفي هوية المستفيدين تماماً ويلتزم بسرية مطلقة ويقدم نموذجاً مثالياً في الأخلاقيات.

 | يُدير الموافقات والإفصاح بوعي احترافي يمنع أي تحيز أو تجاوز.

 | يلزم حدود السرية ويعرض الحالات بصورة تحترم خصوصية الأطراف.

 | يحاول الالتزام بالسرية لكنه يغفل عن إخفاء بعض المعطيات الدالة.

 | يكشف بيانات حساسة للمستفيدين أو يخل باحترام زملائه بالجلسات.

 |

---

## 7. Task Lifecycle, UI Card Schema & Platform Features

### 7.1. Six-Stage Task Workflow (دورة المهمة)

Every deliverable/task on the platform follows a strict 6-step state machine:

1. **View Instructions & Rubric:** Task instructions and full rubric level descriptions are visible to the participant *before* execution.


2. **Execution & Evidence Upload:** Participant executes the task and uploads required evidence (reports, plans, audio recordings, results, attachments).


3. **Self-Evaluation & Reflection:** Participant completes a self-assessment against the rubric and writes a structured reflection.


4. **Supervisor Review & Feedback:** Supervisor/Evaluator reviews the evidence and logs text or audio feedback linked to specific criteria or audio timestamps.


5. **Improvement & Resubmission:** Participant responds to feedback, documents applied improvements, and submits a revised version if needed.


6. **Final Approval:** Authorized evaluator marks the task as Approved (`معتمدة`).



### 7.2. Task Card Data Model (عناصر بطاقة المهمة)

Each task card in the UI and database must include the following 9 components:

| Field / Component (عنصر بطاقة المهمة) | System Function & Schema Requirement (وظيفته) |
| --- | --- |
| **1. Linked Competencies (الكفايات المرتبطة)** | Displays which of the 43 sub-competencies / 14 functional domains this task proves.

 |
| **2. Count & Hours (العدد والساعات)** | Tracks completion count and actual logged hours separately without duplication.

 |
| **3. Submission Evidence (أدلة التسليم)** | File/form attachments: reports, plans, audio recordings, test results, and supporting files.

 |
| **4. Rubric (الروبرك)** | Displays the linked rubric and its 5 performance level descriptions prior to execution, and records per-criterion scores + evidence justification + required improvement during evaluation.

 |
| **5. Reflection (التأمل)** | Structured 4-part reflection form: (1) What did I do? (ماذا فعلت؟), (2) Why? (ولماذا؟), (3) What was its impact? (وما أثره؟), (4) What will I change next? (وما الذي سأغيره؟).

 |
| **6. Feedback (التغذية الراجعة)** | Text or audio feedback from the supervisor/evaluator linked directly to a specific rubric criterion or a specific `mm:ss` timestamp inside an audio recording.

 |
| **7. Response to Feedback (الاستجابة للتغذية)** | Participant's articulation of understanding the feedback + attached evidence of applying it in subsequent practice.

 |
| **8. Task Status (حالة المهمة)** | Enum state: `Draft` (`مسودة`), `Submitted` (`مقدمة`), `Needs Revision` (`تحتاج تعديلًا`), `Approved` (`معتمدة`).

 |
| **9. Version History (سجل النسخ)** | Immutable audit log preserving the initial submission, all subsequent revisions, self-assessments, and evaluator ratings over time.

 |

### 7.3. Audio, Peer Review, Privacy & Scheduling Features

* **Contextual Audio Supervision Exchange:** Voice notes must be tied to learning outcomes: the participant submits a specific supervisory question (سؤال إشرافي محدد), the supervisor replies with feedback linked to a rubric criterion, and the participant uploads evidence of applying that guidance.


* **Peer Review vs. Official Evaluation:** Peers (fellow participants) can provide formative reviews (مراجعات تكوينية), whereas only an authorized evaluator (المقيم المخول) can issue the final summative approval.


* **Privacy & Granular Access Control:**
* Case recordings are strictly **private** between the participant and their supervisor by default.


* Participants have an opt-in control to share an authorized, fully anonymized version (منزوعة البيانات الدالة) with a specific peer group.


* Participants control which parts of their personal reflections are shared with peers.




* **Asynchronous vs. Synchronous Operations:**
* *Asynchronous:* Submitting reports, reflections, peer reviews, and written/audio feedback.


* *Synchronous (Requires Booking/Calendar Module):* Live training sessions, individual/group supervision, role-play simulations, and committee defenses require flexible scheduling with multiple time slots and attendance verification.





---

## 8. Admin Configuration Module (Unresolved Business Rules)

Because the toolkit leaves five operational parameters open for final accreditation committee determination, the software architecture **must not hardcode** these values; instead, they must be built as **Admin-Configurable Settings (إعدادات النظام القابلة للتخصيص)**:

1. **Minimum Passing Thresholds:** Configurable minimum score per competency and per rubric criterion, plus minimum required attendance percentage.


2. **Supervision Session Quotas:** Configurable number of required supervision sessions and the exact hour split between individual and group supervision (out of the 20 total hours).


3. **Simulation & Media Counts:** Configurable required counts for role-play simulations, phased assessments, and educational media items.


4. **Institutional Project Bundling Toggle:** Admin flag to allow merging the institutional tasks (Organizational Readiness, Omar Qarafi 3-Track Plan, Modified Pfeiffer Plan, Program Design, Leadership Project) into a single unified submission workflow while still requiring independent evaluation of each output's criteria.


5. **Review Sampling & Remediation Policy:** Configurable workflow for whether evaluators review 100% of reports/recordings or a statistical sample (بالعينة), along with automated remediation workflows when weak performance is detected.
