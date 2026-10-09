# AI-Powered Personal Health Copilot — Project Understanding & Architecture Brief

## 1. Hackathon Context & Vision
- **Event:** Altrix Labs Hackathon (Round 1)
- **Project Title:** AI-Powered Personal Health Copilot
- **Target Persona:** 
  - **Patients:** Everyday citizens managing chronic conditions, families tracking multi-year paper prescriptions, lab reports, and discharge summaries.
  - **Healthcare Administrators / Doctors:** Clinics and hospital staff reviewing patient histories, bulk-digitizing legacy paper files, and verifying AI-extracted clinical records.
- **Team Composition:** 3 Student Engineers
  - Member 1: Frontend & UX Architect
  - Member 2: Backend & Database Architect
  - Member 3: AI & OCR Pipeline Engineer

---

## 2. Core Problem Statement
In India and emerging healthcare ecosystems:
1. **Fragmented & Paper-Heavy Records:** Patients carry loose paper files, faded thermal receipts, handwritten doctor prescriptions, and multi-page pathology PDFs across fragmented providers.
2. **Medical Jargon & Fear:** Patients receive lab reports with acronyms (e.g., HbA1c, SGPT, eGFR) and cannot discern what is benign vs. what requires timely medical consultation.
3. **Linguistic Barriers:** Most diagnostic reports and medical notes are in English, while millions of patients understand only regional languages (Tamil, Hindi, Telugu, Malayalam) or colloquial mixtures like "Thanglish".
4. **Lack of Continuity & Trend Awareness:** Isolated reports do not reveal longitudinal health trends (e.g., fasting glucose creeping from 98 to 142 mg/dL over 18 months).
5. **National Digital Health Ecosystem Gap:** India is transitioning to the Ayushman Bharat Digital Mission (ABDM) and FHIR standards, but existing paper records are disconnected from this future.

---

## 3. Product Value Proposition
The **AI-Powered Personal Health Copilot** transforms unstructured, bilingual, and handwritten health documents into a secure, structured, timeline-driven personal health assistant.

### Key Pillars:
1. **Multimodal Extraction with Strict Safeguards:**
   - Ingestion of PDF, DOCX, JPG, PNG reports.
   - Provider abstraction: Google Gemini 2.5/Flash multimodal engine for bilingual/handwritten nuance, with local Tesseract.js fallback.
   - Zero hallucination: Missing data is tagged `null` or `"Not available"`. The model never invents diagnoses or medications.
2. **Deterministic Code-Based Safety:**
   - Abnormal test result detection is **never entrusted to an LLM**. Deterministic business logic compares numeric values directly against the report's printed reference intervals.
   - The LLM only generates plain-language, empathetic contextual explanations and translations.
   - Prominent, legally grounded medical disclaimers on every view ("*This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice.*").
3. **Bank-Grade Tenant Isolation:**
   - Strict patient data isolation: Patient queries automatically filter by authenticated `patientId` embedded in httpOnly JWT cookies.
   - Role-based access control (`admin` vs `patient`).
   - Automated test suite validating cross-patient boundary protection.
4. **ABDM / FHIR R4 Ready Architecture:**
   - Internal schema structured around FHIR resources (`Patient`, `Observation`, `DiagnosticReport`, `MedicationStatement`, `Condition`, `Encounter`).
   - One-click `toFhirBundle(patientId)` export to demonstrate national health stack readiness.
5. **Inclusive Regional UX:**
   - Multilingual interface and plain-language summaries (English, Tamil, Hindi, Telugu, Malayalam).
   - Thanglish query comprehension in grounded AI chat.
   - Browser Web Speech API for voice interactions with graceful degradation.

---

## 4. Hackathon Scoring Rubric Alignment

| Scoring Dimension | Weight | Our Solution Strategy |
| :--- | :---: | :--- |
| **AI Utilization** | **35%** | • Modular AI pipeline with swappable interfaces (`OcrProvider`, `LlmProvider`).<br>• High-accuracy multimodal extraction for bilingual & handwritten prescriptions.<br>• Plain-language summaries grounded strictly in user records.<br>• Deterministic test range evaluation paired with contextual AI explanations. |
| **Technical Architecture** | **25%** | • Clean TypeScript end-to-end (Node.js, Express, React, Vite).<br>• MongoDB Atlas with GridFS for durable file storage (no ephemeral disk reliance).<br>• In-process asynchronous job queue for resilient bulk uploads.<br>• FHIR R4 compliant schema with real-time Bundle exporter. |
| **UX & Product Polish** | **20%** | • Modern healthcare design system: calm teal/slate aesthetic, dark/light theme persistence.<br>• Interactive timeline, Recharts trend visualization, and calendar view.<br>• Comprehensive UI states: specific empty, loading, processing, and error screens.<br>• Accessibility (a11y) standards, keyboard navigation, and responsive layout. |
| **Healthcare Impact & Safety** | **10%** | • Clear medical boundaries: descriptive observations, never prescribing or diagnosing.<br>• Prominent medical disclaimers and advice to consult healthcare professionals.<br>• Direct empowerment of non-English-speaking patients in rural and tier-2/3 regions. |
| **Demo Execution** | **10%** | • Crisp, rehearsed 3-minute storyline contrasting Admin bulk upload and Patient PT-1001 journey.<br>• Live processing of real-world synthetic bilingual prescription and lab report.<br>• Demonstrable FHIR export and grounded AI chat. |
| **Bonus Criteria** | **Bonus** | • Regional language summaries (Tamil, Hindi, etc.) + Thanglish support.<br>• Handwritten/bilingual OCR processing.<br>• Mock ABHA ID linking, verification badge, and sync status. |

---

## 5. Architectural Principles & Non-Negotiables
1. **Single Language Advantage:** 100% TypeScript across frontend and backend for shared interfaces, validation types, and runtime safety.
2. **Strict Privacy by Design:** 
   - No clinical PHI or sensitive keys logged to `stdout` or console.
   - Synthetic patient identities only (`PT-1001`, `PT-1002`, `PT-1003`).
   - Patient upload endpoints auto-inject `patientId` from verified JWT claims.
3. **Resilience over Monoliths:** 
   - Bulk upload failures are isolated per-file; one corrupt file never halts a batch.
   - AI and OCR services are isolated behind clean abstraction layers.
4. **Deterministic Over Generative for Critical Logic:**
   - Lab values: Deterministic code comparisons against numerical intervals.
   - Dates: Strict ISO 8601 normalization.
   - Medicines: Deduplicated name, dosage, frequency, and duration entities.
