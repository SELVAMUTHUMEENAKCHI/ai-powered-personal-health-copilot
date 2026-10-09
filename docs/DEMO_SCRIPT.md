# Hackathon Demo Script & Live Presentation Narrative

- **Target Presentation Duration:** 3 to 4 Minutes
- **Primary Audience:** Altrix Labs Hackathon Judges & Clinical Evaluators
- **Scoring Objective:** Maximize 100% of Rubric Points (AI Utilization 35%, Architecture 25%, UX 20%, Healthcare Impact 10%, Presentation 10% + Regional/ABDM Bonus)

---

## 1. Demo Roles & Quick Credentials

| Persona | Email | Password | Context |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@altrix.health` | `AdminPassword123!` | Hospital Clinical Admin / Data Operator |
| **Patient 1 (Chronic Diabetic)** | `ramesh@example.com` | `Password123!` | Patient `PT-1001` (Ramesh Kumar, 42M, multi-year records) |
| **Patient 2 (Tamil Prescription)** | `priya@example.com` | `Password123!` | Patient `PT-1002` (Priya S, 35F, bilingual prescription) |

---

## 2. Timed Presentation Walkthrough (Step-by-Step)

```
0:00 - 0:30  ─── Hook & The Real-World Healthcare Challenge
0:30 - 1:15  ─── Admin Bulk Ingestion, Modular AI Pipeline & Review
1:15 - 2:00  ─── Patient Experience: Dashboard, Health Summary & Safety
2:00 - 2:45  ─── Multilingual Regional UX & Grounded Voice Copilot
2:45 - 3:15  ─── Longitudinal Trends, Calendar & FHIR R4 Exporter
3:15 - 3:30  ─── Technical Summary, Security Guardrails & Wrap-Up
```

---

### Segment 1: The Hook & The Problem (0:00 – 0:30)
**Presenter Speaking:**
> *"Good morning judges. In India today, over 80% of healthcare interactions still rely on loose paper files, faded thermal bills, and bilingual doctor prescriptions. When a patient receives a pathology report showing 'HbA1c 8.2%' or 'SGPT 58', they face confusion, medical jargon, and panic.*
> 
> *Today, we present the **AI-Powered Personal Health Copilot**—a production-grade, privacy-first platform that transforms fragmented paper reports into an intelligent, plain-language health timeline. Built with end-to-end TypeScript, MongoDB GridFS, Google Gemini 2.5 Flash, and an HL7 FHIR R4 architecture, our copilot is deterministic where it matters, and empathetic where it counts."*

---

### Segment 2: Admin Portal & Resilient Bulk Ingestion (0:30 – 1:15)
**Screen Action:**
1. Open web app, click **"Quick Login: Admin"** button.
2. Land on **Admin Dashboard**. Point to the instant patient directory.
3. Click **"Bulk Ingest Records"**.
4. Drag and drop 3 synthetic files:
   - `PT-1001_blood_report_sept.pdf`
   - `PT-1002_rx_tamil_english.jpg` (Bilingual prescription)
   - `PT-9999_corrupt_unregistered.pdf` (Deliberate test file to prove error handling)
5. Hit **"Start Processing Batch"**.

**Presenter Speaking:**
> *"Let's look at the administrative perspective. Clinics often need to digitize decades of legacy paperwork. Our bulk upload pipeline uses an asynchronous job queue with SHA-256 duplicate detection.*
> 
> *Notice what happens in real time: File 1 and File 2 progress through **Queued → OCR Processing → Extracting → Validating → Completed**. File 3 fails gracefully because patient PT-9999 is unregistered. Notice that a single bad file never halts the batch—the system isolates failures and displays precise error reasons.*
> 
> *Clicking into the bilingual prescription for Patient PT-1002, our multimodal Gemini pipeline has accurately extracted medicine names, dosages, and Tamil instructions ('ஒரு நாளைக்கு 3 முறை' = Thrice daily) into structured JSON without hallucinating."*

---

### Segment 3: Patient Dashboard, Safety & Deterministic Analysis (1:15 – 2:00)
**Screen Action:**
1. Log out, click **"Quick Login: Patient (Ramesh Kumar - PT-1001)"**.
2. Arrive at **Patient Dashboard**.
3. Highlight **Current Health Summary** widget:
   - *"Based on your available records up to September 28, 2026"*
4. Highlight **Abnormal Findings** callout:
   - *Fasting Blood Sugar: 134 mg/dL (High - Ref: 70-100 mg/dL)*
5. Point to the medical safety disclaimer banner.

**Presenter Speaking:**
> *"Now let's switch to the patient experience. The patient immediately sees their **Current Health Summary**, dynamically anchored to their latest verified document date—September 28, 2026.*
> 
> *Here is our most critical architectural decision: **We never let an LLM determine whether a test is abnormal.** The abnormal flag you see here for Fasting Blood Sugar was computed using deterministic TypeScript code comparing the lab's printed reference range of 70 to 100 mg/dL against the value 134.*
> 
> *The AI's role is strictly limited to translating that fact into compassionate, plain language: 'Your glucose value is above the reference range shown in the report. Please discuss this with a qualified healthcare professional.' Every screen features our non-negotiable medical disclaimer."*

---

### Segment 4: Multilingual Regional UX & Grounded Voice Copilot (2:00 – 2:45)
**Screen Action:**
1. Click the Language Switcher in the top navigation bar and select **"தமிழ் (Tamil)"**.
2. Entire UI switches to Tamil, including the plain-language summary and metric titles.
3. Open the floating **AI Health Copilot** drawer.
4. Click the microphone icon (Web Speech API animation pulses).
5. Speak (or type): *"Enoda sugar level evalo iruku latest report la?"* (Thanglish).
6. Copilot streams an empathetic response in Tamil, citing the exact document date and lab value.

**Presenter Speaking:**
> *"Healthcare in India cannot be English-only. With one click, our entire UI transforms into Tamil, Hindi, Telugu, or Malayalam. Even more powerful: our Copilot understands colloquial 'Thanglish'.*
> 
> *When the patient asks in Thanglish about their sugar level, our backend assembles context **strictly from Ramesh's authenticated records**—cross-patient data is physically impossible to access due to our tenant isolation middleware. The copilot replies in Tamil, quoting the exact report date and reading, and reminds the patient to consult their doctor."*

---

### Segment 5: Trends, Calendar & ABDM / FHIR Interoperability (2:45 – 3:15)
**Screen Action:**
1. Navigate to **"Lab Trends"** tab.
2. Show Recharts visualization for Fasting Blood Sugar over 3 visits, showing normal reference band in green and abnormal data points in amber/red.
3. Scroll to Serum Creatinine: show the fallback message: *"Not enough historical data to show a trend"* (only 1 data point).
4. Click **"Mock ABHA ID & FHIR Export"**.
5. Show mock ABHA ID badge (`91-8472-1923-0192 - Verified`).
6. Click **"Generate FHIR R4 Bundle"**; show clean, schema-valid JSON bundle.

**Presenter Speaking:**
> *"Patients also need longitudinal insight. Our Recharts trends plot blood markers across time with healthy reference bands. If fewer than two tests exist, the system honestly states 'Not enough historical data to show a trend'—we never fabricate data.*
> 
> *Finally, India is transitioning to the Ayushman Bharat Digital Mission. Our data model is built natively on FHIR R4. With one click, the patient can export their entire medical history as an ABDM-compliant FHIR Bundle containing Observations, MedicationStatements, and DiagnosticReports."*

---

### Segment 6: Architectural Summary & Closing Hook (3:15 – 3:30)
**Presenter Speaking:**
> *"In summary, the AI-Powered Personal Health Copilot delivers:
> 1. High-accuracy multimodal extraction with Tesseract fallback.
> 2. Zero-hallucination deterministic safety checks.
> 3. Verified patient tenant isolation tested against cross-tenant attacks.
> 4. Inclusive regional language and voice accessibility.
> 5. Ready for India's digital health future today.
> 
> Thank you, judges. We welcome your questions."*

---

## 3. Anticipated Judge Questions & Bulletproof Answers

| Anticipated Question | Architectural Defense / Answer |
| :--- | :--- |
| **"What if the LLM hallucinates an incorrect normal/abnormal flag?"** | *"It is architecturally impossible. Our LLM extracts the printed numbers and text. Our deterministic code evaluator calculates `value > ref_high`. The LLM only receives the computed result to generate a conversational explanation."* |
| **"How do you prevent Patient A from seeing Patient B's records?"** | *"Patient isolation is enforced at the backend middleware level. Every database query filters by `req.user.patientId` extracted from signed, httpOnly JWT cookies. Even if someone tampers with the URL or payload, our server rejects it with a 403 Forbidden. We have automated tests verifying this."* |
| **"How does the system handle poor-quality or handwritten prescriptions?"** | *"Gemini 2.5 Flash Multimodal Vision excels at messy medical cursive. Furthermore, each extracted entity carries a confidence score (`high` vs `low`). Low-confidence fields are flagged for admin human-in-the-loop review."* |
| **"What if Gemini API is rate-limited or offline?"** | *"Our architecture uses an `OcrProvider` interface. If Gemini is unavailable, the pipeline automatically falls back to an in-process Tesseract.js engine, ensuring zero data loss and continuous queue operation."* |
