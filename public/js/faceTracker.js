/**
 * FaceTracker handles webcam capture and MediaPipe FaceMesh processing.
 * Extracts head rotation (pitch, yaw, roll), mouth openness, and eye blinks.
 * Includes fallback interactive simulation when camera is unavailable.
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
    this.emitInterval = 1000 / 30; // ~30 FPS emission throttle

    this.simulationActive = false;
    this.simulatedPose = {
      yaw: 0,
      pitch: 0,
      roll: 0,
      mouthOpen: 0,
      leftEye: 1,
      rightEye: 1
    };
  }

  /**
   * Start webcam and initialize MediaPipe FaceMesh
   */
  async start() {
    this.onStatusChange('Requesting camera access...', false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam not supported in this browser');
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
      console.warn('[FaceTracker] Camera or MediaPipe initialization failed:', err);
      this.onStatusChange(`Camera unavailable: ${err.message}. Using test mode 🕹️`, false);
      this.startSimulation();
    }
  }

  /**
   * Initialize MediaPipe FaceMesh pipeline
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
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => this.onResults(results));

    // Continuous frame processing via Camera utils or requestVideoFrameCallback
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
      // Fallback loop using requestAnimationFrame
      const loop = async () => {
        if (this.isTracking && this.videoElement && this.videoElement.readyState >= 2) {
          try {
            await this.faceMesh.send({ image: this.videoElement });
          } catch (e) {
            // ignore frame drops
          }
        }
        if (this.isTracking) {
          requestAnimationFrame(loop);
        }
      };
      requestAnimationFrame(loop);
    }
  }

  /**
   * Process FaceMesh 468 landmarks into 3D head pose and facial expressions
   */
  onResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.onStatusChange('Searching for face... 🔍', false);
      return;
    }

    this.onStatusChange('Face detected ✅', true);
    const landmarks = results.multiFaceLandmarks[0];

    // Key Landmark indices in MediaPipe FaceMesh:
    // 1: Nose tip
    // 10: Forehead / Glabella
    // 152: Chin
    // 33: Left eye outer corner (from subject's perspective)
    // 263: Right eye outer corner
    // 13: Upper lip center
    // 14: Lower lip center
    // 159, 145: Left eye top & bottom
    // 386, 374: Right eye top & bottom

    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    // 1. Face Dimensions
    const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeDist = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y) || 0.1;
    const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.2;
    const midY = (forehead.y + chin.y) / 2;

    // 2. Yaw (turn left/right): horizontal displacement of nose relative to eye midpoint
    // Webcam is mirrored, invert for intuitive mirroring
    const rawYaw = -((nose.x - eyeMidX) / eyeDist) * 3.2;
    const yaw = Math.max(-1.2, Math.min(1.2, rawYaw));

    // 3. Pitch (nod up/down): vertical displacement of nose relative to forehead/chin midpoint
    const rawPitch = -((nose.y - midY) / faceHeight) * 3.5;
    const pitch = Math.max(-0.8, Math.min(0.8, rawPitch));

    // 4. Roll (tilt head sideways): angle between the two eyes
    const rawRoll = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x);
    const roll = Math.max(-0.8, Math.min(0.8, rawRoll));

    // 5. Mouth Openness: distance between upper and lower inner lips
    const lipDist = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);
    const mouthRatio = lipDist / faceHeight;
    // Typical closed is ~0.02, wide open is ~0.14
    const mouthOpen = Math.max(0, Math.min(1, (mouthRatio - 0.025) / 0.11));

    // 6. Eye Blinks
    let leftEye = 1.0;
    let rightEye = 1.0;
    if (landmarks[159] && landmarks[145] && landmarks[386] && landmarks[374]) {
      const leftEyeDist = Math.hypot(landmarks[145].x - landmarks[159].x, landmarks[145].y - landmarks[159].y) / faceHeight;
      const rightEyeDist = Math.hypot(landmarks[374].x - landmarks[386].x, landmarks[374].y - landmarks[386].y) / faceHeight;
      // Closed ~0.012, open ~0.035
      leftEye = Math.max(0, Math.min(1, (leftEyeDist - 0.015) / 0.022));
      rightEye = Math.max(0, Math.min(1, (rightEyeDist - 0.015) / 0.022));
    }

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
   * Simulation / Test mode fallback: Allows controlling the 3D head with mouse
   */
  startSimulation() {
    this.simulationActive = true;
    this.onStatusChange('Test Mode: Move mouse over preview to turn head! 🖱️', true);

    const onMouseMove = (e) => {
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

    window.addEventListener('mousemove', onMouseMove);

    // Press 'M' key in simulation mode to toggle mouth open/close, 'B' to blink
    window.addEventListener('keydown', (e) => {
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
    });
  }

  stop() {
    this.isTracking = false;
    this.simulationActive = false;
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

// Export to window
window.FaceTracker = FaceTracker;

