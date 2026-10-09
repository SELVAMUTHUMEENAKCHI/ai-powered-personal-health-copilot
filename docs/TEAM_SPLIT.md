# Team Allocation & Responsibility Split (3-Student Team)

To ensure rapid, parallel execution during the Altrix Labs hackathon without bottlenecks or merge conflicts, responsibilities are clearly divided among the 3 student engineers.

---

## 1. Team Roles & Ownership Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MEMBER 1: Frontend & UX Architect                    │
│  • React + Vite + TypeScript Single Page Application                   │
│  • Tailwind CSS Design System, Responsive Layout, Dark/Light Theme     │
│  • Recharts Visualizations, Health Timeline, Document Split-Viewer     │
│  • react-i18next Multilingual Localization (EN, TA, HI, TE, ML)        │
│  • Browser Web Speech API (Voice STT / TTS Integration)                │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│               MEMBER 2: Backend & Database Architect                   │
│  • Node.js + Express + TypeScript REST API Gateway                     │
│  • MongoDB Atlas & GridFS Durable Binary Storage                       │
│  • JWT Authentication (httpOnly cookies) & Role-Based Access Control   │
│  • Patient Tenant Isolation Middleware & Security Tests                │
│  • Asynchronous Job Queue, File Hash Deduplication & Bulk Ingestion   │
│  • HL7 FHIR R4 Model & `toFhirBundle` Interoperability Exporter        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                 MEMBER 3: AI & OCR Pipeline Engineer                   │
│  • Modular Pipeline Orchestrator (OcrProvider & LlmProvider interfaces)│
│  • Google Gemini 2.5 Flash Vision & Text Multimodal Prompt Engineering │
│  • Local Tesseract.js Fallback Engine                                  │
│  • Strict JSON Schema Definition & Zod Runtime Output Validation       │
│  • Clinical Date & Unit Normalizer Engine                              │
│  • Deterministic Range Evaluation (Code-based Math, Not LLM)           │
│  • Grounded Patient Copilot Chat with Thanglish Comprehension          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Task Matrix

| Phase | Member 1 (Frontend / UX) | Member 2 (Backend / DB) | Member 3 (AI / OCR) |
| :--- | :--- | :--- | :--- |
| **Phase 1**<br>*Foundation & Auth* | • Scaffold Vite + React + Tailwind + Lucide icons.<br>• Implement `AuthContext`, `ThemeContext`.<br>• Build Login UI with role switch. | • Scaffold Express + TypeScript monorepo.<br>• Set up Mongoose models & GridFS bucket.<br>• Implement JWT auth in httpOnly cookies.<br>• Build isolation middleware & automated security tests. | • Author `shared/` TypeScript types & Zod schemas.<br>• Set up Gemini API client & environment keys.<br>• Verify multimodal test call against sample prescription. |
| **Phase 2**<br>*Upload & AI Pipeline* | • Build drag-and-drop file uploader component.<br>• Implement upload progress states (`Queued`, `Processing`, etc.).<br>• Connect polling hook to job status API. | • Implement Multer with magic-byte file validation.<br>• Implement GridFS stream storage & SHA-256 hash.<br>• Build in-process job queue & polling endpoint.<br>• Implement document repository CRUD. | • Define `OcrProvider` & `LlmProvider` interfaces.<br>• Implement `GeminiProvider` (multimodal) & Tesseract fallback.<br>• Build strict JSON extraction prompt & Zod validator.<br>• Write deterministic `rangeEvaluator` & plain-language summarizer. |
| **Phase 3**<br>*Patient Experience* | • Build Patient Dashboard with "Current Health Summary" card.<br>• Build interactive reverse-chronological Health Timeline.<br>• Implement Document Detail Modal with split view.<br>• Implement all designated empty/loading/error states. | • Implement `/api/patients/:id/summary` endpoint.<br>• Implement `/api/patients/:id/timeline` endpoint.<br>• Implement `/api/documents/:id/file` GridFS stream endpoint.<br>• Enforce patient isolation on all patient queries. | • Refine plain-language summary prompt for empathy and layman terms.<br>• Implement disclaimer injection into all generated clinical text.<br>• Unit test extraction against multi-page lab reports. |
| **Phase 4**<br>*Admin & Bulk Upload* | • Build Admin Dashboard & instant patient search bar.<br>• Build Bulk Upload Modal with drag-and-drop.<br>• Build Job Progress Table (Totals + per-file status).<br>• Build Admin Human-in-the-Loop Review Screen. | • Implement `/api/patients` search endpoint.<br>• Implement `/api/documents/bulk-upload` endpoint.<br>• Build batch filename parser (`PT-1001_report.pdf`).<br>• Implement resilient job worker (one failure doesn't halt batch). | • Fine-tune OCR parser for handwritten & bilingual prescriptions.<br>• Add confidence scoring flags (`high` vs `low`) to trigger admin review.<br>• Test bulk processing on 10 synthetic files. |
| **Phase 5**<br>*Chat, Voice & i18n* | • Build floating Copilot Chat Drawer.<br>• Integrate Web Speech API (mic button, STT, TTS).<br>• Configure `react-i18next` with language switcher (EN, TA, HI, TE, ML). | • Implement `/api/chat/message` & `/api/chat/sessions`.<br>• Build strict context builder (retrieves ONLY authenticated patient's records).<br>• Prevent cross-tenant prompt injection. | • Prompt engineer Copilot with strict grounding.<br>• Implement Thanglish query comprehension.<br>• Implement translation service for summary readouts.<br>• Add voice error handling & fallback messages. |
| **Phase 6**<br>*FHIR, Trends & Calendar* | • Build Recharts Lab Trends with reference bands & empty states.<br>• Build Calendar Page (report date vs. upload date).<br>• Build Medication Manager page.<br>• Build Mock ABHA Card & FHIR JSON viewer modal. | • Implement `toFhirBundle(patientId)` service.<br>• Implement `/api/patients/:id/fhir-bundle` endpoint.<br>• Implement `/api/patients/:id/trends` endpoint.<br>• Implement `/api/reminders` CRUD endpoints. | • Validate exported FHIR Bundle against HL7 FHIR R4 schema.<br>• Ensure medication entities cleanly map to `MedicationStatement`.<br>• Ensure lab tests cleanly map to `Observation` resources. |
| **Phase 7**<br>*Polish, Tests & Demo* | • Mobile responsiveness audit & dark theme polish.<br>• Polish animations & micro-interactions.<br>• Rehearse live demo walkthrough. | • Run full security regression test suite.<br>• Implement master seed script (`seed.ts`) with synthetic patients & reports.<br>• Author deployment configuration (Vercel/Render). | • Benchmark extraction accuracy across synthetic test files.<br>• Verify deterministic range evaluation test coverage.<br>• Help author README and API documentation. |

---

## 3. Communication & Code Collaboration Protocol

1. **Shared Contract-First Development:**
   - Both frontend and backend depend strictly on the `shared/` package for TypeScript interfaces and Zod schemas.
   - Any API or schema change MUST be merged into `shared/` first before frontend or backend consumption.
2. **Git Branching Strategy:**
   - `main`: Production-ready, verified code.
   - `phase-<N>-integration`: Working branch for the active phase.
   - Feature branches: `feat/m1-timeline-ui`, `feat/m2-bulk-upload`, `feat/m3-gemini-ocr`.
   - Never commit directly to `main`.
3. **Daily Cadence (Hackathon Sprint):**
   - **Morning Sync (15 mins):** Align on phase objectives, verify shared contracts, identify blockers.
   - **Midday Check-in (10 mins):** Review integration branch merges and test status.
   - **Evening Phase Review (20 mins):** Run end-to-end tests, inspect UI, review deliverables, log completion.
