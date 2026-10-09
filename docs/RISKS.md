# Risk Management & Mitigation Strategy

This document identifies potential technical, clinical, security, and timeline risks for the AI-Powered Personal Health Copilot, along with concrete, architectural mitigation controls.

---

## 1. Risk Matrix Overview

```
High Impact   │  [R-02: Safety / Advice]    [R-01: AI Hallucination]
              │  [R-04: Tenant Isolation]   [R-03: Rate Limits & Latency]
Medium Impact │  [R-05: Handwritten OCR]    [R-07: Scope Creep]
              │  [R-06: Browser Voice API]  [R-08: GridFS Streaming]
Low Impact    │  
              └───────────────────────────────────────────────────────────
                 Low Likelihood             Medium Likelihood         High Likelihood
```

---

## 2. Detailed Risk Analysis & Architectural Controls

### Risk 01: AI Hallucination of Diagnoses or Medications
- **Severity:** CRITICAL | **Likelihood:** MEDIUM
- **Description:** An LLM might generate assumed conditions (e.g., claiming a patient has "Chronic Kidney Disease" simply because a routine creatinine test was ordered) or fabricate medicine dosages.
- **Architectural Mitigations:**
  1. **Strict Zero-Hallucination Prompting:** Prompt explicitly states: *"Extract diagnoses ONLY if explicitly written under 'Diagnosis:' or 'Impression:'. Do NOT infer or predict medical conditions. If unmentioned, return an empty array []. Missing fields must be null or 'Not available'."*
  2. **Zod Runtime Type Enforcement:** All LLM outputs pass through a strict Zod parser. Any unexpected keys, non-null values for absent data, or schema deviations immediately trigger sanitization.
  3. **Explicit Diagnosis Tagging in UI:** Diagnoses are labeled in the UI as *"Diagnosis mentioned in uploaded document"*, clarifying that the AI is only transcribing the doctor's written words.

---

### Risk 02: Clinical Safety & Patient Misinterpretation
- **Severity:** CRITICAL | **Likelihood:** LOW
- **Description:** A patient might perceive AI-generated summaries as authoritative clinical advice and delay seeing a physician or alter their medication dosage.
- **Architectural Mitigations:**
  1. **Deterministic Abnormal Detection:** Pure mathematical code evaluation (`value > high` or `value < low`). The LLM is NEVER allowed to categorize a test as normal or abnormal.
  2. **Strict Guardrail Templates:** Explanations adhere to safe formulaic wording: *"Your glucose value is above the reference range shown in the report. Please discuss this with a qualified healthcare professional."*
  3. **Universal Medical Disclaimer:** A non-dismissible, persistent medical disclaimer appears across every dashboard, report modal, and chat response: *"This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice."*

---

### Risk 03: Gemini API Rate Limits, Outages, or High Latency
- **Severity:** HIGH | **Likelihood:** MEDIUM
- **Description:** During live hackathon evaluation or bulk processing, the Gemini API might return HTTP 429 (Rate Limited) or experience latency spikes.
- **Architectural Mitigations:**
  1. **Swappable Interface Abstraction (`OcrProvider`):** The pipeline decouples OCR from the LLM. If Gemini fails or times out, the system automatically falls back to an in-process `Tesseract.js` engine.
  2. **Asynchronous Job Queue & Polling:** Uploads are queued immediately with HTTP 202. The client polls `/api/documents/jobs/:jobId`, preventing HTTP request timeouts on large PDFs.
  3. **Retry with Exponential Backoff:** Built-in 3-tier exponential retry logic for transient network failures.

---

### Risk 04: Cross-Patient Data Leakage (Tenant Isolation Failure)
- **Severity:** CRITICAL | **Likelihood:** LOW
- **Description:** A malicious user or programming bug could allow Patient A (`PT-1001`) to access Patient B's (`PT-1002`) lab reports or chat history.
- **Architectural Mitigations:**
  1. **Backend-Enforced Scoping:** Middleware reads `patientId` exclusively from signed `httpOnly` JWT cookies. Any `patientId` passed in the URL or request body is verified against the authenticated user.
  2. **Automated Security Regression Suite:** Pre-commit tests simulate cross-tenant access attempts and verify that `403 Forbidden` is returned for all cross-tenant attempts.
  3. **No Database Queries Without Tenant Scope:** In Mongoose models, patient queries always include `{ patientId: req.scopedPatientId }`.

---

### Risk 05: Handwritten & Low-Quality Prescription OCR Inaccuracies
- **Severity:** MEDIUM | **Likelihood:** HIGH
- **Description:** Illegible doctor handwriting or blurred camera photos may result in ambiguous medicine names or incorrect dosage extraction.
- **Architectural Mitigations:**
  1. **Multimodal Vision Model:** Google Gemini 2.5 Flash possesses state-of-the-art vision understanding for messy cursive compared to traditional text-only OCR.
  2. **Confidence Scoring:** The extraction pipeline assigns a `confidence: 'high' | 'low'` flag to each medicine and test.
  3. **Admin Review Screen:** Records containing low-confidence extractions are flagged for human-in-the-loop verification on the Admin Review page.

---

### Risk 06: Browser Speech API (STT / TTS) Incompatibility
- **Severity:** MEDIUM | **Likelihood:** MEDIUM
- **Description:** The browser Web Speech API varies across operating systems and browsers (e.g., Safari on iOS vs. Chrome on Android), and some regional voices (like Malayalam) may not be installed on the client machine.
- **Architectural Mitigations:**
  1. **Feature Detection & Graceful Fallback:** The voice module checks `window.SpeechRecognition` and `window.speechSynthesis`. If unsupported, the microphone button displays a friendly tooltip and degrades gracefully to standard text chat.
  2. **Language Availability Check:** If the selected language voice is missing, the system displays a clear toast notification: *"Voice readout is not supported for this language in your browser. Displaying text response."*

---

### Risk 07: Hackathon Scope Creep & Integration Bottlenecks
- **Severity:** HIGH | **Likelihood:** MEDIUM
- **Description:** Attempting to build real ABDM OAuth integration, real doctor booking, or payment gateways could consume excessive student development time, resulting in an unfinished demo.
- **Architectural Mitigations:**
  1. **Disciplined Phase-by-Phase Plan:** Implementation strictly adheres to `PHASES.md` (Phase 1 through Phase 7). No phase begins before the previous phase is tested and approved.
  2. **Explicit Anti-Scope Enforcement:** ABDM is strictly implemented as a mock ABHA verification badge and an HL7 FHIR R4 Bundle exporter (`toFhirBundle`). Real government gateways are firmly excluded.
  3. **Synthetic Seed Data:** Realistic synthetic datasets (`PT-1001`, `PT-1002`, `PT-1003`) are prepared early, decoupling demo readiness from live upload dependencies.

---

### Risk 08: GridFS Streaming & Storage Latency
- **Severity:** LOW | **Likelihood:** LOW
- **Description:** Storing 50MB PDFs in MongoDB GridFS could lead to memory bloat or streaming latency if buffers are kept in RAM.
- **Architectural Mitigations:**
  1. **Stream-Based Ingestion:** Uploaded files are piped directly via Node.js streams into GridFS without holding full buffers in memory.
  2. **Size Guards:** Strict 50MB file size limit enforced at the Multer middleware level.
