// src/App.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import PreExamSetup from './components/PreExamSetup';
import ExamArena from './components/ExamArena';
import ExamResults from './components/ExamResults';
import RulesModal from './components/RulesModal';
import {
  checkBackendHealth,
  startExam,
  getAllQuestions,
} from './services/api';

function App() {
  // Navigation / Workflow Stages: 'SETUP' | 'EXAM' | 'RESULTS'
  const [stage, setStage] = useState('SETUP');

  // Candidate info
  const [userId, setUserId] = useState('student-101');
  const [name, setName] = useState('Aditya');

  // Hardware & Proctoring states
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);

  // Backend Integration states
  const [backendOnline, setBackendOnline] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Results & Session Details
  const [resultData, setResultData] = useState(null);
  const [finalSessionData, setFinalSessionData] = useState(null);

  // Rules Modal
  const [rulesOpen, setRulesOpen] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const webTimerIntervalRef = useRef(null);

  /**
   * Check Backend Server Connectivity (GET /)
   */
  const verifyBackend = useCallback(async () => {
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      setErrorMessage(null);
      // Preload questions list
      try {
        const questions = await getAllQuestions();
        if (Array.isArray(questions)) {
          setQuestionsList(questions);
        }
      } catch (err) {
        console.warn('Could not preload questions list yet:', err);
      }
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // Check backend connectivity on mount and periodically
  useEffect(() => {
    let isMounted = true;

    async function initialCheck() {
      try {
        await checkBackendHealth();
        if (isMounted) {
          setBackendOnline(true);
          setErrorMessage(null);
          try {
            const questions = await getAllQuestions();
            if (isMounted && Array.isArray(questions)) {
              setQuestionsList(questions);
            }
          } catch (e) {
            console.warn('Questions preload skipped:', e);
          }
        }
      } catch {
        if (isMounted) {
          setBackendOnline(false);
        }
      }
    }

    initialCheck();

    const interval = setInterval(() => {
      checkBackendHealth()
        .then(() => isMounted && setBackendOnline(true))
        .catch(() => isMounted && setBackendOnline(false));
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Save Video Screenshots (Invoked by Electron main IPC or browser timer)
   */
  const saveVideoScreenShots = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      return;
    }

    try {
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      if (!track) return;

      if (typeof ImageCapture !== 'undefined') {
        const imageCapture = new ImageCapture(track);
        const blob = await imageCapture.takePhoto();
        const arrayBuffer = await blob.arrayBuffer();

        if (window.athena && typeof window.athena.storeCameraSnapImageOnDisk === 'function') {
          window.athena.storeCameraSnapImageOnDisk(arrayBuffer);
        }
      }
      setSnapshotCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to capture video snapshot:', error);
    }
  }, []);

  // Register Electron IPC Listeners if running in Electron
  useEffect(() => {
    let removeTimerListener = () => {};
    let removeSnapListener = () => {};

    if (window.athena) {
      if (typeof window.athena.registerListenerForTimerTickFromMain === 'function') {
        removeTimerListener = window.athena.registerListenerForTimerTickFromMain((time) => {
          setTimer(typeof time === 'number' ? Math.round(time) : time);
        });
      }

      if (typeof window.athena.registerListenerForCameraSnapFromMain === 'function') {
        removeSnapListener = window.athena.registerListenerForCameraSnapFromMain(() => {
          saveVideoScreenShots();
        });
      }
    }

    return () => {
      removeTimerListener();
      removeSnapListener();
      if (webTimerIntervalRef.current) {
        clearInterval(webTimerIntervalRef.current);
      }
    };
  }, [saveVideoScreenShots]);

  /**
   * Request Webcam Access
   */
  async function getCameraAccess() {
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = videoData;
      }
      setCameraEnabled(true);
      setErrorMessage(null);
    } catch (err) {
      console.error('Camera access failed:', err);
      setErrorMessage('Could not access camera. Please allow webcam permissions in your browser/system.');
    }
  }

  /**
   * Request Full Screen
   */
  async function enableFullScreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setFullScreen(true);
      setErrorMessage(null);
    } catch (err) {
      console.error('Fullscreen request failed:', err);
      setErrorMessage('Could not enter full screen. Please allow fullscreen access.');
    }
  }

  /**
   * Start Exam Flow
   * 1. Calls POST /exam/start to create session
   * 2. Calls GET /exam/mcq to fetch questions
   * 3. Starts Electron timer and proctoring
   * 4. Transitions to EXAM arena
   */
  async function handleStartExam() {
    if (!userId.trim() || !name.trim()) {
      setErrorMessage('Please provide both Candidate ID and Name.');
      return;
    }

    try {
      setIsStarting(true);
      setErrorMessage(null);

      // 1. Initialize Exam Session in Backend (POST /exam/start)
      const startRes = await startExam(userId.trim(), name.trim());
      const activeSessionId = startRes.sessionId;
      setSessionId(activeSessionId);

      // 2. Fetch Questions (GET /exam/mcq)
      const qList = await getAllQuestions();
      setQuestionsList(qList);

      // 3. Start Proctoring & Timers
      if (window.athena && typeof window.athena.startTimerOnMain === 'function') {
        await window.athena.startTimerOnMain();
      } else {
        // Fallback timer if running outside Electron
        let elapsed = 0;
        webTimerIntervalRef.current = setInterval(() => {
          elapsed += 1;
          setTimer(elapsed);
        }, 1000);
      }

      // 4. Transition to Exam
      setStage('EXAM');
    } catch (err) {
      console.error('Failed to start exam:', err);
      setErrorMessage(err.message || 'Failed to start exam. Check backend connection.');
    } finally {
      setIsStarting(false);
    }
  }

  /**
   * Handle Exam Submitted
   */
  async function handleExamSubmitted({ result, session }) {
    if (webTimerIntervalRef.current) {
      clearInterval(webTimerIntervalRef.current);
    }
    setResultData(result);
    setFinalSessionData(session);
    setStage('RESULTS');
  }

  /**
   * Restart Assessment
   */
  async function handleRestart() {
    setStage('SETUP');
    setSessionId('');
    setTimer(0);
    setSnapshotCount(0);
    setResultData(null);
    setFinalSessionData(null);
    setErrorMessage(null);
    await verifyBackend();
  }

  return (
    <div className="app-shell">
      {/* Top Universal Header */}
      <Header
        stage={stage}
        studentName={name}
        userId={userId}
        sessionId={sessionId}
        timer={timer}
        backendOnline={backendOnline}
        onOpenRules={() => setRulesOpen(true)}
      />

      <div className="app-main-content">
        {/* Stage 1: Setup & Readiness */}
        {stage === 'SETUP' && (
          <PreExamSetup
            userId={userId}
            setUserId={setUserId}
            name={name}
            setName={setName}
            cameraEnabled={cameraEnabled}
            videoRef={videoRef}
            onGetCameraAccess={getCameraAccess}
            fullScreen={fullScreen}
            onEnableFullScreen={enableFullScreen}
            backendOnline={backendOnline}
            onCheckBackend={verifyBackend}
            onStartExam={handleStartExam}
            isStarting={isStarting}
            errorMessage={errorMessage}
            onOpenRules={() => setRulesOpen(true)}
          />
        )}

        {/* Stage 2: Active Exam Arena */}
        {stage === 'EXAM' && (
          <ExamArena
            sessionId={sessionId}
            questionsList={questionsList}
            videoRef={videoRef}
            timer={timer}
            snapshotCount={snapshotCount}
            onExamSubmitted={handleExamSubmitted}
            onOpenRules={() => setRulesOpen(true)}
          />
        )}

        {/* Stage 3: Assessment Results & Scorecard */}
        {stage === 'RESULTS' && (
          <ExamResults
            resultData={resultData}
            sessionData={finalSessionData}
            questionsList={questionsList}
            timer={timer}
            snapshotCount={snapshotCount}
            onRestart={handleRestart}
          />
        )}
      </div>

      {/* Rules Modal (Chromium in-app + Native Electron trigger) */}
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
      />
    </div>
  );
}

export default App;