# MVP Scope & Feature Prioritization Matrix

This document defines the strict boundary between what **must** be built for the Altrix Labs Hackathon (Round 1), what is high-value secondary scope, and what is explicitly prohibited. Because our team has 3 student engineers, disciplined scope management ensures a polished, working, bug-free deliverable.

---

## 1. Feature Classification Framework

```
┌────────────────────────────────────────────────────────┐
│                   P0: CORE MVP (Must Build)            │
│  Auth + Roles + Tenant Isolation + Single Upload       │
│  Modular AI Pipeline (OCR + Gemini + Zod + Norm)       │
│  Deterministic Abnormal Detection + Safe Explanations  │
│  Patient Dashboard + Health Summary + Timeline         │
│  Admin Patient Search + Profile + Bulk Upload          │
│  Mock ABHA + FHIR R4 Schema + Theme Persistence        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               P1: HIGH VALUE POST-MVP (Build Next)     │
│  Calendar View (Report vs Upload Date)                 │
│  Medication Manager (Evidence-Based Active List)       │
│  Recharts Longitudinal Trends (Lab Values)             │
│  Grounded AI Chat (Patient-Isolated Knowledge Base)    │
│  Multilingual UI & AI (Tamil, Hindi, Telugu, etc.)     │
│  Thanglish Natural Query Comprehension                 │
│  Global Search (Scoped by Role)                        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 P2: POLISH & DELIGHT (If Time Permits) │
│  Web Speech API Voice Input / Output (Mic UI)          │
│  Automated Reminders (Meds, Follow-ups, Tests)         │
│  Admin Extraction Review & Human-in-the-Loop Edit UI   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│              DO NOT BUILD (Explicit Anti-Scope)        │
│  Real ABDM Sandbox Integration / Government Gateway    │
│  Medical Diagnosis or Treatment Recommendations       │
│  Payment Gateways / Billing Infrastructure             │
│  Real Patient Data / Sensitive Production PHI          │
│  Mobile Native Apps (PWA / Responsive Web is sufficient)│
└────────────────────────────────────────────────────────┘
```

---

## 2. Priority Breakdown & Deliverables

### P0 — Core MVP (Must Be Flawless for Round 1 Submission)
*These features represent the foundational pass/fail bar for technical evaluation.*

1. **Authentication & Role-Based Access Control:**
   - JWT tokens stored in secure, `httpOnly`, `sameSite` cookies.
   - Roles: `admin` and `patient`.
   - Auto-generated patient IDs (`PT-1001`, `PT-1002`, `PT-1003`).
   - Cryptographic password hashing using `bcrypt`.
2. **Backend Patient Isolation:**
   - Middleware ensures `patient` role endpoints strictly query `{ patientId: req.user.patientId }`.
   - Route guard prohibiting patient role from executing administrative endpoints (`403 Forbidden`).
   - Automated test suite verifying cross-patient access denial.
3. **Document Ingestion & Durable Storage:**
   - Single file upload supporting PDF, DOCX, JPG, JPEG, PNG (50MB limit).
   - Magic-byte MIME type validation and file hash (SHA-256) calculation for duplicate detection.
   - MongoDB GridFS storage (zero loss from server restarts, eliminates local disk dependency).
   - Per-file status pipeline: `Queued` → `OCR Processing` → `Extracting` → `Validating` → `Saved` → `Completed` (or `Failed` with descriptive reason).
4. **Modular AI Pipeline (OCR + Extraction + Normalization):**
   - Swappable interface abstractions: `OcrProvider` (Gemini Multimodal / Tesseract.js fallback) and `LlmProvider` (Gemini 2.5 Flash).
   - Strict JSON schema extraction: Patient demographics, report date, document type, medications (name, dosage, frequency, duration), lab tests (name, value, unit, reference range), and explicit diagnoses.
   - Zod runtime validation of all AI outputs before database persistence.
   - Normalization layer: Date standardization (ISO 8601), unit normalization, and missing data tagged `null` or `"Not available"`. Zero hallucination.
5. **Deterministic Abnormal Detection & Plain-Language Summary:**
   - Pure code logic comparing numeric test values to printed reference intervals.
   - If no reference range exists in the report, value is marked `unspecified`—never assumed abnormal.
   - Plain-language AI summary explaining findings in layman terms.
   - Strict safety wording: *"Your glucose value is above the reference range shown in the report. Please discuss this with a qualified healthcare professional."*
   - Ubiquitous medical disclaimer banner.
6. **Patient Portal (Core UX):**
   - **Current Health Summary:** Dynamic summary based on latest available records (`"Based on your available records up to <date>"`). Fallbacks for empty states (`"No recent record is available"`).
   - **Health Timeline:** Reverse-chronological timeline sorted by report date (falling back to upload date).
   - **Document Detail Modal:** View extracted parameters, plain-language breakdown, and original source preview.
7. **Admin Portal (Core Capabilities):**
   - Patient search by ID (`PT-1001`) or name.
   - Full patient profile viewer (historical documents, extracted data, current metrics).
   - Resilient Bulk Upload: Ingests batches like `PT-1001_blood_report.pdf`, parses patient ID, calculates hashes, displays real-time job summary (total/success/failed), and prevents single-file errors from halting the queue.
8. **Mock ABHA & FHIR R4 Ready Model:**
   - Patient profile displays mock ABHA ID (`91-XXXX-XXXX-XXXX`), verification badge, and sync status.
   - FHIR-compliant internal schemas (`Patient`, `Observation`, `DiagnosticReport`, `MedicationStatement`, `Condition`, `Encounter`).
   - Backend exporter endpoint `/api/patients/:id/fhir-bundle` returning a valid FHIR R4 JSON Bundle.
9. **UI Design System & State Management:**
   - Calm medical palette (emerald/teal primary, slate neutral, amber caution, rose alert).
   - Light theme default with persistent dark mode toggle (stored in `localStorage`).
   - Specific UI state messages as dictated by the design specs:
     - *"Processing your medical document..."*
     - *"Document processed successfully."*
     - *"Unable to process this document. Please check the file and try again."*
     - *"No medical records available yet. Upload your first document to get started."*

---

### P1 — High-Value Enhancements (Round 1 Differentiators)
*These features maximize scoring in AI Utilization (35%) and UX (20%).*

1. **Interactive Calendar View:**
   - Month/week view highlighting records by `reportDate` (with fallback to `uploadedAt`).
   - Interactive day click revealing documents, tests, and prescriptions filed on that day.
2. **Medication Manager:**
   - Active medications list grounded strictly in extracted prescriptions.
   - Flags medications where duration has expired vs. ongoing treatment without guessing.
3. **Longitudinal Lab Trends (Recharts):**
   - Interactive trend lines for key blood markers (e.g., Fasting Blood Sugar, HbA1c, Cholesterol).
   - Empty state check: If fewer than 2 data points exist, displays *"Not enough historical data to show a trend"*.
4. **Grounded AI Copilot Chat:**
   - Chat assistant with retrieval strictly bounded to the authenticated patient's observations and diagnoses.
   - Rejects queries attempting to access external medical recommendations or cross-patient data.
   - Understands colloquial and mixed language (e.g., *"Enoda sugar level normal ah iruka?"* in Thanglish).
5. **Multilingual UI & Translations (react-i18next):**
   - Seamless language switcher: English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Malayalam (മലയാളം).
   - AI summaries rendered in the patient's selected regional language on demand.
6. **Scoped Global Search:**
   - Patient: Searches within own documents, medications, and observations.
   - Admin: Searches across all patients, documents, and medical tags.

---

### P2 — Polish & Hackathon Bonus (If Time Permits)
*Targeting hackathon bonus points and "wow" factor during live judging.*

1. **Voice Input/Output (Web Speech API):**
   - Microphone button adjacent to chat and search inputs.
   - Real-time Speech-to-Text (STT) and optional Text-to-Speech (TTS) readout of plain-language summaries.
   - Graceful fallback and user-facing warning if the browser or OS lacks speech synthesis for selected languages.
2. **Patient Reminders & Alerts:**
   - Medicine schedule notifications, upcoming lab test recommendations, and doctor follow-up alerts parsed from prescriptions.
3. **Admin Human-in-the-Loop Review Screen:**
   - Split-screen view: Original scanned PDF on left, editable JSON/form on right.
   - Low-confidence OCR extraction flags requiring admin sign-off.

---

## 3. Explicit Anti-Scope (DO NOT BUILD)
*Building these introduces severe compliance risks, massive time sinks, or architectural failure.*

| Prohibited Feature | Justification |
| :--- | :--- |
| **Real ABDM Sandbox Integration** | Requires government whitelisting, OAuth gateways, M1/M2/M3 cryptographic bridges, and KYC hardware. A mock FHIR R4 Bundle exporter achieves 100% of the scoring goal without external downtime risks. |
| **Diagnostic & Prescribing AI** | Legally dangerous and prohibited by medical ethics. The system is an organization and summarization copilot, not a doctor. |
| **Payment Gateways & Billing** | Unnecessary distraction from healthcare AI core functionality. |
| **Real Patient PHI** | HIPAA and DISHA violation. All seed data and test records must be synthetically generated. |
| **Native Mobile App (React Native/Flutter)** | Responsive Vite web application renders flawlessly on mobile viewports with zero dual-codebase maintenance. |
| **Direct Binary Editing of Legacy .DOC** | Vulnerable and complex; handled via a friendly prompt: *"Limited support for legacy .DOC. Please convert to PDF or DOCX."* |

---

## 4. Priority vs. Hackathon Rubric Mapping

| Feature Area | Priority | Primary Rubric Beneficiary | Expected Point Yield |
| :--- | :---: | :--- | :---: |
| Tenant Isolation & Auth | P0 | Technical Architecture (25%) | 25 / 25 |
| Multimodal Extraction & Safety | P0 | AI Utilization (35%) + Healthcare Impact (10%) | 40 / 45 |
| Patient Dashboard & Timeline | P0 | UX & Design (20%) | 18 / 20 |
| Bulk Upload & Job Queue | P0 | Technical Architecture (25%) | Bonus Polish |
| Multilingual (Tamil/Hindi) + Thanglish | P1 | AI Utilization (35%) + Bonus | +5 Bonus |
| Grounded Chat & Voice STT/TTS | P1/P2 | UX (20%) + Demo (10%) | +5 Bonus |
| FHIR R4 Bundle Exporter | P0 | Technical Architecture (25%) + Impact (10%) | 10 / 10 |
