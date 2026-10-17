// src/App.jsx — VEYRA Root Application
import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

// Services
import {
  checkBackendHealth,
  getToken, setToken, setStoredUser, clearAuth,
  signIn, firstRunSetup, getCurrentUser,
  getExamQuestions, startExam, recordProctoringSnap,
} from './services/api';

// Views
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import ExamList from './components/ExamList';
import QuestionBank from './components/QuestionBank';
import ExamEditor from './components/ExamEditor';
import PreExamSetup from './components/PreExamSetup';
import ExamArena from './components/ExamArena';
import ExamResults from './components/ExamResults';
import AttemptHistory from './components/AttemptHistory';
import SettingsView from './components/SettingsView';
import RulesModal from './components/RulesModal';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import CandidateDashboard from './components/CandidateDashboard';
import UserManagement from './components/UserManagement';

// ── IPC bridge (Electron or null) ───────────────────────────────────────────
const ipc = window.veyra || window.athena || null;

function App() {
  // ── App init state ───────────────────────────────────────────────────────
  const [appState, setAppState] = useState('loading'); // 'loading'|'auth'|'setup'|'app'
  const [setupRequired, setSetupRequired] = useState(false);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);

  // ── Navigation ───────────────────────────────────────────────────────────
  // Admin views: 'dashboard'|'exams'|'exam-editor'|'questions'|'sessions'|'analytics'|'settings'|'users'
  // Candidate views: 'candidate-dashboard'|'exam-setup'|'exam-arena'|'exam-results'|'history'
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  // ── Exam flow ────────────────────────────────────────────────────────────
  const [selectedExam, setSelectedExam] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [sessionDuration, setSessionDuration] = useState(1800);
  const [questionsList, setQuestionsList] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [finalSessionData, setFinalSessionData] = useState(null);

  // ── Proctoring ───────────────────────────────────────────────────────────
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [screenSnapshotCount, setScreenSnapshotCount] = useState(0);

  // ── Backend ──────────────────────────────────────────────────────────────
  const [backendOnline, setBackendOnline] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // ── Misc ─────────────────────────────────────────────────────────────────
  const [rulesOpen, setRulesOpen] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const webSnapshotIntervalRef = useRef(null);

  // ── Video sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [view, mediaStream]);

  // ── Camera snap capture ───────────────────────────────────────────────────
  const saveVideoScreenShots = useCallback(async () => {
    const video = videoRef.current;
    const stream = mediaStreamRef.current || (video ? video.srcObject : null);
    if (!video && !stream) return;

    let buf = null;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
          if (blob) buf = await blob.arrayBuffer();
        }
      } catch { /* ignore */ }
    }

    if (!buf && stream) {
      try {
        const track = stream.getVideoTracks()[0];
        if (track && typeof ImageCapture !== 'undefined') {
          const ic = new ImageCapture(track);
          const blob = await ic.takePhoto();
          buf = await blob.arrayBuffer();
        }
      } catch { /* ignore */ }
    }

    if (buf) {
      if (ipc?.storeCameraSnap) ipc.storeCameraSnap(buf);
      else if (ipc?.storeCameraSnapImageOnDisk) ipc.storeCameraSnapImageOnDisk(buf);
      setSnapshotCount((p) => p + 1);

      // Report to backend
      if (sessionId) {
        recordProctoringSnap(sessionId, 'camera').catch(() => {});
      }
    }
  }, [sessionId]);

  // ── IPC listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ipc) return;
    const removers = [];

    if (ipc.registerListenerForCameraSnapFromMain) {
      removers.push(ipc.registerListenerForCameraSnapFromMain(() => saveVideoScreenShots()));
    }
    if (ipc.registerCameraSnapListener) {
      removers.push(ipc.registerCameraSnapListener(() => saveVideoScreenShots()));
    }
    if (ipc.registerListenerForScreenSnapFromMain) {
      removers.push(ipc.registerListenerForScreenSnapFromMain(() => {
        setScreenSnapshotCount((p) => p + 1);
        if (sessionId) recordProctoringSnap(sessionId, 'screen').catch(() => {});
      }));
    }
    if (ipc.registerScreenSnapListener) {
      removers.push(ipc.registerScreenSnapListener(() => {
        setScreenSnapshotCount((p) => p + 1);
      }));
    }

    return () => {
      removers.forEach((r) => typeof r === 'function' && r());
      if (webSnapshotIntervalRef.current) clearInterval(webSnapshotIntervalRef.current);
    };
  }, [saveVideoScreenShots, sessionId]);

  // ── Health check ──────────────────────────────────────────────────────────
  const verifyBackend = useCallback(async () => {
    try {
      const health = await checkBackendHealth();
      setBackendOnline(true);
      setErrorMessage(null);
      return health;
    } catch {
      setBackendOnline(false);
      return null;
    }
  }, []);

  // ── Initial app boot ──────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      setAppState('loading');
      try {
        const health = await checkBackendHealth();
        setBackendOnline(true);

        // Check if first-run setup needed
        if (health.setupRequired) {
          setSetupRequired(true);
          setAppState('auth');
          return;
        }

        // Check if already authenticated
        const token = getToken();
        if (token) {
          try {
            const user = await getCurrentUser();
            setCurrentUser(user);
            setStoredUser(user);
            setAppState('app');
            setView(user.role === 'admin' ? 'dashboard' : 'candidate-dashboard');
            return;
          } catch {
            clearAuth();
          }
        }

        setAppState('auth');
      } catch {
        setBackendOnline(false);
        setAppState('auth'); // Show auth screen with offline warning
      }
    }
    boot();
  }, []);

  // Periodic health ping
  useEffect(() => {
    const interval = setInterval(() => verifyBackend(), 15000);
    return () => clearInterval(interval);
  }, [verifyBackend]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  async function handleSignIn({ email, password }) {
    const res = await signIn({ email, password });
    setToken(res.token);
    setStoredUser(res.user);
    setCurrentUser(res.user);
    setAppState('app');
    setView(res.user.role === 'admin' ? 'dashboard' : 'candidate-dashboard');
  }

  async function handleFirstRunSetup({ name, email, password }) {
    const res = await firstRunSetup({ name, email, password });
    setToken(res.token);
    setStoredUser(res.user);
    setCurrentUser(res.user);
    setSetupRequired(false);
    setAppState('app');
    setView('dashboard');
  }

  function handleSignOut() {
    clearAuth();
    setCurrentUser(null);
    stopProctoringFlow();
    setView('dashboard');
    setAppState('auth');
  }

  // ── Proctoring helpers ────────────────────────────────────────────────────
  async function getCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraEnabled(true);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(`Camera access failed: ${err.message}. Please allow webcam permission.`);
    }
  }

  function stopProctoringFlow() {
    if (ipc?.stopProctoring) ipc.stopProctoring();
    else if (ipc?.stopProctoringOnMain) ipc.stopProctoringOnMain();
    if (webSnapshotIntervalRef.current) {
      clearInterval(webSnapshotIntervalRef.current);
      webSnapshotIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setMediaStream(null);
    setCameraEnabled(false);
    setConsentGiven(false);
  }

  // ── Exam start ────────────────────────────────────────────────────────────
  async function handleStartExam(examId) {
    try {
      setIsStarting(true);
      setErrorMessage(null);

      const startRes = await startExam(examId);
      const activeSessionId = startRes.sessionId;
      setSessionId(activeSessionId);
      setSessionDuration(startRes.durationSeconds || 1800);

      const qList = await getExamQuestions(examId);
      setQuestionsList(qList);

      // Start proctoring
      if (ipc?.startProctoring) {
        await ipc.startProctoring({ webcamInterval: 5000, screenInterval: 10000 });
      } else if (ipc?.startTimerOnMain) {
        await ipc.startTimerOnMain();
      } else {
        // Browser fallback
        if (webSnapshotIntervalRef.current) clearInterval(webSnapshotIntervalRef.current);
        webSnapshotIntervalRef.current = setInterval(() => saveVideoScreenShots(), 5000);
      }

      setSnapshotCount(0);
      setScreenSnapshotCount(0);

      // Immediate first snap
      setTimeout(() => saveVideoScreenShots(), 1000);

      setView('exam-arena');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start exam. Check backend connection.');
    } finally {
      setIsStarting(false);
    }
  }

  // ── Exam submitted ─────────────────────────────────────────────────────────
  function handleExamSubmitted({ result, session }) {
    stopProctoringFlow();
    setResultData(result);
    setFinalSessionData(session);
    setView('exam-results');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(newView, params = {}) {
    setViewParams(params);
    setView(newView);
    setErrorMessage(null);
  }

  function handleStartExamSetup(exam) {
    setSelectedExam(exam);
    navigate('exam-setup');
  }

  function handleRestartFlow() {
    setSessionId('');
    setQuestionsList([]);
    setResultData(null);
    setFinalSessionData(null);
    stopProctoringFlow();
    navigate(currentUser?.role === 'admin' ? 'dashboard' : 'candidate-dashboard');
  }

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <div className="page-loader">
        <div className="loader-logo">V</div>
        <div className="loader-text">VEYRA</div>
        <div className="loader-sub">Smart Assessments. Seamless Execution.</div>
        <div className="loader-bar"><div className="loader-bar-fill" /></div>
      </div>
    );
  }

  // ── Render: Auth ───────────────────────────────────────────────────────────
  if (appState === 'auth') {
    return (
      <AuthScreen
        isSetup={setupRequired}
        backendOnline={backendOnline}
        onSignIn={handleSignIn}
        onSetup={handleFirstRunSetup}
        onRetryBackend={verifyBackend}
      />
    );
  }

  // ── Render: Application ───────────────────────────────────────────────────
  const isCandidate = currentUser?.role === 'candidate';
  const isAdmin = currentUser?.role === 'admin';
  const isExamActive = view === 'exam-arena';

  return (
    <div className="app-shell">
      <AppHeader
        currentUser={currentUser}
        view={view}
        backendOnline={backendOnline}
        sessionId={sessionId}
        sessionDuration={sessionDuration}
        onSignOut={handleSignOut}
        onOpenRules={() => setRulesOpen(true)}
        isExamActive={isExamActive}
      />

      <div className="app-layout">
        {/* Sidebar (hidden during exam) */}
        {!isExamActive && (
          <Sidebar
            currentUser={currentUser}
            view={view}
            onNavigate={navigate}
          />
        )}

        {/* Main Content */}
        <main className="app-main-content">

          {/* ── Admin views ─────────────────────────────────────── */}
          {isAdmin && view === 'dashboard' && (
            <AdminDashboard
              currentUser={currentUser}
              onNavigate={navigate}
            />
          )}
          {isAdmin && view === 'exams' && (
            <ExamList
              onNavigate={navigate}
              onCreateExam={() => navigate('exam-editor', { mode: 'create' })}
              onEditExam={(exam) => navigate('exam-editor', { mode: 'edit', exam })}
            />
          )}
          {isAdmin && view === 'exam-editor' && (
            <ExamEditor
              mode={viewParams.mode || 'create'}
              initialExam={viewParams.exam}
              onDone={() => navigate('exams')}
              onCancel={() => navigate('exams')}
            />
          )}
          {isAdmin && view === 'questions' && (
            <QuestionBank onNavigate={navigate} />
          )}
          {isAdmin && view === 'users' && (
            <UserManagement onNavigate={navigate} />
          )}
          {isAdmin && view === 'analytics' && (
            <AdminDashboard
              currentUser={currentUser}
              onNavigate={navigate}
              showAnalytics
            />
          )}
          {isAdmin && view === 'settings' && (
            <SettingsView currentUser={currentUser} />
          )}
          {isAdmin && view === 'sessions' && (
            <AttemptHistory
              isAdmin
              onNavigate={navigate}
            />
          )}

          {/* ── Candidate views ──────────────────────────────────── */}
          {isCandidate && view === 'candidate-dashboard' && (
            <CandidateDashboard
              currentUser={currentUser}
              onStartExamSetup={handleStartExamSetup}
              onNavigate={navigate}
            />
          )}
          {view === 'exam-setup' && (
            <PreExamSetup
              exam={selectedExam}
              currentUser={currentUser}
              cameraEnabled={cameraEnabled}
              mediaStream={mediaStream}
              videoRef={videoRef}
              consentGiven={consentGiven}
              setConsentGiven={setConsentGiven}
              onGetCameraAccess={getCameraAccess}
              backendOnline={backendOnline}
              onCheckBackend={verifyBackend}
              onStartExam={handleStartExam}
              isStarting={isStarting}
              errorMessage={errorMessage}
              onOpenRules={() => setRulesOpen(true)}
            />
          )}
          {view === 'exam-arena' && (
            <ExamArena
              sessionId={sessionId}
              sessionDuration={sessionDuration}
              questionsList={questionsList}
              videoRef={videoRef}
              mediaStream={mediaStream}
              snapshotCount={snapshotCount}
              screenSnapshotCount={screenSnapshotCount}
              onCaptureSnapshot={saveVideoScreenShots}
              onExamSubmitted={handleExamSubmitted}
              onOpenRules={() => setRulesOpen(true)}
            />
          )}
          {view === 'exam-results' && (
            <ExamResults
              resultData={resultData}
              sessionData={finalSessionData}
              questionsList={questionsList}
              snapshotCount={snapshotCount}
              screenSnapshotCount={screenSnapshotCount}
              onRestart={handleRestartFlow}
              onNavigate={navigate}
            />
          )}
          {view === 'history' && (
            <AttemptHistory
              isAdmin={isAdmin}
              onNavigate={navigate}
            />
          )}
          {view === 'settings' && !isAdmin && (
            <SettingsView currentUser={currentUser} />
          )}

        </main>
      </div>

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default App;