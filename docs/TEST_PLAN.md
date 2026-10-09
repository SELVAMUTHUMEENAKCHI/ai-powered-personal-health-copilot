# Comprehensive Quality Assurance & Test Plan

Reliability, tenant privacy, and medical safety are foundational to the AI-Powered Personal Health Copilot. This test plan defines our automated and manual verification gates across security, AI extraction accuracy, ingestion robustness, and user experience.

---

## 1. Test Suite Summary Matrix

| Category | Tooling | Focus | Target Coverage / Pass Bar |
| :--- | :--- | :--- | :--- |
| **Security & Tenant Isolation** | Jest / Supertest | Cross-patient boundary denial, Admin RBAC protection | 100% Pass (Zero tolerance for leakage) |
| **Deterministic Clinical Logic** | Jest Unit Tests | Test value vs. reference range mathematical evaluation | 100% Branch Coverage |
| **AI Extraction & Zod Schema** | Jest Integration | Missing data handling, JSON structure, no hallucination | 100% Validated by Zod |
| **File Ingestion & Magic-Bytes** | Supertest / Multer | MIME spoofing, corrupt PDFs, large files, duplicate hashes | 100% Pass |
| **ABDM / FHIR R4 Compliance** | FHIR Schema Validator | Bundle structure, resource types, valid identifiers | 100% FHIR R4 Schema Valid |
| **Frontend UI & States** | Manual / Playwright | Design tokens, empty/loading/error states, i18n, dark mode | Complete visual verification |

---

## 2. Security & Tenant Isolation Test Plan

### Test Case SEC-01: Cross-Patient Data Access Denial
- **Objective:** Verify that an authenticated patient cannot read medical records belonging to another patient.
- **Preconditions:**
  - Patient A (`PT-1001`) is authenticated with valid JWT cookie.
  - Patient B (`PT-1002`) has documents and observations in the database.
- **Action:**
  - Patient A issues `GET /api/patients/PT-1002/summary`.
  - Patient A issues `GET /api/documents?patientId=PT-1002`.
  - Patient A issues `GET /api/documents/DOC-PT1002-001`.
- **Expected Result:**
  - Status `403 Forbidden` returned with error code `TENANT_ISOLATION_VIOLATION`.
  - Zero sensitive metadata or clinical data returned in body.

### Test Case SEC-02: Patient Calling Admin-Only Endpoints
- **Objective:** Verify that a standard patient account cannot invoke administrative routes.
- **Preconditions:** Patient A (`PT-1001`, `role: 'patient'`) is logged in.
- **Action:**
  - Patient A issues `GET /api/patients` (Admin patient directory).
  - Patient A issues `POST /api/documents/bulk-upload`.
  - Patient A issues `PATCH /api/documents/DOC-001/review`.
- **Expected Result:**
  - Status `403 Forbidden` returned for all attempts.
  - Log entry recorded: unauthorized privilege escalation attempt (no PHI logged).

### Test Case SEC-03: Patient Upload Isolation Bypass Attempt
- **Objective:** Ensure patient upload endpoint cannot be tricked into saving documents for another patient via spoofed request body.
- **Preconditions:** Patient A (`PT-1001`) is logged in.
- **Action:** Patient A uploads a file with `multipart/form-data` containing `patientId: "PT-1002"`.
- **Expected Result:**
  - The server ignores the body field `patientId` and strictly assigns `patientId = req.user.patientId` (`PT-1001`).
  - Stored document record has `patientId: "PT-1001"`.

---

## 3. AI Extraction & Deterministic Logic Test Plan

### Test Case AI-01: Deterministic Test Range Evaluation
- **Objective:** Verify mathematical range evaluation without LLM involvement.
- **Inputs & Expected Outputs:**
  | Test Name | Numeric Value | Ref Low | Ref High | Expected Interpretation |
  | :--- | :---: | :---: | :---: | :---: |
  | Fasting Glucose | 126 | 70 | 100 | `HIGH` |
  | Fasting Glucose | 65 | 70 | 100 | `LOW` |
  | Fasting Glucose | 88 | 70 | 100 | `NORMAL` |
  | Serum Creatinine | 1.1 | 0.7 | 1.3 | `NORMAL` |
  | Urine Albumin | "Trace" | null | null | `UNSPECIFIED` (No range -> Do NOT flag) |
  | Blood Pressure | "120/80" | null | null | `UNSPECIFIED` |

### Test Case AI-02: Missing Data & Zero Hallucination
- **Objective:** Ensure unmentioned parameters are recorded as `null` or `"Not available"` and never invented.
- **Input:** Lab report containing only CBC (Complete Blood Count) with no diagnoses or medications written.
- **Expected Output:**
  - `medicines`: `[]` (empty array, not guessed vitamins or antibiotics).
  - `explicitDiagnoses`: `[]` (empty array, not assumed anemia).
  - `reportDate`: Extracted ISO date or `null`.

### Test Case AI-03: Bilingual Prescription Extraction (Tamil + English)
- **Objective:** Validate multimodal vision extraction on a prescription containing mixed Tamil and English handwriting/text.
- **Input:** Sample prescription image with *"Paracetamol 650mg - ஒரு நாளைக்கு 3 முறை (Thrice daily) for 5 days"*.
- **Expected Output:**
  - `name`: `"Paracetamol"`
  - `dosage`: `"650mg"`
  - `frequency`: `"Thrice daily"` (or translated English equivalent with Tamil captured)
  - `duration`: `"5 days"`
  - `confidence`: `"high"`

### Test Case AI-04: Medical Safety & Non-Diagnostic Language
- **Objective:** Ensure AI summaries never claim a clinical diagnosis or prescribe treatments.
- **Negative Assertions:**
  - Generated summary must NOT contain phrases like *"You have diabetes"*, *"You are diagnosed with"*, *"Take this medication"*.
- **Positive Assertions:**
  - Generated summary must contain phrases like *"Your glucose value is above the reference range shown in the report. Please discuss this with a qualified healthcare professional."*
  - Generated summary must include the mandatory medical disclaimer.

---

## 4. Ingestion & File Validation Test Plan

### Test Case ING-01: Magic-Byte vs. File Extension Mismatch (MIME Spoofing)
- **Objective:** Prevent malicious executables disguised as documents.
- **Action:** Rename `malicious_script.exe` to `report.pdf` and attempt upload.
- **Expected Result:**
  - Server inspects file magic bytes (buffer header).
  - Upload rejected immediately with `415 Unsupported Media Type` before saving or passing to OCR.

### Test Case ING-02: Duplicate File Hash Detection (SHA-256)
- **Objective:** Prevent redundant processing costs and duplicate timeline clutter.
- **Action:** Upload the exact same file twice for Patient `PT-1001`.
- **Expected Result:**
  - Second upload identifies matching SHA-256 hash in GridFS/Document records.
  - Returns friendly notification referencing existing document: *"This document has already been processed and is in your timeline."*

### Test Case ING-03: Resilient Bulk Upload Queue Processing
- **Objective:** Ensure one corrupt file does not halt the entire batch.
- **Action:** Admin uploads a 3-file batch:
  1. `PT-1001_blood_report.pdf` (Valid)
  2. `PT-9999_unknown_patient.pdf` (Invalid patient ID)
  3. `PT-1002_prescription.jpg` (Valid)
- **Expected Result:**
  - File 1 processes to `Completed`.
  - File 2 fails with status `Failed` and reason `"Patient PT-9999 does not exist in registry."`.
  - File 3 processes to `Completed`.
  - Batch job totals: `{ total: 3, success: 2, failed: 1, processing: 0 }`.

---

## 5. ABDM / FHIR R4 Bundle Validation Test Plan

### Test Case FHIR-01: Bundle Schema Integrity
- **Objective:** Validate that `/api/patients/:id/fhir-bundle` produces schema-valid FHIR R4 JSON.
- **Verification Checks:**
  - `resourceType`: Must be `"Bundle"`.
  - `type`: Must be `"collection"`.
  - Contains valid `Patient` resource with identifier system `"https://healthid.ndhm.gov.in"`.
  - Contains valid `Observation` resources with code, effectiveDateTime, valueQuantity, and referenceRange.
  - Contains valid `MedicationStatement` resources with dosage and status.

---

## 6. Frontend UX & User Acceptance Criteria

| Screen / Flow | Acceptance Criteria |
| :--- | :--- |
| **Login Flow** | • Admin login redirects to `/admin` dashboard.<br>• Patient login redirects to `/dashboard`.<br>• Fast demo switch buttons for both roles. |
| **Current Health Summary** | • Displays *"Based on your available records up to <date>"* when records exist.<br>• Displays *"No medical records available yet. Upload your first document to get started."* when empty.<br>• Displays prominent medical disclaimer banner. |
| **Health Timeline** | • Reverse chronological order.<br>• Clear visual badges for Lab Report vs. Prescription.<br>• Clicking item opens split-view modal showing source file and extracted parameters. |
| **Longitudinal Trends** | • Renders clean line chart when >= 2 data points exist.<br>• Displays exact string *"Not enough historical data to show a trend"* when < 2 data points exist. |
| **Multilingual Switch** | • Switching to Tamil changes all UI labels and prompts AI summary in Tamil.<br>• Switching to Hindi renders Devanagari labels flawlessly. |
| **Voice Interface** | • Microphone button triggers browser STT with pulse animation.<br>• TTS reads out summary with pause/stop control.<br>• Graceful warning displayed if browser speech synthesis is unavailable. |
| **Theme Persistence** | • Default is light theme.<br>• Toggling to dark mode persists across browser refresh (stored in `localStorage`). |
