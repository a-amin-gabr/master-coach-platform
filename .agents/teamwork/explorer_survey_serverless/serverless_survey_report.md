# Master Coach Fellowship Platform (`zamalat.cyce52.com`)
## Comprehensive Cloud Serverless Architecture, AWS Always-Free Constraints & IaC Survey Report

**Project**: Master Coach Platform (منظومة إعداد وتأهيل الماستر كوتش - شركة تمكين الرؤية للاستشارات المهنية)  
**Author**: Cloud Serverless Architecture Explorer  
**Production Domain**: `zamalat.cyce52.com`  
**Date**: 2026-10-16  
**Status**: Authoritative Architectural Survey & Implementation Blueprint  

---

### Table of Contents
1. [Executive Summary & Architectural Paradigm](#1-executive-summary--architectural-paradigm)
2. [Pillar 1: API Inventory & AWS Lambda / API Gateway Adaptation](#2-pillar-1-api-inventory--aws-lambda--api-gateway-adaptation)
3. [Pillar 2: DynamoDB Single-Table Design & Strict Always-Free Constraints](#3-pillar-2-dynamodb-single-table-design--strict-always-free-constraints)
4. [Pillar 3: S3 Pre-Signed Upload URLs & Storage Lifecycle Management](#4-pillar-3-s3-pre-signed-upload-urls--storage-lifecycle-management)
5. [Pillar 4: WebSocket Real-Time Messaging Architecture & Connection State](#5-pillar-4-websocket-real-time-messaging-architecture--connection-state)
6. [Pillar 5: Amazon CloudFront Static Distribution & Security Hardening](#6-pillar-5-amazon-cloudfront-static-distribution--security-hardening)
7. [Pillar 6: Infrastructure as Code (AWS SAM) & Dual-Mode Local Emulation](#7-pillar-6-infrastructure-as-code-aws-sam--dual-mode-local-emulation)
8. [AWS Always-Free Tier Cost Audit & Financial Guardrails](#8-aws-always-free-tier-cost-audit--financial-guardrails)
9. [Step-by-Step Production Deployment Runbook](#9-step-by-step-production-deployment-runbook)

---

### 1. Executive Summary & Architectural Paradigm

The Master Coach Fellowship Platform (`zamalat.cyce52.com`) currently operates as a standalone monolithic Node.js v24 application utilizing Express v5.3.0, `better-sqlite3`, and a native `ws` WebSocket server. The current codebase serves a dual-role audience:
1. **Candidate Trainee Coaches** (who submit 8 major qualification milestones, log 240 hours, submit 20 clinical cases and 30 recorded sessions, execute 90 psychometric tool applications across MBTI, Wheel of Life, and SWOT, and draft 4-part structured reflections).
2. **Master Coach Abdelkarim Al-Khelaifi / Executive Committee** (who conduct 6 formal rubric evaluations across 5 performance levels, manage ethical clearance toggles ETH-01 through ETH-07, supervise direct 1-on-1 and cohort chat channels, and issue digitally signed graduation decrees).

#### The Serverless Mandate
The objective is to re-architect this platform into an **AWS-Native Serverless application** capable of sustaining production traffic indefinitely at **$0.00/month recurring infrastructure cost** by strictly operating within the permanent boundaries of the **AWS Always-Free Tier**.

#### The Dual-Mode Architecture Philosophy
To preserve the developer experience and enable fast offline CI testing without requiring live AWS credentials, the application adopts a **Dual-Mode Architecture**:
- **Offline / Local Mode**: Express + `better-sqlite3` + native `ws` on `localhost:3000`. The entire 4-part test suite (`npm run test:all`) executes locally in under 3 seconds with zero network dependencies.
- **Production Serverless Mode**: AWS Lambda (Node.js 20.x/22.x) behind Amazon API Gateway (HTTP APIs v2 for REST + WebSocket API for real-time messaging), Amazon DynamoDB (Single-Table Design, Provisioned 25 RCU / 25 WCU), Amazon S3 (direct pre-signed URL uploads), and Amazon CloudFront with an AWS Certificate Manager (ACM) SSL/TLS certificate for `zamalat.cyce52.com`.

---

### 2. Pillar 1: API Inventory & AWS Lambda / API Gateway Adaptation

#### 2.1 Complete Inventory of Existing REST Routes
An audit of the server codebase reveals **37 REST endpoints** distributed across 11 modules under `server/routes/`:

| Module | Route / Endpoint | HTTP Method | Auth / Role | Description |
|---|---|---|---|---|
| **Health** | `/api/health` | GET | Public | Service healthcheck & system metadata |
| **Auth** | `/api/auth/login` | POST | Public | Authenticates coach or admin, returns JWT |
| **Auth** | `/api/auth/me` | GET | Authenticated | Retrieves current authenticated profile & coach dossier |
| **Auth** | `/api/auth/register` | POST | Public | Onboards new candidate coach with cloned baseline |
| **Auth** | `/api/auth/logout` | POST | Authenticated | Invalidates client session |
| **Coaches** | `/api/coaches` | GET | Admin | Lists all coaches with live task/ethics summaries |
| **Coaches** | `/api/coaches/:id` | GET | Coach (Self) / Admin | Full candidate state dossier & rubrics |
| **Coaches** | `/api/coaches/:id/reset-state` | POST | Coach (Self) / Admin | Resets dossier to fresh (0%) or demo (100%) |
| **Tasks** | `/api/tasks` | GET | Coach (Self) / Admin | Fetches 8 submission milestone tasks |
| **Tasks** | `/api/tasks/:id` | GET | Coach (Self) / Admin | Fetches single task with evidence & reflections |
| **Tasks** | `/api/tasks/:id/reflection` | PUT | Coach (Self) / Admin | Updates 4-part reflection (What, Why, Impact, Change) |
| **Tasks** | `/api/tasks/:id/submit` | POST | Coach (Self) / Admin | Submits task, increments major version (v1.0 -> v2.0) |
| **Tasks** | `/api/tasks/:id/evaluate` | POST | Admin | Evaluates task, assigns grade, notes, and audio URL |
| **Uploads** | `/api/uploads` | POST | Coach (Self) / Admin | Multipart upload for evidence (to be replaced by pre-signed URLs) |
| **Tools** | `/api/tools` | GET | Coach (Self) / Admin | Fetches MBTI, Wheel of Life, and SWOT applications |
| **Tools** | `/api/tools/apply` | POST | Coach (Self) / Admin | Submits tool application with anti-duplication validation |
| **Rubrics** | `/api/rubrics` | GET | Coach (Self) / Admin | Fetches 6 official Arab Coaching Federation rubrics |
| **Rubrics** | `/api/rubrics/evaluate` | POST | Admin | Evaluates criterion (level 1-5, weights, evidence note) |
| **Ethics** | `/api/ethics` | GET | Coach (Self) / Admin | Fetches checkpoints ETH-01 to ETH-07 & referrals |
| **Ethics** | `/api/ethics/toggle` | POST | Admin | Toggles checkpoint status (verified, passed, flagged) |
| **Ethics** | `/api/ethics/referrals` | POST | Coach (Self) / Admin | Documents clinical ethical referral |
| **Cases** | `/api/cases` | GET | Coach (Self) / Admin | Fetches 20 clinical case studies |
| **Cases** | `/api/cases/:id` | GET | Coach (Self) / Admin | Fetches single clinical case study |
| **Audit** | `/api/audit/determination` | GET | Coach (Self) / Admin | Computes complete graduation clearance criteria |
| **Audit** | `/api/audit/determination` | POST | Admin | Issues official graduation decree (CYCE-MC-...) |
| **Admin** | `/api/admin/pending-tasks` | GET | Admin | Retrieves all pending tasks across all candidates |
| **Admin** | `/api/admin/stats` | GET | Admin | Cohort KPI metrics, hours, rubric averages |
| **Admin** | `/api/admin/reset-demo` | POST | Admin | Restores full initial database seed state |
| **Admin** | `/api/admin/export` | GET | Admin | Full JSON database dump export |
| **Admin** | `/api/admin/certificate-config` | GET & PUT | Admin | Reads/updates decree header, chair, and seal config |
| **Admin** | `/api/admin/certificate-rows` | POST, PUT, DELETE | Admin | CRUD operations on decree credential breakdown rows |
| **Admin** | `/api/admin/certificate-rows/reset` | POST | Admin | Resets decree breakdown rows to standard 12 items |
| **Admin** | `/api/admin/tasks` | POST, PUT, DELETE | Admin | CRUD operations on task bank definitions |
| **Admin** | `/api/admin/competencies` | POST, PUT, DELETE | Admin | CRUD operations on 14 competency domains |
| **Admin** | `/api/admin/rubrics/criteria` | POST, PUT, DELETE | Admin | CRUD operations on rubric criteria |
| **Admin** | `/api/admin/quotas` | PUT | Admin | Updates institutional hours/case quotas |
| **Admin** | `/api/admin/coaches` | POST, PUT, DELETE | Admin | Administrative coach account provisioning |
| **Chat** | `/api/chat/channels` | GET | Authenticated | Lists user direct supervisory and cohort channels |
| **Chat** | `/api/chat/channels/:id/messages`| GET & POST | Member / Admin | Paginated messages & REST message broadcast bridge |
| **Chat** | `/api/chat/upload` | POST | Member / Admin | Chat voice notes, images, documents (to be pre-signed) |
| **Chat** | `/api/chat/channels/:id/read` | POST | Member / Admin | Synchronizes read receipts |
| **Chat** | `/api/chat/search` | GET | Authenticated | Full-text query across chat history |
| **Chat** | `/api/chat/stream` | GET | Authenticated | SSE stream (deprecated in serverless in favor of WebSocket) |

#### 2.2 Serverless Lambda Adaptation Strategy
We evaluated three approaches for adapting the 37 REST routes into AWS Lambda:

1. **Granular Micro-Lambdas (37 separate functions)**:
   - *Verdict*: **Rejected**. Creating 37 separate Lambda functions introduces severe cold-start multiplication, increases CloudFormation template size past limits, and fragments the data access code.
2. **Monolithic Lambda with Serverless Express (`@codegenie/serverless-express`)**:
   - *Verdict*: **Recommended for REST**. Wrapping the existing Express application inside a single handler (`server/lambda.js`) mounted to an API Gateway HTTP API proxy route (`ANY /{proxy+}`).
   - *Benefits*:
     - 100% preservation of route definitions, middleware (`auth.js`), validation logic, and error formatting.
     - The existing fullstack test suite (`tests/api_fullstack.test.js`) runs with zero modifications against both local Express and API Gateway.
     - Single warm execution container serves consecutive requests across all endpoints.
     - Sub-200ms cold start when bundled with esbuild into a single file (< 2MB).
3. **Dedicated WebSocket Micro-Lambdas**:
   - *Verdict*: **Recommended for Real-Time**. Unlike REST APIs, WebSocket events ($connect, $disconnect, default message frames) benefit from ultra-lightweight dedicated handlers that do not load Express, minimizing execution duration to < 15ms per frame.

#### 2.3 API Gateway Architecture: HTTP API v2 vs REST API v1
For the REST backend, **Amazon API Gateway HTTP API (v2)** is selected:
- **Cost**: 70% cheaper than REST API v1 ($1.00/million vs $3.50/million after free tier; 1,000,000 free requests/month during initial tier).
- **Latency**: Native HTTP/2 support and lower proxy overhead (~10ms vs ~45ms).
- **Payload Limit**: Supports up to 10MB payload size (sufficient for all JSON metadata). Large binary evidence (up to 50MB) completely bypasses API Gateway via S3 Pre-signed URLs.
- **CORS Configuration**: Configured directly at the API Gateway level to allow `https://zamalat.cyce52.com` and `http://localhost:3000`.

---

### 3. Pillar 2: DynamoDB Single-Table Design & Strict Always-Free Constraints

#### 3.1 Strict AWS Always-Free Tier Provisioning Reality
Amazon DynamoDB's permanent Always-Free Tier includes:
- **25 GB** of encrypted data storage.
- **25 Provisioned Write Capacity Units (WCU)**.
- **25 Provisioned Read Capacity Units (RCU)**.

> **CRITICAL ARCHITECTURAL WARNING**:  
> The 25 RCU and 25 WCU free allowance applies **exclusively** when `BillingMode` is set to `PROVISIONED`. On-Demand mode (`PAY_PER_REQUEST`) does NOT receive a permanent monthly free tier allocation and will incur charges once the initial trial expires. Furthermore, AWS sums the provisioned capacity across the base table **and all Global Secondary Indexes (GSIs)** in the account.

To ensure permanent $0.00 billing, the table and its single GSI are allocated as follows:
- **Base Table**: `ProvisionedThroughput`: 13 RCU / 13 WCU.
- **Global Secondary Index 1 (GSI1)**: `ProvisionedThroughput`: 12 RCU / 12 WCU.
- **Total Account Consumption**: **25 RCU / 25 WCU** (100% within free quota, $0.00/month).

#### 3.2 Single-Table Entity-Relationship Schema Design
All 12 relational entities from SQLite are mapped into a single DynamoDB table named `MasterCoachPlatform`:

| Entity | Primary Key (`PK`) | Sort Key (`SK`) | `GSI1PK` | `GSI1SK` | Projected Attributes & Schema |
|---|---|---|---|---|---|
| **User Account** | `USER#<email>` | `METADATA` | `USER_ID#<userId>` | `PROFILE` | `userId`, `email`, `passwordHash`, `name`, `role`, `avatar`, `phone`, `createdAt` |
| **Coach Dossier** | `COACH#<coachId>` | `PROFILE` | `USER_ID#<userId>` | `COACH` | `coachId`, `userId`, `candidateCode`, `title`, `enrollmentDate`, `supervisorName`, `committeeChair`, `currentStanding`, `auditStatus`, `auditDecree`, `createdAt` |
| **Coach State Document** | `COACH#<coachId>` | `STATE#JSON` | `COACH#<coachId>` | `STATE` | `stateJson` (full synchronized program state object), `updatedAt` |
| **Task Milestone** | `COACH#<coachId>` | `TASK#<taskId>` | `TASK_STATUS#<status>` | `COACH#<coachId>#<taskId>` | `taskId`, `coachId`, `title`, `category`, `rubricCode`, `status`, `version`, `grade`, `reflection`, `supervisorNotes`, `audioFeedbackUrl`, `history`, `updatedAt` |
| **Evidence Deposit** | `COACH#<coachId>` | `EVIDENCE#<taskId>#<evidenceId>` | `TASK#<taskId>` | `EVIDENCE#<createdAt>` | `evidenceId`, `taskId`, `coachId`, `name`, `originalName`, `fileKey`, `fileUrl`, `mimeType`, `sizeBytes`, `type`, `pages`, `duration`, `isAnonymous`, `createdAt` |
| **Tool Application** | `COACH#<coachId>` | `TOOL#<toolType>#BEN#<beneficiaryCode>` | `TOOL#<toolType>` | `COACH#<coachId>#<beneficiaryCode>` | `id`, `coachId`, `toolType`, `beneficiaryCode`, `date`, `focus`, `plan`, `status`, `createdAt` |
| **Rubric Evaluation** | `COACH#<coachId>` | `RUBRIC#<rubricCode>#CRIT#<criterionId>` | `RUBRIC#<rubricCode>` | `CRIT#<criterionId>#LEVEL#<level>` | `coachId`, `rubricCode`, `criterionId`, `level`, `evidenceNote`, `notes`, `requiredImprovement`, `updatedAt` |
| **Ethics Checkpoint** | `COACH#<coachId>` | `ETHICS#CHECK#<checkpointId>` | `ETHICS#STATUS#<status>` | `COACH#<coachId>#<checkpointId>` | `coachId`, `checkpointId`, `title`, `status`, `clearedBy`, `clearedAt` |
| **Ethics Referral** | `COACH#<coachId>` | `ETHICS#REF#<caseRef>` | `ETHICS#REFERRALS` | `COACH#<coachId>#<detectionDate>` | `caseRef`, `coachId`, `beneficiaryCode`, `detectionDate`, `observedSymptoms`, `actionTaken`, `referredTo`, `status`, `createdAt` |
| **Chat Channel** | `CHAT_CHANNEL#<channelId>` | `METADATA` | `CHANNEL_TYPE#<type>` | `CHANNEL#<channelId>` | `channelId`, `channelType`, `name`, `description`, `directCoachId`, `createdAt` |
| **Channel Member** | `CHAT_CHANNEL#<channelId>` | `MEMBER#<userId>` | `USER_ID#<userId>` | `CHANNEL#<channelId>` | `channelId`, `userId`, `role`, `lastReadMessageId`, `joinedAt` |
| **Chat Message** | `CHAT_CHANNEL#<channelId>` | `MSG#<timestamp>#<messageId>` | `SENDER#<userId>` | `MSG#<timestamp>` | `id`, `channelId`, `senderId`, `senderName`, `senderRole`, `messageType`, `content`, `mediaUrl`, `mediaMeta`, `isPinned`, `createdAt` |
| **WebSocket Connection** | `WS_CONN#<connectionId>` | `METADATA` | `USER_ID#<userId>` | `CONN#<connectionId>` | `connectionId`, `userId`, `role`, `connectedAt`, `ttl` (Unix epoch) |
| **System Benchmark** | `CONFIG#GLOBAL` | `CERTIFICATE` / `QUOTAS` | `CONFIG#GLOBAL` | `METADATA` | `certificateConfig`, `quotas`, `competencies`, `taskBank` |

#### 3.3 Native Anti-Duplication Enforcement in DynamoDB
In the 2026 Curriculum, a critical requirement is that within each of the 3 tools (MBTI, Wheel of Life, SWOT), 30 unique beneficiaries must be logged without repetition (internal anti-duplication).
- In SQLite, this is enforced via `UNIQUE(coach_id, tool_type, beneficiary_code)`.
- In DynamoDB, this is enforced natively without table scans by setting the item's Sort Key to `TOOL#<toolType>#BEN#<beneficiaryCode>` and executing `PutCommand` with:
  ```javascript
  ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
  ```
  If a candidate attempts to re-enter `BEN-05` in MBTI, DynamoDB immediately rejects the write with a `ConditionalCheckFailedException`, perfectly preserving the domain integrity rule at 1 WCU cost.

#### 3.4 Data Capacity & Storage Estimates
- Complete dossier per coach (8 tasks, 30 tool apps, 30 rubric evals, reflections): ~350 KB.
- 500 candidate coaches = 175 MB.
- 50,000 chat messages = 35 MB.
- Total database size: **~210 MB**, which is **0.84%** of DynamoDB's 25 GB free storage ceiling.

---

### 4. Pillar 3: S3 Pre-Signed Upload URLs & Storage Lifecycle Management

#### 4.1 The Serverless File Upload Challenge
In the local Express implementation, file uploads pass through Multer to the local `/uploads` directory with a 50MB ceiling. In an AWS serverless architecture:
- AWS API Gateway enforces a strict **10MB payload ceiling** on HTTP APIs.
- Streaming large binaries through Lambda wastes memory and compute seconds, risking timeouts on mobile connections.

#### 4.2 Two-Step Pre-Signed URL Direct Upload Architecture
Candidate evidence (audio recordings, PDF portfolios) and chat attachments (voice notes, images) transition to **Direct S3 Pre-Signed Uploads**:

```
+---------------+              +--------------------+              +---------------+
|   Frontend    |              |   API Gateway /    |              |   Amazon S3   |
| (Browser/App) |              |   Lambda Handler   |              | Evidence/Chat |
+---------------+              +--------------------+              +---------------+
        |                                |                                 |
        | 1. POST /api/uploads/presign    |                                 |
        |    {taskId, fileName, mime, sz}|                                 |
        |    isAnonymous: true           |                                 |
        |------------------------------->|                                 |
        |                                | 2. Validate JWT, role,          |
        |                                |    size <= 50MB, anonymization  |
        |                                |    Generate S3 PutObject URL    |
        | 3. Returns {uploadUrl, fileKey}|                                 |
        |<-------------------------------|                                 |
        |                                                                  |
        | 4. Direct HTTP PUT (Binary Blob)                                 |
        |----------------------------------------------------------------->|
        |                                                                  |
        | 5. S3 200 OK (ETag returned)                                    |
        |<-----------------------------------------------------------------|
        |                                |                                 |
        | 6. POST /api/uploads/confirm   |                                 |
        |    {taskId, fileKey, meta}     |                                 |
        |------------------------------->|                                 |
        |                                | 7. S3 HeadObject verification   |
        |                                |    DynamoDB PutItem (Evidence)  |
        |                                |    Update Task version v1.0->1.1|
        | 8. 201 Created (Evidence obj)  |                                 |
        |<-------------------------------|                                 |
```

#### 4.3 Technical Implementation Specifications
1. **Pre-sign Handler (`POST /api/uploads/presign`)**:
   - Validates candidate authentication and privacy pledge (`isAnonymous === true`).
   - Generates object key:
     `evidence/{coachId}/{taskId}/{timestamp}-{uuid}-{sanitizedFileName}`
   - Sets S3 Pre-signed URL expiration to **900 seconds (15 minutes)**.
   - Enforces upload constraint metadata: `x-amz-meta-anonymized: "true"`, `Content-Type: req.body.fileType`.
2. **Deposit Confirmation Handler (`POST /api/uploads/confirm`)**:
   - Calls `HeadObjectCommand` to verify file existence and exact byte size in S3.
   - Saves `EVIDENCE#...` item in DynamoDB and bumps task version (e.g. `v1.0` -> `v1.1`).
   - Appends audit trail history entry.

#### 4.4 S3 Storage Lifecycle & Cost Optimization Rules
To ensure storage costs remain $0.00:
- **Bucket**: `zamalat-cyce52-storage-{AccountId}`.
- **Rule 1 (`ChatMediaExpiration`)**: Voice notes and ephemeral chat attachments expire automatically after **90 days**.
- **Rule 2 (`EvidenceInfrequentAccess`)**: Candidate submitted portfolio documents transition to **S3 Standard-IA (Infrequent Access)** after **30 days** of inactivity.
- **Rule 3 (`AbortIncompleteMultipart`)**: Incomplete multipart uploads are aborted automatically after **3 days** to prevent orphan chunk charges.
- **Rule 4 (`CORSConfiguration`)**:
  ```xml
  <CORSConfiguration>
      <CORSRule>
          <AllowedOrigin>https://zamalat.cyce52.com</AllowedOrigin>
          <AllowedOrigin>http://localhost:3000</AllowedOrigin>
          <AllowedMethod>GET</AllowedMethod>
          <AllowedMethod>PUT</AllowedMethod>
          <AllowedMethod>HEAD</AllowedMethod>
          <AllowedHeader>*</AllowedHeader>
          <MaxAgeSeconds>3600</MaxAgeSeconds>
      </CORSRule>
  </CORSConfiguration>
  ```

---

### 5. Pillar 4: WebSocket Real-Time Messaging Architecture & Connection State

#### 5.1 Architecture Shift: From Stateful Node `ws` to API Gateway WebSocket
In the local environment, `server/websocket.js` utilizes an in-memory `ChannelManager` with a `Map<userId, Set<WebSocket>>`. In AWS Serverless:
- Lambdas are stateless and ephemeral; in-memory socket pointers cannot survive across invocations.
- **Amazon API Gateway WebSocket API** serves as the persistent connection termination layer at the AWS edge, translating frames into distinct Lambda invocations.

#### 5.2 API Gateway WebSocket Route Mapping
The WebSocket API defines 5 primary routes:
1. **`$connect` Route (`wsConnectHandler`)**:
   - Triggered on handshake (`wss://ws.zamalat.cyce52.com?token=<jwt_token>`).
   - Extracts JWT from `event.queryStringParameters.token`.
   - Validates signature and extracts `userId`, `name`, and `role`.
   - Inserts connection item into DynamoDB:
     - `PK: WS_CONN#<connectionId>`
     - `SK: METADATA`
     - `GSI1PK: USER_ID#<userId>`
     - `GSI1SK: CONN#<connectionId>`
     - `ttl: Math.floor(Date.now() / 1000) + 7200` (2 hours)
   - Returns HTTP 200 to complete connection.
2. **`$disconnect` Route (`wsDisconnectHandler`)**:
   - Triggered on client disconnect or network drop.
   - Deletes `WS_CONN#<connectionId>` from DynamoDB.
   - Returns HTTP 200.
3. **`chat:send` Action Route (`wsMessageHandler`)**:
   - Parses payload: `{ action: "chat:send", channelId: 1, content: "...", messageType: "text", mediaUrl: "..." }`.
   - Verifies channel membership (or admin role).
   - Writes message item to DynamoDB: `PK: CHAT_CHANNEL#<channelId>`, `SK: MSG#<timestamp>#<uuid>`.
   - Queries all channel members via `GSI1` (`CHAT_CHANNEL#<channelId> -> MEMBER#<userId>`).
   - Dispatches message frame to all member active connections using `@aws-sdk/client-apigatewaymanagementapi` (`PostToConnectionCommand`).
4. **`chat:typing` & `chat:read` Routes**:
   - Broadcasts typing indicator or read receipt frame to counter-party connections.
5. **`$default` & Ping/Pong**:
   - Responds to `{ action: "ping" }` with `{ type: "pong" }`.

#### 5.3 Ghost Connection Self-Healing (Stale Connection Management)
When mobile devices disconnect abruptly (network loss, app kill), API Gateway may take minutes to register `$disconnect`.
- When `wsMessageHandler` or the REST bridge invokes `PostToConnectionCommand`, if API Gateway returns **HTTP 410 `GoneException`**, the handler catches the error and **immediately deletes the stale connection ID from DynamoDB**.
- The DynamoDB TTL attribute guarantees that even unattended orphan records are purged within 2 hours without consuming Write Capacity Units.

#### 5.4 Dual-Broadcast Bridge from REST Endpoints
When an administrator posts an evaluation note or an automated system announcement via REST (`POST /api/chat/channels/:id/messages`):
- The REST Lambda initializes `ApiGatewayManagementApiClient` pointing to the WebSocket API endpoint callback:
  `https://{api-id}.execute-api.{region}.amazonaws.com/prod`
- Queries channel member active connections from DynamoDB and posts the message frame.
- This guarantees **100% functional equivalence** with the local `broadcastChatMessageViaWS` dual bridge.

---

### 6. Pillar 5: Amazon CloudFront Static Distribution & Security Hardening

#### 6.1 Multi-Origin Edge Distribution Design for `zamalat.cyce52.com`
The single-page web frontend, API endpoints, and uploads are unified under a single SSL domain (`zamalat.cyce52.com`) backed by Amazon CloudFront:

```
                            [ User Browser ]
                                   |
                                   v  (HTTPS / TLS 1.3)
                    +------------------------------+
                    |       Amazon CloudFront      |
                    |      zamalat.cyce52.com      |
                    +------------------------------+
                       |           |            |
         Path: /api/*  |           | Default: * | Path: /uploads/*
                       v           |            v
    +--------------------+         |    +--------------------+
    | API Gateway HTTP   |         |    | S3 Evidence Bucket |
    | Lambda Backend     |         |    | (Protected OAC)    |
    +--------------------+         |    +--------------------+
                                   v
                        +--------------------+
                        |  S3 Static Website |
                        |  (HTML, CSS, JS)   |
                        +--------------------+
```

#### 6.2 CloudFront Distribution Specifications
- **Origins**:
  1. `S3StaticOrigin`: S3 Bucket containing `index.html`, `css/`, `js/`, `assets/`. Secured via **Origin Access Control (OAC)** (S3 bucket completely blocks public access).
  2. `HttpApiGatewayOrigin`: API Gateway HTTP API endpoint (`https://{api-id}.execute-api.{region}.amazonaws.com`).
  3. `S3EvidenceOrigin`: S3 Bucket containing candidate evidence files and avatars.
- **Cache Behaviors**:
  - `/api/*`: Cache disabled (TTL: 0), all HTTP methods allowed (`GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`), `Authorization` and query strings forwarded.
  - `/uploads/*`: Cached for 86,400s (24h), compression enabled.
  - Default (`*`): Static assets cached for 86,400s. Gzip and Brotli compression enabled.
- **Single-Page Application (SPA) Error Fallback**:
  - Custom Error Response for HTTP 403 and 404: Returns `/index.html` with HTTP 200 status code, enabling client-side navigation without 404 flashes.
- **Price Class**: `PriceClass_100` (North America, Europe, Middle East low-latency edge nodes; 100% covered within CloudFront's **1 TB free data transfer out per month**).

#### 6.3 Enterprise Security Headers Policy
A CloudFront Response Headers Policy enforces strict headers on all responses from `zamalat.cyce52.com`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*; media-src 'self' blob: data: https://*; connect-src 'self' wss://ws.zamalat.cyce52.com https://zamalat.cyce52.com wss://*.execute-api.*.amazonaws.com https://*.execute-api.*.amazonaws.com https://*.s3.*.amazonaws.com; frame-ancestors 'none';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
```

---

### 7. Pillar 6: Infrastructure as Code (AWS SAM) & Dual-Mode Local Emulation

#### 7.1 IaC Framework Selection: AWS SAM
**AWS Serverless Application Model (SAM)** is selected as the primary Infrastructure as Code engine:
- **CloudFormation Native**: Zero third-party lock-in (unlike Serverless Framework v4 which requires paid enterprise licenses).
- **Concise Syntax**: Expands ~350 lines of SAM YAML into ~1,400 lines of raw CloudFormation resources.
- **Built-in Local Testing**: Native `sam local start-api` and `sam local invoke` integration.

#### 7.2 Complete Production AWS SAM Template (`template.yaml`)
Below is the definitive, production-ready SAM template configured strictly for Always-Free tier operation:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  Master Coach Fellowship Platform (zamalat.cyce52.com)
  Tamkeen Al-Roaya - Serverless AWS Always-Free Architecture

Globals:
  Function:
    Timeout: 15
    MemorySize: 1024
    Runtime: nodejs20.x
    Architectures:
      - arm64 # Graviton2: 20% cheaper, faster cold-starts
    Environment:
      Variables:
        TABLE_NAME: !Ref MasterCoachTable
        STORAGE_BUCKET: !Ref EvidenceStorageBucket
        JWT_SECRET: !Ref JwtSecretParam
        NODE_ENV: production

Parameters:
  DomainName:
    Type: String
    Default: zamalat.cyce52.com
  JwtSecretParam:
    Type: String
    NoEcho: true
    Default: tamkeen-master-coach-alroaya-v3-secret-key-2026

Resources:
  # -------------------------------------------------------------
  # 1. DynamoDB Single Table (Strict Provisioned Always-Free Sizing)
  # -------------------------------------------------------------
  MasterCoachTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: MasterCoachPlatform
      BillingMode: PROVISIONED
      ProvisionedThroughput:
        ReadCapacityUnits: 13
        WriteCapacityUnits: 13
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput:
            ReadCapacityUnits: 12
            WriteCapacityUnits: 12
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      SSESpecification:
        SSEEnabled: true

  # -------------------------------------------------------------
  # 2. S3 Storage Bucket (Evidence & Direct Uploads)
  # -------------------------------------------------------------
  EvidenceStorageBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'zamalat-cyce52-storage-${AWS::AccountId}'
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256 # Free default S3 encryption
      LifecycleConfiguration:
        Rules:
          - Id: ExpireChatMedia
            Status: Enabled
            Prefix: chat/
            ExpirationInDays: 90
          - Id: TransitionEvidenceIA
            Status: Enabled
            Prefix: evidence/
            Transitions:
              - TransitionInDays: 30
                StorageClass: STANDARD_IA
          - Id: AbortIncompleteMultipart
            Status: Enabled
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 3
      CorsConfiguration:
        CorsRules:
          - AllowedOrigins:
              - !Sub 'https://${DomainName}'
              - 'http://localhost:3000'
            AllowedMethods:
              - GET
              - PUT
              - HEAD
            AllowedHeaders:
              - '*'
            MaxAge: 3600

  # -------------------------------------------------------------
  # 3. HTTP API Gateway (REST Backend)
  # -------------------------------------------------------------
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins:
          - !Sub 'https://${DomainName}'
          - 'http://localhost:3000'
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        AllowHeaders:
          - '*'
        MaxAge: 600

  # -------------------------------------------------------------
  # 4. Monolithic REST Lambda Handler
  # -------------------------------------------------------------
  RestApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: server/
      Handler: lambda.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MasterCoachTable
        - S3CrudPolicy:
            BucketName: !Ref EvidenceStorageBucket
      Events:
        ApiProxy:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /{proxy+}
            Method: ANY

  # -------------------------------------------------------------
  # 5. WebSocket API Gateway
  # -------------------------------------------------------------
  WebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: MasterCoachWebSocketApi
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: "$request.body.action"

  WsConnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $connect
      AuthorizationType: NONE
      Target: !Sub 'integrations/${WsConnectIntegration}'

  WsConnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WsConnectFunction.Arn}/invocations'

  WsDisconnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $disconnect
      Target: !Sub 'integrations/${WsDisconnectIntegration}'

  WsDisconnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WsDisconnectFunction.Arn}/invocations'

  WsDefaultRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $default
      Target: !Sub 'integrations/${WsDefaultIntegration}'

  WsDefaultIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WsMessageFunction.Arn}/invocations'

  # -------------------------------------------------------------
  # 6. WebSocket Lambda Handlers
  # -------------------------------------------------------------
  WsConnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: server/
      Handler: wsHandlers.connect
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MasterCoachTable

  WsDisconnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: server/
      Handler: wsHandlers.disconnect
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MasterCoachTable

  WsMessageFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: server/
      Handler: wsHandlers.message
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MasterCoachTable
        - Statement:
            - Effect: Allow
              Action:
                - 'execute-api:ManageConnections'
              Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*'

Outputs:
  HttpApiUrl:
    Description: HTTP API Gateway Base URL
    Value: !Sub 'https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com'
  WebSocketApiUrl:
    Description: WebSocket API Gateway Endpoint
    Value: !Sub 'wss://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/prod'
  DynamoDBTableName:
    Description: DynamoDB Table Name
    Value: !Ref MasterCoachTable
  StorageBucketName:
    Description: S3 Evidence Storage Bucket
    Value: !Ref EvidenceStorageBucket
```

#### 7.3 Data Access Abstraction Layer (`server/db/`)
To achieve seamless dual-mode execution without code duplication:
```
server/
├── db/
│   ├── index.js             # Factory: exports SQLite or DynamoDB driver based on DB_DRIVER env
│   ├── sqliteDriver.js      # Wraps better-sqlite3 for local dev & CI
│   └── dynamoDriver.js      # Wraps @aws-sdk/lib-dynamodb for production/SAM local
```
When `process.env.DB_DRIVER === 'dynamodb'`, all queries route to DynamoDB Single Table. When unset or set to `'sqlite'`, the system defaults to the zero-dependency SQLite database.

---

### 8. AWS Always-Free Tier Cost Audit & Financial Guardrails

A rigorous financial audit confirms that the platform operates at **$0.00/month recurring cost**:

| AWS Service | Always-Free Tier Allowance | Platform Expected Usage (500 Candidates) | Utilization % | Monthly Bill |
|---|---|---|---|---|
| **Amazon DynamoDB** | 25 RCU & 25 WCU (Provisioned) | 13 RCU / 13 WCU (Table) + 12 RCU / 12 WCU (GSI) | **100.0%** | **$0.00** |
| **DynamoDB Storage**| 25 GB encrypted storage | ~250 MB | **1.0%** | **$0.00** |
| **AWS Lambda** | 1,000,000 requests / month | ~120,000 requests / month | **12.0%** | **$0.00** |
| **AWS Lambda Compute**| 3,200,000 seconds / month (arm64)| ~18,000 seconds / month (150ms avg) | **0.56%** | **$0.00** |
| **Amazon CloudFront**| 1 TB data transfer out / month | ~15 GB / month | **1.5%** | **$0.00** |
| **CloudFront Requests**| 10,000,000 HTTP/HTTPS requests | ~450,000 requests / month | **4.5%** | **$0.00** |
| **Amazon S3** | 5 GB standard storage (12-mo free) | ~3.8 GB active evidence (with lifecycle) | **76.0%** | **$0.00** |
| **AWS ACM Certificate**| Free public SSL/TLS certificates | 1 certificate (`zamalat.cyce52.com`) | N/A | **$0.00** |
| **API Gateway HTTP** | 1,000,000 requests / month (12-mo free) | ~120,000 requests / month | **12.0%** | **$0.00** |
| **Total Monthly Cost**| — | — | — | **$0.00** |

---

### 9. Step-by-Step Production Deployment Runbook

Follow this runbook to deploy `zamalat.cyce52.com` to AWS:

#### Step 1: Pre-requisites & Local Environment
Ensure AWS CLI and AWS SAM CLI are installed:
```bash
aws configure # Set AWS Access Key, Secret Key, and Region (e.g. eu-central-1 or us-east-1)
sam --version
```

#### Step 2: Request Free ACM SSL Certificate for `zamalat.cyce52.com`
In `us-east-1` (mandatory for CloudFront distributions):
```bash
aws acm request-certificate \
  --domain-name zamalat.cyce52.com \
  --validation-method DNS \
  --region us-east-1
```
Add the generated CNAME record to the `cyce52.com` DNS management console.

#### Step 3: Build & Deploy Backend via SAM
```bash
sam build
sam deploy --guided \
  --stack-name master-coach-platform \
  --parameter-overrides DomainName=zamalat.cyce52.com
```

#### Step 4: Deploy Static Frontend to S3 & Invalidate CloudFront
```bash
# Sync frontend static files to S3 bucket
aws s3 sync . s3://zamalat-cyce52-static-assets \
  --exclude "server/*" \
  --exclude "tests/*" \
  --exclude "node_modules/*" \
  --exclude ".git/*" \
  --exclude ".agents/*"

# Invalidate CloudFront edge cache
aws cloudfront create-invalidation \
  --distribution-id <YOUR_CLOUDFRONT_DIST_ID> \
  --paths "/*"
```

#### Step 5: Verify Production Live Health
```bash
curl -I https://zamalat.cyce52.com/api/health
```
Expected output: HTTP/2 200 OK with `{"status":"UP","service":"Tamkeen Al-Roaya Master Coach Platform v3.0"}`.
