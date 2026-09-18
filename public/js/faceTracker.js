/**
 * Desktop Gremlin — FaceTracker
 * 
 * Manages webcam capture and MediaPipe FaceMesh processing.
 * Extracts 3D head rotation (yaw, pitch, roll), mouth openness, and eye blinks.
 * Includes an interactive mouse & keyboard fallback simulation for camera-free testing.
 */

class FaceTracker {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.onPoseUpdate = options.onPoseUpdate || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.isTracking = false;
    this.cameraStream = null;
    this.faceMesh = null;
    this.cameraUtil = null;
    this.lastEmitTime = 0;
    this.emitInterval = 1000 / 30; // Throttle telemetry to ~30 FPS to minimize socket congestion

    // Simulation state (fallback mode)
    this.simulationActive = false;
    this.simulatedPose = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      mouthOpen: 0,
      leftEye: 1,
      rightEye: 1
    };

    // Stored references for cleanup to prevent event listener leakage
    this._onMouseMove = null;
    this._onKeyDown = null;
  }

  /**
   * Request webcam stream and initialize MediaPipe FaceMesh model.
   * Gracefully falls back to interactive simulation if permission is denied or camera is missing.
   */
  async start() {
    // If simulation was running, clean up its listeners first
    this.stopSimulation();
    this.onStatusChange('Requesting camera access...', false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam not supported in this browser environment');
      }

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.cameraStream;
        await this.videoElement.play();
      }

      this.onStatusChange('Loading MediaPipe FaceMesh model...', false);
      await this.initMediaPipe();
      this.isTracking = true;
      this.onStatusChange('Face tracking active 🟢', true);
    } catch (err) {
      console.warn('[FaceTracker] Camera initialization failed:', err);
      this.onStatusChange(`Camera unavailable (${err.message}). Using test mode 🕹️`, false);
      this.startSimulation();
    }
  }

  /**
   * Initialize MediaPipe FaceMesh pipeline and frame ingestion
   */
  async initMediaPipe() {
    if (typeof FaceMesh === 'undefined') {
      throw new Error('MediaPipe FaceMesh script not loaded');
    }

    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // Enables detailed eye pupil and iris tracking
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => this.onResults(results));

    // Continuous video frame processing loop
    if (typeof Camera !== 'undefined' && this.videoElement) {
      this.cameraUtil = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isTracking && this.videoElement && this.videoElement.readyState >= 2) {
            await this.faceMesh.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });
      await this.cameraUtil.start();
    } else {
      // Fallback frame loop using requestAnimationFrame if Camera util is not present
      const frameLoop = async () => {
        if (this.isTracking && this.videoElement && this.videoElement.readyState >= 2) {
          try {
            await this.faceMesh.send({ image: this.videoElement });
          } catch (e) {
            // Tolerate occasional frame drop
          }
        }
        if (this.isTracking) {
          requestAnimationFrame(frameLoop);
        }
      };
      requestAnimationFrame(frameLoop);
    }
  }

  /**
   * Process 468 facial landmarks into 3D head pose and facial expressions.
   * Key Landmark indices:
   *   1   = Nose Tip
   *   10  = Forehead / Glabella
   *   152 = Chin
   *   33  = Left Eye Outer Corner
   *   263 = Right Eye Outer Corner
   *   13  = Upper Lip Center
   *   14  = Lower Lip Center
   *   159 / 145 = Left Eye Upper / Lower Eyelid
   *   386 / 374 = Right Eye Upper / Lower Eyelid
   */
  onResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.onStatusChange('Searching for face... 🔍', false);
      return;
    }

    this.onStatusChange('Face detected ✅', true);
    const landmarks = results.multiFaceLandmarks[0];

    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    // 1. Calculate Face Scale References
    const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeDist = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y) || 0.1;
    const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.2;
    const midY = (forehead.y + chin.y) / 2;

    // 2. Yaw (Horizontal Head Turn)
    // Webcam feed is mirrored for the user, invert sign for intuitive head turning
    const rawYaw = -((nose.x - eyeMidX) / eyeDist) * 3.2;
    const yaw = Math.max(-1.2, Math.min(1.2, rawYaw));

    // 3. Pitch (Vertical Head Nod)
    const rawPitch = -((nose.y - midY) / faceHeight) * 3.5;
    const pitch = Math.max(-0.8, Math.min(0.8, rawPitch));

    // 4. Roll (Lateral Head Tilt)
    const rawRoll = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x);
    const roll = Math.max(-0.8, Math.min(0.8, rawRoll));

    // 5. Mouth Openness (Vertical distance between inner lips normalized by face height)
    const lipDist = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);
    const mouthRatio = lipDist / faceHeight;
    // Typical rest ratio is ~0.025, wide open is ~0.14
    const mouthOpen = Math.max(0, Math.min(1, (mouthRatio - 0.025) / 0.11));

    // 6. Eye Openness & Blinks
    let leftEye = 1.0;
    let rightEye = 1.0;
    if (landmarks[159] && landmarks[145] && landmarks[386] && landmarks[374]) {
      const leftEyeDist = Math.hypot(landmarks[145].x - landmarks[159].x, landmarks[145].y - landmarks[159].y) / faceHeight;
      const rightEyeDist = Math.hypot(landmarks[374].x - landmarks[386].x, landmarks[374].y - landmarks[386].y) / faceHeight;
      // Typical blink is < 0.015, full open is > 0.035
      leftEye = Math.max(0, Math.min(1, (leftEyeDist - 0.015) / 0.022));
      rightEye = Math.max(0, Math.min(1, (rightEyeDist - 0.015) / 0.022));
    }

    // Rate-limit emissions to ~30 FPS
    const now = Date.now();
    if (now - this.lastEmitTime >= this.emitInterval) {
      this.lastEmitTime = now;
      this.onPoseUpdate({
        yaw,
        pitch,
        roll,
        mouthOpen,
        leftEye,
        rightEye
      });
    }
  }

  /**
   * Fallback Interactive Simulation Mode:
   * Allows controlling head orientation via mouse position over preview box,
   * 'M' key to toggle mouth open/close, and 'B' key to blink.
   */
  startSimulation() {
    this.stopSimulation();
    this.simulationActive = true;
    this.onStatusChange('Test Mode: Move mouse over preview to turn head! 🖱️', true);

    this._onMouseMove = (e) => {
      if (!this.simulationActive) return;
      const previewBox = document.getElementById('visitorAvatarCanvas') || document.body;
      const rect = previewBox.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      this.simulatedPose.yaw = Math.max(-1.2, Math.min(1.2, normX * 1.2));
      this.simulatedPose.pitch = Math.max(-0.8, Math.min(0.8, normY * 0.8));
      this.simulatedPose.roll = normX * 0.3;

      this.onPoseUpdate({ ...this.simulatedPose });
    };

    this._onKeyDown = (e) => {
      if (!this.simulationActive) return;
      if (e.key === 'm' || e.key === 'M') {
        this.simulatedPose.mouthOpen = this.simulatedPose.mouthOpen > 0.5 ? 0 : 1;
        this.onPoseUpdate({ ...this.simulatedPose });
      }
      if (e.key === 'b' || e.key === 'B') {
        this.simulatedPose.leftEye = 0;
        this.simulatedPose.rightEye = 0;
        this.onPoseUpdate({ ...this.simulatedPose });
        setTimeout(() => {
          this.simulatedPose.leftEye = 1;
          this.simulatedPose.rightEye = 1;
          this.onPoseUpdate({ ...this.simulatedPose });
        }, 200);
      }
    };

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Clean up simulation event listeners to prevent duplicate handlers
   */
  stopSimulation() {
    this.simulationActive = false;
    if (this._onMouseMove) {
      window.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  /**
   * Stop camera stream and reset tracking state
   */
  stop() {
    this.isTracking = false;
    this.stopSimulation();

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.onStatusChange('Camera stopped', false);
  }
}

// Export to window object for browser access
window.FaceTracker = FaceTracker;

