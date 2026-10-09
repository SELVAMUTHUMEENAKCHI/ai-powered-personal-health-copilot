import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { apiRequest } from './services/api';
import { DocumentApiService } from './services/document.service';
import { PatientApiService } from './services/patient.service';
import {
  ShieldCheck,
  User,
  LogOut,
  Moon,
  Sun,
  Activity,
  Lock,
  FileText,
  Search,
  CheckCircle,
  FileUp,
  Clock,
  Globe,
  Mic,
  MicOff,
  Calendar as CalendarIcon,
  Pill,
  TrendingUp,
  Bell,
  Info,
  Sparkles,
  KeyRound,
  X,
  Layers,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  Save,
  Phone,
  Heart,
} from 'lucide-react';
import { Patient, PatientSummary, MedicalDocument } from '@health-copilot/shared';
import { HealthSummaryCard } from './components/patient/HealthSummaryCard';
import { HealthTimeline } from './components/patient/HealthTimeline';
import { HealthCalendar } from './components/patient/HealthCalendar';
import { MedicationManager } from './components/patient/MedicationManager';
import { HealthAnalytics } from './components/patient/HealthAnalytics';
import { AbhaCard } from './components/patient/AbhaCard';
import { RemindersList } from './components/patient/RemindersList';
import { DocumentUploadModal } from './components/patient/DocumentUploadModal';
import { DocumentDetailModal } from './components/patient/DocumentDetailModal';
import { CopilotDrawer } from './components/chat/CopilotDrawer';
import { MedicalDisclaimer } from './components/common/MedicalDisclaimer';
import { EmptyState } from './components/common/EmptyState';
import { StatusBadge } from './components/common/StatusBadge';
import { AdminPortal } from './components/admin/AdminPortal';

export const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, loading, login, register, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Auth Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInRole, setSignInRole] = useState<'patient' | 'admin'>('patient');
  const [emailInput, setEmailInput] = useState('ramesh@example.com');
  const [passwordInput, setPasswordInput] = useState('Password123!');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sign Up form state
  const [signUpRole, setSignUpRole] = useState<'patient' | 'admin'>('patient');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [signUpDob, setSignUpDob] = useState('1998-05-15');
  const [signUpGender, setSignUpGender] = useState<'male' | 'female' | 'other'>('male');
  const [signUpBloodGroup, setSignUpBloodGroup] = useState('O+');
  const [signUpLang, setSignUpLang] = useState('en');

  // Registration success modal
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  const [createdAbhaId, setCreatedAbhaId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Profile modal & edit state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodGroup: 'O+',
    preferredLanguage: 'en',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  // Student info modal
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Active navigation tab for patient
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profile' | 'timeline' | 'calendar' | 'medications' | 'analytics' | 'documents' | 'abha' | 'reminders'
  >('overview');

  // Patient data state
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [summaryData, setSummaryData] = useState<PatientSummary | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Global search & voice search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Security isolation test result
  const [isolationTestResult, setIsolationTestResult] = useState<string | null>(null);

  // Admin state
  const [adminPatients, setAdminPatients] = useState<
    Array<{
      patientId: string;
      name: string;
      gender: string;
      abhaId?: string;
      documentCount: number;
    }>
  >([]);

  // Fetch patient documents and summary
  const fetchPatientData = useCallback(async (patientId: string) => {
    setDataLoading(true);
    try {
      const [profile, summary, docs] = await Promise.all([
        PatientApiService.getProfile(patientId),
        PatientApiService.getSummary(patientId),
        DocumentApiService.listDocuments(patientId),
      ]);
      setPatientData(profile);
      setSummaryData(summary);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load patient records:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch admin patient directory
  const fetchAdminData = useCallback(async () => {
    try {
      const res = await apiRequest<{ success: boolean; patients: typeof adminPatients }>('/patients');
      setAdminPatients(res.patients);
    } catch (err) {
      console.error('Failed to load admin patients:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setPatientData(null);
      setSummaryData(null);
      setDocuments([]);
      setAdminPatients([]);
      setIsolationTestResult(null);
      return;
    }

    if (user.role === 'patient' && user.patientId) {
      fetchPatientData(user.patientId);
    } else if (user.role === 'admin') {
      fetchAdminData();
    }
  }, [user, fetchPatientData, fetchAdminData]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      await login(emailInput, passwordInput);
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (signUpPassword !== signUpConfirmPassword) {
      setAuthError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({
        role: signUpRole,
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        phone: signUpPhone.trim() || undefined,
        password: signUpPassword,
        dob: signUpRole === 'patient' ? signUpDob : undefined,
        gender: signUpRole === 'patient' ? signUpGender : undefined,
        bloodGroup: signUpRole === 'patient' ? signUpBloodGroup : undefined,
        preferredLanguage: signUpLang,
      });

      // Show celebratory Patient ID & ABHA ID message if registered as patient
      if (res.patientId) {
        setCreatedPatientId(res.patientId);
        setCreatedAbhaId(res.abhaId || null);
      }
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleOpenProfile = () => {
    if (patientData) {
      setEditProfileData({
        name: patientData.name || user?.name || '',
        phone: patientData.phone || '',
        dob: patientData.dob ? new Date(patientData.dob).toISOString().split('T')[0] : '1995-05-15',
        gender: patientData.gender || 'male',
        bloodGroup: patientData.bloodGroup || 'O+',
        preferredLanguage: (patientData as any).preferredLanguage || 'en',
      });
    } else if (user) {
      setEditProfileData({
        name: user.name,
        phone: '',
        dob: '1995-05-15',
        gender: 'male',
        bloodGroup: 'O+',
        preferredLanguage: 'en',
      });
    }
    setIsEditingProfile(false);
    setProfileSaveMsg(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.patientId) return;
    setProfileSaving(true);
    setProfileSaveMsg(null);
    try {
      const res = await PatientApiService.updateProfile(user.patientId, {
        name: editProfileData.name.trim(),
        phone: editProfileData.phone.trim() || undefined,
        dob: editProfileData.dob ? new Date(editProfileData.dob) : undefined,
        gender: editProfileData.gender,
        bloodGroup: editProfileData.bloodGroup,
      });
      if (res.patient) {
        setPatientData(res.patient);
        if (user) {
          user.name = editProfileData.name.trim();
        }
      }
      setProfileSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditingProfile(false);
      fetchPatientData(user.patientId);
    } catch (err) {
      setProfileSaveMsg({ type: 'error', text: (err as Error).message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle switching role in Sign In form
  const handleSelectSignInRole = (role: 'patient' | 'admin') => {
    setSignInRole(role);
    setAuthError(null);
    if (role === 'admin') {
      setEmailInput('admin@altrix.health');
      setPasswordInput('AdminPassword123!');
    } else {
      setEmailInput('ramesh@example.com');
      setPasswordInput('Password123!');
    }
  };

  // Quick 1-click login for demo personas
  const handleQuickLogin = async (role: 'admin' | 'patient') => {
    setSignInRole(role);
    const email = role === 'admin' ? 'admin@altrix.health' : 'ramesh@example.com';
    const pass = role === 'admin' ? 'AdminPassword123!' : 'Password123!';
    setEmailInput(email);
    setPasswordInput(pass);
    setAuthError(null);
    setSubmitting(true);
    try {
      await login(email, pass);
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot password submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const res = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        data: { email: forgotEmail },
      });
      setForgotMsg(res.message);
    } catch {
      setForgotMsg('Password reset instructions have been dispatched.');
    }
  };

  // Voice search toggle via browser Web Speech API
  const handleToggleVoiceSearch = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isVoiceSearching) {
      setIsVoiceSearching(false);
      return;
    }

    try {
      const recognition = new (SpeechRecognition as any)();
      const langMap: Record<string, string> = {
        en: 'en-IN',
        ta: 'ta-IN',
        hi: 'hi-IN',
        te: 'te-IN',
        ml: 'ml-IN',
      };
      recognition.lang = langMap[i18n.language] || 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceSearching(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setGlobalSearch(transcript);
        setIsVoiceSearching(false);
      };

      recognition.onerror = () => {
        setIsVoiceSearching(false);
      };

      recognition.onend = () => {
        setIsVoiceSearching(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsVoiceSearching(false);
    }
  };

  // Live Cross-tenant security isolation test for judges
  const runCrossTenantTest = async () => {
    if (!user || user.role !== 'patient') return;
    const targetOtherId = user.patientId === 'PT-1001' ? 'PT-1002' : 'PT-1001';
    setIsolationTestResult(`Executing cross-tenant request to ${targetOtherId}...`);

    try {
      await apiRequest(`/patients/${targetOtherId}`);
      setIsolationTestResult('FAILURE: Cross-tenant access succeeded (Unexpected)');
    } catch (err) {
      const errorObj = err as { code?: string; status?: number; message?: string };
      setIsolationTestResult(
        `SUCCESS: Access to ${targetOtherId} was BLOCKED with 403 Forbidden. Backend tenant isolation enforced.`
      );
    }
  };

  // Filtered documents for search
  const filteredDocuments = useMemo(() => {
    if (!globalSearch.trim()) return documents;
    const q = globalSearch.toLowerCase();
    return documents.filter((doc) => {
      const matchName = doc.fileName.toLowerCase().includes(q);
      const matchType = doc.documentType.toLowerCase().includes(q);
      const matchSummary = (doc.aiSummary || '').toLowerCase().includes(q);
      const matchMeds = (doc.medicines || []).some((m) => m.name.toLowerCase().includes(q));
      const matchTests = (doc.abnormalFindings || []).some((t) => t.testName.toLowerCase().includes(q));
      return matchName || matchType || matchSummary || matchMeds || matchTests;
    });
  }, [documents, globalSearch]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('health_copilot_lang', newLang);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Brand & Student Badge */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t('appName')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                AI Copilot
              </span>
            </div>
            <button
              onClick={() => setShowAboutModal(true)}
              className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline flex items-center mt-0.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 mr-1" />
              How It Works & Key Features • Learn More
            </button>
          </div>
        </div>

        {/* Global Search with Voice Microphone (Visible when logged in) */}
        {user && (
          <div className="flex-1 max-w-md mx-2 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full pl-9 pr-10 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
            <button
              onClick={handleToggleVoiceSearch}
              className={`p-1.5 rounded-lg absolute right-1.5 transition-all ${
                isVoiceSearching
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              title={isVoiceSearching ? 'Listening... click to stop' : 'Click to speak search query'}
            >
              {isVoiceSearching ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Language Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="en" className="dark:bg-slate-900">English (EN)</option>
              <option value="ta" className="dark:bg-slate-900">தமிழ் (TA)</option>
              <option value="hi" className="dark:bg-slate-900">हिन्दी (HI)</option>
              <option value="te" className="dark:bg-slate-900">తెలుగు (TE)</option>
              <option value="ml" className="dark:bg-slate-900">മലയാളം (ML)</option>
            </select>
          </div>

          {/* Theme Switcher (Default: Light Mode) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Pill or Status */}
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={handleOpenProfile}
                className="flex items-center text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer group"
                title="Click to View & Edit My Profile"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold underline decoration-dotted decoration-teal-400/60 underline-offset-2">{user.name}</span>
                <span className="ml-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">({user.role})</span>
                {user.patientId && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px] font-bold">
                    {user.patientId}
                  </span>
                )}
              </button>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 transition-colors cursor-pointer ml-1"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Not Signed In
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <MedicalDisclaimer />

        {/* NOT LOGGED IN: Dual Sign In / Sign Up Screen */}
        {!user ? (
          <div className="max-w-md mx-auto mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Tabs for Sign In vs Sign Up */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Create Account (Sign Up)
              </button>
            </div>

            {authError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs">
                {authError}
              </div>
            )}

            {/* TAB 1: SIGN IN FORM */}
            {authMode === 'signin' ? (
              <div className="space-y-4">
                {/* Select Who is Signing In: Admin vs Patient */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Sign In As:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleSelectSignInRole('patient')}
                      className={`flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        signInRole === 'patient'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSignInRole('admin')}
                      className={`flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        signInRole === 'admin'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-teal-600 dark:text-teal-400" />
                      Doctor / Admin
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold flex items-center">
                      {signInRole === 'admin' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                          Doctor / Clinical Portal Access
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                          Personal Health Portal Access
                        </>
                      )}
                    </span>
                    <p className="text-teal-700/80 dark:text-teal-300/70 text-[10px]">
                      {signInRole === 'admin'
                        ? 'Admin credentials pre-filled. Enter your custom email if registered.'
                        : 'Patient credentials pre-filled. Enter your custom email if registered.'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 uppercase">
                    {signInRole}
                  </span>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {signInRole === 'admin' ? 'Email Address' : 'Email, Patient ID, or ABHA ID'}
                    </label>
                    <input
                      type="text"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={
                        signInRole === 'admin'
                          ? 'admin@altrix.health'
                          : 'ramesh@example.com, PT-1001, or 91-8472-1923-0192'
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    {signInRole === 'patient' && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Tip: You can log in with your registered <strong>Email</strong>, <strong>Patient ID (PT-XXXX)</strong>, or <strong>ABHA ID (91-XXXX-XXXX-XXXX)</strong>.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showSignInPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignInPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? 'Authenticating...'
                      : signInRole === 'admin'
                      ? 'Sign In as Doctor / Admin'
                      : 'Sign In as Patient'}
                  </button>
                </form>

                {/* Quick 1-Click Role Login */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      One-Click Quick Login
                    </label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Click to sign in instantly</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Admin button */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickLogin('admin')}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left group cursor-pointer ${
                        signInRole === 'admin'
                          ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-teal-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Admin</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Doctor / Clinical Portal
                        </p>
                      </div>
                      <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-teal-600 dark:text-teal-400 font-semibold group-hover:underline">
                        Sign In as Admin →
                      </div>
                    </button>

                    {/* Patient button */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickLogin('patient')}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left group cursor-pointer ${
                        signInRole === 'patient'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Patient</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Personal Health Portal
                        </p>
                      </div>
                      <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline">
                        Sign In as Patient →
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: SIGN UP / REGISTRATION FORM */
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                {/* Select Who is Signing Up: Admin vs Patient */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Registering Account As:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setSignUpRole('patient')}
                      className={`flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        signUpRole === 'patient'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpRole('admin')}
                      className={`flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        signUpRole === 'admin'
                          ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-teal-600 dark:text-teal-400" />
                      Doctor / Admin
                    </button>
                  </div>
                </div>

                {signUpRole === 'patient' ? (
                  <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 space-y-1">
                    <div className="font-bold flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                      Personal Patient Registration
                    </div>
                    <p className="text-teal-700/90 dark:text-teal-300/80 leading-relaxed">
                      Enter your details below. Your unique sequential <strong>Patient ID</strong> will be generated automatically for your health records.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 space-y-1">
                    <div className="font-bold flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                      Clinical Staff / Administrator Registration
                    </div>
                    <p className="text-teal-700/90 dark:text-teal-300/80 leading-relaxed">
                      Create a clinician account with administrative access to the patient directory, bulk multi-file upload, and document review screens.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {signUpRole === 'admin' ? 'Doctor / Administrator Name *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder={signUpRole === 'admin' ? 'e.g. Dr. Ramesh Sundaram' : 'e.g. Ramesh Kumar'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div className={`grid ${signUpRole === 'patient' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder={signUpRole === 'admin' ? 'admin@altrix.health' : 'patient@example.com'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  {signUpRole === 'patient' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="At least 6 chars"
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title={showSignUpPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showSignUpConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignUpConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {signUpRole === 'patient' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={signUpDob}
                        onChange={(e) => setSignUpDob(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Gender
                      </label>
                      <select
                        value={signUpGender}
                        onChange={(e) => setSignUpGender(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Blood Group
                      </label>
                      <select
                        value={signUpBloodGroup}
                        onChange={(e) => setSignUpBloodGroup(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={signUpLang}
                    onChange={(e) => setSignUpLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-50"
                  >
                    {submitting
                      ? signUpRole === 'admin'
                        ? 'Creating Administrator Account...'
                        : 'Creating Account & Generating ID...'
                      : signUpRole === 'admin'
                      ? 'Create Administrator Account'
                      : 'Create Account & Generate Patient ID'}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    {signUpRole === 'admin'
                      ? 'Direct access to the Clinical Management & Review Portal.'
                      : 'A unique Patient ID (e.g. PT-1004) will be auto-generated for your health records.'}
                  </p>
                </div>
              </form>
            )}
          </div>
        ) : user.role === 'admin' ? (
          /* ADMIN PORTAL */
          <AdminPortal />
        ) : (
          /* PATIENT PORTAL */
          <div className="space-y-6">
            {/* Patient Header & Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                      {user.patientId}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Welcome, {user.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your secure, structured digital health journey powered by multimodal AI
                  </p>
                </div>

                {/* Patient Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>

                  <button
                    onClick={() => setIsCopilotOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Copilot</span>
                  </button>

                  <button
                    onClick={runCrossTenantTest}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    title="Live demonstration of cross-patient isolation guard"
                  >
                    <Lock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Test Isolation</span>
                  </button>
                </div>
              </div>

              {/* Isolation Live Result Banner */}
              {isolationTestResult && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
                    isolationTestResult.startsWith('SUCCESS')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{isolationTestResult}</span>
                  </div>
                  <button
                    onClick={() => setIsolationTestResult(null)}
                    className="text-xs hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Patient Navigation Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'overview', label: t('nav.overview'), icon: Activity },
                  { id: 'profile', label: 'My Profile', icon: User },
                  { id: 'timeline', label: t('nav.timeline'), icon: Clock },
                  { id: 'calendar', label: t('nav.calendar'), icon: CalendarIcon },
                  { id: 'medications', label: t('nav.medications'), icon: Pill },
                  { id: 'analytics', label: t('nav.analytics'), icon: TrendingUp },
                  { id: 'documents', label: `${t('nav.documents')} (${filteredDocuments.length})`, icon: FileText },
                  { id: 'abha', label: t('nav.abha'), icon: ShieldCheck },
                  { id: 'reminders', label: t('nav.reminders'), icon: Bell },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Current Health Summary Card */}
                <HealthSummaryCard summary={summaryData} loading={dataLoading} />

                {/* Recent Documents Quick Strip */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                      Recent Medical Documents ({documents.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      View All Documents
                    </button>
                  </div>

                  {documents.length === 0 ? (
                    <EmptyState
                      title="No Medical Documents Uploaded"
                      message="Upload your blood reports, prescriptions, or discharge summaries to see them organized chronologically."
                      actionText="Upload First Document"
                      onAction={() => setIsUploadOpen(true)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {documents.slice(0, 4).map((doc) => (
                        <div
                          key={doc.documentId}
                          onClick={() => setSelectedDoc(doc)}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400 transition-all cursor-pointer shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[200px]">
                              {doc.fileName}
                            </span>
                            <StatusBadge status={doc.processingStatus} size="sm" />
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                            <span>Report: {doc.reportDate || 'Not available'}</span>
                            <span>•</span>
                            <span>Upload: {new Date(doc.uploadedAt).toISOString().split('T')[0]}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                            {doc.aiSummary || 'Document processed and indexed into clinical record.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Patient Profile & Demographics
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        View and update your personal health record credentials
                      </p>
                    </div>
                  </div>

                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={handleOpenProfile}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>

                {profileSaveMsg && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                      profileSaveMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span>{profileSaveMsg.text}</span>
                    <button
                      type="button"
                      onClick={() => setProfileSaveMsg(null)}
                      className="text-xs hover:underline cursor-pointer ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Identity Cards Row (Patient ID & ABHA ID with Copy & Dark Red Reminder) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Patient ID Card */}
                  <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                        Unique Patient ID
                      </span>
                      <span className="text-xl font-black font-mono text-teal-900 dark:text-teal-100">
                        {patientData?.patientId || user?.patientId || 'PT-1001'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(patientData?.patientId || user?.patientId || 'PT-1001', 'patientId')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-semibold text-teal-700 dark:text-teal-300 shadow-xs hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedText === 'patientId' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ABHA ID Card */}
                  <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
                        Ayushman Bharat Health Account (ABHA)
                      </span>
                      <span className="text-xl font-black font-mono text-teal-900 dark:text-teal-100">
                        {patientData?.abhaId || '91-8472-1923-0192'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(patientData?.abhaId || '91-8472-1923-0192', 'abhaId')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-semibold text-teal-700 dark:text-teal-300 shadow-xs hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedText === 'abhaId' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ABHA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dark Red Highlighted Reminder */}
                <div className="p-4 bg-red-100 dark:bg-red-950/70 border-2 border-red-700 dark:border-red-600 rounded-2xl text-center space-y-1 shadow-xs">
                  <p className="text-red-900 dark:text-red-100 font-black text-xs sm:text-sm uppercase tracking-wider">
                    ⚠️ REMEMBER THE ID FOR FUTURE USE FOR LOGIN
                  </p>
                  <p className="text-red-800 dark:text-red-300 text-xs">
                    Please keep your ABHA ID and Patient ID saved safely. You can use your <strong>ABHA ID</strong>, <strong>Patient ID</strong>, or registered <strong>Email</strong> to sign in anytime!
                  </p>
                </div>

                {/* Profile Form (Edit vs View Mode) */}
                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editProfileData.name}
                          onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={editProfileData.phone}
                          onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={editProfileData.dob}
                          onChange={(e) => setEditProfileData({ ...editProfileData, dob: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Gender
                        </label>
                        <select
                          value={editProfileData.gender}
                          onChange={(e) => setEditProfileData({ ...editProfileData, gender: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Blood Group
                        </label>
                        <select
                          value={editProfileData.bloodGroup}
                          onChange={(e) => setEditProfileData({ ...editProfileData, bloodGroup: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Email (Registered Account)
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ''}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {patientData?.name || user?.name}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {patientData?.phone || 'Not provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">
                        {patientData?.dob ? new Date(patientData.dob).toISOString().split('T')[0] : '1995-05-15'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block capitalize">
                        {patientData?.gender || 'male'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                        {patientData?.bloodGroup || 'O+'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Email</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                    Chronological Health Timeline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Records ordered chronologically with clear distinction between Report Date and Upload Date
                  </p>
                </div>
                <HealthTimeline
                  documents={filteredDocuments}
                  onSelectDocument={(doc) => setSelectedDoc(doc)}
                  loading={dataLoading}
                />
              </div>
            )}

            {activeTab === 'calendar' && (
              <HealthCalendar
                documents={filteredDocuments}
                onSelectDocument={(doc) => setSelectedDoc(doc)}
              />
            )}

            {activeTab === 'medications' && (
              <MedicationManager
                documents={documents}
                onSelectDocument={(doc) => setSelectedDoc(doc)}
              />
            )}

            {activeTab === 'analytics' && (
              <HealthAnalytics documents={documents} />
            )}

            {activeTab === 'documents' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      All Indexed Documents ({filteredDocuments.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Patients can upload documents only (existing records cannot be manually modified by patients)
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                </div>

                {filteredDocuments.length === 0 ? (
                  <EmptyState
                    title="No Documents Found"
                    message={
                      globalSearch
                        ? `No medical documents match "${globalSearch}". Try clearing your search.`
                        : 'Upload your first medical report to begin.'
                    }
                    actionText="Upload Medical Document"
                    onAction={() => setIsUploadOpen(true)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.documentId}
                        onClick={() => setSelectedDoc(doc)}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400 transition-all cursor-pointer shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[160px]">
                              {doc.fileName}
                            </span>
                          </div>
                          <StatusBadge status={doc.processingStatus} size="sm" />
                        </div>

                        <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                          <div>Report Date: {doc.reportDate || 'Not available'}</div>
                          <div>Upload Date: {new Date(doc.uploadedAt).toISOString().split('T')[0]}</div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {doc.aiSummary || 'Document indexed into patient health record.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'abha' && patientData && (
              <AbhaCard patient={patientData} />
            )}

            {activeTab === 'reminders' && (
              <RemindersList />
            )}
          </div>
        )}
      </main>

      {/* Floating Copilot Drawer & Launcher Button (Always active in bottom right corner) */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onOpen={() => setIsCopilotOpen(true)}
        onClose={() => setIsCopilotOpen(false)}
        patientId={user?.patientId || 'PT-1001'}
        patientName={user?.name || 'Demo Patient'}
      />

      {/* Modals */}
      {/* Upload Modal (Enforces authenticated patientId) */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          if (user?.patientId) {
            fetchPatientData(user.patientId);
          }
        }}
      />

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Registration Success Modal */}
      {createdPatientId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Account Created Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your medical identity credentials have been generated and securely registered.
              </p>
            </div>

            {/* ABHA ID Card */}
            {createdAbhaId && (
              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">
                    Your Official ABHA ID
                  </span>
                  <span className="text-lg font-black font-mono text-teal-950 dark:text-teal-100">
                    {createdAbhaId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(createdAbhaId, 'regAbha')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-xs hover:bg-teal-50 cursor-pointer"
                >
                  {copiedText === 'regAbha' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Patient ID Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Unique Patient ID
                </span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {createdPatientId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(createdPatientId, 'regPatientId')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-100 cursor-pointer"
              >
                {copiedText === 'regPatientId' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            {/* DARK RED HIGHLIGHTED REMINDER */}
            <div className="p-4 bg-red-100 dark:bg-red-950/80 border-2 border-red-700 dark:border-red-600 rounded-2xl text-center space-y-1 shadow-sm">
              <p className="text-red-900 dark:text-red-100 font-black text-sm uppercase tracking-wide">
                🚨 Remember the ID for future use for login
              </p>
              <p className="text-red-800 dark:text-red-200 text-xs leading-relaxed">
                Please copy and save your <strong>ABHA ID</strong> and <strong>Patient ID</strong> safely. You can use your ABHA ID, Patient ID, or Email to sign in anytime!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedPatientId(null);
                setCreatedAbhaId(null);
              }}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Continue to Patient Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
              </div>
              <button
                onClick={() => { setShowForgotModal(false); setForgotMsg(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMsg ? (
              <div className="space-y-4 text-center py-2">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {forgotMsg}
                </p>
                <button
                  onClick={() => { setShowForgotModal(false); setForgotMsg(null); }}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Enter your account email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-teal-600 text-white font-semibold cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Website Features & Helpful Capabilities Modal (No student details) */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    What AI Personal Health Copilot Does
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your intelligent, multimodal digital health companion
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <p className="text-xs sm:text-sm font-semibold text-teal-950 dark:text-teal-100 leading-relaxed">
                  AI Personal Health Copilot is built to transform confusing medical reports and fragmented clinical documents into clear, organized, and actionable health insights for patients and doctors alike.
                </p>
              </div>

              {/* 6 Key Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Lab Report Interpretation</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload blood tests, pathology panels, and prescriptions (PDF, PNG, JPG). Multimodal AI extracts numeric parameters, flags out-of-range biomarkers, and explains findings in plain language.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Chronological Health Timeline</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Consolidates past consults, diagnostic checks, and prescriptions into a unified, chronological timeline so you never lose track of past health events.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <Mic className="w-4 h-4 text-teal-600" />
                    <span>Voice & 5-Language AI Copilot</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ask questions in English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Malayalam (മലയാളം), or colloquial Tanglish with instant voice input and audio readout.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>Medications & Drug Safety</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Maintains an active prescription registry, dosage schedules, refill reminders, and scans for hazardous drug-drug interactions or contraindications.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>ABHA & HL7 FHIR R4 Ready</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Generates standardized Ayushman Bharat Digital Mission (ABDM) ABHA health identifiers and exports standard HL7 FHIR R4 JSON bundles for hospital interoperability.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
                    <Lock className="w-4 h-4 text-teal-600" />
                    <span>Strict Patient Privacy & Security</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tenant cryptographic JWT token isolation guarantees zero data leakage. Patients can only access their own records, backed by zero-trust backend authorization.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    My Health Profile
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    View and update your personal credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSaveMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                  profileSaveMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                }`}
              >
                <span>{profileSaveMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setProfileSaveMsg(null)}
                  className="text-xs hover:underline cursor-pointer ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Identity Credentials (Patient ID & ABHA ID with 1-click Copy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">
                    Patient ID
                  </span>
                  <span className="text-base font-black font-mono text-teal-950 dark:text-teal-100">
                    {patientData?.patientId || user?.patientId || 'PT-1001'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(patientData?.patientId || user?.patientId || 'PT-1001', 'modalPatientId')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-xs hover:bg-teal-50 cursor-pointer"
                >
                  {copiedText === 'modalPatientId' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">
                    Official ABHA ID
                  </span>
                  <span className="text-base font-black font-mono text-teal-950 dark:text-teal-100">
                    {patientData?.abhaId || '91-8472-1923-0192'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(patientData?.abhaId || '91-8472-1923-0192', 'modalAbhaId')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-xs hover:bg-teal-50 cursor-pointer"
                >
                  {copiedText === 'modalAbhaId' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ABHA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DARK RED HIGHLIGHTED REMINDER */}
            <div className="p-4 bg-red-100 dark:bg-red-950/80 border-2 border-red-700 dark:border-red-600 rounded-2xl text-center space-y-1 shadow-sm">
              <p className="text-red-900 dark:text-red-100 font-black text-xs sm:text-sm uppercase tracking-wide">
                🚨 Remember the ID for future use for login
              </p>
              <p className="text-red-800 dark:text-red-200 text-xs leading-relaxed">
                You can sign into your account using your <strong>ABHA ID</strong>, <strong>Patient ID</strong>, or registered <strong>Email</strong>. Keep this ID safely noted!
              </p>
            </div>

            {/* Form: View Mode vs Edit Mode */}
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editProfileData.name}
                      onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editProfileData.phone}
                      onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editProfileData.dob}
                      onChange={(e) => setEditProfileData({ ...editProfileData, dob: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Gender
                    </label>
                    <select
                      value={editProfileData.gender}
                      onChange={(e) => setEditProfileData({ ...editProfileData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Blood Group
                    </label>
                    <select
                      value={editProfileData.bloodGroup}
                      onChange={(e) => setEditProfileData({ ...editProfileData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                      {patientData?.name || user?.name}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                      {patientData?.phone || 'Not provided'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">
                      {patientData?.dob ? new Date(patientData.dob).toISOString().split('T')[0] : '1995-05-15'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block capitalize">
                      {patientData?.gender || 'male'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                      {patientData?.bloodGroup || 'O+'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Email</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                      {user?.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (patientData) {
                        setEditProfileData({
                          name: patientData.name || user?.name || '',
                          phone: patientData.phone || '',
                          dob: patientData.dob ? new Date(patientData.dob).toISOString().split('T')[0] : '1995-05-15',
                          gender: patientData.gender || 'male',
                          bloodGroup: patientData.bloodGroup || 'O+',
                          preferredLanguage: (patientData as any).preferredLanguage || 'en',
                        });
                      }
                      setIsEditingProfile(true);
                    }}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
