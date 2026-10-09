# REST API Specification

This document provides the complete API contract for the AI-Powered Personal Health Copilot. All endpoints are versioned under `/api` and enforce strict authentication, role-based access control, and tenant isolation.

---

## 1. Authentication & Session Management

### `POST /api/auth/login`
Authenticates a user and issues an `httpOnly` JWT session cookie.

- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "patient@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "user": {
      "id": "670529d10e012a938c401a91",
      "email": "patient@example.com",
      "role": "patient",
      "patientId": "PT-1001",
      "name": "Ramesh Kumar"
    }
  }
  ```
- **Response Headers:**
  `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`
- **Error Responses:**
  - `400 Bad Request` (Invalid payload format)
  - `401 Unauthorized` (Invalid credentials)

---

### `GET /api/auth/me`
Retrieves the profile of the currently authenticated user.

- **Access:** Authenticated (`admin` | `patient`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "user": {
      "id": "670529d10e012a938c401a91",
      "email": "patient@example.com",
      "role": "patient",
      "patientId": "PT-1001",
      "name": "Ramesh Kumar"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (Missing or expired session cookie)

---

### `POST /api/auth/logout`
Clears the session cookie and invalidates client session state.

- **Access:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```

---

## 2. Patients & Clinical Data

### `GET /api/patients`
Searches or lists patients.

- **Access:** Admin only
- **Query Parameters:**
  - `query` (optional string): Search term for `patientId` (e.g. `PT-1001`) or `name`.
  - `page` (optional number, default 1)
  - `limit` (optional number, default 20)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "total": 3,
    "patients": [
      {
        "patientId": "PT-1001",
        "name": "Ramesh Kumar",
        "dob": "1984-06-15T00:00:00.00Z",
        "gender": "male",
        "bloodGroup": "B+",
        "abhaId": "91-8472-1923-0192",
        "abhaStatus": "verified",
        "documentCount": 4,
        "lastRecordDate": "2026-09-28T00:00:00.00Z"
      }
    ]
  }
  ```

---

### `GET /api/patients/:patientId`
Retrieves core profile details for a specific patient.

- **Access:** Admin OR Authenticated Patient matching `:patientId`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "patient": {
      "patientId": "PT-1001",
      "name": "Ramesh Kumar",
      "dob": "1984-06-15T00:00:00.000Z",
      "gender": "male",
      "bloodGroup": "B+",
      "phone": "+91-9876543210",
      "abhaId": "91-8472-1923-0192",
      "abhaStatus": "verified",
      "lastSync": "2026-10-01T10:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden` (Patient attempting to access another patient's profile)
  - `404 Not Found` (Patient does not exist)

---

### `GET /api/patients/:patientId/summary`
Generates the consolidated Current Health Summary based on the latest available records.

- **Access:** Admin OR Authenticated Patient matching `:patientId`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "summary": {
      "patientId": "PT-1001",
      "latestRecordDate": "2026-09-28",
      "asOfStatement": "Based on your available records up to September 28, 2026",
      "plainLanguageSummary": "Your latest blood tests show that your fasting glucose is slightly elevated compared to the laboratory reference range. Your kidney and liver parameters are within normal reference intervals. You have 2 ongoing prescribed medications for hypertension and diabetes.",
      "abnormalFindingsCount": 1,
      "activeMedicationsCount": 2,
      "totalDocumentsCount": 4,
      "disclaimer": "This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice."
    }
  }
  ```

---

### `GET /api/patients/:patientId/timeline`
Retrieves all historical medical documents, reports, and prescriptions ordered chronologically.

- **Access:** Admin OR Authenticated Patient matching `:patientId`
- **Query Parameters:**
  - `type` (optional string): Filter by `lab_report`, `prescription`, `discharge_summary`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "timeline": [
      {
        "documentId": "DOC-908123",
        "effectiveDate": "2026-09-28",
        "dateSource": "report_date",
        "documentType": "lab_report",
        "title": "Comprehensive Metabolic & Lipid Panel",
        "fileName": "PT-1001_blood_report_sept2026.pdf",
        "abnormalCount": 1,
        "abnormalItems": ["Fasting Blood Sugar (134 mg/dL - High)"],
        "medicinesCount": 0,
        "processingStatus": "Completed"
      },
      {
        "documentId": "DOC-890212",
        "effectiveDate": "2026-06-10",
        "dateSource": "report_date",
        "documentType": "prescription",
        "title": "General Physician Prescription (Apollo Clinic)",
        "fileName": "PT-1001_prescription_june.jpg",
        "abnormalCount": 0,
        "medicinesCount": 2,
        "processingStatus": "Completed"
      }
    ]
  }
  ```

---

### `GET /api/patients/:patientId/trends`
Provides time-series data for quantitative lab tests for Recharts visualization.

- **Access:** Admin OR Authenticated Patient matching `:patientId`
- **Query Parameters:**
  - `testNames` (optional comma-separated): e.g. `Glucose Fasting,HbA1c,Cholesterol`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "trends": [
      {
        "testName": "Fasting Blood Sugar",
        "unit": "mg/dL",
        "referenceRange": { "low": 70, "high": 100 },
        "hasEnoughData": true,
        "dataPoints": [
          { "date": "2025-11-12", "value": 98, "interpretation": "NORMAL" },
          { "date": "2026-04-05", "value": 115, "interpretation": "HIGH" },
          { "date": "2026-09-28", "value": 134, "interpretation": "HIGH" }
        ]
      },
      {
        "testName": "Serum Creatinine",
        "unit": "mg/dL",
        "referenceRange": { "low": 0.7, "high": 1.3 },
        "hasEnoughData": false,
        "message": "Not enough historical data to show a trend",
        "dataPoints": [
          { "date": "2026-09-28", "value": 0.9, "interpretation": "NORMAL" }
        ]
      }
    ]
  }
  ```

---

### `GET /api/patients/:patientId/fhir-bundle`
Generates a valid HL7 FHIR R4 JSON Bundle (`type: 'collection'`) representing the patient's entire medical record for ABDM interoperability.

- **Access:** Admin OR Authenticated Patient matching `:patientId`
- **Response `200 OK`:**
  ```json
  {
    "resourceType": "Bundle",
    "id": "bundle-PT-1001-20261008",
    "type": "collection",
    "timestamp": "2026-10-08T15:20:00.000Z",
    "entry": [
      {
        "fullUrl": "urn:uuid:patient-PT-1001",
        "resource": {
          "resourceType": "Patient",
          "id": "PT-1001",
          "identifier": [
            { "system": "https://healthid.ndhm.gov.in", "value": "91-8472-1923-0192" }
          ],
          "name": [{ "text": "Ramesh Kumar" }],
          "gender": "male",
          "birthDate": "1984-06-15"
        }
      },
      {
        "fullUrl": "urn:uuid:obs-1",
        "resource": {
          "resourceType": "Observation",
          "status": "final",
          "code": { "text": "Glucose Fasting" },
          "subject": { "reference": "Patient/PT-1001" },
          "valueQuantity": { "value": 134, "unit": "mg/dL" },
          "interpretation": [{ "coding": [{ "code": "H", "display": "High" }] }],
          "referenceRange": [{ "low": { "value": 70 }, "high": { "value": 100 } }]
        }
      }
    ]
  }
  ```

---

## 3. Document Ingestion & Processing

### `POST /api/documents/upload`
Uploads a single medical document. For patients, `patientId` is auto-mapped from the JWT cookie (any `patientId` in the body is discarded). For admins, `patientId` must be specified in the body.

- **Access:** Authenticated (`admin` | `patient`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file (PDF, DOCX, JPG, JPEG, PNG, max 50MB)
  - `patientId`: (Required only if caller is `admin`)
  - `documentType`: (Optional hint: `lab_report`, `prescription`, `discharge_summary`, `auto`)
- **Response `202 Accepted`:**
  ```json
  {
    "success": true,
    "message": "Processing your medical document...",
    "jobId": "JOB-109283",
    "documentId": "DOC-771239",
    "initialStatus": "Queued"
  }
  ```

---

### `POST /api/documents/bulk-upload`
Ingests a batch of documents (up to 20 files per request).

- **Access:** Admin only
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `files`: Array of file binaries (e.g. `PT-1001_blood_report.pdf`, `PT-1002_prescription.jpg`)
- **Response `202 Accepted`:**
  ```json
  {
    "success": true,
    "jobId": "JOB-BULK-9901",
    "totalFiles": 3,
    "status": "in_progress",
    "pollUrl": "/api/documents/jobs/JOB-BULK-9901"
  }
  ```

---

### `GET /api/documents/jobs/:jobId`
Polls the processing progress of a single upload or bulk upload batch.

- **Access:** Authenticated (Owner of job or Admin)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "jobId": "JOB-BULK-9901",
    "status": "in_progress",
    "totals": {
      "total": 3,
      "success": 1,
      "failed": 0,
      "processing": 2
    },
    "files": [
      {
        "fileName": "PT-1001_blood_report.pdf",
        "patientId": "PT-1001",
        "status": "Completed",
        "documentId": "DOC-89102",
        "errorReason": null
      },
      {
        "fileName": "PT-1002_rx_tamil.jpg",
        "patientId": "PT-1002",
        "status": "Extracting",
        "documentId": "DOC-89103",
        "errorReason": null
      },
      {
        "fileName": "PT-9999_unknown.pdf",
        "patientId": "PT-9999",
        "status": "Failed",
        "documentId": null,
        "errorReason": "Patient PT-9999 does not exist in registry."
      }
    ]
  }
  ```

---

### `GET /api/documents/:documentId`
Retrieves extracted structured data and status for a single document.

- **Access:** Admin OR Authenticated Patient owning the document
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "document": {
      "documentId": "DOC-89102",
      "patientId": "PT-1001",
      "fileName": "PT-1001_blood_report.pdf",
      "fileType": "application/pdf",
      "reportDate": "2026-09-28",
      "documentType": "lab_report",
      "processingStatus": "Completed",
      "aiSummary": "Report shows elevated Fasting Blood Glucose (134 mg/dL). Kidney markers are within normal range.",
      "abnormalFindings": [
        {
          "testName": "Glucose Fasting",
          "value": 134,
          "unit": "mg/dL",
          "referenceRange": { "low": 70, "high": 100 },
          "interpretation": "HIGH",
          "plainLanguageNote": "Your glucose value is above the reference range shown in the report. Please discuss this with a qualified healthcare professional."
        }
      ],
      "medicines": [],
      "explicitDiagnoses": ["Type 2 Diabetes Mellitus mentioned in uploaded document"],
      "adminReviewed": false,
      "uploadedAt": "2026-10-08T15:00:00.000Z"
    }
  }
  ```

---

### `GET /api/documents/:documentId/file`
Streams the original uploaded file directly from MongoDB GridFS.

- **Access:** Admin OR Authenticated Patient owning the document
- **Response `200 OK`:** Binary stream with appropriate `Content-Type` header (e.g. `application/pdf`, `image/png`).

---

### `PATCH /api/documents/:documentId/review`
Allows an administrator to correct AI-extracted fields (human-in-the-loop review).

- **Access:** Admin only
- **Request Body (JSON):**
  ```json
  {
    "reportDate": "2026-09-28",
    "documentType": "lab_report",
    "medicines": [
      {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "Once daily with dinner",
        "duration": "30 days"
      }
    ],
    "adminReviewed": true
  }
  ```
- **Response `200 OK`:** Updated document resource.

---

## 4. Grounded AI Copilot & Multilingual Services

### `POST /api/chat/message`
Sends a message to the health copilot. Grounding is strictly bounded to the authenticated patient's observations, reports, and medications. Cross-patient queries or external medical prescribing are strictly refused.

- **Access:** Authenticated Patient (Admin may query on behalf of a specified patient)
- **Request Body (JSON):**
  ```json
  {
    "message": "Enoda sugar level evalo iruku latest report la?",
    "language": "ta"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "reply": "உங்களின் சமீபத்திய பரிசோதனை அறிக்கையின்படி (செப்டம்பர் 28, 2026), உங்கள் இரத்த சர்க்கரை அளவு (Fasting Blood Sugar) 134 mg/dL ஆக உள்ளது. இது ஆய்வகத்தின் இயல்பான வரம்பை விட (70-100 mg/dL) அதிகமாக உள்ளது. தயவுசெய்து உங்கள் மருத்துவரிடம் இது குறித்து ஆலோசிக்கவும்.",
    "detectedIntent": "lab_inquiry",
    "sources": [
      { "documentId": "DOC-89102", "reportDate": "2026-09-28", "title": "Comprehensive Metabolic Panel" }
    ],
    "disclaimer": "This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice."
  }
  ```

---

### `POST /api/ai/translate`
Translates an AI summary or report finding on-the-fly into one of the supported regional languages.

- **Access:** Authenticated
- **Request Body (JSON):**
  ```json
  {
    "text": "Your glucose value is above the reference range shown in the report.",
    "targetLanguage": "hi"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "translatedText": "आपकी ग्लूकोज रिपोर्ट में दिखाए गए संदर्भ सीमा से अधिक है। कृपया एक योग्य स्वास्थ्य विशेषज्ञ से परामर्श लें।"
  }
  ```

---

## 5. Standard Error Envelopes

Every error response adheres to a uniform structure:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_ISOLATION_VIOLATION",
    "message": "Access denied: You are not authorized to access records for this patient.",
    "details": null
  }
}
```

### Common HTTP Status Codes:
- `400 Bad Request`: Validation failure (Zod error details returned).
- `401 Unauthorized`: No active session cookie or token expired.
- `403 Forbidden`: Role permission failure or patient isolation violation.
- `404 Not Found`: Resource does not exist.
- `415 Unsupported Media Type`: File format not permitted.
- `422 Unprocessable Entity`: AI extraction or parsing failed permanently.
- `500 Internal Server Error`: Server exception (no PHI or secrets in stack trace).
