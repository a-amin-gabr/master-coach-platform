# Orchestration Master Plan: Master Coach Fellowship Platform

## Project Overview
Transform the Master Coach Fellowship Platform (`zamalat.cyce52.com` / Tamkeen Al-Roaya) into a production-grade, AWS-Native serverless application operating strictly within AWS Always-Free tier resources, while executing a complete academic audit to align all texts, rubrics, and case studies verbatim with Coach Abdelkarim Al-Khelaifi's official 2026 curriculum.

## Phases & Milestones

### Phase 0: Survey & Scope Mapping (Parallel Explorers)
- **Explorer 1 (Codebase & Architecture)**: Survey current workspace structure, existing files (PROJECT.md, README.md, server.js, js/, css/, data/, tests/), package.json, test runner, dual-mode runner needs.
- **Explorer 2 (Academic Content & Curriculum)**: Survey Arabic text, 6 rubrics, 14 competency domains, 8 submission tasks, 4-part reflections, 90 clinical tool case studies, evaluate verbatim alignment with 2026 Arab Coaching Federation standards and detect all placeholder text.
- **Explorer 3 (AWS Serverless & Cloud Infrastructure)**: Survey AWS Always-Free tier constraints (DynamoDB 25 RCU/WCU, 25GB single-table schema, S3 pre-signed uploads, Lambda Node.js handlers, WebSocket & HTTP API Gateway, CloudFront static distribution, CloudFormation/SAM/Terraform IaC).

### Phase 1: Architecture Specification & Dual-Track Decomposition
- Synthesize explorer reports into `PROJECT.md` with full feature inventory, milestone definitions, interface contracts, and code layout.
- Launch E2E Testing Track Orchestrator / Test Writers (`TEST_INFRA.md`).

### Phase 2: Implementation Track & E2E Testing Track Execution
- **Milestone 1**: Academic Content & 2026 Verbatim Rubric Synchronization (0 placeholder copy, 6 rubrics, 8 submission milestones, 14 competencies, 90 tool case studies, 4-part reflections).
- **Milestone 2**: AWS-Native Always-Free Serverless Backend (DynamoDB single table, Lambda handlers, S3 pre-signed URLs, WebSocket real-time API, CloudFormation/SAM IaC).
- **Milestone 3**: Edge Distribution, Frontend Polish & Dual-Mode Local/Lambda Runner (CloudFront config, 375px+ responsive UI with 0px horizontal scroll, dual-mode Express/SQLite and AWS Lambda/DynamoDB runner).
- **Milestone 4**: Comprehensive Automated Testing & E2E Verification (pass 100% test suite `npm run test:all`, rubric logic, ethical blockers, mobile viewport verification, AWS IaC validation).

### Phase 3: Final Acceptance, Adversarial Coverage Hardening & Handoff
- Challenger adversarial stress testing.
- Forensic Auditor integrity review (binary pass/fail).
- Victory verification request to Sentinel and final handoff.md.
