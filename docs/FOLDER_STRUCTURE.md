# Monorepo Folder Structure & Module Organization

To ensure a seamless developer experience for a 3-member student team and prevent merge conflicts, the codebase is structured as a TypeScript monorepo with clear separation between client, server, shared types, and documentation.

---

## 1. Top-Level Directory Tree

```
antigravity-health-copilot/
├── .env.example                 # Root environment variable template
├── .gitignore                   # Multi-tier gitignore (node_modules, logs, dist, .env)
├── package.json                 # Monorepo root workspaces (client, server, shared)
├── tsconfig.json                # Base TypeScript configuration
├── README.md                    # Project documentation & execution guide
├── docs/                        # Architecture, API specifications, and plans
│   ├── PROJECT_UNDERSTANDING.md
│   ├── MVP_SCOPE.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── FOLDER_STRUCTURE.md
│   ├── PHASES.md
│   ├── TEAM_SPLIT.md
│   ├── TEST_PLAN.md
│   ├── DEMO_SCRIPT.md
│   └── RISKS.md
├── shared/                      # Shared TypeScript types & validation schemas
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/
│       │   ├── auth.ts          # User and session types
│       │   ├── patient.ts       # Patient demographics and summary types
│       │   ├── document.ts      # Document, job, and upload types
│       │   ├── clinical.ts      # Observation, medication, diagnosis types
│       │   ├── fhir.ts          # FHIR R4 Bundle and resource interfaces
│       │   └── chat.ts          # Copilot chat and language types
│       └── schemas/
│           ├── document.zod.ts  # Zod validation schemas for AI extraction
│           └── auth.zod.ts      # Request body validation schemas
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   └── src/
│       ├── server.ts            # Entry point: HTTP listener, DB connection
│       ├── app.ts               # Express configuration, helmet, cors, rate-limiting
│       ├── config/
│       │   ├── database.ts      # Mongoose connection & GridFS bucket setup
│       │   └── env.ts           # Type-safe environment variable parser (Zod)
│       ├── middleware/
│       │   ├── auth.middleware.ts        # JWT verification from httpOnly cookie
│       │   ├── role.middleware.ts        # Admin vs Patient RBAC guard
│       │   ├── isolation.middleware.ts   # Strict patient tenant isolation guard
│       │   ├── upload.middleware.ts      # Multer config with magic-byte check
│       │   ├── error.middleware.ts       # Global error handler (no PHI leaks)
│       │   └── rateLimiter.ts            # Request throttling
│       ├── models/
│       │   ├── user.model.ts             # Auth users collection
│       │   ├── patient.model.ts          # Patients collection
│       │   ├── document.model.ts         # Documents collection
│       │   ├── observation.model.ts      # FHIR Observation collection
│       │   ├── medication.model.ts       # FHIR MedicationStatement collection
│       │   ├── diagnosticReport.model.ts # FHIR DiagnosticReport collection
│       │   ├── condition.model.ts        # FHIR Condition collection
│       │   ├── encounter.model.ts        # FHIR Encounter collection
│       │   ├── reminder.model.ts         # Reminders collection
│       │   ├── uploadJob.model.ts        # Asynchronous job tracking collection
│       │   └── chatSession.model.ts      # Grounded chat sessions collection
│       ├── controllers/
│       │   ├── auth.controller.ts        # Login, logout, me
│       │   ├── patient.controller.ts     # Profile, summary, timeline, trends
│       │   ├── document.controller.ts    # Single & bulk upload, file streaming
│       │   ├── fhir.controller.ts        # FHIR R4 exporter
│       │   ├── chat.controller.ts        # Grounded copilot chat
│       │   └── reminder.controller.ts    # Medication & test reminders
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── patient.routes.ts
│       │   ├── document.routes.ts
│       │   ├── fhir.routes.ts
│       │   ├── chat.routes.ts
│       │   └── reminder.routes.ts
│       ├── services/
│       │   ├── gridfs.service.ts         # Stream buffers to/from GridFS
│       │   ├── jobQueue.service.ts       # In-process resilient worker queue
│       │   ├── fhirBundle.service.ts     # Maps Mongo entities to FHIR R4 Bundle
│       │   └── patient.service.ts        # Health summary & trend calculations
│       ├── ai/                           # Modular AI & OCR Pipeline Subsystem
│       │   ├── interfaces.ts             # OcrProvider & LlmProvider interfaces
│       │   ├── pipeline.ts               # Orchestrator: Validation -> OCR -> LLM -> Norm -> Safe
│       │   ├── providers/
│       │   │   ├── gemini.provider.ts    # Google Gemini 2.5 Flash implementation
│       │   │   └── tesseract.provider.ts # Local Tesseract.js fallback
│       │   ├── normalizer/
│       │   │   ├── dateNormalizer.ts     # Standardize to ISO 8601
│       │   │   └── unitNormalizer.ts     # Standardize clinical units
│       │   ├── rules/
│       │   │   └── rangeEvaluator.ts     # Deterministic code-based range checking
│       │   ├── prompts/
│       │   │   ├── extractionPrompt.ts   # Strict JSON schema prompt
│       │   │   └── summaryPrompt.ts      # Empathetic plain-language prompt
│       │   └── translator/
│       │       └── translator.service.ts # Regional translation & Thanglish parser
│       ├── seeds/
│       │   ├── seed.ts                   # Master synthetic seed runner
│       │   ├── syntheticPatients.ts      # PT-1001, PT-1002, PT-1003
│       │   └── sampleFiles/              # Synthetic PDFs, JPGs (Tamil/English Rx, Labs)
│       └── tests/
│           ├── security.test.ts          # Tenant isolation & RBAC enforcement
│           ├── aiPipeline.test.ts        # OCR, extraction, and range evaluator tests
│           └── fhirExport.test.ts        # Validates FHIR Bundle schema
├── client/                      # React + TypeScript + Vite Frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx             # React DOM root with providers
│       ├── App.tsx              # React router setup & route guards
│       ├── index.css            # Tailwind directives, theme variables, custom scrollbars
│       ├── assets/              # Icons, badges, medical logos
│       ├── context/
│       │   ├── AuthContext.tsx           # Authentication state & login/logout
│       │   ├── ThemeContext.tsx          # Light default, persistent dark mode
│       │   └── LanguageContext.tsx       # Active locale state
│       ├── i18n/
│       │   ├── i18n.ts                   # i18next configuration
│       │   └── locales/
│       │       ├── en.json               # English
│       │       ├── ta.json               # Tamil (தமிழ்)
│       │       ├── hi.json               # Hindi (हिन्दी)
│       │       ├── te.json               # Telugu (తెలుగు)
│       │       └── ml.json               # Malayalam (മലയാളം)
│       ├── services/
│       │   ├── api.ts                    # Axios / fetch instance with credentials
│       │   ├── auth.service.ts           # Login, logout, session verify
│       │   ├── patient.service.ts        # Dashboard, timeline, trends
│       │   ├── document.service.ts       # Upload, polling, document details
│       │   ├── chat.service.ts           # Copilot chat requests
│       │   └── voice.service.ts          # Web Speech API wrapper (STT & TTS)
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.tsx            # Header with language/theme switches & user pill
│       │   │   ├── Sidebar.tsx           # Navigation links based on role
│       │   │   ├── MedicalDisclaimer.tsx # Ubiquitous safety warning banner
│       │   │   ├── StatusBadge.tsx       # Processing state pills (Queued, Validating, etc.)
│       │   │   ├── EmptyState.tsx        # Styled empty states with precise copy
│       │   │   ├── LoadingState.tsx      # Shimmer and progress spinners
│       │   │   └── ErrorState.tsx        # Actionable error banners
│       │   ├── patient/
│       │   │   ├── HealthSummaryCard.tsx # "Based on records up to <date>" widget
│       │   │   ├── HealthTimeline.tsx    # Interactive chronological timeline
│       │   │   ├── AbnormalFindings.tsx  # Color-coded high/low findings callouts
│       │   │   ├── MedicationList.tsx    # Current prescriptions table
│       │   │   ├── TrendCharts.tsx       # Recharts time-series for lab markers
│       │   │   ├── DocumentViewer.tsx    # Split-view original file & extracted fields
│       │   │   ├── CopilotChat.tsx       # Floating AI chat drawer with voice mic
│       │   │   └── AbhaCard.tsx          # Mock ABHA ID badge & sync status
│       │   └── admin/
│       │       ├── PatientSearch.tsx     # Instant filter by PT-ID or name
│       │       ├── BulkUploadModal.tsx   # Drag-and-drop batch upload with live poll
│       │       ├── JobProgressTable.tsx  # Totals (Total/Success/Failed) & file errors
│       │       ├── ExtractionReview.tsx  # Human-in-the-loop review & edit modal
│       │       └── FhirExportModal.tsx   # JSON viewer & download for ABDM Bundle
│       └── pages/
│           ├── LoginPage.tsx             # Dual-login switch (Admin demo / Patient demo)
│           ├── PatientDashboard.tsx      # Main patient overview
│           ├── TimelinePage.tsx          # Dedicated timeline & document history
│           ├── MedicationsPage.tsx       # Dedicated active medications manager
│           ├── TrendsPage.tsx            # Full-screen lab trends visualization
│           ├── CalendarPage.tsx          # Month/week view of medical events
│           ├── AdminDashboard.tsx        # Admin overview & quick actions
│           ├── AdminPatientDetail.tsx    # Admin view of complete patient file
│           └── NotFoundPage.tsx          # 404 handler
```

---

## 2. Directory Responsibilities & Team Boundaries

| Directory | Owner | Key Responsibilities |
| :--- | :--- | :--- |
| `shared/` | Shared Contract | Central source of truth for TypeScript types and Zod schemas. Eliminates API drift between frontend and backend. |
| `server/src/ai/` | Member 3 (AI/OCR) | Self-contained AI pipeline. All prompts, normalizers, deterministic evaluators, and provider implementations live here. |
| `server/src/models/` & `services/` | Member 2 (Backend/DB) | MongoDB schemas, GridFS file streaming, async upload queue, FHIR Bundle exporter, and tenant isolation middleware. |
| `client/src/components/` & `pages/` | Member 1 (Frontend/UX) | Responsive React UI, Tailwind styling, Recharts visualization, theme toggle, i18next localizations, and Web Speech API. |
| `server/src/seeds/` | All Members | Realistic synthetic medical data generation (bilingual prescriptions, pathology reports). |
