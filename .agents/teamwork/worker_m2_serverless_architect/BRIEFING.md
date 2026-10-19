# BRIEFING — 2026-10-16T08:26:00Z

## Mission
Architect, implement, and deliver the AWS-Native Always-Free Serverless Backend for the Master Coach Fellowship Platform (`zamalat.cyce52.com`), featuring SAM template, Serverless Express and WebSocket Lambda adapters, abstract storage repository DAO layer (DynamoDB & SQLite drivers), S3 pre-signed upload endpoints, and production deployment documentation with 100% test pass rate.

## 🔒 My Identity
- Archetype: Cloud Serverless Solutions Architect
- Roles: implementer, qa, specialist
- Working directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m2_serverless_architect
- Original parent: 2d4422f1-2555-4b30-96ea-da5281ff6790
- Milestone: Milestone 2 — AWS-Native Always-Free Serverless Backend Architecture

## 🔒 Key Constraints
- Strictly adhere to AWS Always-Free Tier limits: DynamoDB 13 RCU/WCU base + 12 RCU/WCU GSI1 = exactly 25 RCU/WCU ($0.00/mo), provisioned billing mode, TTL enabled.
- S3 Bucket configured with CORS, 15-min pre-signed upload capability, lifecycle rules (30-day IA, 90-day chat media expiry, 3-day abort multipart).
- Dual-mode architecture: preserve offline zero-dependency SQLite and native ws execution for local dev and CI tests (`npm run test:all`), alongside production AWS Lambda / DynamoDB.
- Dead connection self-healing (HTTP 410 GoneException cleanup) in WebSocket Lambda.
- Exclusive write ownership: `template.yaml`, `server/lambda.js`, `server/ws-lambda.js`, `server/db/`, `server/routes/uploads.js`, `docs/DEPLOYMENT_AWS.md`.
- STRICTLY DO NOT TOUCH `js/data.js` (owned by Worker M1 Arabic Content Specialist).
- Integrity mandate: genuine implementation only, no hardcoded cheats or dummy facades.

## Current Parent
- Conversation ID: 2d4422f1-2555-4b30-96ea-da5281ff6790
- Updated: 2026-10-16T08:26:00Z

## Task Summary
- **What to build**:
  1. AWS SAM template `template.yaml` (DynamoDB single table, S3 bucket, HTTP API v2, WebSocket API, Lambda functions, least-privilege IAM).
  2. Serverless Express adapter `server/lambda.js` and WebSocket handler `server/ws-lambda.js`.
  3. Storage Repository DAO layer in `server/db/` (`index.js`, `repository.js`, `dynamoDriver.js`, `sqliteDriver.js`).
  4. S3 Pre-signed uploads in `server/routes/uploads.js` (`POST /api/uploads/presign`, `POST /api/uploads/confirm`).
  5. Deployment runbook `docs/DEPLOYMENT_AWS.md` for `zamalat.cyce52.com`.
  6. Comprehensive verification and test suite execution.
- **Success criteria**:
  - `npm run test:all` passes 100% with zero regressions.
  - Verification scripts confirm DynamoDB and SQLite driver operations, presign validation, and WebSocket frame handling.
- **Interface contracts**:
  - `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator/PROJECT.md`
  - `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless/serverless_survey_report.md`

## Key Decisions Made
- Use `@codegenie/serverless-express` for the HTTP REST adapter (`server/lambda.js`).
- Use dedicated lightweight event handlers in `server/ws-lambda.js` for WebSocket `$connect`, `$disconnect`, and `$default`/`chat:send`.
- Build an abstract `Repository` interface in `server/db/repository.js` implemented by both `sqliteDriver.js` and `dynamoDriver.js`, exported via `server/db/index.js`.
- Design `dynamoDriver.js` to strictly follow the Single-Table design (PK/SK and GSI1PK/GSI1SK) established in the serverless survey report.

## Artifact Index
- `template.yaml` — AWS SAM Infrastructure as Code template
- `server/lambda.js` — Serverless Express HTTP API handler
- `server/ws-lambda.js` — Serverless WebSocket API event handlers
- `server/db/index.js` — DAO factory toggling SQLite vs DynamoDB
- `server/db/repository.js` — Base repository interface and method contracts
- `server/db/sqliteDriver.js` — SQLite database implementation wrapper
- `server/db/dynamoDriver.js` — DynamoDB Single-Table implementation using AWS SDK v3
- `server/routes/uploads.js` — Extended with `/presign` and `/confirm` endpoints
- `docs/DEPLOYMENT_AWS.md` — Complete production deployment runbook for `zamalat.cyce52.com`
- `tests/test_serverless_drivers.js` — Verification test for repository drivers & serverless handlers

## Change Tracker
- **Files modified**: None yet
- **Build status**: Baseline tests passing 100%
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (baseline `npm run test:all`)
- **Lint status**: Clean
- **Tests added/modified**: Pending serverless driver integration tests

## Loaded Skills
- None requested explicitly. Following internal guidelines and freelance mastery rules.
