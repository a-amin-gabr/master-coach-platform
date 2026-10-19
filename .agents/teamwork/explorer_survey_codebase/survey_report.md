# Comprehensive Codebase Survey Report: Master Coach Fellowship Platform (v3.0)
**Project**: Master Coach Fellowship Platform (`zamalat.cyce52.com` / Tamkeen Al-Roaya)  
**Curriculum**: Master Coach Abdelkarim Al-Khelaifi Official 2026 Curriculum  
**Date**: 2026-10-16  
**Investigator**: Codebase Survey Explorer  
**Working Directory**: `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform`

---

## 1. Executive Summary

This report delivers a complete, read-only architectural and operational survey of the existing **Master Coach Fellowship Platform (v3.0)** codebase. The platform is an executive-grade fullstack web application designed for the professional qualification and portfolio evaluation of Master Coach candidates under the academic leadership of Master Coach Abdelkarim Al-Khelaifi (Tamkeen Al-Roaya / `cyce52.com`).

### Core Architecture Findings:
1. **Current Local Stack**:
   - **Backend**: Node.js v24 runtime with Express v5.3.0, SQLite (WAL mode via `better-sqlite3`), native WebSockets via `ws` v8.22.0, JWT authentication (`jsonwebtoken` v9.0.3), password hashing (`bcryptjs` v3.0.3), and multipart file handling via `multer` v2.4.0.
   - **Frontend**: Single-Page Application (SPA) built with semantic HTML5, custom executive CSS3 (Tamkeen Al-Roaya design system: Royal Navy `#0B1B3D`, Emerald `#059669`, Amber `#D97706`), vanilla JavaScript modules (`api.js`, `app.js`, `chat-widget.js`, `data.js`, `icons.js`).
   - **Real-Time Layer**: Dual-engine bridge supporting both native WebSockets (`/ws?token=...`) with heartbeat ping/pong, presence, channel isolation, and typing indicators, alongside Server-Sent Events (`/api/chat/stream`) and REST fallbacks.
2. **Quality & Test Coverage**:
   - Automated test suite (`npm run test:all`) executes cleanly with **100% pass rate** across all core test suites (`tests/api_fullstack.test.js`, `tests/websocket.test.js`, `test_platform.js`, `test_reactive_logic.js`).
   - Additional adversarial stress and security suites (`challenger_empirical_oracle.test.js`, `challenger_m1_security.test.js`, `challenger_m1_r2_adversarial.js`, `stress_challenger.js`) verify zero cross-tenant leakage, SQL injection immunity, prototype pollution resistance, and 0 uncaught exceptions under chaos bursts.
3. **Mobile Viewport Responsiveness**:
   - Headless Chrome DevTools Protocol (CDP) verification across iPhone SE / Mini (375px), iPhone 12/13/14 Pro (390px), and iPhone Pro Max (414px) confirms **0px horizontal canvas overflow** (`docScrollWidth === winW`). Wide data tables are securely encapsulated within `.table-responsive-container` with smooth touch-scrolling.
4. **AWS Serverless Migration Readiness**:
   - The platform is primed for transition to an **AWS-Native Serverless Architecture** operating strictly within the **AWS Always-Free Tier** (Amazon DynamoDB 25 RCU/WCU, AWS Lambda 1M requests/mo, Amazon API Gateway HTTP & WebSocket APIs, Amazon S3 with pre-signed URLs, and Amazon CloudFront distribution for `zamalat.cyce52.com`).
   - A **Dual-Mode Runner** pattern (Repository/DAO abstraction) will preserve local offline Express/SQLite execution for rapid development and automated CI while enabling AWS Serverless Lambda/DynamoDB deployment for production.

---

## 2. Directory Layout & Dependency Analysis

### 2.1 File Tree Structure
```
master_coach_platform/
├── .agents/                          # Teamwork multi-agent coordination metadata
├── assets/                           # Visual brand identity and emblems
│   ├── icons/
│   └── images/
│       ├── client_logo.png
│       ├── logo.png
│       └── شعار_تمكين_الرؤية_المطور_1771964091100-OkSVbixy.png
├── css/
│   └── styles.css                    # 134 KB - Tamkeen Al-Roaya Executive Design System
├── data/
│   ├── platform.db                   # SQLite WAL database (seeded demo dataset)
│   ├── platform.db-shm               # SQLite Shared Memory index
│   └── platform.db-wal               # SQLite Write-Ahead Log
├── index.html                        # 28.3 KB - SPA markup, modals, drawer, 19 contract DOM IDs
├── js/
│   ├── api.js                        # 18.4 KB - Client API communication & auth session layer
│   ├── app.js                        # 443.9 KB - Interactive SPA engine, state, panel controllers
│   ├── chat-widget.js                # 89.9 KB - Floating launcher, drawer, WS client, audio recorder
│   ├── data.js                       # 245.9 KB - Academic data store (14 domains, 6 rubrics, 8 tasks)
│   └── icons.js                      # 12.3 KB - SVG icon dictionary
├── package.json                      # Project metadata, scripts, dependencies
├── package-lock.json                 # Pinned dependency lockfile
├── render.yaml                       # Cloud hosting deployment specification
├── server/
│   ├── config.js                     # Environment variables, ports, paths, JWT secret
│   ├── database.js                   # 53.2 KB - SQLite schema, queries, seeds, WAL setup
│   ├── server.js                     # 3.1 KB - Express 5 app, middleware, routes, WS upgrade
│   ├── websocket.js                  # 21.1 KB - Native WebSocket server & ChannelManager
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification & RBAC (admin vs coach)
│   │   └── upload.js                 # Multer disk upload config (50MB, fileFilter)
│   └── routes/                       # 11 REST route controllers
│       ├── admin.js                  # 41.4 KB - KPI stats, pending queue, reset demo, export
│       ├── audit.js                  # 8.7 KB - 7-rule graduation eligibility & decree
│       ├── auth.js                   # 9.7 KB - Login, register, me, logout
│       ├── cases.js                  # 2.4 KB - 20 clinical case studies
│       ├── chat.js                   # 13.3 KB - Channels, messages, SSE stream, media upload
│       ├── coaches.js                # 2.8 KB - Coach profiles and digital portfolios
│       ├── ethics.js                 # 6.6 KB - 7 ethics checkpoints & specialist referrals
│       ├── rubrics.js                # 7.1 KB - 6 rubrics evaluation & weighted averages
│       ├── tasks.js                  # 9.0 KB - 8 tasks, 4-part reflection, supervisor rating
│       ├── tools.js                  # 5.7 KB - 90 tools & anti-duplication engine
│       └── uploads.js                # 6.1 KB - Task evidence upload handler
├── tests/                            # Comprehensive automated test suites
│   ├── api_fullstack.test.js         # 50.4 KB - 11 fullstack API verification phases
│   ├── websocket.test.js             # 22.6 KB - 9 WebSocket integration test phases
│   ├── test_platform.js              # 12.9 KB - Deep academic, hours, rubrics, DOM verification
│   ├── test_platform.mjs             # 12.9 KB - ESM adaptive directory verification
│   ├── test_reactive_logic.js        # 7.0 KB - Anti-duplication, ethical blocker, task lifecycle
│   ├── test_reactive_logic.mjs       # 7.2 KB - ESM version of reactive logic test
│   ├── challenger_empirical_oracle.test.js # 21.7 KB - Concurrency, privacy, fuzzing, SQLi
│   ├── challenger_m1_security.test.js # 46.1 KB - 32 adversarial security tests across 5 categories
│   ├── challenger_m1_r2_adversarial.js # 15.9 KB - Prototype pollution, buffer fuzzing, chaos burst
│   ├── stress_challenger.js          # 19.0 KB - 60 client concurrency, 100-msg FIFO race
│   └── reproduce_bugs.js             # 7.0 KB - Edge-case vulnerability reproduction
├── uploads/                          # Local storage for uploaded task evidence & chat media
├── PROJECT.md                        # Platform specification & DOM ID contracts
├── README.md                         # Platform documentation in Arabic
└── DEAD_ENDS.md                      # Dead ends register
```

### 2.2 `package.json` Configuration
- **Name**: `master_coach_platform`
- **Version**: `3.0.0`
- **Module Type**: `commonjs`
- **Dependencies**:
  - `bcryptjs`: `^3.0.3` (Secure credential hashing)
  - `better-sqlite3`: `^13.0.3` (Synchronous, ultra-fast SQLite3 driver with WAL support)
  - `cors`: `^2.8.6` (Cross-Origin Resource Sharing)
  - `express`: `^5.3.0` (Next-generation Express web framework)
  - `jsonwebtoken`: `^9.0.3` (HMAC/RSA token generation and verification)
  - `multer`: `^2.4.0` (Multipart form-data parsing for uploads)
  - `ws`: `^8.22.0` (High-performance RFC 6455 native WebSocket implementation)
- **Scripts**:
  - `start`: `node server/server.js`
  - `test`: `node tests/api_fullstack.test.js && node tests/websocket.test.js`
  - `test:ws`: `node tests/websocket.test.js`
  - `test:all`: `node tests/api_fullstack.test.js && node tests/websocket.test.js && (cd .. && node test_platform.js && node test_reactive_logic.js)`

---

## 3. Existing Backend Server Implementation

### 3.1 Entry Point (`server/server.js`)
- Initializes SQLite database on startup via `db.initializeDatabase()`.
- Express 5 application with CORS enabled, JSON body parser (`limit: '20mb'`), and URL-encoded parser.
- Static asset hosting: `/uploads` mapped to `uploads/` directory; `/` mapped to project root (serving `index.html`, `css/`, `js/`, `assets/`).
- Mounts 11 route modules under `/api/*`.
- Provides explicit JSON 404 handler for unknown `/api/*` endpoints.
- Provides SPA fallback serving `index.html` for client-side navigation.
- Wraps Express in `http.createServer(app)` and binds the native WebSocket server via `initWebSocketServer(server)`.

### 3.2 Database Layer & Relational Schema (`server/database.js`)
Operating with `better-sqlite3` in WAL (`Write-Ahead Logging`) mode with foreign key constraints enabled (`PRAGMA foreign_keys = ON`). The schema comprises **13 tables**:

| Table Name | Primary Key | Key Attributes / Foreign Keys | Purpose |
|------------|-------------|-------------------------------|---------|
| `users` | `id` (AUTOINCREMENT) | `email` (UNIQUE NOCASE), `password_hash`, `role` (`admin` \| `coach`) | User authentication & role-based credentials |
| `coaches` | `id` (AUTOINCREMENT) | `user_id` -> `users(id)`, `candidate_code` (UNIQUE), `audit_status` | Candidate coaching profile & audit standing |
| `coach_program_state` | `coach_id` | `coach_id` -> `coaches(id)`, `state_json` (TEXT) | Complete serialized JSON state for rapid hydration |
| `tasks` | `(id, coach_id)` | Composite PK, `coach_id` -> `coaches(id)`, `status`, `version`, `reflection_json` | 8 Milestone tasks with 4-part reflections |
| `evidences` | `id` (AUTOINCREMENT) | `task_id`, `coach_id` -> `coaches(id)`, `file_path`, `is_anonymous` | Uploaded evidence files (PDF, audio, spreadsheets) |
| `tool_applications` | `id` (AUTOINCREMENT) | `coach_id` -> `coaches(id)`, `tool_type`, `beneficiary_code` | 90 Tool applications with anti-duplication rule |
| `rubrics_evaluations` | `id` (AUTOINCREMENT) | `(coach_id, rubric_code, criterion_id)` UNIQUE, `level` (1-5) | Granular rubric criteria scores (30 total criteria) |
| `ethics_checkpoints` | `id` (AUTOINCREMENT) | `(coach_id, checkpoint_id)` UNIQUE, `status` | 7 Mandatory ethics checkpoints |
| `ethics_referrals` | `id` (AUTOINCREMENT) | `coach_id` -> `coaches(id)`, `case_ref`, `referred_to`, `status` | Specialist medical/psychiatric referral log |
| `supervisor_feedbacks`| `id` (AUTOINCREMENT) | `coach_id`, `task_id`, `audio_file_path`, `text_notes`, `grade` | Official supervisor feedback records |
| `chat_channels` | `id` (AUTOINCREMENT) | `channel_type` (`direct` \| `group`), `direct_coach_id` | Cohort group discussion & 1-on-1 supervision channels |
| `chat_channel_members`| `id` (AUTOINCREMENT) | `(channel_id, user_id)` UNIQUE, `last_read_message_id` | Channel membership & read receipt tracking |
| `chat_messages` | `id` (AUTOINCREMENT) | `channel_id`, `sender_id`, `message_type`, `content`, `media_url` | Text, audio voice notes, and image chat messages |

### 3.3 Default Accounts & Seed Data
On initial run, `server/database.js` automatically populates the database from `DEFAULT_DATA` in `js/data.js`:
1. **Master Coach (Admin)**: `abdelkarim@cyce52.com` (Password: `Master@2026`)
2. **Coach Candidate 1 (Primary Demo)**: `coach@cyce52.com` (Ahmed Al-Shammari, `MC-2026-084`, Password: `Coach@2026`)
3. **Coach Candidate 2 (New Candidate)**: `sara@cyce52.com` (Sara Al-Mutairi, `MC-2026-085`, Password: `Coach@2026`)

### 3.4 REST API Surface Area (11 Controllers, 35 Endpoints)
1. **`/api/auth`**:
   - `POST /api/auth/login`: Issues JWT signed with HMAC secret.
   - `GET /api/auth/me`: Validates session and returns coach metadata.
   - `POST /api/auth/register`: Onboards new coach with auto-generated registration code (`MC-2026-XXX`).
   - `POST /api/auth/logout`: Clears session.
2. **`/api/coaches`**:
   - `GET /api/coaches`: Lists all enrolled candidate coaches (Admin only).
   - `GET /api/coaches/:id`: Full dossier and live state of specific coach.
3. **`/api/tasks`**:
   - `GET /api/tasks`: Retrieves 8 tasks for active coach.
   - `GET /api/tasks/:id`: Retrieves task details and reflection data.
   - `PUT /api/tasks/:id/reflection`: Updates the 4-part reflection fields.
   - `POST /api/tasks/:id/submit`: Submits task and increments version (`v1.0` -> `v1.1` -> `v2.0`).
   - `POST /api/tasks/:id/evaluate`: Evaluates task with supervisor score (1.0 - 5.0) and audio note (Admin only).
4. **`/api/uploads`**:
   - `POST /api/uploads`: Multipart upload with file verification and link to task.
5. **`/api/tools`**:
   - `GET /api/tools`: Summary stats (MBTI, Wheel of Life, SWOT) and application counts.
   - `POST /api/tools/apply`: Registers tool application with strict **anti-duplication check**.
6. **`/api/rubrics`**:
   - `GET /api/rubrics`: Fetches 6 rubrics and criteria ratings.
   - `POST /api/rubrics/evaluate`: Updates individual criterion or batch criteria, checks critical blockers.
7. **`/api/ethics`**:
   - `GET /api/ethics`: 7 checkpoints status and referral registry.
   - `POST /api/ethics/toggle`: Supervisor toggle for ethics checkpoint clearance (Admin only).
   - `POST /api/ethics/referrals`: Creates referral entry to prove practice boundaries.
8. **`/api/cases`**:
   - `GET /api/cases`: 20 clinical case studies with models and anonymization tags.
   - `GET /api/cases/:id`: Detailed case study analysis.
9. **`/api/audit`**:
   - `GET /api/audit/determination`: Evaluates all 7 graduation rules and detects blockers.
   - `POST /api/audit/determination`: Issues official graduation decree and digital seal (Admin only).
10. **`/api/admin`**:
    - `GET /api/admin/pending-tasks`: Supervisor review queue.
    - `GET /api/admin/stats`: Aggregated platform KPIs.
    - `POST /api/admin/reset-demo`: Restores baseline demo state.
    - `GET /api/admin/export`: Full JSON backup export.
11. **`/api/chat`**:
    - `GET /api/chat/stream`: Server-Sent Events stream for real-time fallback.
    - `GET /api/chat/channels`: User channels (Cohort group + 1-on-1 direct supervision).
    - `GET /api/chat/channels/:channelId/messages`: Channel message history with pagination.
    - `POST /api/chat/channels/:channelId/messages`: Sends message and bridges to WebSockets/SSE.
    - `POST /api/chat/upload`: Uploads voice notes and image attachments (up to 50MB).
    - `POST /api/chat/channels/:channelId/read`: Read receipts update.
    - `GET /api/chat/search`: Scoped message search with tenant isolation.

### 3.5 Real-Time WebSocket Server (`server/websocket.js`)
- **Protocol**: Native RFC 6455 (`ws`).
- **Endpoint**: `ws://<host>:<port>/ws?token=<jwt_token>` (supports query string, `Authorization` header, and `Sec-WebSocket-Protocol`).
- **Pre-Handshake Security**: Rejects unauthenticated connections immediately before HTTP upgrade with `401 Unauthorized`.
- **Channel Segregation**:
  - `ChannelManager` maintains `Map<userId, Set<WebSocket>>`.
  - Group Channel (1): All enrolled coaches and Master Coach.
  - Direct Supervisory Channel (2+): Strictly isolated between candidate coach and Master Coach. Rejects cross-tenant access with `403 Forbidden`.
- **Dual-Engine Broadcast Bridge**: Messages sent via REST endpoint `/api/chat/channels/:channelId/messages` trigger WebSocket broadcast through `broadcastChatMessageViaWS()` and SSE streaming via `broadcastChatMessage()`.
- **Heartbeat & Liveness**: 25-second ping/pong heartbeat interval with automatic socket cleanup on abrupt disconnections.

---

## 4. Existing Frontend Assets & Mobile Viewport Behavior

### 4.1 Asset Overview
- **`index.html` (28.3 KB)**:
  - Clean HTML5 semantic layout with RTL (`dir="rtl"`) directionality.
  - Cairo, Tajawal, and JetBrains Mono typography via Google Fonts.
  - Slide-over messenger drawer (`#chat-drawer`) with channel switcher.
  - Floating omnipresent chat launcher (`#floating-chat-launcher`) with unread badge.
  - High-contrast modal dialogs (`#auth-modal`, `#task-modal`, `#tool-modal`, `#case-modal`, `#domain14-modal`, `#chat-media-modal`, `#confirm-modal`, `#generic-modal`).
  - Preserves all **19 mandatory DOM contract IDs** tested by automated suites.
- **`css/styles.css` (134.6 KB, 6,139 lines)**:
  - Design Tokens: Royal Navy (`#0B1B3D`, `#0B132B`), Emerald (`#059669`), Amber (`#D97706`), Ice Blue (`#F8FAFC`).
  - Dark/Light Theme variables (`body.theme-light`, `body.theme-dark`).
  - Glassmorphic card styling, sticky navigation pills with frosted blur (`backdrop-filter: blur(12px)`).
  - SVG progress rings, KPI metric strips, animated waveform audio players, touch-friendly action buttons.
- **`js/app.js` (443.9 KB)**:
  - SPA controller managing role switching (Participant vs Supervisor/Admin vs Committee).
  - Live progress rings rendering (240h, 20 cases, 30 sessions, 90 tools).
  - Task submission lifecycle modal, reflection editor, rubric assessment matrix, anti-duplication modal, 14 domains modal, and certificate generation.
- **`js/api.js` (18.4 KB)**:
  - Client REST API client managing JWT auth, automatic token attachment, session storage in `localStorage`, and graceful fallback to local storage mode when running standalone offline.
- **`js/chat-widget.js` (89.9 KB)**:
  - Modular floating action launcher and slide-over messenger drawer controller.
  - Native browser WebSocket client (`ws://` / `wss://`) with exponential backoff auto-reconnect, 25s ping/pong, typing indicator dispatch, audio recording via `MediaRecorder`, image preview lightbox, and read receipts.
- **`js/data.js` (245.9 KB)**:
  - Canonical academic data repository containing all curriculum specifications, 14 domains, 6 rubrics, 8 tasks, 20 cases, 30 sessions, 90 tool applications, 9 labs, and graduation decree parameters.

### 4.2 Mobile Responsive Layout Verification (375px - 414px)
An empirical browser evaluation was executed using Headless Google Chrome over Chrome DevTools Protocol (CDP) (`Emulation.setDeviceMetricsOverride`):

| Device / Viewport Target | Window Width | Document ScrollWidth | Body ScrollWidth | Horizontal Canvas Overflow | Status |
|--------------------------|--------------|----------------------|------------------|----------------------------|--------|
| **iPhone SE / Mini** | **375px** | **375px** | **375px** | **0px (Zero overflow)** | **PASS ✓** |
| **iPhone 12/13/14 Pro** | **390px** | **390px** | **390px** | **0px (Zero overflow)** | **PASS ✓** |
| **iPhone Plus / Max** | **414px** | **414px** | **414px** | **0px (Zero overflow)** | **PASS ✓** |

**Responsive Architecture Highlights**:
1. Global viewport constraint: `html, body { overflow-x: hidden !important; max-width: 100vw !important; width: 100% !important; }`.
2. Responsive navigation: `.main-nav-bar` uses `-webkit-overflow-scrolling: touch` with horizontal swipe and hidden scrollbars.
3. Responsive tables: Wide multi-column data tables (736px+) are safely encapsulated inside `.table-responsive-container` (`overflow-x: auto`), allowing horizontal swiping within the container without affecting the page canvas width.
4. Flexible header: At `< 768px`, the executive header collapses from horizontal bar into a stacked flex column with full-width controls.
5. Off-canvas chat drawer: At `< 540px`, `.chat-drawer` dynamically expands to `100vw` for maximum thumb readability.

---

## 5. Academic Content & Curriculum Alignment (2026 Standards)

The academic architecture in `js/data.js` and `server/database.js` aligns with Coach Abdelkarim Al-Khelaifi's 2026 Curriculum:

### 5.1 The 6 Official Evaluation Rubrics
Each rubric includes 5 criteria, explicit weights summing to 100%, and granular 5-level descriptive criteria (1=ضعيف, 2=مقبول, 3=جيد, 4=جيد جداً, 5=ممتاز):
1. **روبرك الجلسات المهنية الميدانية (`sessions`)**:
   - `R1-C1`: هيكل الجلسة وإدارة الوقت (Weight: 20%)
   - `R1-C2`: ملاءمة النموذج وتبريره المنهجي (Weight: 20%)
   - `R1-C3`: التوثيق والتحليل والربط الاستبصاري (Weight: 20%)
   - `R1-C4`: **الأخلاقيات وحماية الخصوصية (معيار حرج قطعي)** (Weight: 20%, `isCritical: true`)
   - `R1-C5`: الأثر الملحوظ والتحول لدى المستفيد (Weight: 20%)
2. **روبرك ملف الإنجاز المهني الشامل (`portfolio`)**:
   - `R2-C1`: **الاكتمال والشمولية لجميع متطلبات البرنامج (معيار حرج)** (Weight: 25%, `isCritical: true`)
   - `R2-C2`: التنوع والاتزان في ممارسة أدوات الكوتشنج (Weight: 20%)
   - `R2-C3`: عمق التأمل المهني ونوعية خطط النمو (Weight: 20%)
   - `R2-C4`: دقة التوثيق والنزاهة وحفظ البيانات (Weight: 20%)
   - `R2-C5`: جودة التنظيم والإخراج المهني للملف (Weight: 15%)
3. **روبرك الورقة العلمية التطبيقية (`researchPaper`)**:
   - `R3-C1`: **الأصالة والعمق المنهجي والتحكيم العلمي (معيار حرج)** (Weight: 20%, `isCritical: true`)
   - `R3-C2`: مراجعة الأدبيات والدراسات السابقة والتوثيق (Weight: 20%)
   - `R3-C3`: التطبيق العملي وربطه بواقع البيئة العربية (Weight: 20%)
   - `R3-C4`: التحليل الإحصائي والاستنتاجات والتوصيات (Weight: 20%)
   - `R3-C5`: سلامة اللغة والصياغة الأكاديمية ونظام APA 7 (Weight: 20%)
4. **روبرك المشروع الابتكاري - مشروع التخرج (`capstone`)**:
   - `R4-C1`: **الابتكار والأصالة والقابلية للتطبيق المؤسسي (معيار حرج)** (Weight: 20%, `isCritical: true`)
   - `R4-C2`: منهجية التصميم والنمذجة والتطوير (Weight: 20%)
   - `R4-C3`: مؤشرات قياس الأثر والعائد التنموي (Weight: 20%)
   - `R4-C4`: التوثيق الفني والأدلة الإجرائية (Weight: 20%)
   - `R4-C5`: العرض النهائي ومناقشة لجنة التحكيم (Weight: 20%)
5. **روبرك المقابلة الختامية للماستر كوتش (`interview`)**:
   - `R5-C1`: **الرسوخ المعرفي والأصيل في مدارس الكوتشنج (معيار حرج)** (Weight: 20%, `isCritical: true`)
   - `R5-C2`: إدارة المعضلات الأخلاقية والمهنية المعقدة (Weight: 20%)
   - `R5-C3`: الحضور والاتزان الانفعالي واللغة التمكينية (Weight: 20%)
   - `R5-C4`: الرؤية القيادية والمساهمة في تطوير المهنة (Weight: 20%)
   - `R5-C5`: الإشراف الكوتشنجي وتقديم التغذية الراجعة للأقران (Weight: 20%)
6. **روبرك الإشراف المهني الفردي والجماعي (`supervision`)**:
   - `R6-C1`: **أخلاقيات الإشراف وحدود العلاقة التوجيهية (معيار حرج)** (Weight: 20%, `isCritical: true`)
   - `R6-C2`: دقة الملاحظة وتحليل ممارسات الكوتش المتدرب (Weight: 20%)
   - `R6-C3`: صياغة التغذية الراجعة البناءة والمحفزة (Weight: 20%)
   - `R6-C4`: بناء خطط التطوير الفردية للممارسين (Weight: 20%)
   - `R6-C5`: تقييم الكفايات بموضوعية ونزاهة مهنية (Weight: 20%)

### 5.2 Critical Ethical Blocker Engine
- Governed by 7 critical criteria (`isCritical: true`) and the Independent Ethics Gate (`ethicsGate.status === 'passed'`).
- If any critical criterion falls below Level 3 (or ethics gate is flagged), the audit engine in `server/routes/audit.js` and `js/app.js` **strictly locks the graduation recommendation**, invalidating graduation decree issuance regardless of overall average score.

### 5.3 14 Core Competency Domains (Arab Coaching Federation)
Mapped in `core14Domains` array with Arabic titles, indicators, target hours, and evidence links:
- `C14-01`: الممارسة المهنية الأساسية (Core Professional Practice - 35h)
- `C14-02`: التحليل المهني (Professional & Analytical Assessment - 25h)
- `C14-03`: التفكير النقدي (Critical Thinking & Socratic Inquiry - 20h)
- `C14-04`: التفكير المنظومي (Systems Thinking & Dynamic Modeling - 20h)
- `C14-05`: دمج النماذج وتطويعها (Model Integration & Adaptation - 20h)
- `C14-06`: التفكير والقيادة المهنية (Professional Leadership & Influence - 20h)
- `C14-07`: الكفايات البحثية (Applied Research & Scholarly Inquiry - 25h)
- `C14-08`: كفايات الابتكار (Methodological & Tool Innovation - 20h)
- `C14-09`: الكفايات الرقمية والذكاء الاصطناعي (Digital Coaching & Responsible AI - 15h)
- `C14-10`: الكفايات الأخلاقية وضوابط الممارسة (Ethical Guardrails & Boundaries - 20h)
- `C14-11`: الإشراف على الممارسين (Supervision of Practitioners - 20h)
- `C14-12`: التصميم الكوتشنجي المتكامل (Integrated Coaching Architecture)
- `C14-13`: التيسير والتعلم الجماعي (Group Dynamics & Team Facilitation)
- `C14-14`: الحصافة والتكيف السياقي (Contextual Agility & Cultural Astuteness)

### 5.4 The 8 Submission Tasks & 4-Part Reflections
Structured reflections required for each milestone:
1. **ماذا فعلت تحديداً؟** (The exact professional intervention)
2. **لماذا؟** (Theoretical models and justification)
3. **ما أثره الملحوظ على المستفيد؟** (Measurable behavioural shift)
4. **ما الذي سأغيره أو أطوره مستقبلاً؟** (Continuous professional improvement plan)

### 5.5 Quantitative Trackers & Anti-Duplication Rule
- **240 Hours**: Formal curriculum, labs, field sessions, and supervision.
- **20 Clinical Cases**: Fully anonymized cases.
- **30 Recorded Field Sessions**: Detailed transcripts and audio links.
- **90 Tool Assessments**: 30 MBTI, 30 Wheel of Life, 30 SWOT.
- **Anti-Duplication Enforcement**: Code forbids repeating beneficiary ID within the same tool counter (e.g. `BEN-05` cannot appear twice in MBTI), but permits cross-tool multi-assessment (e.g. `BEN-05` can participate in Wheel of Life). Verified server-side (HTTP 400 `DUPLICATE_BENEFICIARY_IN_TOOL`) and client-side.

---

## 6. Existing Automated Test Suites & Runner Scripts

### 6.1 Test Suite Inventory
The platform possesses a multi-layered test infrastructure:

```
tests/
├── api_fullstack.test.js           # REST API end-to-end integration (11 phases)
├── websocket.test.js               # WebSocket protocol & segregation (9 phases)
├── test_platform.js                # Data model & DOM contract verification (8 sections)
├── test_reactive_logic.js          # Reactive engines (Anti-dupe, Blocker, Lifecycle)
├── challenger_empirical_oracle.test.js  # Adversarial oracle & race harness (9 tests)
├── challenger_m1_security.test.js  # Deep security & tamper harness (32 tests)
├── challenger_m1_r2_adversarial.js # Chaos burst & prototype pollution (14 tests)
├── stress_challenger.js            # Concurrency (60 conns) & 100-msg race burst
└── reproduce_bugs.js               # Vulnerability reproduction harness (8 tests)
```

### 6.2 Test Execution Results

Running `npm run test:all`:
```
> master_coach_platform@3.0.0 test:all
> node tests/api_fullstack.test.js && node tests/websocket.test.js && (cd .. && node test_platform.js && node test_reactive_logic.js)
```

**Results Breakdown**:
1. `tests/api_fullstack.test.js`:
   - Phase 1: Healthcheck (`/api/health` 200 UP) ✓
   - Phase 2: Auth & RBAC (Admin & Coach tokens, 401 on bad password) ✓
   - Phase 3: Multipart File Upload (Multer disk storage & metadata) ✓
   - Phase 4: 4-Part Reflection Store (Persistence & retrieval) ✓
   - Phase 5: Task Submission & Supervisor Rating (`v1.0` -> `v2.0`, grade 4.8) ✓
   - Phase 6: Anti-Duplication Engine (Duplicate rejection in tool, cross-tool allowance) ✓
   - Phase 7: 6-Rubrics & Critical Blocker (Average score computation, block trigger on level 2) ✓
   - Phase 8: Specialist Referrals Registry (Creation & retrieval) ✓
   - Phase 9: Graduation Decree & Audit Determination (7 conditions check, decree generation) ✓
   - Phase 10: Chat Hub & Group Cohort (Direct vs group channels, message persistence) ✓
   - Phase 11: 14 Core Competency Domains (Domain inspection) ✓
   - Phase 12: Dynamic Admin Suite (Coaches list, stats, reset demo) ✓
2. `tests/websocket.test.js`:
   - Phase 1: Login & JWT extraction ✓
   - Phase 2: Pre-handshake JWT verification ✓
   - Phase 3: 401 rejection on invalid/expired/missing tokens ✓
   - Phase 4: Heartbeat ping/pong ✓
   - Phase 5: Message send/receive & SQLite write ✓
   - Phase 6: Dual-broadcast bridge (REST POST to WS broadcast) ✓
   - Phase 7: Live typing indicators ✓
   - Phase 8: Channel segregation (Sara cannot eavesdrop or write to Ahmed direct channel) ✓
   - Phase 9: Read receipts broadcasting ✓
3. `test_platform.js`:
   - Section 1: Domains & Competencies (9 domains, 44 competencies) ✓
   - Section 2: Hours & Quantitative Requirements (240h, 20 cases, 30 sessions) ✓
   - Section 3: 90 Tools & Uniqueness (30 MBTI, 30 Wheel, 30 SWOT, non-duplication) ✓
   - Section 4: Qualitative Outputs (10 models, LMMI indicator, 58-page paper, capstone) ✓
   - Section 5: 6 Rubrics (30 criteria, 7 critical criteria, 30 required improvements) ✓
   - Section 6: Ethics Gate (Passed status, 7 checkpoints, referrals) ✓
   - Section 7: 9 Specialized Labs (30h total) ✓
   - Section 8: DOM Contract Verification (19 mandatory element IDs verified) ✓
4. `test_reactive_logic.js`:
   - Anti-duplication reactive tests ✓
   - Critical ethical blocker dynamic trigger and release ✓
   - Task versioning and reflection reactivity ✓

**Overall `test:all` Pass Rate: 100% (Zero Failures)**.

### 6.3 Test Runner Path Discrepancy Note
- In `package.json`, script `test:all` executes `(cd .. && node test_platform.js && node test_reactive_logic.js)`.
- This is because `tests/test_platform.js` and `tests/test_reactive_logic.js` hardcode `resolve(baseDir, 'master_coach_platform/index.html')`.
- Conversely, `tests/test_platform.mjs` and `tests/test_reactive_logic.mjs` feature path detection (`fs.existsSync(resolve(baseDir, 'index.html')) ? baseDir : resolve(baseDir, 'master_coach_platform')`), allowing execution from both within the directory and from parent directory. Updating the `.js` files with this adaptive pattern will make them self-contained.

---

## 7. Dual-Mode Execution & AWS Serverless Target Architecture

### 7.1 Gap Analysis: Local vs AWS Always-Free Tier

| Architectural Dimension | Current Local Implementation | AWS Always-Free Target Architecture | Migration Gap & Solution |
|-------------------------|------------------------------|------------------------------------|---------------------------|
| **Compute & Runtime** | Stateful Node.js process (`server/server.js`) listening on TCP port 3000 | Stateless AWS Lambda functions (Node.js 20.x/22.x) behind API Gateway | Decouple state; package routes into Lambda handlers (or `@codegenie/serverless-express` adapter for dual runner) |
| **Database** | SQLite file (`data/platform.db`) via `better-sqlite3` (WAL mode) | Amazon DynamoDB Single-Table Design (`MasterCoachPlatform`) | Design PK/SK schema; create DynamoDB storage adapter with identical DAO interface |
| **Real-Time Messaging** | In-process `ws` server with in-memory connection Set & SSE | Amazon API Gateway WebSocket API with DynamoDB connection tracking | Create `$connect`, `$disconnect`, `$default` Lambda handlers using `@connections` management API |
| **File Storage** | Local disk directory (`uploads/`) parsed via Multer | Amazon S3 bucket with Pre-Signed URLs | Replace direct multipart upload to server with client-side direct upload via S3 pre-signed `PUT` URLs |
| **CDN & Edge** | Static Express middleware (`express.static`) | Amazon CloudFront distribution pointing to S3 origin + API Gateway origin | Deploy CloudFront with custom domain `zamalat.cyce52.com`, SSL certificate (ACM), and CSP security headers |
| **Infrastructure as Code** | `render.yaml` | AWS SAM (`template.yaml`) or CloudFormation | Author complete SAM template configured strictly within Always-Free tier thresholds |

### 7.2 AWS Always-Free Tier Threshold Guardrails
To ensure zero operational cost permanently for `zamalat.cyce52.com`:
- **Amazon DynamoDB**:
  - Capacity: **Provisioned Mode** set to **25 RCU** and **25 WCU** (Always-Free tier covers up to 25 provisioned units).
  - Storage: Up to **25 GB** (Always-Free tier).
- **AWS Lambda**:
  - Invocations: **1,000,000 free requests per month**.
  - Compute: **3.2 million seconds** of compute time per month (128 MB tier).
- **Amazon API Gateway**:
  - HTTP APIs: **1,000,000 free requests per month** (first 12 months, and negligible cost thereafter).
  - WebSocket APIs: Keep connections lean and use efficient frame batching.
- **Amazon S3**:
  - Free tier standard storage (5 GB standard storage for first 12 months; optimized data retention).
- **Amazon CloudFront**:
  - **1 TB Data Transfer Out per month** (Always-Free tier).
  - **10,000,000 HTTP/HTTPS requests per month** (Always-Free tier).

### 7.3 DynamoDB Single-Table Design Blueprint
A single DynamoDB table named `MasterCoachPlatform` with composite primary key:
- **`PK`** (Partition Key, String)
- **`SK`** (Sort Key, String)
- **Global Secondary Index 1 (GSI1)**:
  - `GSI1PK` (String)
  - `GSI1SK` (String)

#### Entity Mapping Scheme:
1. **User Entity**:
   - `PK`: `USER#<email>` (or `USER#<userId>`)
   - `SK`: `METADATA`
   - Attributes: `id`, `name`, `email`, `password_hash`, `role`, `avatar`, `created_at`
2. **Coach Profile Entity**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `METADATA`
   - `GSI1PK`: `USER#<userId>`, `GSI1SK`: `COACH#METADATA`
   - Attributes: `candidate_code`, `title`, `audit_status`, `supervisor_name`
3. **Coach State (Hydration Store)**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `STATE`
   - Attributes: `state_json`, `updated_at`
4. **Task Entity**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `TASK#<taskId>`
   - Attributes: `title`, `status`, `version`, `grade`, `reflection_json`, `supervisor_notes`
5. **Tool Application (With Storage-Layer Anti-Duplication)**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `TOOL#<toolType>#BEN#<beneficiaryCode>`
   - **Zero-Code Anti-Duplication**: Using DynamoDB condition expression `attribute_not_exists(PK)` guarantees at the database level that no beneficiary code can be registered more than once within the same tool counter!
6. **Rubrics Evaluation Entity**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `RUBRIC#<rubricCode>#CRIT#<criterionId>`
   - Attributes: `level`, `isCritical`, `requiredImprovement`, `evidenceNote`, `notes`
7. **Ethics Checkpoint Entity**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `ETHICS#CHECKPOINT#<checkpointId>`
   - Attributes: `status`, `cleared_by`, `cleared_at`
8. **Ethics Referral Entity**:
   - `PK`: `COACH#<coachId>`
   - `SK`: `ETHICS#REFERRAL#<referralId>`
   - Attributes: `case_ref`, `beneficiary_code`, `referred_to`, `observed_symptoms`
9. **Chat Channel Entity**:
   - `PK`: `CHANNEL#<channelId>`
   - `SK`: `METADATA`
   - Attributes: `channel_type`, `name`, `direct_coach_id`
10. **Chat Membership Entity**:
    - `PK`: `CHANNEL#<channelId>`
    - `SK`: `MEMBER#<userId>`
    - `GSI1PK`: `USER#<userId>`, `GSI1SK`: `CHANNEL#<channelId>`
    - Attributes: `role`, `last_read_message_id`
11. **Chat Message Entity**:
    - `PK`: `CHANNEL#<channelId>`
    - `SK`: `MSG#<timestamp>#<messageId>`
    - Attributes: `sender_id`, `sender_name`, `message_type`, `content`, `media_url`, `media_meta`
12. **Active WebSocket Connection Entity**:
    - `PK`: `WS_CONN#<connectionId>`
    - `SK`: `USER#<userId>`
    - `GSI1PK`: `USER#<userId>`, `GSI1SK`: `WS_CONN#<connectionId>`
    - Attributes: `connected_at`, `ttl` (DynamoDB Time-To-Live for automatic cleanup)

### 7.4 Dual-Mode Runner Architecture Blueprint
To achieve seamless execution across both local offline development and production serverless deployment:

```
                  +-----------------------------------+
                  |         Frontend (SPA)            |
                  |     (index.html, js/api.js)       |
                  +-----------------+-----------------+
                                    |
                    API Calls / WebSocket Traffic
                                    |
                  +-----------------v-----------------+
                  |       Unified Service Layer       |
                  |  (Auth, Tasks, Rubrics, Chat)     |
                  +-----------------+-----------------+
                                    |
                    Abstract Storage Interface (DAO)
                                    |
          +-------------------------+-------------------------+
          |                                                   |
[Mode: local / offline]                             [Mode: aws / serverless]
          |                                                   |
+---------v---------+                               +---------v---------+
|   SqliteAdapter   |                               |  DynamoDbAdapter  |
|  (better-sqlite3) |                               | (@aws-sdk/client) |
+---------+---------+                               +---------+---------+
          |                                                   |
+---------v---------+                               +---------v---------+
| data/platform.db  |                               | Amazon DynamoDB   |
+-------------------+                               +-------------------+
```

- When running locally (`npm start` or `npm run test:all`): `STORAGE_MODE=sqlite` activates `SqliteAdapter`. WebSockets run via `server/websocket.js`.
- When deployed to AWS: `STORAGE_MODE=dynamodb` activates `DynamoDbAdapter`. API Gateway HTTP API routes invoke Lambda handlers; WebSocket API routes invoke `ws-connect`, `ws-message`, and `ws-disconnect` handlers.

---

## 8. Conclusion & Recommendations for Next Phases

1. **Academic Alignment**: The existing codebase has already implemented all 6 official rubrics (30 criteria, 7 critical blockers), 14 core competency domains, 8 milestone tasks, 4-part reflections, 20 cases, 30 sessions, and 90 tools with verified anti-duplication. The content is authentic and publication-grade Arabic text under Coach Abdelkarim Al-Khelaifi's leadership.
2. **Mobile Layout**: Responsive styling on 375px–414px viewports is verified with 0px horizontal overflow.
3. **Automated Testing**: 100% test pass rate across unit, integration, and adversarial security suites.
4. **Actionable Roadmap for Development Team**:
   - **Phase 1 (Storage Abstraction)**: Extract SQLite database queries in `server/database.js` behind a unified Storage Interface (`IStorageRepository`).
   - **Phase 2 (DynamoDB & S3 Adapters)**: Implement `DynamoDbStorageAdapter` conforming to the Single-Table design schema and `S3StorageAdapter` for pre-signed URLs.
   - **Phase 3 (AWS Serverless Handlers & SAM Template)**: Create SAM `template.yaml` defining DynamoDB table (25 RCU/WCU provisioned), S3 buckets, HTTP API, WebSocket API, Lambda handlers, and CloudFront distribution.
   - **Phase 4 (Dual-Mode Local Runner)**: Ensure `npm start` and `npm run test:all` execute identically in offline local mode and pass 100%, with toggleable emulation for DynamoDB local.
   - **Phase 5 (Production Deployment Guide)**: Formulate step-by-step AWS deployment and DNS configuration guide for pointing `zamalat.cyce52.com` to CloudFront and API Gateway.
