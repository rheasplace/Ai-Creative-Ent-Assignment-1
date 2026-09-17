/**
 * Desktop Gremlin — Client Application
 * 
 * Manages UI transitions, 2D retro desktop rendering, 3D WebGL Gremlin head overlay,
 * visitor controls (WASD/arrows and webcam face tracking), and real-time Socket.IO synchronization.
 */

// Initialize Socket.IO connection
const socket = io();

// Global client state container
const gameState = {
  role: null, // 'host' (desktop screen) or 'visitor' (gremlin controller)
  roomCode: null,
  connected: false,
  deskState: {
    icons: [],
    windows: [],
    gremlinPos: { x: 512, y: 288 },
    gremlinMode: 'head-tracked', // 'head-tracked' (3D model) or 'walk' (2D sprite)
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
  }
};

// UI Screen DOM references
const screens = {
  title: document.getElementById('titleScreen'),
  roomCode: document.getElementById('roomCodeScreen'),
  join: document.getElementById('joinScreen'),
  game: document.getElementById('gameScreen')
};

// Controls and displays
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
const hostView = document.getElementById('hostView');
const visitorView = document.getElementById('visitorView');
const desktopCanvas = document.getElementById('desktopCanvas');
const threeCanvas = document.getElementById('threeCanvas');
const remoteCanvas = document.getElementById('remoteCanvas');
const visitorAvatarCanvas = document.getElementById('visitorAvatarCanvas');
const webcamVideo = document.getElementById('webcamVideo');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const faceTrackingStatus = document.getElementById('faceTrackingStatus');
const gremlinDebug = document.getElementById('gremlinDebug');

// Canvas 2D contexts & 3D instances
const desktopCtx = desktopCanvas ? desktopCanvas.getContext('2d') : null;
const remoteCtx = remoteCanvas ? remoteCanvas.getContext('2d') : null;
let hostGremlin3D = null;
let visitorGremlin3D = null;
let faceTracker = null;

// ==========================================
// UI Screen Navigation
// ==========================================
function showScreen(screenName) {
  Object.values(screens).forEach((screen) => {
    if (screen) screen.classList.add('hidden');
  });
  if (screens[screenName]) {
    screens[screenName].classList.remove('hidden');
  }
}

// Navigation event listeners
hostBtn.addEventListener('click', () => socket.emit('host:create'));
joinBtn.addEventListener('click', () => showScreen('join'));
cancelJoin.addEventListener('click', () => showScreen('title'));

endHost.addEventListener('click', () => {
  cleanupAndExit();
});

joinSubmit.addEventListener('click', () => {
  const code = roomCodeInput.value.trim();
  if (code.length < 6) {
    joinError.textContent = 'Please enter a valid 6-digit room code';
    return;
  }
  joinError.textContent = '';
  socket.emit('visitor:join', { roomCode: code });
});

endSession.addEventListener('click', () => {
  cleanupAndExit();
});

function cleanupAndExit() {
  if (faceTracker) faceTracker.stop();
  if (hostGremlin3D) hostGremlin3D.dispose();
  if (visitorGremlin3D) visitorGremlin3D.dispose();
  socket.disconnect();
  location.reload();
}

// ==========================================
// Socket.IO Real-Time Client Handlers
// ==========================================

// Host receives generated 6-digit room code
socket.on('host:created', ({ roomCode }) => {
  gameState.role = 'host';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  roomCodeDisplay.textContent = roomCode;
  showScreen('roomCode');
});

// Host is notified that the visitor joined
socket.on('visitor:joined', ({ visitorId }) => {
  console.log(`[HOST] Visitor paired: ${visitorId}`);
  startGameHost();
});

// Visitor successfully joined the room
socket.on('session:join', ({ roomCode, role, state }) => {
  gameState.role = 'visitor';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  if (state) {
    Object.assign(gameState.deskState, state);
  }
  startGameVisitor();
});

// Error received from server
socket.on('error', ({ message }) => {
  if (joinError) joinError.textContent = `Error: ${message}`;
  console.error(message);
});

// Visitor disconnected
socket.on('visitor:left', () => {
  alert('Visitor left the session.');
  location.reload();
});

// Session ended by host
socket.on('session:ended', ({ reason }) => {
  alert('Session ended: ' + (reason || 'Host disconnected'));
  location.reload();
});

// Desktop state update (e.g. icon moved, window closed)
socket.on('state:updated', (state) => {
  Object.assign(gameState.deskState, state);
});

// Host receives updated gremlin 2D position
socket.on('gremlin:moved', ({ x, y }) => {
  gameState.deskState.gremlinPos = { x, y };
  if (hostGremlin3D) {
    hostGremlin3D.setPosition(x, y);
  }
});

// Host receives 3D facial telemetry (yaw, pitch, roll, mouth, eye blinks)
socket.on('gremlin:faceUpdate', (pose) => {
  if (!gameState.deskState.gremlinPose) {
    gameState.deskState.gremlinPose = {};
  }
  Object.assign(gameState.deskState.gremlinPose, pose);

  if (pose.x !== undefined && pose.y !== undefined) {
    gameState.deskState.gremlinPos = { x: pose.x, y: pose.y };
  }

  if (hostGremlin3D) {
    hostGremlin3D.updatePose(pose);
  }
});

// Gremlin mode toggled (3D head vs 2D circle)
socket.on('gremlin:modeChanged', ({ mode }) => {
  gameState.deskState.gremlinMode = mode;
});

// Visitor interaction complete
socket.on('interaction:complete', (result) => {
  console.log('[VISITOR] Interaction result:', result);
});

// ==========================================
// Host Experience & Canvas Rendering
// ==========================================

function startGameHost() {
  roleLabel.textContent = '👤 Host (Desktop)';
  hostView.classList.remove('hidden');
  visitorView.classList.add('hidden');
  showScreen('game');

  // Initial simulated desktop items
  gameState.deskState = {
    icons: [
      { id: 'icon-1', x: 100, y: 100, type: 'folder', label: 'Pictures' },
      { id: 'icon-2', x: 200, y: 100, type: 'file', label: 'Document.txt' },
      { id: 'icon-3', x: 300, y: 100, type: 'app', label: 'Calculator' },
      { id: 'icon-4', x: 400, y: 100, type: 'folder', label: 'Downloads' }
    ],
    windows: [
      { id: 'win-1', x: 500, y: 200, width: 300, height: 200, title: 'System Info', open: true }
    ],
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
  };

  // Initialize Three.js 3D Gremlin Head on the transparent overlay canvas
  if (typeof GremlinHead3D !== 'undefined' && threeCanvas) {
    hostGremlin3D = new GremlinHead3D({
      canvas: threeCanvas,
      width: 1024,
      height: 576,
      isOverlay: true
    });
  }

  // Start 60 FPS desktop animation loop
  renderDesktop();
}

function renderDesktop() {
  const w = desktopCanvas.width;
  const h = desktopCanvas.height;

  // Clear 2D background with gold retro color
  desktopCtx.fillStyle = '#d4af37';
  desktopCtx.fillRect(0, 0, w, h);

  // Draw retro wallpaper grid pattern
  desktopCtx.strokeStyle = '#c09830';
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

  // Draw simulated desktop icons
  gameState.deskState.icons.forEach(drawIcon);

  // Draw open windows
  gameState.deskState.windows.forEach((win) => {
    if (win.open) drawWindow(win);
  });

  // Render Gremlin based on active mode
  if (gameState.deskState.gremlinMode === 'head-tracked' && hostGremlin3D) {
    threeCanvas.style.display = 'block';
    hostGremlin3D.render();
  } else {
    if (threeCanvas) threeCanvas.style.display = 'none';
    drawGremlin2D(gameState.deskState.gremlinPos.x, gameState.deskState.gremlinPos.y);
  }

  requestAnimationFrame(renderDesktop);
}

function drawIcon(icon) {
  const { x, y, type, label } = icon;
  const size = 50;

  // Icon background tile
  desktopCtx.fillStyle = '#fff';
  desktopCtx.fillRect(x - size / 2, y - size / 2, size, size);
  desktopCtx.strokeStyle = '#ccc';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x - size / 2, y - size / 2, size, size);

  // Icon emoji symbol
  desktopCtx.fillStyle = '#333';
  desktopCtx.font = 'bold 24px Arial';
  desktopCtx.textAlign = 'center';
  desktopCtx.textBaseline = 'middle';

  let symbol = '📁';
  if (type === 'file') symbol = '📄';
  if (type === 'app') symbol = '⚙️';
  desktopCtx.fillText(symbol, x, y);

  // Icon text label
  desktopCtx.font = '12px Arial';
  desktopCtx.fillStyle = '#333';
  desktopCtx.fillText(label, x, y + 35);
}

function drawWindow(windowObj) {
  const { x, y, width, height, title } = windowObj;

  // Window body
  desktopCtx.fillStyle = '#f0f0f0';
  desktopCtx.fillRect(x, y, width, height);
  desktopCtx.strokeStyle = '#999';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x, y, width, height);

  // Window title bar
  desktopCtx.fillStyle = '#0078d4';
  desktopCtx.fillRect(x, y, width, 25);
  desktopCtx.font = 'bold 14px Arial';
  desktopCtx.fillStyle = '#fff';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'middle';
  desktopCtx.fillText(title, x + 10, y + 12.5);

  // Window close 'X' button
  const closeX = x + width - 20;
  const closeY = y + 12.5;
  desktopCtx.strokeStyle = '#fff';
  desktopCtx.lineWidth = 2;
  desktopCtx.beginPath();
  desktopCtx.moveTo(closeX - 6, closeY - 6);
  desktopCtx.lineTo(closeX + 6, closeY + 6);
  desktopCtx.stroke();
  desktopCtx.beginPath();
  desktopCtx.moveTo(closeX + 6, closeY - 6);
  desktopCtx.lineTo(closeX - 6, closeY + 6);
  desktopCtx.stroke();
}

function drawGremlin2D(x, y) {
  // Simple 2D fallback gremlin sprite
  desktopCtx.fillStyle = '#4caf50';
  desktopCtx.beginPath();
  desktopCtx.arc(x, y, 20, 0, Math.PI * 2);
  desktopCtx.fill();

  // Whites of eyes
  desktopCtx.fillStyle = '#fff';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.arc(x + 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.fill();

  // Pupils
  desktopCtx.fillStyle = '#000';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.arc(x + 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.fill();

  // Mouth
  desktopCtx.strokeStyle = '#000';
  desktopCtx.lineWidth = 2;
  desktopCtx.beginPath();
  desktopCtx.arc(x, y + 3, 5, 0, Math.PI);
  desktopCtx.stroke();
}

// ==========================================
// Visitor Experience & Control Handling
// ==========================================

function startGameVisitor() {
  roleLabel.textContent = '🕹️ Visitor (Gremlin Controller)';
  hostView.classList.add('hidden');
  visitorView.classList.remove('hidden');
  showScreen('game');

  // Initialize 3D avatar preview mirror for visitor
  if (typeof GremlinHead3D !== 'undefined' && visitorAvatarCanvas) {
    visitorGremlin3D = new GremlinHead3D({
      canvas: visitorAvatarCanvas,
      width: 240,
      height: 240,
      isOverlay: false
    });
  }

  // Initialize Face Tracker
  if (typeof FaceTracker !== 'undefined') {
    faceTracker = new FaceTracker({
      videoElement: webcamVideo,
      onPoseUpdate: (pose) => {
        Object.assign(gameState.localGremlinPose, pose);

        // Update visitor's local 3D mirror
        if (visitorGremlin3D) {
          visitorGremlin3D.updatePose(pose);
        }

        // Send telemetry to host
        socket.emit('visitor:faceUpdate', {
          roomCode: gameState.roomCode,
          pose: {
            ...pose,
            x: gameState.localGremlinPos.x,
            y: gameState.localGremlinPos.y
          }
        });

        if (gremlinDebug) {
          gremlinDebug.textContent = `Pose: yaw ${(pose.yaw * 57.3).toFixed(0)}°, pitch ${(pose.pitch * 57.3).toFixed(0)}° | Mouth: ${(pose.mouthOpen * 100).toFixed(0)}% | Eyes: ${(pose.leftEye * 100).toFixed(0)}%`;
        }
      },
      onStatusChange: (statusText) => {
        if (faceTrackingStatus) faceTrackingStatus.textContent = statusText;
      }
    });

    // Start in simulation mode immediately so visitor has instant controls
    faceTracker.startSimulation();
  }

  // Camera toggle button
  if (toggleCameraBtn) {
    toggleCameraBtn.addEventListener('click', async () => {
      if (!faceTracker) return;
      if (!faceTracker.isTracking) {
        toggleCameraBtn.textContent = '⏳ Starting Camera...';
        await faceTracker.start();
        toggleCameraBtn.textContent = faceTracker.isTracking ? '🛑 Stop Camera' : '📷 Retry Camera';
      } else {
        faceTracker.stop();
        toggleCameraBtn.textContent = '📷 Enable Camera';
        faceTracker.startSimulation();
      }
    });
  }

  // 2D vs 3D mode switch button
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      const newMode = gameState.deskState.gremlinMode === 'head-tracked' ? 'walk' : 'head-tracked';
      gameState.deskState.gremlinMode = newMode;
      toggleModeBtn.textContent = newMode === 'head-tracked' ? 'Switch to 2D' : 'Switch to 3D Head';
      socket.emit('visitor:toggleMode', { roomCode: gameState.roomCode, mode: newMode });
    });
  }

  // Bind keyboard and click inputs
  setupVisitorInput();

  // Start rendering loop for visitor (remote view + 3D mirror)
  renderRemoteView();
}

function renderRemoteView() {
  const w = remoteCanvas.width;
  const h = remoteCanvas.height;
  const scale = 0.5;

  remoteCtx.fillStyle = '#d4af37';
  remoteCtx.fillRect(0, 0, w, h);

  // Scaled icons on remote radar
  gameState.deskState.icons.forEach((icon) => {
    remoteCtx.fillStyle = '#ff9800';
    remoteCtx.fillRect(icon.x * scale - 12, icon.y * scale - 12, 24, 24);
  });

  // Scaled windows on remote radar
  gameState.deskState.windows.forEach((win) => {
    if (win.open) {
      remoteCtx.fillStyle = '#fff';
      remoteCtx.fillRect(win.x * scale, win.y * scale, win.width * scale, win.height * scale);
    }
  });

  // Gremlin position indicator on remote radar
  remoteCtx.fillStyle = '#4caf50';
  remoteCtx.beginPath();
  remoteCtx.arc(
    gameState.localGremlinPos.x * scale,
    gameState.localGremlinPos.y * scale,
    10,
    0,
    Math.PI * 2
  );
  remoteCtx.fill();

  // Render 3D visitor avatar mirror
  if (visitorGremlin3D) {
    visitorGremlin3D.render();
  }

  requestAnimationFrame(renderRemoteView);
}

// Input state
const keys = {};

function setupVisitorInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    processMovement();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // Click on remote radar canvas to jump gremlin directly to point
  remoteCanvas.addEventListener('click', (e) => {
    const rect = remoteCanvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / (rect.width / remoteCanvas.width);
    const clickY = (e.clientY - rect.top) / (rect.height / remoteCanvas.height);

    // Scale from radar coordinates back to full desktop (2x)
    const desktopX = clickX * 2;
    const desktopY = clickY * 2;

    gameState.localGremlinPos.x = desktopX;
    gameState.localGremlinPos.y = desktopY;

    socket.emit('visitor:moveGremlin', {
      roomCode: gameState.roomCode,
      x: desktopX,
      y: desktopY
    });
  });
}

function processMovement() {
  const speed = 7;
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

  // Constrain position within desktop boundaries
  gameState.localGremlinPos.x = Math.max(40, Math.min(1024 - 40, gameState.localGremlinPos.x));
  gameState.localGremlinPos.y = Math.max(40, Math.min(576 - 40, gameState.localGremlinPos.y));

  if (moved) {
    socket.emit('visitor:moveGremlin', {
      roomCode: gameState.roomCode,
      x: gameState.localGremlinPos.x,
      y: gameState.localGremlinPos.y
    });
  }

  if (keys[' ']) {
    socket.emit('visitor:interact', {
      roomCode: gameState.roomCode,
      action: 'grab',
      targetId: null
    });
  }
}

// Initial application entry point
console.log('🎮 Desktop Gremlin Client loaded');
showScreen('title');

