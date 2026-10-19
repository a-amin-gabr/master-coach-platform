# Dispatch: Milestone 1 — Academic Content & 2026 Verbatim Curriculum Synchronization

## Identity
- Role: Arabic Content & Curriculum Specialist
- Type: teamwork_preview_worker
- Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m1_arabic_content
- Parent Orchestrator Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator

## Mandatory Reading
1. Authoritative User Request:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md`
2. Academic Survey Report & Handoff:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/spec_miner_survey_academic/academic_survey_report.md`
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/spec_miner_survey_academic/handoff.md`
3. Project Scope:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator/PROJECT.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
- Exclusive Write Ownership: `js/data.js` and curriculum documentation.
- DO NOT modify `server/` backend routes, `template.yaml`, or database drivers (owned by Serverless Architect).

## Tasks & Deliverables
1. **Clinical Enrichment of 90 Tool Assessments in `js/data.js`**:
   - Individualize all 30 MBTI entries with distinct personality types (e.g. INTJ, ENFP, ISTJ, ENTJ, etc.), specific clinical coaching focus, behavioral blind spots, tailored communication plans, and authentic reflections.
   - Individualize all 30 Wheel of Life entries across varied life/professional domains (قيادة، توازن، إدارة الطاقة، العلاقات المهنية، التطوير المستمر), specific gap analysis, and distinct action plans.
   - Individualize all 30 SWOT entries with distinct contextual SWOT analyses, organizational/personal threats, leverage strategies, and measurable quarterly milestones.
   - Ensure every tool entry preserves unique beneficiary codes (`BEN-01` through `BEN-20` respecting anti-duplication rule).
2. **Eradicate Mock Filenames & Placeholder Copy**:
   - Replace placeholder recording names (`mock_session_01.mp3` through `mock_session_30.mp3`) with professional audio artifact references (e.g. `session_rec_C14_BEN01_20260215.m4a`).
   - Eliminate any "lorem ipsum" or informal/generic phrases across all data entities.
3. **Curriculum & Rubric Integrity**:
   - Verify that all 6 rubrics, 5-tier descriptive matrices, exact weights (R2 differential: 25%/20%/20%/20%/15%, R1/R3-R6: 20%), 7 critical blocker criteria, and 8 submission tasks with 4-part reflections ("ماذا فعلت تحديداً؟"، "لماذا؟"، "ما أثره الملحوظ على المستفيد؟"، "ما الذي سأغيره أو أطوره مستقبلاً؟") remain 100% compliant.
4. **Verification**:
   - Run the test suite: `npm run test:all`. Ensure 100% pass with exit code 0.
   
## 2026-10-16T05:24:35Z
You are the Arabic Content & Curriculum Specialist (Worker M1) for the Master Coach Fellowship Platform project.
Your assigned working directory is:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m1_arabic_content

Read your DISPATCH.md in your working directory and the authoritative user request at:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
You own `js/data.js` and curriculum content. Do not touch backend server files.

Execute your tasks:
1. Individualize all 90 tool assessments in `js/data.js` (30 MBTI, 30 Wheel of Life, 30 SWOT) with distinct clinical coaching focus, specific reflections, and concrete action plans, preserving beneficiary uniqueness.
2. Eradicate all mock filenames (e.g. `mock_session_*.mp3`) and replace with authentic audio artifact references.
3. Eliminate all placeholder copy, ensuring 100% academic rigor aligned with the 2026 Arab Coaching Federation curriculum (CPC/PCC equivalence, Pfeiffer model, LMMI indicator, 4-part reflections).
4. Run tests (`npm run test:all`) to verify 100% pass.
5. Write your handoff report to:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m1_arabic_content/handoff.md
Then notify parent via send_message.
