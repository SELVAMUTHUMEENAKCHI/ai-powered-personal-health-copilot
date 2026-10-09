# System & Technical Architecture Specification

## 1. High-Level System Architecture

The AI-Powered Personal Health Copilot employs a decoupled, modular client-server architecture built entirely with TypeScript to guarantee end-to-end type safety. The client is a responsive Single Page Application (SPA), while the backend is an Express-based REST API enforcing strict isolation, asynchronous processing, and modular AI integrations.

```mermaid
graph TB
    subgraph "Client Tier (React + Vite + TypeScript)"
        UI_Patient["Patient Portal<br/>(Dashboard, Timeline, Chat)"]
        UI_Admin["Admin Portal<br/>(Search, Bulk Upload, Review)"]
        State_Auth["Auth State & Cookies<br/>(httpOnly JWT)"]
        Voice_Subsystem["Web Speech API<br/>(Browser STT / TTS)"]
        i18n_Subsystem["i18next Engine<br/>(EN, TA, HI, TE, ML)"]
    end

    subgraph "API Gateway & Security Layer (Express + Node.js)"
        CORS["CORS & Helmet Security"]
        RateLimit["Rate Limiting Middleware"]
        AuthMiddleware["JWT Authentication<br/>(httpOnly Cookie Extractor)"]
        TenantIsolation["Patient Isolation Guard<br/>(Enforces req.user.patientId)"]
        RoleGuard["Role-Based Access Control<br/>(Admin vs. Patient)"]
    end

    subgraph "Core Application Services"
        DocService["Document Management Service"]
        JobQueue["In-Process Asynchronous Job Queue"]
        FHIRService["FHIR R4 Bundle Exporter"]
        ChatService["Grounded Patient Copilot Service"]
    end

    subgraph "Modular AI Pipeline"
        MagicValidator["Magic-Byte & MIME Validator"]
        OCR_Router["OCR Abstraction Layer<br/>(OcrProvider Interface)"]
        GeminiOCR["Gemini 2.5 Flash Vision"]
        TesseractFallback["Tesseract.js Local Fallback"]
        LLM_Router["LLM Abstraction Layer<br/>(LlmProvider Interface)"]
        ZodValidator["Zod Structured Schema Validator"]
        NormEngine["Clinical Normalizer & Unit Standardizer"]
        AbnormalEngine["Deterministic Range Evaluator<br/>(Code Logic Only)"]
        SummaryEngine["Safe Plain-Language Simplifier"]
    end

    subgraph "Data & Persistence Tier"
        GridFS["MongoDB GridFS<br/>(Durable Raw Document Storage)"]
        MongoAtlas["MongoDB Atlas Collections<br/>(FHIR Entities, Jobs, Users)"]
    end

    %% Client to API Connections
    UI_Patient --> CORS
    UI_Admin --> CORS
    CORS --> RateLimit
    RateLimit --> AuthMiddleware
    AuthMiddleware --> TenantIsolation
    TenantIsolation --> RoleGuard

    %% Route to Services
    RoleGuard --> DocService
    RoleGuard --> FHIRService
    RoleGuard --> ChatService
    DocService --> JobQueue

    %% Pipeline Execution
    JobQueue --> MagicValidator
    MagicValidator --> GridFS
    MagicValidator --> OCR_Router
    OCR_Router --> GeminiOCR
    OCR_Router -.-> TesseractFallback
    OCR_Router --> LLM_Router
    LLM_Router --> ZodValidator
    ZodValidator --> NormEngine
    NormEngine --> AbnormalEngine
    AbnormalEngine --> SummaryEngine
    SummaryEngine --> MongoAtlas

    %% Chat Service groundings
    ChatService --> MongoAtlas
    FHIRService --> MongoAtlas
```

---

## 2. End-to-End Medical Document Data Pipeline

The pipeline processes single files or high-volume bulk batches. Each stage is decoupled and executes as a discrete service with structured input/output contracts.

```mermaid
flowchart TD
    A["File Upload (PDF, DOCX, JPG, PNG)"] --> B["File Validation & Hash Calculation<br/>• File signature / Magic-byte check<br/>• SHA-256 duplicate detection<br/>• 50MB size guard"]
    B --> C["GridFS Persistence<br/>• Stream buffer directly to GridFS<br/>• Generate durable storageRef"]
    C --> D["Job Queue Enqueue<br/>• Create UploadJob record<br/>• Status: 'Queued'"]
    
    D --> E["Stage 1: OCR Extraction<br/>• Route to OcrProvider<br/>• Primary: Gemini Multimodal Vision<br/>• Fallback: Tesseract.js (if offline/rate-limited)<br/>• Status: 'OCR Processing'"]
    
    E --> F["Stage 2: Structured Entity Extraction<br/>• Route to LlmProvider<br/>• Strict JSON Schema prompt<br/>• Extract: Dates, Meds, Tests, Diagnoses<br/>• Status: 'Extracting'"]
    
    F --> G["Stage 3: Runtime Schema Validation<br/>• Zod schema validation on JSON<br/>• Strip hallucinations or malformed keys<br/>• Missing data -> null / 'Not available'<br/>• Status: 'Validating'"]
    
    G --> H["Stage 4: Normalization & Deduplication<br/>• Dates -> ISO 8601 YYYY-MM-DD<br/>• Lab units standardization (e.g. mg/dL)<br/>• Medication entity standard format"]
    
    H --> I["Stage 5: Deterministic Abnormal Evaluation<br/>• Pure mathematical comparison: value vs. ref_range<br/>• Flag: NORMAL, HIGH, LOW, or UNSPECIFIED<br/>• NEVER use LLM for abnormal classification"]
    
    I --> J["Stage 6: Clinical Summarization & Safety<br/>• Generate plain-language explanation<br/>• Append strict non-diagnostic disclaimers<br/>• Optional: Regional language translation"]
    
    J --> K["Stage 7: FHIR Resource Generation & Storage<br/>• Update Document record<br/>• Insert Observations, Medications, Diagnoses<br/>• Status: 'Completed'<br/>• Update UploadJob metrics"]

    %% Error Handling
    B -- "Invalid File / Corrupt" --> Err["Mark Job 'Failed'<br/>• Record errorReason<br/>• Do not break bulk batch"]
    E -- "OCR Failure" --> Err
    F -- "Extraction Failure" --> Err
    G -- "Schema Validation Failure" --> Err
```

---

## 3. Database Schema & Entity Relationships (ER Diagram)

The data model uses a FHIR R4-inspired relational-on-document design in MongoDB. Every clinical resource incorporates a `resourceType` property, matching the HL7 FHIR standard while optimizing for fast MongoDB indexing and tenant isolation.

```mermaid
erDiagram
    User ||--o{ Patient : "manages/belongs to"
    Patient ||--o{ Document : "owns"
    Patient ||--o{ Observation : "has"
    Patient ||--o{ DiagnosticReport : "receives"
    Patient ||--o{ MedicationStatement : "prescribed"
    Patient ||--o{ Condition : "diagnosed with"
    Patient ||--o{ Encounter : "attends"
    Patient ||--o{ Reminder : "scheduled for"
    Patient ||--o{ ChatSession : "participates in"
    Document ||--o{ Observation : "derives"
    Document ||--o{ MedicationStatement : "contains"
    Document ||--o{ DiagnosticReport : "manifests as"
    UploadJob ||--o{ Document : "tracks processing of"

    User {
        ObjectId _id PK
        string email UK
        string passwordHash
        string role "admin | patient"
        string patientId "FK to Patient (null for admin)"
        Date createdAt
    }

    Patient {
        ObjectId _id PK
        string patientId UK "e.g. PT-1001"
        string name
        Date dob
        string gender "male | female | other"
        string bloodGroup
        string phone
        string abhaId UK "e.g. 91-8472-1923-0192"
        string abhaStatus "verified | unverified | mock"
        Date lastSync
        Date createdAt
    }

    Document {
        ObjectId _id PK
        string documentId UK
        string patientId FK "Indexed for isolation"
        string patientName
        string fileName
        string fileType "application/pdf | image/png | etc."
        ObjectId storageRef "GridFS file id"
        string fileHash "SHA-256 for duplicate detection"
        Date uploadedAt
        string uploadedBy "User ID"
        string uploadedRole "admin | patient"
        Date reportDate "Extracted or null"
        string documentType "lab_report | prescription | discharge_summary | other"
        string ocrText "Extracted raw text"
        json rawExtraction "Validated Zod structure"
        string aiSummary "Plain-language summary"
        json abnormalFindings "List of abnormal observations"
        string processingStatus "Queued | OCR Processing | Extracting | Validating | Saved | Completed | Failed"
        string errorReason "Null if successful"
        boolean adminReviewed "Review status"
    }

    Observation {
        ObjectId _id PK
        string resourceType "Observation"
        string patientId FK "Indexed for isolation"
        ObjectId documentId FK
        string code "e.g. Glucose Fasting"
        float value
        string unit "e.g. mg/dL"
        float referenceLow
        float referenceHigh
        string interpretation "NORMAL | HIGH | LOW | UNSPECIFIED"
        string plainLanguageNote "Layman explanation"
        Date effectiveDateTime "Report date"
        Date issued "Upload date"
    }

    DiagnosticReport {
        ObjectId _id PK
        string resourceType "DiagnosticReport"
        string patientId FK
        ObjectId documentId FK
        string code "e.g. Comprehensive Metabolic Panel"
        string status "final"
        Date effectiveDateTime
        array result "Array of Observation ObjectIds"
        string conclusion "Plain-language overall impression"
    }

    MedicationStatement {
        ObjectId _id PK
        string resourceType "MedicationStatement"
        string patientId FK
        ObjectId documentId FK
        string medicationName
        string dosage "e.g. 500mg"
        string frequency "e.g. Twice daily after meals"
        string duration "e.g. 10 days"
        Date startDate
        Date endDate
        string status "active | completed | stopped | unknown"
        string confidence "high | low"
    }

    Condition {
        ObjectId _id PK
        string resourceType "Condition"
        string patientId FK
        ObjectId documentId FK
        string code "Diagnosis text strictly from report"
        string clinicalStatus "active | resolved | remission"
        Date recordedDate
        string note "Explicit diagnosis mentioned in doc"
    }

    Encounter {
        ObjectId _id PK
        string resourceType "Encounter"
        string patientId FK
        ObjectId documentId FK
        string serviceProvider "Clinic / Hospital Name"
        string doctorName
        Date periodStart
        Date periodEnd
        string reasonCode
    }

    UploadJob {
        ObjectId _id PK
        string jobId UK
        string batchName
        string uploadedBy FK
        int totalFiles
        int processedFiles
        int successCount
        int failedCount
        string status "queued | in_progress | completed | failed"
        json fileStatuses "Array of per-file state and errors"
        Date createdAt
        Date updatedAt
    }

    Reminder {
        ObjectId _id PK
        string patientId FK
        string title
        string reminderType "medication | follow_up | lab_test | appointment"
        Date dueDate
        string frequency "once | daily | weekly"
        boolean isCompleted
        Date createdAt
    }

    ChatSession {
        ObjectId _id PK
        string patientId FK
        string title
        array messages "Array of { sender, message, language, timestamp }"
        Date createdAt
        Date updatedAt
    }
```

---

## 4. Key Design Patterns & Technical Specifications

### 4.1 Swappable AI & OCR Provider Abstraction
To prevent tight coupling to any proprietary LLM or OCR API, the extraction engine operates strictly against TypeScript interfaces:

```typescript
// Core abstraction interfaces
export interface OcrResult {
  rawText: string;
  confidence: number;
  detectedLanguage?: string;
  isHandwritten?: boolean;
}

export interface OcrProvider {
  name: string;
  extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}

export interface MedicalEntityExtraction {
  patientName: string | null;
  patientIdHint: string | null;
  reportDate: string | null; // ISO 8601 YYYY-MM-DD
  documentType: 'lab_report' | 'prescription' | 'discharge_summary' | 'other';
  medicines: Array<{
    name: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
    confidence: 'high' | 'low';
  }>;
  tests: Array<{
    name: string;
    value: number | string;
    unit: string | null;
    referenceRange: {
      low: number | null;
      high: number | null;
      rawText: string | null;
    } | null;
  }>;
  explicitDiagnoses: string[];
  clinicalImpression: string | null;
}

export interface LlmProvider {
  name: string;
  extractEntities(ocrText: string, imageBuffer?: Buffer): Promise<MedicalEntityExtraction>;
  generatePlainSummary(extraction: MedicalEntityExtraction, language: string): Promise<string>;
  answerPatientQuery(context: string, query: string, language: string): Promise<string>;
}
```

### 4.2 Deterministic Abnormal Test Evaluation Logic
To ensure patient safety and eliminate LLM hallucination in clinical classification, test evaluation runs strictly as deterministic TypeScript code:

```typescript
export type Interpretation = 'NORMAL' | 'HIGH' | 'LOW' | 'UNSPECIFIED';

export function evaluateTestValue(
  value: number | string,
  referenceRange?: { low: number | null; high: number | null } | null
): Interpretation {
  if (!referenceRange || (referenceRange.low === null && referenceRange.high === null)) {
    return 'UNSPECIFIED'; // Do NOT flag without a report-printed reference interval
  }

  const numVal = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numVal)) {
    return 'UNSPECIFIED';
  }

  if (referenceRange.low !== null && numVal < referenceRange.low) {
    return 'LOW';
  }
  if (referenceRange.high !== null && numVal > referenceRange.high) {
    return 'HIGH';
  }

  return 'NORMAL';
}
```

### 4.3 FHIR R4 Bundle Exporter (`toFhirBundle`)
ABDM compliance is achieved through an internal resource mapper that formats patient records into an HL7 FHIR R4 JSON Bundle (`type: 'collection'`):

```typescript
export async function toFhirBundle(patientId: string): Promise<FhirBundle> {
  const patient = await PatientModel.findOne({ patientId });
  const observations = await ObservationModel.find({ patientId });
  const medications = await MedicationStatementModel.find({ patientId });
  const reports = await DiagnosticReportModel.find({ patientId });

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      { resource: mapToFhirPatient(patient) },
      ...observations.map(obs => ({ resource: mapToFhirObservation(obs) })),
      ...medications.map(med => ({ resource: mapToFhirMedicationStatement(med) })),
      ...reports.map(rep => ({ resource: mapToFhirDiagnosticReport(rep) })),
    ],
  };
}
```

### 4.4 Tenant Isolation & Security Architecture
1. **Authentication:** 
   - Handled via signed JSON Web Tokens (JWT) containing `{ userId, role, patientId }`.
   - Delivered exclusively in `httpOnly`, `secure`, `sameSite: 'strict'` HTTP cookies to eliminate XSS token theft.
2. **Tenant Isolation Middleware:**
   - Any endpoint with a `:patientId` parameter or patient-facing resource route injects a mandatory validation guard:
   ```typescript
   export const enforcePatientIsolation = (req: Request, res: Response, next: NextFunction) => {
     if (req.user.role === 'admin') return next();
     
     // Patients are hard-locked to their own ID
     const targetId = req.params.patientId || req.query.patientId || req.body.patientId;
     if (targetId && targetId !== req.user.patientId) {
       return res.status(403).json({ error: 'Access denied: Tenant isolation violation.' });
     }
     
     // Automatically scope queries to the authenticated user
     req.scopedPatientId = req.user.patientId;
     next();
   };
   ```
3. **Storage Security:**
   - Files are stored in MongoDB GridFS, keeping raw binaries isolated from public web directories.
   - Access to raw files is restricted to authenticated users matching document ownership.
4. **Log Sanitization:**
   - Custom Winston/Pino logger masks patient names, phone numbers, ABHA IDs, and API keys.
