# Project: Master Coach Platform (Tamkeen Al-Roaya - cyce52.com)

## Architecture
- **Backend Architecture**: Node.js v24 + Express v5.3.0 + `better-sqlite3` database + native `ws` WebSocket server (`server/websocket.js`). HTTP server upgrade handling via `http.createServer(app)`. Dual-engine synchronization ensures REST APIs, SSE endpoints, and WebSockets broadcast in real time with automatic fallback.
- **Frontend Architecture**: Executive Single-Page Application (HTML5, Vanilla CSS3 / Modern Glassmorphism, Vanilla JS). Light-mode first with high-contrast Cairo and Tajawal typography. Floating omnipresent launcher widget and slide-over messenger drawer (`#chat-drawer`). Sticky quick-nav pills with ScrollSpy.
- **Data Flow**:
  1. *Chat & Supervision*: User actions -> Floating Action Launcher -> WebSocket Client (`/ws?token=...`) <-> WebSocket Server (`server/websocket.js`) <-> SQLite (`chat_messages`, `chat_channels`). REST fallback via `/api/chat/*`.
  2. *Evaluation & Integrity*: 6 Arab Coaching Federation rubrics + 14 competency domains + quantitative trackers (240h, 20 cases, 30 sessions, 90 tools) + ethical blocker gate (`ETH-01` to `ETH-07`).
  3. *Dual-Role Experience*: Seamless switching between Trained Coach (candidate submission, progress rings, reflections) and Master Coach (Executive Admin KPI dashboard, rubric evaluation, clearance toggles, graduation decree).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Native `ws` WebSocket Server | Modular WebSocket server on Express HTTP upgrade with JWT auth | M1 | Survey (explorer_survey_1) |
| 2 | Channel Segregation | 1-on-1 private supervision & cohort group (ديوان زمالة الماستر كوتش) | M1 | Survey (explorer_survey_1) |
| 3 | Bidirectional Protocol | Real-time frames (`chat:send`, `chat:typing`, `chat:read`, `ping`/`pong`) | M1 | Survey (explorer_survey_1) |
| 4 | Dual-Engine Bridge | REST endpoints trigger WebSocket broadcast; SSE streaming preserved | M1 | Survey (explorer_survey_1) |
| 5 | WebSocket Integration Tests | Node 24 WebSocket integration test suite verifying handshake, auth, broadcast | M1 | Survey (explorer_survey_1) |
| 6 | Floating Action Launcher | Omnipresent floating button (bottom-left RTL) with unread pulse badge | M2 | Survey (explorer_survey_2) |
| 7 | Slide-over Messenger Drawer | Off-canvas drawer (`#chat-drawer`) with channel switcher and active view | M2 | Survey (explorer_survey_2) |
| 8 | Dashboard Flow Decoupling | Remove `#panel-chat` from primary vertical scroll, preserve `#chat-content-area` | M2 | Survey (explorer_survey_2) |
| 9 | Client-Side WebSocket Engine | Auto-reconnect with exponential backoff, ping/pong heartbeat, REST fallback | M2 | Survey (explorer_survey_2) |
| 10 | Voice Note Recording & Playback | MediaRecorder recording, 50MB audio upload, custom waveform audio player | M2 | Survey (explorer_survey_2) |
| 11 | Image Preview Lightbox | File picker with image thumbnail preview in chat bubbles and modal expand | M2 | Survey (explorer_survey_2) |
| 12 | Real-Time Typing Indicators | Typing indicator pulses in slide-over drawer when counterpart is composing | M2 | Survey (explorer_survey_2) |
| 13 | Tamkeen Al-Roaya Palette | Royal Navy `#0B1B3D`, Emerald `#059669`, Amber `#D97706` executive styling | M3 | Survey (explorer_survey_2) |
| 14 | Typography & Whitespace Overhaul | Light-mode first, Cairo & Tajawal typography, eliminate dark-on-dark contrast issues | M3 | Survey (explorer_survey_2) |
| 15 | Polished SVG Progress Gauges | Modern circular progress rings for 240h, 20 cases, 30 sessions, 90 tool applications | M3 | Survey (explorer_survey_2) |
| 16 | Modern Cards & Metric Strips | Refined card layouts, elevated KPI summaries, intuitive task submission cards | M3 | Survey (explorer_survey_2) |
| 17 | Sticky Quick-Navigation Pills | Frosted glass sticky pill bar with ScrollSpy section tracking and smooth scroll | M3 | Survey (explorer_survey_2) |
| 18 | Dual-Role Switching & Token Sync | Seamless toggle between Candidate and Admin views with synchronized JWT auth | M3 | Survey (spec_miner_survey_1) |
| 19 | DOM Test Contract Preservation | Retain all 19 mandatory DOM element IDs tested by `test_platform.js` | M3 | Survey (spec_miner_survey_1) |
| 20 | Domain & Rubric Integrity | 100% compliance across 35 API routes, 6 rubrics, 14 domains, anti-duplication | M3 | Survey (spec_miner_survey_1) |
| 21 | Full Test Suite Execution | `npm run test:all` executes cleanly and passes 100% across all suites | M4 | Survey (spec_miner_survey_1) |
| 22 | Forensic Integrity & Verification | Forensic audit checks verifying no facades, hardcoded mocks, or shortcuts | M4 | Survey (orchestrator) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend WebSocket Architecture & Dual-Engine Bridge | Install `ws`, create `server/websocket.js`, update `server/server.js` and `server/routes/chat.js`, write `tests/websocket.test.js` | none | DONE |
| M2 | Floating Omnipresent Chat Widget & Real-Time Client Integration | Decouple `#panel-chat`, build floating launcher button, slide-over drawer (`#chat-drawer`), client WS engine, voice recorder, image preview | M1 | IN_PROGRESS |
| M3 | Executive UI/UX Design System & All-in-One Single-Page Overhaul | Tamkeen Al-Roaya palette, Cairo/Tajawal fonts, SVG progress rings, cards, sticky quick-nav, dual-role token sync, 19 DOM IDs preserved | none | PLANNED |
| M4 | Final Comprehensive Verification & Adversarial Hardening | Execute `npm run test:all`, verify 100% pass across all suites, challenger stress tests, forensic integrity audit | M1, M2, M3 | PLANNED |

## Interface Contracts
### Client WebSocket ↔ Server WebSocket
- **Handshake Endpoint**: `ws://<host>:<port>/ws?token=<jwt_token>` (query param or `Sec-WebSocket-Protocol` header)
- **Client Outgoing Events**:
  - `chat:send`: `{ type: "chat:send", channelId: number, content: string, messageType?: "text"|"audio"|"image", mediaUrl?: string, mediaMeta?: object }`
  - `chat:typing`: `{ type: "chat:typing", channelId: number, isTyping: boolean }`
  - `chat:read`: `{ type: "chat:read", channelId: number, messageId: number }`
  - `ping`: `{ type: "ping" }`
- **Server Outgoing Events**:
  - `chat:message`: `{ type: "chat:message", channelId: number, message: { id, sender_id, sender_name, sender_role, content, message_type, media_url, media_meta, created_at } }`
  - `chat:typing`: `{ type: "chat:typing", channelId: number, userId: number, userName: string, isTyping: boolean }`
  - `chat:read_receipt`: `{ type: "chat:read_receipt", channelId: number, userId: number, messageId: number }`
  - `pong`: `{ type: "pong" }`
  - `error`: `{ type: "error", code: string, message: string }`

### REST Fallback Contract
- `POST /api/chat/channels/:channelId/messages`: `{ content, message_type, media_url, media_meta }`
- `GET /api/chat/channels/:channelId/messages`: returns array of messages
- `POST /api/chat/upload`: multipart/form-data `file` (audio, image, document up to 50MB) -> returns `{ url, filename, size, mimetype }`

### DOM ID Contract (Mandatory for test preservation)
The following 19 IDs must exist in `index.html`:
`panel-hours`, `panel-rubrics`, `panel-quant`, `panel-cases`, `panel-sessions`, `panel-tools`, `panel-analytics`, `panel-admin`, `panel-chat`, `panel-defense`, `select-role`, `btn-export-pdf`, `btn-export-json`, `btn-anonymize`, `rubric-filters`, `competency-filter`, `kpi-strip`, `degree-modal`, `chat-content-area`.

## Code Layout
- `server/websocket.js`: Native WebSocket server logic, ChannelManager, JWT auth, event dispatching.
- `server/server.js`: HTTP server setup, upgrade delegation, static files and route mounts.
- `server/routes/chat.js`: REST endpoints, SSE stream, media upload, and broadcast bridge.
- `js/app.js`: Main client application logic, role switching, quantitative trackers, task submissions, rubrics.
- `js/chat-widget.js`: Modular floating action launcher, slide-over drawer, WebSocket client, audio recorder, and image preview.
- `css/styles.css`: Tamkeen Al-Roaya Executive Design System, typography, cards, progress rings, sticky navigation, and slide-over chat styles.
- `index.html`: Modernized single-page layout, floating launcher markup, slide-over drawer markup, preserved DOM contract IDs.
- `tests/websocket.test.js`: WebSocket unit and integration test suite.
- `tests/api_fullstack.test.js`: Existing API test suite (Suite 1-10).
