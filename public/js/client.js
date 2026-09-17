// Socket.IO client connection
const socket = io();

// Game state
const gameState = {
  role: null, // 'host' or 'visitor'
  roomCode: null,
  connected: false,
  deskState: {
    icons: [],
    windows: [],
    gremlinPos: { x: 512, y: 288 },
    gremlinMode: 'head-tracked', // 'head-tracked' (3D) or 'walk' (2D)
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

// UI elements
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
const statusLabel = document.getElementById('statusLabel');

// Canvas contexts & 3D instances
let desktopCtx = desktopCanvas ? desktopCanvas.getContext('2d') : null;
let remoteCtx = remoteCanvas ? remoteCanvas.getContext('2d') : null;
let hostGremlin3D = null;
let visitorGremlin3D = null;
let faceTracker = null;

// ==================== UI Navigation ====================
function showScreen(screenName) {
  Object.values(screens).forEach((screen) => screen.classList.add('hidden'));
  if (screens[screenName]) {
    screens[screenName].classList.remove('hidden');
  }
}

hostBtn.addEventListener('click', () => {
  socket.emit('host:create');
});

joinBtn.addEventListener('click', () => {
  showScreen('join');
});

endHost.addEventListener('click', () => {
  socket.disconnect();
  location.reload();
});

cancelJoin.addEventListener('click', () => {
  showScreen('title');
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
  if (faceTracker) {
    faceTracker.stop();
  }
  socket.disconnect();
  location.reload();
});

// ==================== Socket.IO Events ====================

// Host: Room created
socket.on('host:created', ({ roomCode }) => {
  gameState.role = 'host';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  roomCodeDisplay.textContent = roomCode;
  showScreen('roomCode');
  console.log(`[HOST] Room code: ${roomCode}`);
});

// Host: Visitor joined
socket.on('visitor:joined', ({ visitorId }) => {
  console.log(`[HOST] Visitor joined: ${visitorId}`);
  startGameHost();
});

// Visitor: Successfully joined room
socket.on('session:join', ({ roomCode, role, state }) => {
  gameState.role = 'visitor';
  gameState.roomCode = roomCode;
  gameState.connected = true;
  if (state) {
    gameState.deskState = Object.assign(gameState.deskState, state);
  }
  console.log(`[VISITOR] Joined room ${roomCode}`);
  startGameVisitor();
});

// Error from server
socket.on('error', ({ message }) => {
  if (joinError) {
    joinError.textContent = `Error: ${message}`;
  }
  console.error(message);
});

// Visitor left
socket.on('visitor:left', () => {
  console.log('[HOST] Visitor disconnected');
  alert('Visitor left the session');
  location.reload();
});

// Session ended
socket.on('session:ended', ({ reason }) => {
  console.log(`[VISITOR] Session ended: ${reason}`);
  alert('Session ended: ' + reason);
  location.reload();
});

// State updated
socket.on('state:updated', (state) => {
  gameState.deskState = Object.assign(gameState.deskState, state);
});

// Host: Gremlin moved
socket.on('gremlin:moved', ({ x, y }) => {
  gameState.deskState.gremlinPos = { x, y };
  if (hostGremlin3D) {
    hostGremlin3D.setPosition(x, y);
  }
});

// Host: 3D Face tracking update received
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

// Host: Gremlin mode changed (2D sprite vs 3D head)
socket.on('gremlin:modeChanged', ({ mode }) => {
  gameState.deskState.gremlinMode = mode;
  console.log(`[MODE] Switched to ${mode}`);
});

// Host: Visitor attempted interaction
socket.on('gremlin:interact', ({ action, targetId }) => {
  console.log(`[HOST] Gremlin interaction: ${action} on ${targetId}`);
});

// Visitor: Interaction complete feedback
socket.on('interaction:complete', (result) => {
  console.log('[VISITOR] Interaction result:', result);
});

// ==================== Host Setup & Rendering ====================

function startGameHost() {
  roleLabel.textContent = '👤 Host (Desktop)';
  hostView.classList.remove('hidden');
  visitorView.classList.add('hidden');
  showScreen('game');

  // Sample desktop data
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

  // Initialize 3D Gremlin Head overlay on host desktop
  if (typeof GremlinHead3D !== 'undefined' && threeCanvas) {
    hostGremlin3D = new GremlinHead3D({
      canvas: threeCanvas,
      width: 1024,
      height: 576,
      isOverlay: true
    });
  }

  // Start rendering loop
  renderDesktop();
}

function renderDesktop() {
  const w = desktopCanvas.width;
  const h = desktopCanvas.height;

  // Clear 2D background
  desktopCtx.fillStyle = '#d4af37';
  desktopCtx.fillRect(0, 0, w, h);

  // Draw wallpaper pattern (grid)
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

  // Draw icons
  gameState.deskState.icons.forEach((icon) => {
    drawIcon(icon);
  });

  // Draw windows
  gameState.deskState.windows.forEach((window) => {
    if (window.open) {
      drawWindow(window);
    }
  });

  // Render Gremlin according to mode
  if (gameState.deskState.gremlinMode === 'head-tracked' && hostGremlin3D) {
    // 3D head rendered via Three.js overlay canvas
    threeCanvas.style.display = 'block';
    hostGremlin3D.render();
  } else {
    // Fallback 2D gremlin circle
    if (threeCanvas) threeCanvas.style.display = 'none';
    drawGremlin(gameState.deskState.gremlinPos.x, gameState.deskState.gremlinPos.y);
  }

  requestAnimationFrame(renderDesktop);
}

function drawIcon(icon) {
  const x = icon.x;
  const y = icon.y;
  const size = 50;

  desktopCtx.fillStyle = '#fff';
  desktopCtx.fillRect(x - size / 2, y - size / 2, size, size);
  desktopCtx.strokeStyle = '#ccc';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x - size / 2, y - size / 2, size, size);

  desktopCtx.fillStyle = '#333';
  desktopCtx.font = 'bold 24px Arial';
  desktopCtx.textAlign = 'center';
  desktopCtx.textBaseline = 'middle';

  let symbol = '📁';
  if (icon.type === 'file') symbol = '📄';
  if (icon.type === 'app') symbol = '⚙️';

  desktopCtx.fillText(symbol, x, y);

  desktopCtx.font = '12px Arial';
  desktopCtx.fillStyle = '#333';
  desktopCtx.fillText(icon.label, x, y + 35);
}

function drawWindow(window) {
  const { x, y, width, height, title } = window;

  desktopCtx.fillStyle = '#f0f0f0';
  desktopCtx.fillRect(x, y, width, height);
  desktopCtx.strokeStyle = '#999';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x, y, width, height);

  desktopCtx.fillStyle = '#0078d4';
  desktopCtx.fillRect(x, y, width, 25);

  desktopCtx.font = 'bold 14px Arial';
  desktopCtx.fillStyle = '#fff';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'middle';
  desktopCtx.fillText(title, x + 10, y + 12.5);

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

function drawGremlin(x, y) {
  desktopCtx.fillStyle = '#4caf50';
  desktopCtx.beginPath();
  desktopCtx.arc(x, y, 20, 0, Math.PI * 2);
  desktopCtx.fill();

  desktopCtx.fillStyle = '#fff';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.fill();
  desktopCtx.beginPath();
  desktopCtx.arc(x + 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.fill();

  desktopCtx.fillStyle = '#000';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.fill();
  desktopCtx.beginPath();
  desktopCtx.arc(x + 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.fill();

  desktopCtx.strokeStyle = '#000';
  desktopCtx.lineWidth = 2;
  desktopCtx.beginPath();
  desktopCtx.arc(x, y + 3, 5, 0, Math.PI);
  desktopCtx.stroke();
}

// ==================== Visitor Setup & Input ====================

function startGameVisitor() {
  roleLabel.textContent = '🕹️ Visitor (Gremlin Controller)';
  hostView.classList.add('hidden');
  visitorView.classList.remove('hidden');
  showScreen('game');

  // Initialize 3D avatar preview for visitor
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
        // Merge into local pose
        Object.assign(gameState.localGremlinPose, pose);

        // Update local 3D mirror
        if (visitorGremlin3D) {
          visitorGremlin3D.updatePose(pose);
        }

        // Send to server/host
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
      onStatusChange: (statusText, isTracking) => {
        if (faceTrackingStatus) {
          faceTrackingStatus.textContent = statusText;
        }
      }
    });

    // Auto-start simulation mode so user has immediate interactivity
    faceTracker.startSimulation();
  }

  // Setup camera toggle button
  if (toggleCameraBtn) {
    toggleCameraBtn.addEventListener('click', async () => {
      if (faceTracker) {
        if (!faceTracker.isTracking) {
          toggleCameraBtn.textContent = '⏳ Starting Camera...';
          await faceTracker.start();
          if (faceTracker.isTracking) {
            toggleCameraBtn.textContent = '🛑 Stop Camera';
          } else {
            toggleCameraBtn.textContent = '📷 Retry Camera';
          }
        } else {
          faceTracker.stop();
          toggleCameraBtn.textContent = '📷 Enable Camera';
          faceTracker.startSimulation();
        }
      }
    });
  }

  // Setup mode switch button (2D vs 3D)
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      const newMode = gameState.deskState.gremlinMode === 'head-tracked' ? 'walk' : 'head-tracked';
      gameState.deskState.gremlinMode = newMode;
      toggleModeBtn.textContent = newMode === 'head-tracked' ? 'Switch to 2D' : 'Switch to 3D Head';
      socket.emit('visitor:toggleMode', { roomCode: gameState.roomCode, mode: newMode });
    });
  }

  // Keyboard and remote click controls
  setupVisitorInput();

  // Start rendering loop for visitor
  renderRemoteView();
}

function renderRemoteView() {
  const w = remoteCanvas.width;
  const h = remoteCanvas.height;
  const scale = 0.5;

  remoteCtx.fillStyle = '#d4af37';
  remoteCtx.fillRect(0, 0, w, h);

  // Scaled icons
  gameState.deskState.icons.forEach((icon) => {
    remoteCtx.fillStyle = '#ff9800';
    remoteCtx.fillRect(icon.x * scale - 12, icon.y * scale - 12, 24, 24);
  });

  // Scaled windows
  gameState.deskState.windows.forEach((window) => {
    if (window.open) {
      remoteCtx.fillStyle = '#fff';
      remoteCtx.fillRect(
        window.x * scale,
        window.y * scale,
        window.width * scale,
        window.height * scale
      );
    }
  });

  // Scaled gremlin indicator
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

const keys = {};

function setupVisitorInput() {
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    processInput();
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  remoteCanvas.addEventListener('click', (e) => {
    const rect = remoteCanvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / (rect.width / remoteCanvas.width);
    const clickY = (e.clientY - rect.top) / (rect.height / remoteCanvas.height);

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

function processInput() {
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

  // Clamp to canvas bounds
  gameState.localGremlinPos.x = Math.max(40, Math.min(1024 - 40, gameState.localGremlinPos.x));
  gameState.localGremlinPos.y = Math.max(40, Math.min(576 - 40, gameState.localGremlinPos.y));

  if (moved) {
    socket.emit('visitor:moveGremlin', {
      roomCode: gameState.roomCode,
      x: gameState.localGremlinPos.x,
      y: gameState.localGremlinPos.y
    });

    if (faceTracker && faceTracker.simulationActive) {
      socket.emit('visitor:faceUpdate', {
        roomCode: gameState.roomCode,
        pose: {
          ...gameState.localGremlinPose,
          x: gameState.localGremlinPos.x,
          y: gameState.localGremlinPos.y
        }
      });
    }
  }

  if (keys[' ']) {
    socket.emit('visitor:interact', {
      roomCode: gameState.roomCode,
      action: 'grab',
      targetId: null
    });
  }
}

// ==================== Initialization ====================
console.log('🎮 Desktop Gremlin 3D Face Client loaded');
showScreen('title');

