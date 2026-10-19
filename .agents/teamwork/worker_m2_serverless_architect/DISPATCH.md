# Dispatch: Milestone 2 — AWS-Native Always-Free Serverless Backend Architecture

## Identity
- Role: Cloud Serverless Solutions Architect
- Type: teamwork_preview_worker
- Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m2_serverless_architect
- Parent Orchestrator Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator

## Mandatory Reading
1. Authoritative User Request:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md`
2. Serverless Survey Report & Handoff:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless/serverless_survey_report.md`
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless/handoff.md`
3. Project Scope:
   `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator/PROJECT.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
- Exclusive Write Ownership:
  - `template.yaml` (AWS SAM infrastructure template)
  - `server/lambda.js` (Serverless Express adapter)
  - `server/ws-lambda.js` (Serverless WebSocket handlers)
  - `server/db/repository.js`, `server/db/dynamoDriver.js`, `server/db/sqliteDriver.js`, `server/db/index.js`
  - `server/routes/uploads.js` (adding S3 pre-signed URL endpoint `/api/uploads/presign` and `/confirm` while preserving local multer fallback)
  - `docs/DEPLOYMENT_AWS.md` (Step-by-step production deployment guide for `zamalat.cyce52.com`)
- DO NOT modify `js/data.js` (owned by Arabic Content Specialist).

## Tasks & Deliverables
1. **AWS SAM Template (`template.yaml`)**:
   - DynamoDB Single Table resource with Provisioned Throughput: `ReadCapacityUnits: 13`, `WriteCapacityUnits: 13` (Base Table), and GSI1 with `ReadCapacityUnits: 12`, `WriteCapacityUnits: 12`. Total = Exactly 25 RCU / 25 WCU Always-Free tier ($0.00/mo).
   - DynamoDB TTL attribute enabled (`ttl` for WebSocket connection eviction).
   - S3 Bucket for evidence, recordings, and media with CORS configuration, 15-minute pre-signed upload capability, and lifecycle configuration (30-day IA, 90-day chat media expiration).
   - AWS Lambda functions:
     - `ApiFunction`: Express HTTP API v2 handler (`ANY /{proxy+}`).
     - `WsConnectFunction`: WebSocket `$connect` handler with JWT verification.
     - `WsDisconnectFunction`: WebSocket `$disconnect` handler.
     - `WsDefaultFunction`: WebSocket `$default` / `chat:send` handler.
   - API Gateway HTTP API (v2) and WebSocket API ($connect, $disconnect, $default).
   - IAM Roles strictly adhering to least privilege.
2. **Serverless Adapters & Entrypoints**:
   - Create `server/lambda.js`: Wraps Express app using `@codegenie/serverless-express`.
   - Create `server/ws-lambda.js`: Handles API Gateway WebSocket frames, DynamoDB connection registration, and message broadcasting with dead-connection cleanup (HTTP 410 `GoneException`).
3. **Storage Repository Layer (`server/db/`)**:
   - Implement abstract DAO layer `server/db/index.js` and `server/db/repository.js`.
   - Implement `server/db/dynamoDriver.js` matching the Single-Table design documented in `serverless_survey_report.md`.
   - Maintain `server/db/sqliteDriver.js` for offline development and CI testing.
4. **S3 Pre-Signed Uploads**:
   - Extend `server/routes/uploads.js` with `POST /api/uploads/presign` (returns pre-signed S3 PUT URL for direct upload) and `POST /api/uploads/confirm`, while preserving offline local disk uploads.
5. **Production Deployment Guide (`docs/DEPLOYMENT_AWS.md`)**:
   - Comprehensive guide for `zamalat.cyce52.com`: CloudFront distribution, ACM SSL certificate, Route 53 / DNS CNAME mapping, SAM build and deploy instructions, and local emulation instructions.
6. **Verification**:
   - Run existing test suite: `npm run test:all`. Must pass 100%.
   - Validate SAM template syntax if tools available, or write verification test.
   - 
## 2026-10-16T05:24:35Z
You are the Cloud Serverless Solutions Architect (Worker M2) for the Master Coach Fellowship Platform project.
Your assigned working directory is:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m2_serverless_architect

Read your DISPATCH.md in your working directory and the authoritative user request at:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
`template.yaml`, `server/lambda.js`, `server/ws-lambda.js`, `server/db/`, `server/routes/uploads.js` (presign endpoints), `docs/DEPLOYMENT_AWS.md`. Do not touch `js/data.js`.

Execute your tasks:
1. Create complete AWS SAM `template.yaml` strictly configured for AWS Always-Free tier: DynamoDB Single Table (13 RCU/WCU base + 12 RCU/WCU GSI1 = 25 RCU/WCU total, TTL), S3 bucket with 15-min pre-signed upload capability and lifecycle rules, Lambda functions, API Gateway HTTP API v2 & WebSocket API, least-privilege IAM roles.
2. Implement serverless adapters: `server/lambda.js` with `@codegenie/serverless-express`, and `server/ws-lambda.js` for WebSocket `$connect`, `$disconnect`, `$default`/`chat:send` with DynamoDB connection tracking and HTTP 410 dead-connection cleanup.
3. Implement Storage Repository DAO layer in `server/db/` (`index.js`, `repository.js`, `dynamoDriver.js`, `sqliteDriver.js`).
4. Extend `server/routes/uploads.js` with `POST /api/uploads/presign` and `POST /api/uploads/confirm` for S3 direct uploads (bypassing 10MB API Gateway limit for 50MB files).
5. Create production deployment guide in `docs/DEPLOYMENT_AWS.md` for `zamalat.cyce52.com`.
6. Run `npm run test:all` to ensure zero regression on existing offline runner.
7. Write your handoff report to:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/worker_m2_serverless_architect/handoff.md
Then notify parent via send_message.
