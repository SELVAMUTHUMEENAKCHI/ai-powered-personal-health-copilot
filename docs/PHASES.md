# Phased Implementation Plan & Execution Milestones

In accordance with hackathon best practices and architecture guidelines, implementation will proceed **one phase at a time**. Each phase represents an independently testable, verified milestone. We will execute a phase, run verification tests, summarize accomplishments and remaining items, and pause for user approval before moving forward.

---

## Phase Overview Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation, Auth, Tenant Isolation & Core DB Schemas          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 2: File Ingestion, GridFS, OCR & Modular AI Extraction Pipeline  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 3: Patient Experience: Dashboard, Health Summary & Timeline     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 4: Admin Portal, Patient Search, Review Screen & Bulk Upload     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 5: Grounded Copilot Chat, Multilingual Localization & Voice STT/TTS│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 6: ABDM / FHIR R4 Bundle Exporter, Calendar, Meds & Trend Charts │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 7: Final Polish, Security Audits, Seed Dataset, Docs & Demo Prep │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Breakdown

### Phase 1: Foundation, Auth, Tenant Isolation & Core DB Schemas
- **Objective:** Establish the project foundation, configure MongoDB Atlas with GridFS, implement JWT authentication in secure `httpOnly` cookies, and create non-negotiable patient tenant isolation middleware.
- **Key Tasks:**
  1. Initialize monorepo workspace (`client`, `server`, `shared`) with strict TypeScript configs.
  2. Implement Mongoose models for `User`, `Patient`, `Document`, and core FHIR resources (`Observation`, `MedicationStatement`, `DiagnosticReport`).
  3. Set up Express application with `helmet`, `cors`, `cookie-parser`, and rate limiting.
  4. Build JWT auth endpoints (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`) with `bcrypt` password hashing.
  5. Implement `roleMiddleware` (`admin` vs `patient`) and `enforcePatientIsolation` middleware.
  6. Write automated security tests proving:
     - Patient A (`PT-1001`) receives `403 Forbidden` when attempting to read Patient B (`PT-1002`) data.
     - A patient user receives `403 Forbidden` when attempting to call admin routes.
- **Verification Deliverable:** Server boots cleanly, connects to MongoDB, and security isolation tests pass 100%.

---

### Phase 2: File Ingestion, GridFS, OCR & Modular AI Extraction Pipeline
- **Objective:** Build the end-to-end medical document processing pipeline from upload to structured extraction and deterministic range evaluation.
- **Key Tasks:**
  1. Implement Multer upload middleware with magic-byte file signature validation (PDF, DOCX, JPG, PNG) and SHA-256 duplicate checking.
  2. Implement `GridFsService` to stream file buffers into MongoDB GridFS (eliminates local disk reliance).
  3. Define swappable interfaces: `OcrProvider` and `LlmProvider`.
  4. Implement `GeminiProvider` using `@google/genai` (multimodal vision + text) and `TesseractProvider` as local fallback.
  5. Author the strict JSON schema extraction prompt:
     - Extracts: Patient name, ID hint, report date (ISO 8601), document type, medicines (name, dosage, frequency, duration), lab tests (name, value, unit, reference range), and explicit diagnoses.
     - Enforces: Missing data is strictly `null` or `"Not available"`. Zero hallucination.
  6. Implement Zod schema validation on extracted JSON payloads.
  7. Build clinical normalizer (date parser, unit standardizer).
  8. Implement deterministic code-based `rangeEvaluator` (pure math comparison; does NOT use LLM).
  9. Implement plain-language AI summary generator with mandatory safety disclaimer.
  10. Implement in-process asynchronous job queue and polling endpoint (`/api/documents/jobs/:jobId`).
- **Verification Deliverable:** Unit & integration test uploading a sample blood report PDF and prescription JPG; pipeline successfully extracts structured data and evaluates ranges.

---

### Phase 3: Patient Experience: Dashboard, Health Summary & Timeline
- **Objective:** Build the responsive patient frontend in React + Tailwind with modern medical aesthetics and complete state handling.
- **Key Tasks:**
  1. Set up Tailwind CSS design tokens: Calm medical palette (emerald/teal primary, slate neutral, amber caution, rose alert), custom fonts, and dark mode class strategy.
  2. Implement `AuthContext` and persistent `ThemeContext` (persisted in `localStorage`).
  3. Build Patient Navigation (Navbar + Sidebar + ubiquitous `MedicalDisclaimer` banner).
  4. Create **Current Health Summary** card:
     - Displays: *"Based on your available records up to <latest date>"*.
     - Fallback: *"No recent record is available"* / *"Information not available in the uploaded records"*.
     - High-level metric pills: Abnormal findings count, active medications count, recent reports.
  5. Create **Health Timeline** component:
     - Reverse-chronological timeline sorted by extracted `reportDate` (falls back to `uploadedAt`).
     - Visual badge distinguishing report types (Lab, Prescription, Discharge Summary).
  6. Build **Document Detail Modal** with split preview (original document stream vs. extracted parameters).
  7. Implement dedicated UI states with required copy:
     - Loading: *"Processing your medical document..."*
     - Success: *"Document processed successfully."*
     - Error: *"Unable to process this document. Please check the file and try again."*
     - Empty: *"No medical records available yet. Upload your first document to get started."*
- **Verification Deliverable:** Patient can log in, view their dashboard, inspect health summary and timeline, and upload a new document with live status feedback.

---

### Phase 4: Admin Portal, Patient Search, Review Screen & Bulk Upload
- **Objective:** Equip administrators and healthcare staff with clinical oversight, bulk ingestion capabilities, and human-in-the-loop review.
- **Key Tasks:**
  1. Build Admin Dashboard with patient search bar (filters instantly by `patientId` like `PT-1001` or name).
  2. Implement full patient profile view (current metrics, complete historical documents, all extracted tests).
  3. Build **Bulk Upload Modal**:
     - Drag-and-drop batch ingestion (up to 20 files).
     - Filename parser: extracts `patientId` from filenames (e.g. `PT-1001_blood_report.pdf`).
     - Validates patient existence in database; flags unknown patients without stopping the batch.
     - Calculates SHA-256 hashes to prevent duplicate ingestion.
  4. Implement live Job Progress Table displaying totals:
     - Total files, success count, failed count, processing count.
     - Per-file status pills and precise error reasons.
  5. Build **Admin Extraction Review Screen**:
     - Side-by-side view: original source file vs. editable form.
     - Allows admin to correct/verify low-confidence dates, medication dosages, or test values.
- **Verification Deliverable:** Admin can search patients, upload a 3-file batch, watch live job polling, and edit an extracted record.

---

### Phase 5: Grounded Copilot Chat, Multilingual Localization & Voice STT/TTS
- **Objective:** Deploy conversational AI grounded strictly in the patient's records, regional language support, and browser voice interfaces.
- **Key Tasks:**
  1. Implement `/api/chat/message` backend service:
     - Context assembly: fetches ONLY the authenticated patient's observations, reports, and medications.
     - System prompt: forbids external diagnosis or cross-patient disclosure.
     - Injects medical disclaimer into every conversational turn.
  2. Implement **Thanglish & Bilingual Comprehension**:
     - Handles mixed colloquial queries (e.g., *"Enoda fasting sugar report la normal ah?"*).
     - Replies in the requested language (Tamil, Hindi, English).
  3. Configure `react-i18next` with complete translation files for:
     - English (EN), Tamil (TA), Hindi (HI), Telugu (TE), Malayalam (ML).
     - Language selector dropdown in navigation.
  4. Implement floating **Copilot Chat Drawer** in patient UI.
  5. Implement `voice.service.ts` using browser Web Speech API:
     - Microphone button with recording pulse animation next to search & chat inputs.
     - Speech-to-Text (STT) input with automatic language code mapping.
     - Optional Text-to-Speech (TTS) audio playback of plain-language summaries.
     - Graceful fallback with toast message if browser lacks speech synthesis for a language.
- **Verification Deliverable:** Patient speaks or types a query in Tamil/Thanglish; Copilot returns a grounded, accurate reply with safety disclaimer.

---

### Phase 6: ABDM / FHIR R4 Bundle Exporter, Calendar, Meds & Trend Charts
- **Objective:** Deliver ABDM readiness, longitudinal clinical analytics, and daily health management tools.
- **Key Tasks:**
  1. Implement `toFhirBundle(patientId)` service and `/api/patients/:patientId/fhir-bundle` endpoint:
     - Serializes Mongo entities into valid HL7 FHIR R4 JSON Bundle (`Patient`, `Observation`, `DiagnosticReport`, `MedicationStatement`, `Condition`).
  2. Build **ABHA Card & FHIR Export Modal**:
     - Displays mock ABHA ID (`91-8472-1923-0192`), verification badge, and sync status (labeled "Demo/Mock").
     - One-click "Export FHIR R4 Bundle" button with formatted JSON viewer and download option.
  3. Build **Interactive Calendar Page**:
     - Month/week calendar highlighting entries by `reportDate` (fallback to `uploadedAt`).
     - Click day to inspect all documents and prescriptions filed on that date.
  4. Build **Medication Manager Page**:
     - Tabular view of all extracted prescriptions.
     - Filters active vs. completed treatments strictly using extracted start/end dates (never assumes active without evidence).
  5. Build **Longitudinal Lab Trends (Recharts)**:
     - Interactive time-series charts for key biomarkers (Fasting Sugar, HbA1c, Cholesterol).
     - Reference range threshold bands (green safe zone).
     - Mandatory threshold check: Displays *"Not enough historical data to show a trend"* if fewer than 2 data points exist.
  6. Build **Reminders Widget**:
     - Medication schedule, follow-up consults, and upcoming repeat tests.
- **Verification Deliverable:** Exported FHIR bundle validates against FHIR R4 schema; charts render with reference ranges; calendar and meds pages function seamlessly.

---

### Phase 7: Final Polish, Security Audits, Seed Dataset, Docs & Demo Prep
- **Objective:** Final hardening, test execution, comprehensive seeding, and demo rehearsal.
- **Key Tasks:**
  1. Build master seed script (`server/src/seeds/seed.ts`):
     - Seeds 1 Admin (`admin@altrix.health / AdminPassword123!`).
     - Seeds 3 Synthetic Patients (`PT-1001`, `PT-1002`, `PT-1003`).
     - Seeds realistic synthetic sample files:
       - Multi-parameter blood report (elevated glucose, normal lipid profile).
       - Bilingual Tamil/English prescription (handwritten & printed combo).
       - Hospital discharge summary.
  2. Execute end-to-end automated test suites:
     - Security tenant isolation tests.
     - AI pipeline schema and range evaluation tests.
     - FHIR Bundle schema compliance tests.
  3. Verify responsive design on mobile, tablet, and desktop viewports.
  4. Finalize root `README.md` with:
     - Setup instructions, environment guide (`.env.example`), demo credentials.
     - Architecture diagrams, DB schema docs, API documentation.
     - Deployment guide (Vercel frontend, Render backend, MongoDB Atlas).
     - Prominent healthcare disclaimer.
  5. Conduct rehearsal of the 3-minute hackathon demo script.
- **Verification Deliverable:** Zero console errors, all tests green, clean seed data loaded, demo script verified.
