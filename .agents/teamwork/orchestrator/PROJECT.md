# Project: Master Coach Platform (Tamkeen Al-Roaya - cyce52.com)

## Architecture
- **Overview**: AWS-Native Always-Free serverless application for Coach Abdelkarim Al-Khelaifi's Master Coach Fellowship Platform (`zamalat.cyce52.com`), featuring dual-mode local runner (Express + SQLite) and AWS Serverless production runner (Lambda + DynamoDB Single-Table + S3 + API Gateway + CloudFront).
- **Backend Architecture**:
  1. *Dual-Mode Architecture*:
     - Offline / CI Runner: Express 5 + `better-sqlite3` + native `ws` WebSocket server.
     - Production AWS Runner: `@codegenie/serverless-express` on API Gateway HTTP API v2 (`ANY /{proxy+}`) + dedicated WebSocket API Lambdas (`$connect`, `$disconnect`, `$default`).
     - Storage Repository Layer: Abstract DAO pattern (`server/db/`) supporting both SQLite and DynamoDB drivers with zero route changes.
  2. *DynamoDB Single-Table Design*:
     - Provisioned Capacity: 13 RCU / 13 WCU (base table) + 12 RCU / 12 WCU (GSI1) = Exactly 25 RCU / 25 WCU Always-Free tier ($0.00/month).
     - Storage: Under 250MB (<1% of 25GB free tier).
     - Entities: Users, Coaches, Program States, Tasks, Evidences, Tool Applications (with conditional expression `attribute_not_exists` anti-duplication), Rubrics, Ethics Checkpoints & Referrals, Supervisor Feedbacks, Chat Channels, Members, Messages, and WebSocket connection states (`WS_CONN#<connId>`).
  3. *S3 Storage & Pre-signed Direct Uploads*:
     - S3 bucket for evidence files, audio recordings, and images.
     - 15-minute pre-signed PUT URLs bypass API Gateway 10MB payload ceiling for 50MB audio/PDF uploads.
     - S3 lifecycle management: 30-day Standard-IA transition, 90-day chat media expiration.
  4. *Edge & Security*:
     - Amazon CloudFront multi-origin distribution pointing to S3 static bucket and API Gateway.
     - TLS 1.3 with AWS Certificate Manager (ACM) for `zamalat.cyce52.com`.
     - Strict Security Headers: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- **Frontend Architecture**:
  - Executive Single-Page Application (HTML5, Modern CSS Glassmorphism, Vanilla JS).
  - Mobile responsiveness: 375px+ viewports with verified 0px horizontal canvas overflow (`docScrollWidth === winW`).
  - Dark/Light mode, high-contrast Cairo and Tajawal typography, SVG circular progress gauges.
  - Floating action launcher and slide-over messenger drawer (`#chat-drawer`).
  - 19 mandatory DOM contract IDs preserved.
- **Academic Content & Curriculum**:
  - 6 official rubrics with exact weights (R2: 25%/20%/20%/20%/15%, R1/R3-R6: 20%) and 5-tier descriptive levels.
  - 7 critical ethical blocker checkpoints with non-compensable veto.
  - 14 core competency domains, 44 subcompetencies, 335 hours.
  - 8 submission milestones with 4-part structured reflections.
  - 90 clinical tool case studies (30 MBTI, 30 Wheel of Life, 30 SWOT) with authentic, individualized Arabic coaching reflections (zero placeholder copy, Pfeiffer modified model, LMMI indicator, CPC/PCC equivalence).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 2026 Rubrics Verbatim Synchronization | 6 official rubrics with 5 tiers, exact weights (R2 differential, R1/R3-R6 20%), 7 critical blocker criteria | M1 | Survey (spec_miner) |
| 2 | 8 Submission Milestones & 4-Part Reflections | TASK-01 to TASK-08 with authentic "ماذا فعلت؟ ولماذا؟ وما أثره؟ وما الذي سأغيره؟" reflections | M1 | Survey (spec_miner) |
| 3 | 90 Tool Assessments Clinical Enrichment | 30 MBTI, 30 Wheel of Life, 30 SWOT individualized professional Arabic case studies, zero placeholder text | M1 | Survey (spec_miner) |
| 4 | Eradicate Placeholder Strings & Mock Filenames | Replace `mock_session_*.mp3` and generic phrases with authentic coaching artifacts | M1 | Survey (spec_miner) |
| 5 | DynamoDB Single-Table Schema & Driver | Single-table design provisioned at 13/13 (table) + 12/12 (GSI1) = 25 RCU/WCU Always-Free tier | M2 | Survey (serverless_explorer) |
| 6 | S3 Pre-signed Direct Upload Architecture | Two-step pre-signed URL upload protocol for 50MB audio/PDF files with lifecycle rules | M2 | Survey (serverless_explorer) |
| 7 | Serverless Express Lambda Handler | `@codegenie/serverless-express` in `server/lambda.js` mounting HTTP API v2 route `ANY /{proxy+}` | M2 | Survey (serverless_explorer) |
| 8 | Serverless WebSocket Lambdas | `$connect`, `$disconnect`, `$default`/`chat:send` handlers with DynamoDB connection tracking & ghost cleanup | M2 | Survey (serverless_explorer) |
| 9 | AWS SAM / CloudFormation IaC Template | Complete `template.yaml` defining S3, DynamoDB, Lambda, API Gateway HTTP/WS, and IAM roles | M2 | Survey (serverless_explorer) |
| 10 | Dual-Mode Storage Abstraction Layer | `server/db/` DAO repository toggling between SQLite (offline CI) and DynamoDB (production) | M3 | Survey (codebase_explorer) |
| 11 | CloudFront Distribution & Security Headers | Static asset CDN config, custom domain `zamalat.cyce52.com`, CSP, HSTS, X-Frame-Options | M3 | Survey (serverless_explorer) |
| 12 | Mobile Responsive Viewport Audit (375px+) | 0px horizontal scroll on 375px, 390px, 414px; table horizontal scroll encapsulation | M3 | Survey (codebase_explorer) |
| 13 | Production Deployment Guide | Step-by-step runbook for DNS CNAME, ACM SSL, SAM deploy, and CloudFront routing for `zamalat.cyce52.com` | M3 | Survey (serverless_explorer) |
| 14 | E2E Testing Suite & Offline Parity | `npm run test:all` executes cleanly and passes 100% across all suites | M4 | Survey (all) |
| 15 | Adversarial Coverage Hardening (Tier 5) | Challenger stress tests on edge cases, concurrent uploads, ethical blockers, anti-duplication | M5 | Strategy (Project Pattern) |
| 16 | Forensic Integrity Audit & Attestation | Teamwork auditor independent verification of zero facades, zero mocks, real implementation | M5 | Strategy (Project Pattern) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Academic Content & 2026 Verbatim Curriculum Synchronization | Individualize 90 tool case studies, eradicate placeholder filenames, verify 6 rubrics, 8 milestones, 4-part reflections | none | IN_PROGRESS |
| M2 | AWS-Native Always-Free Serverless Backend Architecture | Implement DynamoDB single-table driver, S3 pre-signed upload handler, Lambda entrypoints, WebSocket serverless handlers, SAM template | none | IN_PROGRESS |
| M3 | Dual-Mode Local/Lambda Runner, CloudFront Config & Mobile Polish | Integrate Storage Repository DAO layer in server, CloudFront distribution template, verify 375px mobile responsiveness, deployment guide | M1, M2 | PLANNED |
| M4 | Comprehensive Automated Testing & E2E Verification | Ensure `npm run test:all` passes 100%, verify rubric logic, ethical blockers, anti-duplication, and SAM validate | M1, M2, M3 | PLANNED |
| M5 | Final Acceptance, Adversarial Coverage Hardening & Forensic Audit | Challenger adversarial testing (Tier 5), Forensic Auditor integrity audit (binary veto), handoff & victory verification | M4 | PLANNED |

## Interface Contracts
### Storage DAO Interface (`server/db/repository.js`)
- `getUserById(id)` / `getUserByEmail(email)`
- `getCoachByUserId(userId)` / `updateCoachProgramState(coachId, state)`
- `listTasks(coachId)` / `getTaskById(taskId)` / `saveTaskSubmission(taskId, submissionData)`
- `listTools(coachId)` / `saveToolApplication(toolData)` (enforces unique beneficiary per toolType)
- `listRubrics()` / `saveRubricEvaluation(evalData)` (enforces critical blocker non-compensation)
- `listEthicsCheckpoints(coachId)` / `saveEthicsCheckpoint(checkpointData)` / `recordEthicsReferral(referralData)`
- `listChatChannels(userId)` / `saveChatMessage(msgData)` / `listChatMessages(channelId, limit, beforeId)`
- `saveWebSocketConnection(connId, userId)` / `removeWebSocketConnection(connId)` / `getConnectionsByChannel(channelId)`

### S3 Pre-Signed Upload Contract
- `POST /api/uploads/presign`: `{ filename: string, fileType: string, fileSize: number, isEvidence?: boolean }`
  -> Returns `{ uploadUrl: string, key: string, fileUrl: string, expires: number }`
- `POST /api/uploads/confirm`: `{ key: string, fileUrl: string, metadata: object }`
  -> Validates upload completion and registers evidence in database.

### API Gateway WebSocket Contract
- `$connect`: Validates JWT token from query string `token`, records connection in DynamoDB.
- `$disconnect`: Removes connection record from DynamoDB.
- `chat:send`: Broadcasts message to active channel members via `ApiGatewayManagementApiClient`, automatically prunes HTTP 410 dead connections.

## Code Layout
- `server/db/`: Abstract storage repository and driver implementations (`sqliteDriver.js`, `dynamoDriver.js`, `index.js`).
- `server/lambda.js`: Express serverless adapter (`@codegenie/serverless-express`) for HTTP API v2.
- `server/ws-lambda.js`: API Gateway WebSocket handlers (`connectHandler`, `disconnectHandler`, `defaultHandler`).
- `server/routes/uploads.js`: Local disk uploads (offline mode) + S3 pre-signed URL generation (production mode).
- `template.yaml`: AWS SAM template configuring DynamoDB (13/12 RCU/WCU Always-Free), S3, Lambda, API Gateway HTTP & WebSocket, CloudFront.
- `js/data.js`: Authoritative 2026 Arab Coaching Federation academic curriculum data, 90 tool clinical case studies, 6 rubrics, 8 tasks.
- `docs/DEPLOYMENT_AWS.md`: Production deployment guide for `zamalat.cyce52.com`.
- `tests/`: Automated test suites (`api_fullstack.test.js`, `websocket.test.js`, `test_platform.js`, `test_reactive_logic.js`, plus new serverless & IaC tests).
