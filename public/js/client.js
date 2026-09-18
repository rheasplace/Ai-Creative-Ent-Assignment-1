/**
 * Desktop Gremlin — Client Application
 * 
 * Interactive Remote Desktop Invasion Engine:
 * - Unified 60 FPS desktop renderer with draggable icons and windows
 * - 3D Three.js Gremlin Head overlay with MediaPipe facial puppetry
 * - Interactive chaos suite: icon grabbing/flinging, window smashing, graffiti stamps,
 *   confetti explosions, screen shake physics, and sticky notes
 * - Real desktop screen sharing via WebRTC + getDisplayMedia
 * - Procedural 8-bit sound effects via Web Audio API
 * - Bi-directional Socket.IO state synchronization between Host and Visitor
 */

// Initialize Socket.IO connection
const socket = io();

// ==========================================
// Web Audio API Procedural Sound Synthesizer
// ==========================================
class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playGrab() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playDrop() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playWindowClose() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Noise blast for smash effect
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playConfetti() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const now = this.ctx.currentTime + idx * 0.05;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  playShake() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playStamp() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playAlert() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554.37].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const time = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.2);
    });
  }
}

const soundFX = new SoundFX();

// ==========================================
// Client State Container
// ==========================================
const gameState = {
  role: null, // 'host' (desktop owner) or 'visitor' (desktop invader)
  roomCode: null,
  connected: false,
  soundEnabled: true,
  screenShareActive: false,
  deskState: {
    icons: [],
    windows: [],
    stamps: [],
    stickyNotes: [],
    gremlinPos: { x: 512, y: 288 },
    gremlinMode: 'head-tracked',
    gremlinPose: {
      yaw: 0,
      pitch: 0,
      roll: 0,
      mouthOpen: 0,
      leftEye: 1,
      rightEye: 1,
      x: 512,
      y: 288
    }
  },
  localGremlinPos: { x: 512, y: 288 },
  localGremlinPose: {
    yaw: 0,
    pitch: 0,
    roll: 0,
    mouthOpen: 0,
    leftEye: 1,
    rightEye: 1,
    x: 512,
    y: 288
  },
  heldIconId: null,
  draggedWindowId: null,
  dragOffset: { x: 0, y: 0 },
  hoverTarget: null,
  confettiParticles: []
};

// DOM References
const screens = {
  title: document.getElementById('titleScreen'),
  roomCode: document.getElementById('roomCodeScreen'),
  join: document.getElementById('joinScreen'),
  game: document.getElementById('gameScreen')
};

const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const endHost = document.getElementById('endHost');
const joinSubmit = document.getElementById('joinSubmit');
const roomCodeInput = document.getElementById('roomCodeInput');
const cancelJoin = document.getElementById('cancelJoin');
const joinError = document.getElementById('joinError');
const endSession = document.getElementById('endSession');
const roleLabel = document.getElementById('roleLabel');
const roomBadge = document.getElementById('roomBadge');
const statusLabel = document.getElementById('statusLabel');
const shareScreenBtn = document.getElementById('shareScreenBtn');
const toggleSoundBtn = document.getElementById('toggleSoundBtn');
const canvasContainer = document.getElementById('canvasContainer');
const desktopCanvas = document.getElementById('desktopCanvas');
const threeCanvas = document.getElementById('threeCanvas');
const screenShareVideo = document.getElementById('screenShareVideo');
const chaosToolbar = document.getElementById('chaosToolbar');
const actionTooltip = document.getElementById('actionTooltip');
const floatingPip = document.getElementById('floatingPip');
const pipHeader = document.getElementById('pipHeader');
const pipBody = document.getElementById('pipBody');
const pipMinimizeBtn = document.getElementById('pipMinimizeBtn');
const visitorAvatarCanvas = document.getElementById('visitorAvatarCanvas');
const webcamVideo = document.getElementById('webcamVideo');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const faceTrackingStatus = document.getElementById('faceTrackingStatus');
const gremlinDebug = document.getElementById('gremlinDebug');

// Chaos toolbar buttons
const btnGrab = document.getElementById('btnGrab');
const btnSlam = document.getElementById('btnSlam');
const btnStamp = document.getElementById('btnStamp');
const btnConfetti = document.getElementById('btnConfetti');
const btnShake = document.getElementById('btnShake');
const btnSticky = document.getElementById('btnSticky');
const btnAlert = document.getElementById('btnAlert');

// Sticky modal elements
const stickyModal = document.getElementById('stickyModal');
const stickyInput = document.getElementById('stickyInput');
const stickySubmit = document.getElementById('stickySubmit');
const stickyCancel = document.getElementById('stickyCancel');

// Canvas 2D Context & 3D Engines
const desktopCtx = desktopCanvas ? desktopCanvas.getContext('2d') : null;
let gremlin3D = null;
let visitorMirror3D = null;
let faceTracker = null;
let peerConnection = null;
let localMediaStream = null;

// ==========================================
// Screen Navigation
// ==========================================
function showScreen(screenName) {
  Object.values(screens).forEach((screen) => {
    if (screen) screen.classList.add('hidden');
  });
  if (screens[screenName]) {
    screens[screenName].classList.remove('hidden');
  }
}

hostBtn.addEventListener('click', () => socket.emit('host:create'));
joinBtn.addEventListener('click', () => showScreen('join'));
cancelJoin.addEventListener('click', () => showScreen('title'));
endHost.addEventListener('click', () => cleanupAndExit());
endSession.addEventListener('click', () => cleanupAndExit());

joinSubmit.addEventListener('click', () => {
  const code = roomCodeInput.value.trim();
  if (code.length < 6) {
    joinError.textContent = 'Please enter a valid 6-digit room code';
    return;
  }
  joinError.textContent = '';
  socket.emit('visitor:join', { roomCode: code });
});

// Audio toggle
if (toggleSoundBtn) {
  toggleSoundBtn.addEventListener('click', () => {
    soundFX.enabled = !soundFX.enabled;
    toggleSoundBtn.textContent = soundFX.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  });
}

function cleanupAndExit() {
  if (faceTracker) faceTracker.stop();
  if (gremlin3D) gremlin3D.dispose();
  if (visitorMirror3D) visitorMirror3D.dispose();
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(t => t.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  socket.disconnect();
  location.reload();
}

// ==========================================
// Socket.IO Real-Time Client Handlers
// ==========================================

socket.on('host:created', ({ roomCode }) => {
  gameState.role = 'host';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  roomCodeDisplay.textContent = roomCode;
  showScreen('roomCode');
});

socket.on('visitor:joined', ({ visitorId }) => {
  console.log(`[HOST] Visitor paired: ${visitorId}`);
  startUnifiedGame('host');
});

socket.on('session:join', ({ roomCode, role, state }) => {
  gameState.role = 'visitor';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  if (state) {
    Object.assign(gameState.deskState, state);
    if (state.gremlinPos) {
      gameState.localGremlinPos = { ...state.gremlinPos };
    }
  }
  startUnifiedGame('visitor');
});

socket.on('error', ({ message }) => {
  if (joinError) joinError.textContent = `Error: ${message}`;
  console.error(message);
});

socket.on('visitor:left', () => {
  alert('Visitor left the session.');
  location.reload();
});

socket.on('session:ended', ({ reason }) => {
  alert('Session ended: ' + (reason || 'Host disconnected'));
  location.reload();
});

socket.on('state:updated', (state) => {
  Object.assign(gameState.deskState, state);
});

// Gremlin movement from visitor
socket.on('gremlin:moved', ({ x, y }) => {
  gameState.deskState.gremlinPos = { x, y };
  if (gremlin3D) {
    gremlin3D.setPosition(x, y);
  }
});

// 3D face updates from visitor
socket.on('gremlin:faceUpdate', (pose) => {
  if (!gameState.deskState.gremlinPose) {
    gameState.deskState.gremlinPose = {};
  }
  Object.assign(gameState.deskState.gremlinPose, pose);
  if (pose.x !== undefined && pose.y !== undefined) {
    gameState.deskState.gremlinPos = { x: pose.x, y: pose.y };
  }
  if (gremlin3D) {
    gremlin3D.updatePose(pose);
  }
});

socket.on('gremlin:modeChanged', ({ mode }) => {
  gameState.deskState.gremlinMode = mode;
});

// Desktop state synchronizations
socket.on('desktop:iconMoved', ({ iconId, x, y, isHeld }) => {
  const icon = gameState.deskState.icons.find(i => i.id === iconId);
  if (icon) {
    icon.x = x;
    icon.y = y;
    icon.isHeld = isHeld;
  }
});

socket.on('desktop:windowClosed', ({ windowId }) => {
  const win = gameState.deskState.windows.find(w => w.id === windowId);
  if (win) {
    win.open = false;
    soundFX.playWindowCloseSound();
    triggerScreenShake();
    spawnConfetti(win.x + win.width / 2, win.y + win.height / 2);
  }
});

socket.on('desktop:windowMoved', ({ windowId, x, y }) => {
  const win = gameState.deskState.windows.find(w => w.id === windowId);
  if (win) {
    win.x = x;
    win.y = y;
  }
});

socket.on('desktop:windowOpened', (windowData) => {
  gameState.deskState.windows.push(windowData);
  soundFX.playAlert();
});

socket.on('desktop:chaosTriggered', ({ effect, details }) => {
  if (effect === 'shake') {
    triggerScreenShake();
    soundFX.playShake();
  } else if (effect === 'confetti') {
    const x = (details && details.x) || 512;
    const y = (details && details.y) || 288;
    spawnConfetti(x, y);
    soundFX.playConfetti();
  }
});

socket.on('desktop:stampAdded', (stamp) => {
  if (!gameState.deskState.stamps) gameState.deskState.stamps = [];
  gameState.deskState.stamps.push(stamp);
  soundFX.playStamp();
});

socket.on('desktop:stickyNoteAdded', (note) => {
  if (!gameState.deskState.stickyNotes) gameState.deskState.stickyNotes = [];
  gameState.deskState.stickyNotes.push(note);
  soundFX.playStamp();
});

// Screen share status & WebRTC signaling
socket.on('screenShare:statusChanged', ({ active }) => {
  gameState.screenShareActive = active;
});

socket.on('webrtc:offer', async ({ sdp }) => {
  if (gameState.role !== 'visitor') return;
  setupVisitorPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc:answer', { roomCode: gameState.roomCode, sdp: peerConnection.localDescription });
});

socket.on('webrtc:answer', async ({ sdp }) => {
  if (gameState.role !== 'host') return;
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  }
});

socket.on('webrtc:iceCandidate', async ({ candidate }) => {
  if (peerConnection && candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }
});

// ==========================================
// Unified Interactive Game Startup
// ==========================================
function startUnifiedGame(role) {
  showScreen('game');

  roomBadge.textContent = `Room #${gameState.roomCode}`;

  if (role === 'host') {
    roleLabel.textContent = '👤 Host (Your Desktop)';
    shareScreenBtn.classList.remove('hidden');
    chaosToolbar.classList.add('hidden');
    floatingPip.classList.add('hidden');
    setupHostScreenSharing();
  } else {
    roleLabel.textContent = '🕹️ Visitor (Desktop Invader)';
    shareScreenBtn.classList.add('hidden');
    chaosToolbar.classList.remove('hidden');
    floatingPip.classList.remove('hidden');
    setupVisitorHUD();
  }

  // Initialize Three.js 3D Gremlin Head overlay on the desktop canvas
  if (typeof GremlinHead3D !== 'undefined' && threeCanvas) {
    gremlin3D = new GremlinHead3D({
      canvas: threeCanvas,
      width: 1024,
      height: 576,
      isOverlay: true
    });
  }

  // Setup direct canvas mouse & touch interactions
  setupInteractiveCanvas();

  // Start 60 FPS animation render loop
  renderDesktopLoop();
}

// ==========================================
// Interactive Canvas Drag-and-Drop Engine
// ==========================================
function setupInteractiveCanvas() {
  let isDragging = false;
  let dragMode = null; // 'icon' or 'window'
  let activeItem = null;

  function getCanvasCoords(e) {
    const rect = desktopCanvas.getBoundingClientRect();
    const scaleX = desktopCanvas.width / rect.width;
    const scaleY = desktopCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  desktopCanvas.addEventListener('mousedown', (e) => {
    const pt = getCanvasCoords(e);

    // If visitor, clicking teleports / walks gremlin to clicked point
    if (gameState.role === 'visitor') {
      gameState.localGremlinPos.x = pt.x;
      gameState.localGremlinPos.y = pt.y;
      socket.emit('visitor:moveGremlin', {
        roomCode: gameState.roomCode,
        x: pt.x,
        y: pt.y
      });
    }

    // 1. Check if clicked on a window close button 'X'
    const topWin = getWindowAt(pt.x, pt.y);
    if (topWin && isWindowCloseButton(topWin, pt.x, pt.y)) {
      closeWindow(topWin.id);
      return;
    }

    // 2. Check if clicked on a window title bar to drag
    if (topWin && isWindowTitleBar(topWin, pt.x, pt.y)) {
      isDragging = true;
      dragMode = 'window';
      activeItem = topWin;
      gameState.dragOffset = { x: pt.x - topWin.x, y: pt.y - topWin.y };
      canvasContainer.classList.add('dragging-interactive');
      return;
    }

    // 3. Check if clicked on an icon to grab & drag
    const hitIcon = getIconAt(pt.x, pt.y);
    if (hitIcon) {
      isDragging = true;
      dragMode = 'icon';
      activeItem = hitIcon;
      gameState.heldIconId = hitIcon.id;
      hitIcon.isHeld = true;
      gameState.dragOffset = { x: pt.x - hitIcon.x, y: pt.y - hitIcon.y };
      canvasContainer.classList.add('dragging-interactive');
      soundFX.playGrab();
      socket.emit('desktop:moveIcon', {
        roomCode: gameState.roomCode,
        iconId: hitIcon.id,
        x: hitIcon.x,
        y: hitIcon.y,
        isHeld: true
      });
      return;
    }
  });

  window.addEventListener('mousemove', (e) => {
    const pt = getCanvasCoords(e);

    // Update hover cursor feedback
    if (!isDragging) {
      const hoverIcon = getIconAt(pt.x, pt.y);
      const hoverWin = getWindowAt(pt.x, pt.y);
      if (hoverIcon || (hoverWin && isWindowTitleBar(hoverWin, pt.x, pt.y))) {
        canvasContainer.classList.add('hovering-interactive');
      } else {
        canvasContainer.classList.remove('hovering-interactive');
      }
    }

    if (!isDragging || !activeItem) return;

    if (dragMode === 'icon') {
      activeItem.x = Math.max(30, Math.min(1024 - 30, pt.x - gameState.dragOffset.x));
      activeItem.y = Math.max(30, Math.min(576 - 30, pt.y - gameState.dragOffset.y));

      // Also move gremlin along with held icon if visitor
      if (gameState.role === 'visitor') {
        gameState.localGremlinPos.x = activeItem.x;
        gameState.localGremlinPos.y = activeItem.y;
        socket.emit('visitor:moveGremlin', {
          roomCode: gameState.roomCode,
          x: activeItem.x,
          y: activeItem.y
        });
      }

      socket.emit('desktop:moveIcon', {
        roomCode: gameState.roomCode,
        iconId: activeItem.id,
        x: activeItem.x,
        y: activeItem.y,
        isHeld: true
      });
    } else if (dragMode === 'window') {
      activeItem.x = Math.max(10, Math.min(1024 - activeItem.width - 10, pt.x - gameState.dragOffset.x));
      activeItem.y = Math.max(10, Math.min(576 - activeItem.height - 10, pt.y - gameState.dragOffset.y));

      socket.emit('desktop:moveWindow', {
        roomCode: gameState.roomCode,
        windowId: activeItem.id,
        x: activeItem.x,
        y: activeItem.y
      });
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging && activeItem) {
      if (dragMode === 'icon') {
        activeItem.isHeld = false;
        gameState.heldIconId = null;
        soundFX.playDrop();
        socket.emit('desktop:moveIcon', {
          roomCode: gameState.roomCode,
          iconId: activeItem.id,
          x: activeItem.x,
          y: activeItem.y,
          isHeld: false
        });
      }
    }
    isDragging = false;
    dragMode = null;
    activeItem = null;
    canvasContainer.classList.remove('dragging-interactive');
  });

  // Double click icon to trigger prank popup
  desktopCanvas.addEventListener('dblclick', (e) => {
    const pt = getCanvasCoords(e);
    const hitIcon = getIconAt(pt.x, pt.y);
    if (hitIcon) {
      spawnPrankPopup(`Gremlin Alert: ${hitIcon.label}`);
    }
  });
}

// Helpers for Hit Testing
function getIconAt(x, y) {
  const icons = gameState.deskState.icons || [];
  return icons.find(icon => Math.hypot(icon.x - x, icon.y - y) <= 35);
}

function getWindowAt(x, y) {
  const windows = (gameState.deskState.windows || []).filter(w => w.open);
  // Iterate in reverse for topmost z-order
  for (let i = windows.length - 1; i >= 0; i--) {
    const win = windows[i];
    if (x >= win.x && x <= win.x + win.width && y >= win.y && y <= win.y + win.height) {
      return win;
    }
  }
  return null;
}

function isWindowTitleBar(win, x, y) {
  return x >= win.x && x <= win.x + win.width && y >= win.y && y <= win.y + 26;
}

function isWindowCloseButton(win, x, y) {
  const closeX = win.x + win.width - 24;
  return x >= closeX && x <= win.x + win.width && y >= win.y && y <= win.y + 26;
}

// ==========================================
// Visitor Controls & Chaos Toolbar
// ==========================================
function setupVisitorHUD() {
  // Minimizable PIP header
  if (pipHeader) {
    pipHeader.addEventListener('click', () => {
      pipBody.classList.toggle('hidden');
      pipMinimizeBtn.textContent = pipBody.classList.contains('hidden') ? '+' : '−';
    });
  }

  // 3D Avatar Preview Mirror
  if (typeof GremlinHead3D !== 'undefined' && visitorAvatarCanvas) {
    visitorMirror3D = new GremlinHead3D({
      canvas: visitorAvatarCanvas,
      width: 110,
      height: 110,
      isOverlay: false
    });
  }

  // Face Tracker initialization
  if (typeof FaceTracker !== 'undefined') {
    faceTracker = new FaceTracker({
      videoElement: webcamVideo,
      onPoseUpdate: (pose) => {
        Object.assign(gameState.localGremlinPose, pose);

        if (visitorMirror3D) {
          visitorMirror3D.updatePose(pose);
        }

        socket.emit('visitor:faceUpdate', {
          roomCode: gameState.roomCode,
          pose: {
            ...pose,
            x: gameState.localGremlinPos.x,
            y: gameState.localGremlinPos.y
          }
        });

        if (gremlinDebug) {
          gremlinDebug.textContent = `Yaw: ${(pose.yaw * 57.3).toFixed(0)}° | Pitch: ${(pose.pitch * 57.3).toFixed(0)}° | Mouth: ${(pose.mouthOpen * 100).toFixed(0)}%`;
        }
      },
      onStatusChange: (statusText) => {
        if (faceTrackingStatus) faceTrackingStatus.textContent = statusText;
      }
    });

    faceTracker.startSimulation();
  }

  // Camera toggle button
  if (toggleCameraBtn) {
    toggleCameraBtn.addEventListener('click', async () => {
      if (!faceTracker) return;
      if (!faceTracker.isTracking) {
        toggleCameraBtn.textContent = '⏳ Starting...';
        await faceTracker.start();
        toggleCameraBtn.textContent = faceTracker.isTracking ? '🛑 Stop Camera' : '📷 Retry';
      } else {
        faceTracker.stop();
        toggleCameraBtn.textContent = '📷 Enable Camera';
        faceTracker.startSimulation();
      }
    });
  }

  // Mode toggle (3D vs 2D)
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      const newMode = gameState.deskState.gremlinMode === 'head-tracked' ? 'walk' : 'head-tracked';
      gameState.deskState.gremlinMode = newMode;
      toggleModeBtn.textContent = newMode === 'head-tracked' ? 'Switch to 2D' : 'Switch to 3D Head';
      socket.emit('visitor:toggleMode', { roomCode: gameState.roomCode, mode: newMode });
    });
  }

  // Keyboard navigation & hotkeys
  setupVisitorKeyboard();

  // Toolbar button bindings
  if (btnGrab) btnGrab.addEventListener('click', () => handleGrabOrDrop());
  if (btnSlam) btnSlam.addEventListener('click', () => handleSlamNearbyWindow());
  if (btnStamp) btnStamp.addEventListener('click', () => handleAddStamp());
  if (btnConfetti) btnConfetti.addEventListener('click', () => handleConfettiBomb());
  if (btnShake) btnShake.addEventListener('click', () => handleEarthquake());
  if (btnSticky) btnSticky.addEventListener('click', () => openStickyModal());
  if (btnAlert) btnAlert.addEventListener('click', () => spawnPrankPopup());

  // Sticky modal actions
  if (stickySubmit) {
    stickySubmit.addEventListener('click', () => {
      const text = stickyInput.value.trim() || 'Gremlin wuz here! 😈';
      addStickyNote(text);
      stickyModal.classList.add('hidden');
      stickyInput.value = '';
    });
  }
  if (stickyCancel) {
    stickyCancel.addEventListener('click', () => {
      stickyModal.classList.add('hidden');
    });
  }
}

// Keyboard Input Processor
const keys = {};

function setupVisitorKeyboard() {
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // Hotkey triggers
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleGrabOrDrop();
    } else if (e.key === 'x' || e.key === 'X') {
      handleSlamNearbyWindow();
    } else if (e.key === 'g' || e.key === 'G') {
      handleAddStamp();
    } else if (e.key === 'c' || e.key === 'C') {
      handleConfettiBomb();
    } else if (e.key === 's' || e.key === 'S') {
      if (!keys['Control'] && !keys['Meta']) {
        handleEarthquake();
      }
    } else if (e.key === 'n' || e.key === 'N') {
      openStickyModal();
    } else if (e.key === 'p' || e.key === 'P') {
      spawnPrankPopup();
    }

    processMovement();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
}

function processMovement() {
  const speed = 10;
  let moved = false;

  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    gameState.localGremlinPos.y -= speed;
    moved = true;
  }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    gameState.localGremlinPos.y += speed;
    moved = true;
  }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    gameState.localGremlinPos.x -= speed;
    moved = true;
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    gameState.localGremlinPos.x += speed;
    moved = true;
  }

  // Clamp within desktop
  gameState.localGremlinPos.x = Math.max(40, Math.min(1024 - 40, gameState.localGremlinPos.x));
  gameState.localGremlinPos.y = Math.max(40, Math.min(576 - 40, gameState.localGremlinPos.y));

  if (moved) {
    // If currently carrying an icon with keyboard, update its coordinates too
    if (gameState.heldIconId) {
      const icon = gameState.deskState.icons.find(i => i.id === gameState.heldIconId);
      if (icon) {
        icon.x = gameState.localGremlinPos.x;
        icon.y = gameState.localGremlinPos.y;
        socket.emit('desktop:moveIcon', {
          roomCode: gameState.roomCode,
          iconId: icon.id,
          x: icon.x,
          y: icon.y,
          isHeld: true
        });
      }
    }

    socket.emit('visitor:moveGremlin', {
      roomCode: gameState.roomCode,
      x: gameState.localGremlinPos.x,
      y: gameState.localGremlinPos.y
    });
  }
}

// ==========================================
// Chaos Actions Implementation
// ==========================================
function handleGrabOrDrop() {
  const gx = gameState.localGremlinPos.x;
  const gy = gameState.localGremlinPos.y;

  if (gameState.heldIconId) {
    // Drop currently held icon
    const icon = gameState.deskState.icons.find(i => i.id === gameState.heldIconId);
    if (icon) {
      icon.isHeld = false;
      soundFX.playDrop();
      socket.emit('desktop:moveIcon', {
        roomCode: gameState.roomCode,
        iconId: icon.id,
        x: icon.x,
        y: icon.y,
        isHeld: false
      });
    }
    gameState.heldIconId = null;
    showTooltip('Dropped icon!');
  } else {
    // Find nearest icon to grab
    const nearestIcon = getIconAt(gx, gy);
    if (nearestIcon) {
      gameState.heldIconId = nearestIcon.id;
      nearestIcon.isHeld = true;
      soundFX.playGrab();
      socket.emit('desktop:moveIcon', {
        roomCode: gameState.roomCode,
        iconId: nearestIcon.id,
        x: gx,
        y: gy,
        isHeld: true
      });
      showTooltip(`Grabbed ${nearestIcon.label}!`);
    } else {
      showTooltip('No icon nearby to grab');
    }
  }
}

function handleSlamNearbyWindow() {
  const gx = gameState.localGremlinPos.x;
  const gy = gameState.localGremlinPos.y;
  const openWindows = (gameState.deskState.windows || []).filter(w => w.open);

  // Find window that gremlin is inside or close to
  const targetWin = openWindows.find(w => {
    return gx >= w.x - 30 && gx <= w.x + w.width + 30 && gy >= w.y - 30 && gy <= w.y + w.height + 30;
  });

  if (targetWin) {
    closeWindow(targetWin.id);
    showTooltip(`💥 Smashed ${targetWin.title}!`);
  } else if (openWindows.length > 0) {
    // Slam topmost open window as fallback
    closeWindow(openWindows[openWindows.length - 1].id);
    showTooltip('💥 Smashed window shut!');
  }
}

function closeWindow(windowId) {
  const win = gameState.deskState.windows.find(w => w.id === windowId);
  if (win && win.open) {
    win.open = false;
    soundFX.playWindowCloseSound();
    triggerScreenShake();
    spawnConfetti(win.x + win.width / 2, win.y + win.height / 2);
    socket.emit('desktop:closeWindow', {
      roomCode: gameState.roomCode,
      windowId: windowId
    });
  }
}

function handleAddStamp() {
  const stampTypes = ['🐾', '😈', '🔥', '🍌', '💥', '💀'];
  const randomEmoji = stampTypes[Math.floor(Math.random() * stampTypes.length)];
  const stamp = {
    id: 'stamp-' + Date.now(),
    type: 'emoji',
    text: randomEmoji,
    x: gameState.localGremlinPos.x,
    y: gameState.localGremlinPos.y,
    rotation: (Math.random() - 0.5) * 0.6
  };

  if (!gameState.deskState.stamps) gameState.deskState.stamps = [];
  gameState.deskState.stamps.push(stamp);
  soundFX.playStamp();

  socket.emit('desktop:addStamp', {
    roomCode: gameState.roomCode,
    stamp: stamp
  });
  showTooltip('Sprayed graffiti stamp!');
}

function handleConfettiBomb() {
  const gx = gameState.localGremlinPos.x;
  const gy = gameState.localGremlinPos.y;
  spawnConfetti(gx, gy);
  soundFX.playConfetti();
  socket.emit('desktop:triggerChaos', {
    roomCode: gameState.roomCode,
    effect: 'confetti',
    details: { x: gx, y: gy }
  });
  showTooltip('🎉 Confetti bomb deployed!');
}

function handleEarthquake() {
  triggerScreenShake();
  soundFX.playShake();
  socket.emit('desktop:triggerChaos', {
    roomCode: gameState.roomCode,
    effect: 'shake'
  });
  showTooltip('📳 Earthquake triggered!');
}

function triggerScreenShake() {
  canvasContainer.classList.add('screen-shake');
  setTimeout(() => {
    canvasContainer.classList.remove('screen-shake');
  }, 450);
}

function openStickyModal() {
  stickyModal.classList.remove('hidden');
  stickyInput.focus();
}

function addStickyNote(text) {
  const colors = ['#fef08a', '#bbf7d0', '#fed7aa', '#e9d5ff'];
  const note = {
    id: 'note-' + Date.now(),
    text: text,
    x: Math.max(40, gameState.localGremlinPos.x - 60),
    y: Math.max(40, gameState.localGremlinPos.y - 60),
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: (Math.random() - 0.5) * 0.2
  };

  if (!gameState.deskState.stickyNotes) gameState.deskState.stickyNotes = [];
  gameState.deskState.stickyNotes.push(note);
  soundFX.playStamp();

  socket.emit('desktop:addStickyNote', {
    roomCode: gameState.roomCode,
    note: note
  });
  showTooltip('Stuck note on desktop!');
}

const prankTitles = [
  'GremlinOS Kernel Panic',
  'CRITICAL ERROR: Mouse Stolen',
  'Warning: Folder Replaced With Tacos',
  'System Defender: Gremlin Win',
  'Alert: Desktop Overload 9000'
];

const prankMessages = [
  'A rogue gremlin has replaced all system files with bananas.\nClick OK to surrender.',
  'Your mouse cursor has been redirected to goblin headquarters.\nNo recovery possible.',
  'Warning: System temperature critical due to excessive mischief.\nPlease supply snacks.',
  'Security scan result: 100% Gremlin infestation.\nGood luck closing this window!'
];

function spawnPrankPopup(customTitle) {
  const title = customTitle || prankTitles[Math.floor(Math.random() * prankTitles.length)];
  const msg = prankMessages[Math.floor(Math.random() * prankMessages.length)];
  const newWin = {
    id: 'prank-win-' + Date.now(),
    title: title,
    x: Math.floor(100 + Math.random() * 400),
    y: Math.floor(80 + Math.random() * 250),
    width: 320,
    height: 180,
    open: true,
    content: msg
  };

  gameState.deskState.windows.push(newWin);
  soundFX.playAlert();

  socket.emit('desktop:openWindow', {
    roomCode: gameState.roomCode,
    windowData: newWin
  });
  showTooltip('⚠️ Prank popup spawned!');
}

function showTooltip(msg) {
  if (!actionTooltip) return;
  actionTooltip.textContent = msg;
  actionTooltip.classList.remove('hidden');
  clearTimeout(actionTooltip._timer);
  actionTooltip._timer = setTimeout(() => {
    actionTooltip.classList.add('hidden');
  }, 2000);
}

// Confetti Particle Physics
function spawnConfetti(originX, originY) {
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 9;
    gameState.confettiParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1.0,
      decay: 0.012 + Math.random() * 0.018,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2
    });
  }
}

// ==========================================
// WebRTC Screen Sharing (Host to Visitor)
// ==========================================
function setupHostScreenSharing() {
  if (!shareScreenBtn) return;

  shareScreenBtn.addEventListener('click', async () => {
    if (gameState.screenShareActive) {
      stopHostScreenShare();
      return;
    }

    try {
      localMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      screenShareVideo.srcObject = localMediaStream;
      gameState.screenShareActive = true;
      shareScreenBtn.textContent = '🛑 Stop Streaming Desktop';
      socket.emit('screenShare:status', { roomCode: gameState.roomCode, active: true });

      // Detect when user stops sharing via browser bar
      localMediaStream.getVideoTracks()[0].onended = () => {
        stopHostScreenShare();
      };

      // Create WebRTC Offer to Visitor
      setupHostPeerConnection(localMediaStream);
    } catch (err) {
      console.warn('Screen share cancelled or not supported:', err);
    }
  });
}

function stopHostScreenShare() {
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(t => t.stop());
    localMediaStream = null;
  }
  gameState.screenShareActive = false;
  shareScreenBtn.textContent = '🖥️ Stream Real Desktop';
  socket.emit('screenShare:status', { roomCode: gameState.roomCode, active: false });
}

function setupHostPeerConnection(stream) {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  peerConnection = new RTCPeerConnection(config);

  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:iceCandidate', { roomCode: gameState.roomCode, candidate: event.candidate });
    }
  };

  peerConnection.createOffer().then(offer => {
    return peerConnection.setLocalDescription(offer);
  }).then(() => {
    socket.emit('webrtc:offer', { roomCode: gameState.roomCode, sdp: peerConnection.localDescription });
  });
}

function setupVisitorPeerConnection() {
  if (peerConnection) return;
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  peerConnection = new RTCPeerConnection(config);

  peerConnection.ontrack = (event) => {
    screenShareVideo.srcObject = event.streams[0];
    gameState.screenShareActive = true;
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:iceCandidate', { roomCode: gameState.roomCode, candidate: event.candidate });
    }
  };
}

// ==========================================
// 60 FPS Desktop Rendering Loop
// ==========================================
function renderDesktopLoop() {
  const w = desktopCanvas.width;
  const h = desktopCanvas.height;

  // 1. Draw Background: Real Screen Video OR Retro Wallpaper
  if (gameState.screenShareActive && screenShareVideo.readyState >= 2) {
    desktopCtx.drawImage(screenShareVideo, 0, 0, w, h);
    // Add subtle semi-transparent overlay to ensure icons pop
    desktopCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    desktopCtx.fillRect(0, 0, w, h);
  } else {
    // Retro Wallpaper Grid
    desktopCtx.fillStyle = '#bfa142';
    desktopCtx.fillRect(0, 0, w, h);

    desktopCtx.strokeStyle = '#a88930';
    desktopCtx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      desktopCtx.beginPath();
      desktopCtx.moveTo(i, 0);
      desktopCtx.lineTo(i, h);
      desktopCtx.stroke();
    }
    for (let j = 0; j < h; j += 40) {
      desktopCtx.beginPath();
      desktopCtx.moveTo(0, j);
      desktopCtx.lineTo(w, j);
      desktopCtx.stroke();
    }
  }

  // 2. Draw Graffiti & Stamps
  (gameState.deskState.stamps || []).forEach(drawStamp);

  // 3. Draw Sticky Notes
  (gameState.deskState.stickyNotes || []).forEach(drawStickyNote);

  // 4. Draw Desktop Icons
  (gameState.deskState.icons || []).forEach(drawIcon);

  // 5. Draw Desktop Windows
  (gameState.deskState.windows || []).forEach((win) => {
    if (win.open) drawWindow(win);
  });

  // 6. Draw Confetti Particles
  renderConfetti();

  // 7. Render Gremlin Avatar (3D WebGL or 2D fallback)
  const gremlinPos = gameState.role === 'visitor' ? gameState.localGremlinPos : gameState.deskState.gremlinPos;

  if (gameState.deskState.gremlinMode === 'head-tracked' && gremlin3D) {
    threeCanvas.style.display = 'block';
    gremlin3D.setPosition(gremlinPos.x, gremlinPos.y);
    gremlin3D.render();
  } else {
    if (threeCanvas) threeCanvas.style.display = 'none';
    drawGremlin2D(gremlinPos.x, gremlinPos.y);
  }

  // 8. Render visitor avatar mirror preview
  if (visitorMirror3D) {
    visitorMirror3D.render();
  }

  requestAnimationFrame(renderDesktopLoop);
}

// Render Confetti Particles
function renderConfetti() {
  for (let i = gameState.confettiParticles.length - 1; i >= 0; i--) {
    const p = gameState.confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25; // gravity
    p.rotation += p.vRot;
    p.life -= p.decay;

    if (p.life <= 0) {
      gameState.confettiParticles.splice(i, 1);
      continue;
    }

    desktopCtx.save();
    desktopCtx.translate(p.x, p.y);
    desktopCtx.rotate(p.rotation);
    desktopCtx.globalAlpha = p.life;
    desktopCtx.fillStyle = p.color;
    desktopCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
    desktopCtx.restore();
  }
}

// Render Desktop Icon
function drawIcon(icon) {
  const { x, y, type, label, isHeld } = icon;
  const size = 52;

  desktopCtx.save();

  // If held by gremlin, add lift shadow and wobble
  if (isHeld) {
    desktopCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    desktopCtx.shadowBlur = 15;
    desktopCtx.shadowOffsetY = 10;
  }

  // Icon background tile
  desktopCtx.fillStyle = isHeld ? '#fef08a' : '#ffffff';
  desktopCtx.beginPath();
  desktopCtx.roundRect(x - size / 2, y - size / 2, size, size, 8);
  desktopCtx.fill();

  desktopCtx.strokeStyle = isHeld ? '#f59e0b' : '#cbd5e1';
  desktopCtx.lineWidth = isHeld ? 2.5 : 1.5;
  desktopCtx.stroke();

  // Emoji Symbol
  desktopCtx.font = '26px Arial';
  desktopCtx.textAlign = 'center';
  desktopCtx.textBaseline = 'middle';

  let symbol = '📁';
  if (type === 'file') symbol = '📄';
  if (type === 'app') symbol = '⚙️';
  if (type === 'trash') symbol = '🗑️';
  desktopCtx.fillText(symbol, x, y - 2);

  // Label
  desktopCtx.font = 'bold 11px Arial';
  desktopCtx.fillStyle = '#0f172a';
  desktopCtx.fillText(label, x, y + 38);

  desktopCtx.restore();
}

// Render Desktop Window
function drawWindow(win) {
  const { x, y, width, height, title, content } = win;

  desktopCtx.save();

  // Window Shadow
  desktopCtx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  desktopCtx.shadowBlur = 20;
  desktopCtx.shadowOffsetY = 8;

  // Window Body
  desktopCtx.fillStyle = '#f8fafc';
  desktopCtx.beginPath();
  desktopCtx.roundRect(x, y, width, height, [6, 6, 4, 4]);
  desktopCtx.fill();
  desktopCtx.restore();

  // Border
  desktopCtx.strokeStyle = '#475569';
  desktopCtx.lineWidth = 1.5;
  desktopCtx.strokeRect(x, y, width, height);

  // Title Bar
  desktopCtx.fillStyle = '#0284c7';
  desktopCtx.beginPath();
  desktopCtx.roundRect(x, y, width, 26, [6, 6, 0, 0]);
  desktopCtx.fill();

  // Title Text
  desktopCtx.font = 'bold 12px Arial';
  desktopCtx.fillStyle = '#ffffff';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'middle';
  desktopCtx.fillText(title, x + 10, y + 13);

  // Close Button Box
  const closeX = x + width - 22;
  desktopCtx.fillStyle = '#ef4444';
  desktopCtx.beginPath();
  desktopCtx.roundRect(closeX, y + 4, 18, 18, 3);
  desktopCtx.fill();

  // Close 'X' symbol
  desktopCtx.strokeStyle = '#ffffff';
  desktopCtx.lineWidth = 2;
  desktopCtx.beginPath();
  desktopCtx.moveTo(closeX + 5, y + 9);
  desktopCtx.lineTo(closeX + 13, y + 17);
  desktopCtx.moveTo(closeX + 13, y + 9);
  desktopCtx.lineTo(closeX + 5, y + 17);
  desktopCtx.stroke();

  // Window Inner Content
  desktopCtx.fillStyle = '#334155';
  desktopCtx.font = '12px Arial';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'top';

  if (content) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      desktopCtx.fillText(line, x + 12, y + 36 + idx * 18);
    });
  }
}

// Render Graffiti Stamp
function drawStamp(stamp) {
  desktopCtx.save();
  desktopCtx.translate(stamp.x, stamp.y);
  desktopCtx.rotate(stamp.rotation || 0);
  desktopCtx.font = '32px Arial';
  desktopCtx.textAlign = 'center';
  desktopCtx.textBaseline = 'middle';
  desktopCtx.fillText(stamp.text, 0, 0);
  desktopCtx.restore();
}

// Render Sticky Note
function drawStickyNote(note) {
  desktopCtx.save();
  desktopCtx.translate(note.x, note.y);
  desktopCtx.rotate(note.rotation || 0);

  // Note Shadow
  desktopCtx.shadowColor = 'rgba(0,0,0,0.2)';
  desktopCtx.shadowBlur = 8;
  desktopCtx.shadowOffsetY = 4;

  // Note Card
  desktopCtx.fillStyle = note.color || '#fef08a';
  desktopCtx.fillRect(0, 0, 130, 80);

  desktopCtx.shadowColor = 'transparent';
  desktopCtx.strokeStyle = 'rgba(0,0,0,0.1)';
  desktopCtx.strokeRect(0, 0, 130, 80);

  // Note Text
  desktopCtx.fillStyle = '#1c1917';
  desktopCtx.font = 'bold 11px Arial';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'top';

  // Word wrap note text
  const words = note.text.split(' ');
  let line = '';
  let lineY = 10;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = desktopCtx.measureText(testLine);
    if (metrics.width > 110 && n > 0) {
      desktopCtx.fillText(line, 10, lineY);
      line = words[n] + ' ';
      lineY += 15;
    } else {
      line = testLine;
    }
  }
  desktopCtx.fillText(line, 10, lineY);

  desktopCtx.restore();
}

// 2D Sprite Fallback Gremlin
function drawGremlin2D(x, y) {
  desktopCtx.save();

  // Goblin head
  desktopCtx.fillStyle = '#10b981';
  desktopCtx.beginPath();
  desktopCtx.arc(x, y, 22, 0, Math.PI * 2);
  desktopCtx.fill();

  // Pointed ears
  desktopCtx.fillStyle = '#059669';
  desktopCtx.beginPath();
  desktopCtx.moveTo(x - 18, y - 5);
  desktopCtx.lineTo(x - 34, y - 18);
  desktopCtx.lineTo(x - 12, y - 16);
  desktopCtx.fill();

  desktopCtx.beginPath();
  desktopCtx.moveTo(x + 18, y - 5);
  desktopCtx.lineTo(x + 34, y - 18);
  desktopCtx.lineTo(x + 12, y - 16);
  desktopCtx.fill();

  // Eyes
  desktopCtx.fillStyle = '#ffffff';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 7, y - 4, 6, 0, Math.PI * 2);
  desktopCtx.arc(x + 7, y - 4, 6, 0, Math.PI * 2);
  desktopCtx.fill();

  // Pupils
  desktopCtx.fillStyle = '#0f172a';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 7, y - 4, 3, 0, Math.PI * 2);
  desktopCtx.arc(x + 7, y - 4, 3, 0, Math.PI * 2);
  desktopCtx.fill();

  // Mischievous mouth
  desktopCtx.strokeStyle = '#0f172a';
  desktopCtx.lineWidth = 2.5;
  desktopCtx.beginPath();
  desktopCtx.arc(x, y + 6, 8, 0, Math.PI);
  desktopCtx.stroke();

  desktopCtx.restore();
}

// Initial entry point
console.log('🎮 Desktop Gremlin Client Engine Ready');
showScreen('title');
