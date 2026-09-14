// App.jsx
import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const videoRef = useRef(null);

  const [timer, setTimer] = useState('');

  useEffect(() => {
    const removeListener = window.athena.registerListenerForTimerTickFromMain(setTimer);
    return removeListener;
  }, []);

  async function getCameraAccess() {
    // get the camera access using browser feature called navigator, returns media stream that contains the stream of video and audio data, if provided else will navigate to the catch block
    try {
      const videoData = await navigator.mediaDevices.getUserMedia({
        video: true
      });


      // make
      if (videoRef.current) {
        videoRef.current.srcObject = videoData
      }
      setCameraEnabled(true);
    } catch (error) {
      alert('Cannot access Camera');
    }
  }

  async function enableFullScreen() {
    try {
      const response = await document.documentElement.requestFullscreen();
      setFullScreen(true);
    } catch (error) {
      alert('Cannot access full screen');
    }
  }


  return (
    <div className="page-container">
      {/* Main Card */}
      <div className="card-container">
        {/* Section 1: Camera / Heimdall */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Configure Camera</h3>
            <p>Kindly configure Camera to attempt quiz/contests.</p>
            <div className="action-row">
              <button
                className="btn btn-black"
                disabled={cameraEnabled}
                onClick={getCameraAccess}
              >
                {cameraEnabled ? 'Camera Connected' : 'Get Camera Access'}
              </button>

              {/* Hidden/Active Video Feed Preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`video-preview`}
              />
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Section 2: Fullscreen */}
        <div className="permission-item">
          <div className="permission-content">
            <h3>Switch to full screen</h3>
            <button
              className="btn btn-primary"
              disabled={fullScreen}
              onClick={() => {
                enableFullScreen();
              }}
            >
              {fullScreen ? 'Full Screen Enabled' : 'Give Full Screen Permissions'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="bottom-actions">
        <button
          className="btn btn-primary"
          disabled={!cameraEnabled || !fullScreen}
          onClick={async () => {
            try {
              const response = await window.athena.startTimerOnMain();
            } catch (error) {

            }
          }}
        >
          Go To Test
        </button>
      </div>

      <div>
        {timer + ' (s) elapsed'}
      </div>
    </div>
  );
}

export default App

