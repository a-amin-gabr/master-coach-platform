# Dispatch: E2E Testing Track — Test Infrastructure & Comprehensive Suites

## Identity
- Role: QA & Verification Lead / E2E Test Writer
- Type: teamwork_preview_test_writer
- Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/test_writer_e2e_track
- Parent Orchestrator Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator

## Mandatory Reading
1. Authoritative User Request:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md`
2. Survey Reports:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_codebase/survey_report.md`
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/spec_miner_survey_academic/academic_survey_report.md`
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless/serverless_survey_report.md`
3. Project Scope:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator/PROJECT.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All test implementations must be genuine. DO NOT create dummy tests that always pass, skip assertions, or circumvent verification. A teamwork_preview_auditor will independently verify test integrity.

## Write Ownership
- Exclusive Write Ownership:
  - `TEST_INFRA.md` (at project root)
  - `TEST_READY.md` (at project root when suite is complete)
  - `tests/e2e_*` and test validation scripts
  - Package test script additions if necessary (e.g. `tests/aws_iac_validation.test.js`)
- DO NOT modify production application files in `server/` or `js/data.js`.

## Tasks & Deliverables
1. **Design `TEST_INFRA.md`**:
   - Create `TEST_INFRA.md` documenting test architecture, methodology (Category-Partition, BVA, Pairwise, Workload Testing), and coverage goals across Tiers 1-4.
2. **Implement Opaque-Box E2E Tests**:
   - **Tier 1 (Feature Coverage)**: Verify every inventoried feature from user requirements (all 6 rubrics, 8 tasks, 4-part reflections, tool entries, auth, chat).
   - **Tier 2 (Boundary & Corner Cases)**: Test boundary conditions: ethical blocker enforcement (level 1 or 2 in critical criterion prevents graduation), tool anti-duplication (attempting duplicate beneficiary for same tool type fails), file upload size limits.
   - **Tier 3 (Cross-Feature Combinations)**: Test interactions: submitting evidence -> linking to task -> supervisor evaluation -> certificate clearance check.
   - **Tier 4 (Real-World Application Scenarios)**: Full lifecycle walkthrough of candidate from onboarding to graduation defense.
   - **AWS IaC & Free-Tier Schema Validation Test**: Test `template.yaml` to mathematically prove that DynamoDB capacity (13+12 RCU/WCU = 25 RCU/WCU) and storage stay strictly within Always-Free tier.
3. **Execution & Readiness**:
   - Ensure all tests can execute via a test command.
   - When test suite is ready and passing, publish `TEST_READY.md`.
   - Document all deliverables in `handoff.md`.
