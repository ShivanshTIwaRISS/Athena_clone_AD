// src/App.jsx — VEYRA Desktop Candidate Examination Platform
import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

// Components
import Header from './components/Header';
import AvailableExams from './components/AvailableExams';
import PreExamSetup from './components/PreExamSetup';
import ExamArena from './components/ExamArena';
import ExamResults from './components/ExamResults';
import AttemptHistory from './components/AttemptHistory';
import RulesModal from './components/RulesModal';
import AuthScreen from './components/AuthScreen';
import { TermsOfServiceModal, PrivacyPolicyModal } from './components/LegalModals';

// Services
import {
  initBackendPort,
  checkBackendHealth,
  startExam,
  getAllQuestions,
  getSessionDetails,
  getToken,
  clearToken,
  getAuthMe,
} from './services/api';

export default function App() {
  // Navigation / Workflow Stages: 'AUTH' | 'AVAILABLE_EXAMS' | 'SETUP' | 'EXAM' | 'RESULTS' | 'HISTORY'
  const [stage, setStage] = useState('AUTH');

  // Candidate identity (set from auth response)
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // ── Restore existing session from stored JWT on mount ──────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Attempt to re-hydrate user identity from backend
    getAuthMe()
      .then((user) => {
        setUserId(user.userId);
        setName(user.name);
        setUserEmail(user.email);
        setStage('AVAILABLE_EXAMS');
      })
      .catch(() => {
        // Token expired / invalid — clear and stay on AUTH
        clearToken();
      });
  }, []);

  // Selected Examination metadata
  const [selectedExam, setSelectedExam] = useState(null);

  // Hardware & Proctoring states
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [screenSnapshotCount, setScreenSnapshotCount] = useState(0);

  // Backend Integration states
  const [backendOnline, setBackendOnline] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Results & Session Details
  const [resultData, setResultData] = useState(null);
  const [finalSessionData, setFinalSessionData] = useState(null);

  // Rules and Legal Modals
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const webTimerIntervalRef = useRef(null);
  const webSnapshotIntervalRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mainContentRef = useRef(null); // scroll container — reset to top on stage change

  /**
   * Keep video element attached to mediaStream across component mounts/unmounts
   */
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      if (videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stage, mediaStream]);

  /**
   * Scroll the main content area back to the top on every stage transition.
   * This prevents the Results page (or any other page) from appearing mid-scroll
   * after the exam ends and the Electron window re-frames.
   */
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [stage]);

  /**
   * Listen for the Electron "exam-window-restored" signal that fires ~80ms
   * after setSimpleFullScreen(false) settles. At that point the macOS menu bar
   * has reappeared and the window has been re-sized — force a scroll reset so
   * the Results page content is never hidden behind the header.
   */
  useEffect(() => {
    const bridge = window.veyra;
    if (!bridge?.registerWindowRestoredListener) return;
    const remove = bridge.registerWindowRestoredListener(() => {
      // Small rAF delay to let Electron finish the animated setBounds
      requestAnimationFrame(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTop = 0;
        }
        // Force the browser to recalculate layout by briefly toggling overflow
        document.documentElement.style.overflow = 'hidden';
        requestAnimationFrame(() => {
          document.documentElement.style.overflow = '';
        });
      });
    });
    return () => typeof remove === 'function' && remove();
  }, []);

  /**
   * Check Backend Server Connectivity (GET /) and preload question bank
   */
  const verifyBackend = useCallback(async () => {
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      setErrorMessage(null);
      try {
        const questions = await getAllQuestions();
        if (Array.isArray(questions)) {
          setQuestionsList(questions);
        }
      } catch (err) {
        console.warn('Could not preload questions yet:', err);
      }
    } catch (err) {
      console.warn('[VEYRA] Backend health check failed:', err);
      setBackendOnline(false);
    }
  }, []);

  // Initialise dynamic port from Electron IPC (or fall back to 3000 in browser)
  useEffect(() => {
    let isMounted = true;
    initBackendPort(3000).then(() => {
      if (isMounted) verifyBackend();
    });
    // Fallback immediate check and periodic ping
    verifyBackend();
    const interval = setInterval(() => verifyBackend(), 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [verifyBackend]);

  /**
   * Request webcam access for proctoring verification
   */
  const getCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setCameraEnabled(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera access rejected or unavailable:', err);
      setCameraEnabled(false);
      setErrorMessage('Camera access was denied. Please allow webcam permissions to continue.');
    }
  };

  /**
   * Request Fullscreen mode
   */
  const enableFullScreen = async () => {
    if (window.veyra?.enableFullScreen) {
      try {
        await window.veyra.enableFullScreen();
        setFullScreen(true);
        return;
      } catch (err) {
        console.warn('IPC enableFullScreen error:', err);
      }
    }
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    setFullScreen(true);
  };

  // Auto-detect fullscreen in Electron or web on setup stage
  useEffect(() => {
    if (window.veyra?.isFullScreen) {
      window.veyra.isFullScreen().then((isFs) => {
        if (isFs) setFullScreen(true);
      }).catch(() => {});
    } else if (document.fullscreenElement) {
      setFullScreen(true);
    }
  }, [stage]);

  // Sync fullscreen state with browser events (in browser environments)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!window.veyra) {
        setFullScreen(Boolean(document.fullscreenElement));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * Capture a webcam frame using HTML5 canvas fallback
   */
  const captureWebcamBlob = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || vid.readyState < 2) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 640;
      canvas.height = vid.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      });
    } catch (err) {
      console.warn('Webcam canvas capture error:', err);
      return null;
    }
  }, []);

  /**
   * Capture and persist proctoring frames
   */
  const saveVideoScreenShots = useCallback(async () => {
    const bridge = window.veyra || window.athena;

    // 1. Capture webcam frame
    try {
      const blob = await captureWebcamBlob();
      if (blob) {
        const arrayBuf = await blob.arrayBuffer();
        if (bridge?.storeCameraSnap || bridge?.storeCameraSnapImageOnDisk) {
          const fn = bridge.storeCameraSnap || bridge.storeCameraSnapImageOnDisk;
          await fn(arrayBuf);
        }
        setSnapshotCount((c) => c + 1);
      }
    } catch (err) {
      console.warn('Webcam snapshot error:', err);
    }

    // 2. Capture desktop screen
    try {
      if (bridge?.captureScreen || bridge?.captureScreenSnap) {
        const fn = bridge.captureScreen || bridge.captureScreenSnap;
        await fn();
        setScreenSnapshotCount((c) => c + 1);
      }
    } catch (err) {
      console.warn('Screen snapshot capture error:', err);
    }
  }, [captureWebcamBlob]);

  /**
   * Stop all proctoring intervals and media tracks
   */
  const stopProctoringFlow = useCallback(() => {
    const bridge = window.veyra || window.athena;
    if (bridge?.exitExamLockdown) {
      try {
        bridge.exitExamLockdown();
      } catch (err) {
        console.warn('Failed to exit lockdown:', err);
      }
    }
    if (bridge?.stopProctoring || bridge?.stopProctoringOnMain) {
      const fn = bridge.stopProctoring || bridge.stopProctoringOnMain;
      try {
        fn();
      } catch (err) {
        console.warn('Failed to stop proctoring on bridge:', err);
      }
    }

    if (webTimerIntervalRef.current) {
      clearInterval(webTimerIntervalRef.current);
      webTimerIntervalRef.current = null;
    }
    if (webSnapshotIntervalRef.current) {
      clearInterval(webSnapshotIntervalRef.current);
      webSnapshotIntervalRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setMediaStream(null);
    setCameraEnabled(false);
  }, []);

  /**
   * Register Electron IPC listeners for timer ticks & snapshot signals
   */
  useEffect(() => {
    const bridge = window.veyra || window.athena;
    if (!bridge) return;

    const removers = [];

    // Timer listener
    const timerFn = bridge.registerTimerListener || bridge.registerListenerForTimerTickFromMain;
    if (timerFn) {
      const rm = timerFn((seconds) => {
        setTimer(typeof seconds === 'number' ? Math.round(seconds) : seconds);
      });
      if (rm) removers.push(rm);
    }

    // Camera shot listener
    const camFn = bridge.registerCameraSnapListener || bridge.registerListenerForCameraSnapFromMain;
    if (camFn) {
      const rm = camFn(async () => {
        await saveVideoScreenShots();
      });
      if (rm) removers.push(rm);
    }

    // Screen snap listener
    const screenFn = bridge.registerScreenSnapListener || bridge.registerListenerForScreenSnapFromMain;
    if (screenFn) {
      const rm = screenFn(() => {
        setScreenSnapshotCount((c) => c + 1);
      });
      if (rm) removers.push(rm);
    }

    return () => {
      removers.forEach((r) => typeof r === 'function' && r());
    };
  }, [saveVideoScreenShots]);

  /**
   * Start Examination Session
   */
  const handleStartExam = async () => {
    if (!userId.trim() || !name.trim()) {
      setErrorMessage('Please enter both your Student ID and Full Name.');
      return;
    }

    try {
      setIsStarting(true);
      setErrorMessage(null);

      // 1. Initialize session on backend (POST /exam/start)
      const startRes = await startExam(userId.trim(), name.trim());
      const newSessionId = startRes?.sessionId;

      if (!newSessionId) {
        throw new Error('Backend did not return a valid session ID');
      }

      setSessionId(newSessionId);
      setTimer(0);
      setSnapshotCount(0);
      setScreenSnapshotCount(0);

      // 2. Fetch fresh question list
      const questions = await getAllQuestions();
      setQuestionsList(Array.isArray(questions) ? questions : []);

      // 3. Start proctoring via Electron IPC or web timer fallback
      const bridge = window.veyra || window.athena;
      if (bridge?.startProctoring || bridge?.startTimerOnMain) {
        const fn = bridge.startProctoring || bridge.startTimerOnMain;
        await fn();
      } else {
        // Browser fallback: 1s timer
        webTimerIntervalRef.current = setInterval(() => {
          setTimer((t) => t + 1);
        }, 1000);

        // Periodic snapshot: every 10s
        webSnapshotIntervalRef.current = setInterval(() => {
          saveVideoScreenShots();
        }, 10000);
      }

      // Initial baseline snapshot
      setTimeout(() => {
        saveVideoScreenShots();
      }, 1000);

      // 4. Engage Full Window Lockdown & Transition to Exam Arena
      if (bridge?.enterExamLockdown) {
        try {
          bridge.enterExamLockdown();
        } catch (err) {
          console.warn('Failed to enter lockdown:', err);
        }
      }
      setStage('EXAM');
    } catch (err) {
      console.error('Error starting examination:', err);
      setErrorMessage(err.message || 'Failed to start examination session. Is the backend running?');
    } finally {
      setIsStarting(false);
    }
  };

  /**
   * Exam Submission Handler
   */
  const handleExamSubmitted = async (submissionResult) => {
    stopProctoringFlow();

    try {
      if (sessionId) {
        const sessionDetails = await getSessionDetails(sessionId);
        setFinalSessionData(sessionDetails);
      }
    } catch (err) {
      console.warn('Could not fetch final session details:', err);
    }

    setResultData(submissionResult);
    setStage('RESULTS');
  };

  /**
   * Return to Available Assessments
   */
  const handleRestartFlow = () => {
    stopProctoringFlow();
    setSessionId('');
    setResultData(null);
    setFinalSessionData(null);
    setTimer(0);
    setSnapshotCount(0);
    setScreenSnapshotCount(0);
    setErrorMessage(null);
    setStage('AVAILABLE_EXAMS');
    verifyBackend();
  };

  /**
   * Auth Success — called by AuthScreen after login / signup
   */
  const handleAuthSuccess = ({ userId: uid, name: uname, email }) => {
    setUserId(uid);
    setName(uname);
    setUserEmail(email);
    setStage('AVAILABLE_EXAMS');
  };

  /**
   * Logout — clear token and return to auth screen
   */
  const handleLogout = () => {
    stopProctoringFlow();
    clearToken();
    setUserId('');
    setName('');
    setUserEmail('');
    setSessionId('');
    setResultData(null);
    setFinalSessionData(null);
    setStage('AUTH');
  };

  /**
   * Select an assessment and proceed to verification
   */
  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setStage('SETUP');
  };

  return (
    <div className="app-shell">
      {/* ── AUTH SCREEN (no header/footer) ── */}
      {stage === 'AUTH' && (
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          backendOnline={backendOnline}
        />
      )}
      {/* Top Header — only shown outside auth screen */}
      {stage !== 'AUTH' && (
        <Header
          stage={stage}
          studentName={name}
          userId={userId}
          userEmail={userEmail}
          sessionId={sessionId}
          timer={timer}
          backendOnline={backendOnline}
          onOpenRules={() => setRulesOpen(true)}
          onLogout={handleLogout}
          onNavigate={(newStage) => {
            if (stage !== 'EXAM') {
              setStage(newStage);
            }
          }}
        />
      )}

      {/* Main Content Area — only shown outside auth screen */}
      {stage !== 'AUTH' && <main className="app-main-content" ref={mainContentRef}>
        {/* Stage 1: Available Examinations */}
        {stage === 'AVAILABLE_EXAMS' && (
          <AvailableExams
            questionsCount={questionsList.length}
            backendOnline={backendOnline}
            onSelectExam={handleSelectExam}
            onNavigate={(target) => setStage(target)}
            onOpenRules={() => setRulesOpen(true)}
          />
        )}

        {/* Stage 2: Pre-Exam Setup & Verification */}
        {stage === 'SETUP' && (
          <div>
            <div className="d-flex align-center justify-between mb-3">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setStage('AVAILABLE_EXAMS')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Available Assessments
              </button>
              {selectedExam && (
                <span className="badge-pill badge-neutral">
                  Assessment: <strong>{selectedExam.title}</strong>
                </span>
              )}
            </div>

            <PreExamSetup
              userId={userId}
              name={name}
              cameraEnabled={cameraEnabled}
              mediaStream={mediaStream}
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
          </div>
        )}

        {/* Stage 3: Timed Examination Arena */}
        {stage === 'EXAM' && (
          <ExamArena
            sessionId={sessionId}
            questionsList={questionsList}
            videoRef={videoRef}
            mediaStream={mediaStream}
            timer={timer}
            snapshotCount={snapshotCount}
            screenSnapshotCount={screenSnapshotCount}
            onExamSubmitted={handleExamSubmitted}
            onOpenRules={() => setRulesOpen(true)}
          />
        )}

        {/* Stage 4: Results & Response Breakdown */}
        {stage === 'RESULTS' && (
          <ExamResults
            resultData={resultData}
            sessionData={finalSessionData}
            questionsList={questionsList}
            timer={timer}
            snapshotCount={snapshotCount}
            screenSnapshotCount={screenSnapshotCount}
            onRestart={handleRestartFlow}
            onBack={() => setStage('HISTORY')}
            onViewHistory={() => setStage('HISTORY')}
          />
        )}

        {/* Stage 5: Candidate Attempt History */}
        {stage === 'HISTORY' && (
          <AttemptHistory
            userId={userId}
            onNavigate={(target) => setStage(target)}
            onReviewSession={async (session) => {
              try {
                const fullSession = await getSessionDetails(session.sessionId);
                setFinalSessionData(fullSession);
                setResultData({
                  attempted: fullSession.attempted ?? session.attempted,
                  correct: fullSession.correct ?? session.correct,
                  wrong: fullSession.wrong ?? session.wrong,
                });
              } catch {
                setFinalSessionData(session);
                setResultData({
                  attempted: session.attempted,
                  correct: session.correct,
                  wrong: session.wrong,
                });
              }
              setStage('RESULTS');
            }}
          />
        )}
      </main>}

      {/* Institutional App Footer — visible outside exam and auth */}
      {stage !== 'AUTH' && stage !== 'EXAM' && (
        <footer className="app-institutional-footer">
          <div className="footer-left">
            <span>VEYRA Secure Assessment Engine | Enterprise v2.4</span>
            <span>Station ID: {userId || 'Candidate Terminal'}</span>
          </div>
          <div className="footer-right">
            <button type="button" className="footer-link-btn" onClick={() => setTosOpen(true)}>
              Terms of Examination
            </button>
            <span className="footer-sep">|</span>
            <button type="button" className="footer-link-btn" onClick={() => setPrivacyOpen(true)}>
              Biometric &amp; Proctoring Privacy
            </button>
            <span className="footer-sep">|</span>
            <button type="button" className="footer-link-btn" onClick={() => setRulesOpen(true)}>
              Examination Regulations
            </button>
          </div>
        </footer>
      )}

      {/* Rules and Legal Modals */}
      {stage !== 'AUTH' && <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />}
      <TermsOfServiceModal isOpen={tosOpen} onClose={() => setTosOpen(false)} />
      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}