import {
  Patient,
  PatientSummary,
  MedicalDocument,
  UserSession,
  ChatMessageItem,
  ChatQueryResponse,
  ChatTurnSource,
} from '@health-copilot/shared';
import {
  INITIAL_MOCK_USERS,
  INITIAL_MOCK_PATIENTS,
  INITIAL_MOCK_SUMMARIES,
  INITIAL_MOCK_DOCUMENTS,
} from './mockData';

const STORAGE_KEY_USERS = 'HEALTH_COPILOT_MOCK_USERS';
const STORAGE_KEY_PATIENTS = 'HEALTH_COPILOT_MOCK_PATIENTS';
const STORAGE_KEY_SUMMARIES = 'HEALTH_COPILOT_MOCK_SUMMARIES';
const STORAGE_KEY_DOCUMENTS = 'HEALTH_COPILOT_MOCK_DOCUMENTS';
const STORAGE_KEY_CURRENT_USER = 'HEALTH_COPILOT_MOCK_CURRENT_USER';
const STORAGE_KEY_CHAT = 'HEALTH_COPILOT_MOCK_CHAT_';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[MockApi] Storage write error:', err);
  }
}

// In-Memory state initialization
let mockUsers = getStored<Array<UserSession & { email: string }>>(STORAGE_KEY_USERS, INITIAL_MOCK_USERS);
let mockPatients = getStored<Patient[]>(STORAGE_KEY_PATIENTS, INITIAL_MOCK_PATIENTS);
let mockSummaries = getStored<Record<string, PatientSummary>>(STORAGE_KEY_SUMMARIES, INITIAL_MOCK_SUMMARIES);
let mockDocuments = getStored<MedicalDocument[]>(STORAGE_KEY_DOCUMENTS, INITIAL_MOCK_DOCUMENTS);

export const MockApiService = {
  getCurrentUser(): UserSession | null {
    return getStored<UserSession | null>(STORAGE_KEY_CURRENT_USER, null);
  },

  setCurrentUser(user: UserSession | null): void {
    setStored(STORAGE_KEY_CURRENT_USER, user);
  },

  async handleRequest<T>(endpoint: string, options: { method?: string; data?: any } = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const [pathOnly, queryString] = endpoint.split('?');
    const params = new URLSearchParams(queryString || '');

    // 1. AUTH ENDPOINTS
    if (pathOnly === '/auth/login' && method === 'POST') {
      const { email } = options.data || {};
      const cleanInput = (email || '').trim().toLowerCase();

      // Find matching user by email, patientId, or ABHA
      let matchedUser = mockUsers.find((u) => u.email.toLowerCase() === cleanInput);

      if (!matchedUser) {
        // Try matching by Patient ID
        const matchedPatient = mockPatients.find(
          (p) =>
            p.patientId.toLowerCase() === cleanInput ||
            (p.abhaId && p.abhaId.toLowerCase().replace(/-/g, '') === cleanInput.replace(/-/g, ''))
        );
        if (matchedPatient) {
          matchedUser = mockUsers.find((u) => u.patientId === matchedPatient.patientId);
        }
      }

      // If still not matched, create or default to Ramesh for seamless demo evaluation
      if (!matchedUser) {
        if (cleanInput.includes('admin') || cleanInput.includes('doctor')) {
          matchedUser = mockUsers[0];
        } else {
          matchedUser = mockUsers[1]; // Ramesh Kumar
        }
      }

      this.setCurrentUser(matchedUser);
      return { success: true, user: matchedUser } as T;
    }

    if (pathOnly === '/auth/me' && method === 'GET') {
      const current = this.getCurrentUser();
      if (!current) {
        throw new Error('Not authenticated');
      }
      return { success: true, user: current } as T;
    }

    if (pathOnly === '/auth/logout' && method === 'POST') {
      this.setCurrentUser(null);
      return { success: true, message: 'Logged out successfully' } as T;
    }

    if (pathOnly === '/auth/register' && method === 'POST') {
      const regData = options.data || {};
      const newPatientId = `PT-${1000 + mockPatients.length + 1}`;
      const randomAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
        1000 + Math.random() * 9000
      )}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPatient: Patient = {
        patientId: newPatientId,
        name: regData.name || 'New Patient',
        dob: regData.dob || '1995-01-01',
        gender: regData.gender || 'other',
        bloodGroup: regData.bloodGroup || 'O+',
        phone: regData.phone || '+91-9876543200',
        abhaId: randomAbha,
        abhaStatus: 'verified',
        lastSync: new Date().toISOString(),
      };

      const newUser: UserSession & { email: string } = {
        id: `user-${Date.now()}`,
        email: regData.email || `${newPatientId.toLowerCase()}@example.com`,
        role: regData.role || 'patient',
        patientId: regData.role === 'admin' ? null : newPatientId,
        name: regData.name,
      };

      mockPatients = [newPatient, ...mockPatients];
      setStored(STORAGE_KEY_PATIENTS, mockPatients);

      mockUsers = [newUser, ...mockUsers];
      setStored(STORAGE_KEY_USERS, mockUsers);

      mockSummaries[newPatientId] = {
        patientId: newPatientId,
        latestRecordDate: null,
        asOfStatement: 'New patient profile created.',
        plainLanguageSummary: `Welcome ${newPatient.name}. No previous clinical documents have been uploaded yet. Upload a lab report or prescription to start tracking your health.`,
        abnormalFindingsCount: 0,
        activeMedicationsCount: 0,
        totalDocumentsCount: 0,
        disclaimer: 'This profile is in initial setup mode.',
      };
      setStored(STORAGE_KEY_SUMMARIES, mockSummaries);

      this.setCurrentUser(newUser);

      return {
        success: true,
        user: newUser,
        patientId: newUser.patientId,
        abhaId: newPatient.abhaId,
        message: 'Account created successfully (In-Browser Demo Mode)',
      } as T;
    }

    if (pathOnly === '/auth/forgot-password' && method === 'POST') {
      return {
        success: true,
        message: 'Password reset link sent to registered email address (Demo mode simulation).',
      } as T;
    }

    // 2. PATIENT ENDPOINTS
    if (pathOnly.startsWith('/patients/') && pathOnly.endsWith('/summary') && method === 'GET') {
      const patientId = pathOnly.split('/')[2];
      const summary = mockSummaries[patientId] || {
        patientId,
        latestRecordDate: null,
        asOfStatement: 'Active clinical record',
        plainLanguageSummary: 'Clinical records are active and under monitoring.',
        abnormalFindingsCount: 0,
        activeMedicationsCount: 0,
        totalDocumentsCount: 0,
        disclaimer: 'Information for tracking purposes.',
      };
      return { success: true, summary } as T;
    }

    if (pathOnly.startsWith('/patients/') && pathOnly.endsWith('/fhir-bundle') && method === 'GET') {
      const patientId = pathOnly.split('/')[2];
      const patient = mockPatients.find((p) => p.patientId === patientId) || mockPatients[0];
      const docs = mockDocuments.filter((d) => d.patientId === patientId);

      const bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: patient.patientId,
              identifier: [
                { system: 'https://healthid.ndhm.gov.in', value: patient.abhaId },
                { system: 'urn:hospital:mrn', value: patient.patientId },
              ],
              name: [{ text: patient.name }],
              gender: patient.gender,
              birthDate: String(patient.dob).substring(0, 10),
            },
          },
          ...docs.map((d) => ({
            resource: {
              resourceType: 'DocumentReference',
              id: d.documentId,
              status: 'current',
              description: d.fileName,
              date: d.reportDate,
            },
          })),
        ],
      };
      return bundle as T;
    }

    if (pathOnly.match(/^\/patients\/[^/]+$/) && method === 'GET') {
      const patientId = pathOnly.split('/')[2];
      const patient = mockPatients.find((p) => p.patientId === patientId) || mockPatients[0];
      return { success: true, patient } as T;
    }

    if (pathOnly.match(/^\/patients\/[^/]+$/) && method === 'PATCH') {
      const patientId = pathOnly.split('/')[2];
      const updateData = options.data || {};
      const idx = mockPatients.findIndex((p) => p.patientId === patientId);
      if (idx !== -1) {
        mockPatients[idx] = { ...mockPatients[idx], ...updateData };
        setStored(STORAGE_KEY_PATIENTS, mockPatients);
        return { success: true, message: 'Profile updated successfully', patient: mockPatients[idx] } as T;
      }
      return { success: true, message: 'Profile updated', patient: mockPatients[0] } as T;
    }

    if (pathOnly === '/patients' && method === 'GET') {
      const query = (params.get('query') || '').toLowerCase();
      let list = mockPatients;
      if (query) {
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.patientId.toLowerCase().includes(query) ||
            (p.abhaId && p.abhaId.toLowerCase().includes(query))
        );
      }
      const formatted = list.map((p) => ({
        patientId: p.patientId,
        name: p.name,
        dob: p.dob,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        abhaId: p.abhaId || '',
        abhaStatus: p.abhaStatus,
        documentCount: mockDocuments.filter((d) => d.patientId === p.patientId).length,
        lastRecordDate: mockSummaries[p.patientId]?.latestRecordDate || null,
      }));
      return {
        success: true,
        total: formatted.length,
        patients: formatted,
        page: 1,
        limit: 50,
      } as T;
    }

    // 3. DOCUMENT ENDPOINTS
    if (pathOnly === '/documents' && method === 'GET') {
      const patientId = params.get('patientId');
      const docType = params.get('type');
      let filtered = mockDocuments;
      if (patientId) {
        filtered = filtered.filter((d) => d.patientId === patientId);
      }
      if (docType) {
        filtered = filtered.filter((d) => d.documentType === docType);
      }
      return { success: true, total: filtered.length, documents: filtered } as T;
    }

    if (pathOnly.match(/^\/documents\/[^/]+$/) && method === 'GET') {
      const docId = pathOnly.split('/')[2];
      const doc = mockDocuments.find((d) => d.documentId === docId) || mockDocuments[0];
      return { success: true, document: doc } as T;
    }

    if (pathOnly === '/documents/upload' && method === 'POST') {
      const current = this.getCurrentUser();
      const patientId = current?.patientId || 'PT-1001';
      const patient = mockPatients.find((p) => p.patientId === patientId) || mockPatients[0];

      let fileName = 'Uploaded_Medical_Report.pdf';
      let documentType: any = 'lab_report';

      if (options.data instanceof FormData) {
        const file = options.data.get('file') as File;
        if (file && file.name) fileName = file.name;
        const hint = options.data.get('documentType') as string;
        if (hint) documentType = hint;
      }

      const newDoc: MedicalDocument = {
        documentId: `DOC-${Date.now().toString().slice(-4)}`,
        patientId: patient.patientId,
        patientName: patient.name,
        fileName,
        fileType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        storageRef: `mock-gridfs-${Date.now()}`,
        fileHash: `hash-${Date.now()}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: current?.id || 'demo-user',
        uploadedRole: current?.role || 'patient',
        reportDate: new Date().toISOString().substring(0, 10),
        documentType,
        aiSummary: `AI-extracted clinical document (${fileName}). Successfully normalized vitals, observations, and medication parameters into longitudinal medical timeline.`,
        abnormalFindings: [
          {
            testName: 'Routine Blood Marker',
            value: 98,
            unit: 'mg/dL',
            referenceRange: { low: 70, high: 110, rawText: '70 - 110 mg/dL' },
            interpretation: 'NORMAL',
            plainLanguageNote: 'Analyzed observation is within expected normal reference bounds.',
          },
        ],
        medicines: [],
        explicitDiagnoses: ['Routine Health Check'],
        processingStatus: 'Completed',
        errorReason: null,
        adminReviewed: false,
      };

      mockDocuments = [newDoc, ...mockDocuments];
      setStored(STORAGE_KEY_DOCUMENTS, mockDocuments);

      // Update patient summary document count
      if (mockSummaries[patientId]) {
        mockSummaries[patientId].totalDocumentsCount = mockDocuments.filter((d) => d.patientId === patientId).length;
        setStored(STORAGE_KEY_SUMMARIES, mockSummaries);
      }

      return {
        success: true,
        message: 'File processed and stored in your longitudinal record successfully.',
        jobId: `JOB-${Date.now()}`,
        initialStatus: 'Completed',
      } as T;
    }

    if (pathOnly.startsWith('/documents/jobs/') && method === 'GET') {
      const jobId = pathOnly.split('/')[3];
      return {
        success: true,
        jobId,
        status: 'completed',
        totalFiles: 1,
        processedFiles: 1,
        successCount: 1,
        failedCount: 0,
        files: [{ fileName: 'Uploaded_Report.pdf', status: 'Completed' }],
      } as T;
    }

    if (pathOnly === '/documents/bulk-upload' && method === 'POST') {
      return {
        success: true,
        message: 'Bulk upload received and queued for OCR processing.',
        jobId: `JOB-BULK-${Date.now()}`,
        totalFiles: 2,
        status: 'completed',
        pollUrl: `/api/documents/jobs/JOB-BULK-${Date.now()}`,
      } as T;
    }

    // 4. CHAT COPILOT ENDPOINTS
    if (pathOnly === '/chat/message' && method === 'POST') {
      const { message, language = 'en', patientId: reqPatientId } = options.data || {};
      const current = this.getCurrentUser();
      const patientId = reqPatientId || current?.patientId || 'PT-1001';
      const patient = mockPatients.find((p) => p.patientId === patientId) || mockPatients[0];
      const summary = mockSummaries[patientId];
      const query = (message || '').toLowerCase();

      let answer = '';
      const chatSources: ChatTurnSource[] = [
        { documentId: 'DOC-101', title: 'Comprehensive Metabolic Panel', reportDate: '2026-09-15' },
        { documentId: 'DOC-102', title: 'Cardiology Prescription', reportDate: '2026-08-10' },
      ];

      if (query.includes('sugar') || query.includes('glucose') || query.includes('diabetes') || query.includes('hba1c')) {
        answer = `Based on your latest records from September 15, 2026, your **Fasting Blood Glucose** is **142 mg/dL** (Reference: 70–99 mg/dL) and your **HbA1c** is **7.8%** (Reference: 4.0–5.6%). Both values are currently elevated, indicating active Type 2 Diabetes that requires continued monitoring and adherence to your prescribed Metformin regimen.`;
      } else if (query.includes('medicine') || query.includes('medication') || query.includes('drug') || query.includes('pill')) {
        answer = `Your active medications from your August 10, 2026 prescription are:
1. **Metformin 500 mg** — 1 tablet twice daily after meals (for blood sugar control).
2. **Telmisartan 40 mg** — 1 tablet every morning (for blood pressure control).
3. **Atorvastatin 10 mg** — 1 tablet nightly before sleep (for cholesterol management).`;
      } else if (query.includes('bp') || query.includes('blood pressure') || query.includes('hypertension')) {
        answer = `Your blood pressure is currently well-controlled at **128/82 mmHg** (documented on your latest outpatient checkup). You are taking **Telmisartan 40 mg daily** to maintain this target range.`;
      } else if (query.includes('abnormal') || query.includes('high') || query.includes('concern')) {
        answer = `Reviewing your records, there are **3 findings flagged as High**:
- **Fasting Blood Glucose**: 142 mg/dL (Normal: < 100 mg/dL)
- **HbA1c**: 7.8% (Normal: < 5.7%)
- **Triglycerides**: 195 mg/dL (Normal: < 150 mg/dL)
Your kidney function (Creatinine 0.9 mg/dL) and liver enzymes are completely normal.`;
      } else {
        answer = `Hello ${patient.name}. According to your health timeline, your records are current through ${
          summary?.latestRecordDate || 'September 2026'
        }. You are actively managing Type 2 Diabetes and Essential Hypertension with 3 ongoing daily medications. Is there a specific test result, medication, or doctor summary you would like me to explain?`;
      }

      // Multilingual support
      if (language === 'ta') {
        answer = `வணக்கம் ${patient.name}. உங்கள் மருத்துவ அறிக்கைகளின்படி, உங்கள் இரத்த சர்க்கரை அளவு (HbA1c: 7.8%, Fasting: 142 mg/dL) சற்று அதிகமாக உள்ளது. மருத்துவர் பரிந்துரைத்த மெட்பார்மின் (Metformin) மாத்திரைகளை தவறாமல் எடுத்துக்கொள்ளவும்.`;
      } else if (language === 'hi') {
        answer = `नमस्ते ${patient.name}. आपके हालिया मेडिकल रिकॉर्ड (सितंबर 2026) के अनुसार, आपका फास्टिंग ब्लड शुगर 142 mg/dL और HbA1c 7.8% है। यह मधुमेह सीमा में है। कृपया अपने डॉक्टर द्वारा दी गई दवाओं का नियमित सेवन करें।`;
      }

      const response: ChatQueryResponse = {
        success: true,
        reply: answer,
        sources: chatSources,
        disclaimer:
          'This AI Copilot provides informational explanations grounded in your uploaded records. It does not replace medical consultation.',
        language,
      };

      // Store in chat history
      const historyKey = `${STORAGE_KEY_CHAT}${patientId}`;
      const history = getStored<ChatMessageItem[]>(historyKey, []);
      const updatedHistory: ChatMessageItem[] = [
        ...history,
        {
          id: `msg-${Date.now()}-1`,
          sender: 'user',
          message,
          language,
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-${Date.now()}-2`,
          sender: 'assistant',
          message: answer,
          language,
          timestamp: new Date().toISOString(),
          sources: chatSources,
        },
      ];
      setStored(historyKey, updatedHistory);

      return response as T;
    }

    if (pathOnly === '/chat/history' && method === 'GET') {
      const patientId = params.get('patientId') || this.getCurrentUser()?.patientId || 'PT-1001';
      const historyKey = `${STORAGE_KEY_CHAT}${patientId}`;
      const messages = getStored<ChatMessageItem[]>(historyKey, []);
      return { success: true, patientId, messages } as T;
    }

    if (pathOnly === '/chat/history' && method === 'DELETE') {
      const patientId = params.get('patientId') || this.getCurrentUser()?.patientId || 'PT-1001';
      const historyKey = `${STORAGE_KEY_CHAT}${patientId}`;
      setStored(historyKey, []);
      return { success: true, message: 'Chat history cleared' } as T;
    }

    // Default fallback
    return { success: true, message: 'Operation simulated in demo mode' } as unknown as T;
  },
};
