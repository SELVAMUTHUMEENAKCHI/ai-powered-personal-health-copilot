# AI-Powered Personal Health Copilot 🩺✨

> **A Production-Grade, Dual-Role Healthcare Intelligence & Patient Portal Web Application**  
> *Developed for College Hackathon — Built for Real-World Clinical Impact*

---

### 👨‍💻 Project & Author Information
* **Lead Engineer:** **Selva Muthu Meenakchi M**
* **Degree:** B.Tech Information Technology (Batch 2023–2027)
* **Institution:** **Muthayammal Engineering College, Rasipuram**
* **Role:** Lead Full-Stack, AI & Security Architect
* **Team Size:** 3 Members

---

## 🌟 Executive Summary

The **AI-Powered Personal Health Copilot** is a healthcare web platform that bridges the communication gap between complex diagnostic lab reports and everyday patients. Unlike basic medical CRUD apps, it features **deterministic clinical safety rules (zero AI hallucination for lab ranges)**, **strict multi-tenant patient data isolation**, **dual-role workflows (Patient vs. Admin/Physician Review)**, **longitudinal biomarker tracking**, **Ayushman Bharat Digital Mission (ABDM) / HL7 FHIR R4 interoperability**, and **conversational multilingual accessibility** (5 Indian languages + Thanglish + Voice STT/TTS).

---

## 🚀 Key Features & Differentiators

### 1. 🛡️ Strict Multi-Tenant Patient Data Isolation & Role Security
* **Zero Cross-Tenant Leakage:** Enforced by cryptographically signed JWTs stored in `httpOnly`, `SameSite=strict` cookies.
* **Backend Authorization Gateways:** All database queries are scoped to `req.user.patientId`. Patient A (`PT-1001`) can never inspect, query, or mutate Patient B (`PT-1002`) records (verified by automated tests returning HTTP `403 Forbidden`).
* **Dual Roles:**
  * **Patient Role:** Upload diagnostics, view interactive chronological health timeline, review medication schedules, explore analytics, export FHIR records, query Copilot. Patients cannot alter raw clinical report extractions.
  * **Admin / Clinician Role:** Search patient registry, perform fault-tolerant multi-file batch uploads, review extractions with human-in-the-loop editing, and override erroneous lab values. Non-admins calling review APIs receive immediate HTTP `403`.

### 2. 🆔 Sequential Patient Onboarding
* Self-registration automatically assigns deterministic sequential IDs (`PT-1001`, `PT-1002`, `PT-1003`, ...).
* Welcome modal and feedback banner confirm:  
  `"Account created successfully. Your Patient ID is PT-XXXX."`

### 3. 📅 Report Date vs. Upload Date Distinction
* Prevents temporal clinical confusion:
  * **Report Date:** The exact date the diagnostic specimen was collected or reported (printed in the document).
  * **Upload Date:** The audit timestamp when the PDF/image was uploaded to the cloud repository.
* Displayed distinctly on the **Chronological Timeline** and the **Interactive Monthly Health Calendar**.

### 4. 🔬 Zero-Hallucination Deterministic Clinical Range Flagging
* **Hardcoded Clinical Safety Engine:** The AI extraction layer extracts test values and reference intervals, but **does not interpret ranges via statistical LLM guessing**.
* A deterministic TypeScript rules engine strictly evaluates numerical boundaries against printed reference intervals:
  * `HIGH` ($> \text{upper bound}$)
  * `LOW` ($< \text{lower bound}$)
  * `NORMAL` ($\text{lower} \le \text{value} \le \text{upper}$)
  * `UNSPECIFIED` (Qualitative or unprinted bounds)
* Includes mandatory non-diagnostic disclaimers recommending consultation with licensed healthcare providers.

### 5. 🗣️ Multilingual & Voice Accessibility
* **5 Indian Languages:** English, தமிழ் (Tamil), हिन्दी (Hindi), తెలుగు (Telugu), മലയാളം (Malayalam).
* **Conversational Thanglish AI:** Understands mixed Tamil-English phrasing (e.g., *"Enoda fasting blood sugar normal ah?"*) and responds with grounded, culturally empathetic advice.
* **Voice AI:** Integrated browser-native Web Speech API for speech-to-text dictation (Microphone button in global search and Copilot chat) and text-to-speech voice playback.

### 6. 📈 Longitudinal Biomarker Trends (Recharts)
* Visualizes key trends over time: **Fasting Blood Glucose**, **HbA1c**, **Hemoglobin**, and **Blood Pressure**.
* **Integrity Guardrail:** If a patient has fewer than 2 data points for a marker, the analytics engine renders an honest fallback message:  
  `"Not enough historical data to show a trend. Upload more reports to track changes over time."`

### 7. 🇮🇳 ABDM & HL7 FHIR R4 Bundle Interoperability
* Generates standard HL7 FHIR R4 Bundles containing `Patient`, `Observation`, and `DiagnosticReport` resources.
* Simulated **Ayushman Bharat Health Account (ABHA)** Card with 14-digit ABHA ID, PHR address, QR code, and 1-click JSON bundle download.

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               React 18 + Vite Frontend                 │
                    │   Tailwind CSS • Lucide Icons • Recharts • Web Speech  │
                    └───────────────────────────┬────────────────────────────┘
                                                │ REST API (JSON) + httpOnly Cookies
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               Node.js + Express Backend                │
                    │           TypeScript • Zod Validation • JWT            │
                    └───────┬───────────────────┬───────────────────┬────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                 ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
                 │  Auth & RBAC     │ │ Deterministic    │ │ ABDM / FHIR R4   │
                 │  Isolation Guard │ │ Clinical Engine  │ │ Bundle Exporter  │
                 └──────────────────┘ └──────────────────┘ └──────────────────┘
                            │                   │                   │
                            └───────────────────┼───────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │           Database Layer / Document Repository         │
                    │   Patients • Documents • Findings • Chat Logs          │
                    └────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Monorepo** | NPM Workspaces (`shared`, `server`, `client`) |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Node.js, Express, TypeScript, Zod, JWT, Multer |
| **Testing** | Jest, Supertest, ts-jest (56/56 passing tests across 6 suites) |
| **Security** | `httpOnly` Cookies, Magic-Byte File Sniffing, Tenant Scoping |
| **Standards** | HL7 FHIR R4, ABDM (Ayushman Bharat Digital Mission) |

---

## 📂 Repository Structure

```
├── client/                     # Vite + React Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/          # AdminPortal, BulkUploadModal, ReviewScreen
│   │   │   ├── chat/           # CopilotDrawer, MessageBubble, VoiceInput
│   │   │   ├── common/         # Navbar, EmptyState, MetricCard, Toast
│   │   │   ├── patient/        # HealthCalendar, MedicationManager, HealthAnalytics,
│   │   │   │                   # AbhaCard, RemindersList, Timeline, DocumentUpload
│   │   │   └── ui/             # Reusable UI primitives
│   │   ├── context/            # AuthContext (dual login/register, cookie persistence)
│   │   ├── i18n.ts             # 5 Languages (EN, TA, HI, TE, ML)
│   │   ├── services/           # Typed API service clients
│   │   └── App.tsx             # Main Application Entry with Judge Quick Switcher
├── server/                     # Express + TypeScript API Server
│   ├── src/
│   │   ├── ai/                 # Gemini / Fallback Clinical Extraction & Thanglish Copilot
│   │   ├── controllers/        # Auth, Document, Patient, Admin, Chat controllers
│   │   ├── middleware/         # Auth, Role Guard, Magic-Byte File Sniffer, Error Handler
│   │   ├── models/             # In-memory/Mongoose Schemas (Patients, Documents, Users)
│   │   ├── routes/             # REST API Endpoints
│   │   ├── services/           # Deterministic Range Evaluator, FHIR R4 Builder
│   │   └── tests/              # 6 Jest Test Suites (56 automated tests)
├── shared/                     # Shared TypeScript Types & Zod Schemas
│   └── src/                    # Shared interfaces, DTOs, and schemas
└── docs/                       # Project Documentation & Architecture Guides
```

---

## ⚡ Getting Started

### Prerequisites
* Node.js v18.x or v20.x
* npm v9.x or later

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository-url>
   cd "antigravity hackxlrate"
   npm install
   ```

2. **Environment Configuration:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *(Pre-configured with local defaults; optional: add `GEMINI_API_KEY` for live AI inferences)*

3. **Build All Monorepo Packages:**
   ```bash
   npm run build
   ```

4. **Start the Development Servers:**
   ```bash
   npm run dev
   ```
   * Client: `http://localhost:5173`
   * API Server: `http://localhost:5000`

---

## 🧪 Automated Test Suite (56/56 Passing)

To verify the deterministic rules, tenant security isolation, and FHIR export pipelines:

```bash
npm run test:server
```

### Verified Test Suites:
1. `auth.test.ts` — Patient self-registration, sequential `PT-1003` generation, email uniqueness, password reset.
2. `security.test.ts` — Cross-tenant isolation (PT-1001 vs PT-1002), role privilege denial, cookie security.
3. `fhir.test.ts` — ABDM / HL7 FHIR R4 bundle validation, longitudinal trends, calendar date events.
4. `admin.test.ts` — Admin bulk multi-document ingestion, human-in-the-loop clinical review, patient search.
5. `chat.test.ts` — Grounded clinical Copilot responses, Thanglish query comprehension, disclaimer attachment.
6. `pipeline.test.ts` — Deterministic reference range evaluator (`HIGH`/`LOW`/`NORMAL`), magic-byte file validation.

---

## 👥 Demo Personas for Judges

Use the 1-click quick-switcher bar at the top of the login screen or enter manually:

| Persona | Role | Email | Password | Patient ID | Key Demo Highlights |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Admin** | Clinician / Admin | `admin@altrix.health` | `admin123` | N/A | Patient registry search, bulk multi-file upload, human-in-the-loop review. |
| **Ramesh Kumar** | Patient | `ramesh@example.com` | `patient123` | `PT-1001` | Longitudinal HbA1c/Glucose trends, Thanglish Copilot, ABHA FHIR download. |
| **Priya Sharma** | Patient | `priya@example.com` | `patient123` | `PT-1002` | Anemia panel, medication manager, calendar view, tenant isolation check. |
| **New Patient** | Self-Registered | *Sign Up Tab* | *Any Password* | Auto `PT-1003` | Demonstrates sequential ID generation and celebratory modal. |

---

## ⚠️ Medical Safety & Clinical Disclaimer

> **IMPORTANT CLINICAL NOTICE:**  
> The AI-Powered Personal Health Copilot is designed exclusively as an educational and personal health literacy assistant. It does **NOT** provide medical diagnosis, clinical treatment plans, or emergency triage. All test interpretations highlight laboratory reference ranges deterministically without replacing professional medical advice. Patients must consult licensed healthcare professionals for all clinical concerns.
