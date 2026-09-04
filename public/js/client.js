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
    gremlinMode: 'walk'
  },
  localGremlinPos: { x: 512, y: 288 }
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
const remoteCanvas = document.getElementById('remoteCanvas');
const gremlinDebug = document.getElementById('gremlinDebug');
const statusLabel = document.getElementById('statusLabel');

// Canvas contexts
let desktopCtx = desktopCanvas.getContext('2d');
let remoteCtx = remoteCanvas.getContext('2d');

// ==================== UI Navigation ====================
function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
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
  gameState.deskState = state;
  console.log(`[VISITOR] Joined room ${roomCode}`);
  startGameVisitor();
});

// Error from server
socket.on('error', ({ message }) => {
  joinError.textContent = `Error: ${message}`;
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

// Host: State updated by visitor action
socket.on('state:updated', (state) => {
  gameState.deskState = state;
});

// Host: Gremlin moved
socket.on('gremlin:moved', ({ x, y }) => {
  gameState.deskState.gremlinPos = { x, y };
});

// Host: Visitor attempted interaction
socket.on('gremlin:interact', ({ action, targetId }) => {
  console.log(`[HOST] Gremlin interaction: ${action} on ${targetId}`);
  // TODO: implement grab/drop and window close logic
});

// Visitor: Interaction complete feedback
socket.on('interaction:complete', (result) => {
  console.log('[VISITOR] Interaction result:', result);
});

// ==================== Game Setup ====================

function startGameHost() {
  roleLabel.textContent = '👤 Host';
  hostView.classList.remove('hidden');
  visitorView.classList.add('hidden');
  showScreen('game');

  // Initialize desk state with sample data
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
    gremlinMode: 'walk'
  };

  // Start rendering loop
  renderDesktop();
}

function startGameVisitor() {
  roleLabel.textContent = '🕹️ Visitor';
  hostView.classList.add('hidden');
  visitorView.classList.remove('hidden');
  showScreen('game');

  // Setup input handling
  setupVisitorInput();

  // Start rendering loop (show remote view)
  renderRemoteView();
}

// ==================== Rendering ====================

function renderDesktop() {
  const w = desktopCanvas.width;
  const h = desktopCanvas.height;

  // Clear canvas
  desktopCtx.fillStyle = '#d4af37';
  desktopCtx.fillRect(0, 0, w, h);

  // Draw wallpaper pattern (simple grid)
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
  gameState.deskState.icons.forEach(icon => {
    drawIcon(icon);
  });

  // Draw windows
  gameState.deskState.windows.forEach(window => {
    if (window.open) {
      drawWindow(window);
    }
  });

  // Draw gremlin
  drawGremlin(gameState.deskState.gremlinPos.x, gameState.deskState.gremlinPos.y);

  // Continue animation loop
  requestAnimationFrame(renderDesktop);
}

function renderRemoteView() {
  const w = remoteCanvas.width;
  const h = remoteCanvas.height;
  const scale = 0.5; // Scale from full desktop to remote view

  // Clear canvas
  remoteCtx.fillStyle = '#d4af37';
  remoteCtx.fillRect(0, 0, w, h);

  // Draw scaled icons
  gameState.deskState.icons.forEach(icon => {
    remoteCtx.fillStyle = '#ff9800';
    remoteCtx.fillRect(icon.x * scale - 12, icon.y * scale - 12, 24, 24);
  });

  // Draw scaled windows
  gameState.deskState.windows.forEach(window => {
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

  // Draw scaled gremlin
  remoteCtx.fillStyle = '#4caf50';
  remoteCtx.fillRect(
    gameState.deskState.gremlinPos.x * scale - 10,
    gameState.deskState.gremlinPos.y * scale - 10,
    20,
    20
  );

  // Update debug info
  gremlinDebug.textContent = `Gremlin: (${Math.round(gameState.deskState.gremlinPos.x)}, ${Math.round(gameState.deskState.gremlinPos.y)})`;

  requestAnimationFrame(renderRemoteView);
}

function drawIcon(icon) {
  const x = icon.x;
  const y = icon.y;
  const size = 50;

  // Icon background
  desktopCtx.fillStyle = '#fff';
  desktopCtx.fillRect(x - size / 2, y - size / 2, size, size);
  desktopCtx.strokeStyle = '#ccc';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x - size / 2, y - size / 2, size, size);

  // Icon symbol based on type
  desktopCtx.fillStyle = '#333';
  desktopCtx.font = 'bold 24px Arial';
  desktopCtx.textAlign = 'center';
  desktopCtx.textBaseline = 'middle';

  let symbol = '📁';
  if (icon.type === 'file') symbol = '📄';
  if (icon.type === 'app') symbol = '⚙️';

  desktopCtx.fillText(symbol, x, y);

  // Label
  desktopCtx.font = '12px Arial';
  desktopCtx.fillStyle = '#333';
  desktopCtx.fillText(icon.label, x, y + 35);
}

function drawWindow(window) {
  const { x, y, width, height, title } = window;

  // Window frame
  desktopCtx.fillStyle = '#f0f0f0';
  desktopCtx.fillRect(x, y, width, height);
  desktopCtx.strokeStyle = '#999';
  desktopCtx.lineWidth = 2;
  desktopCtx.strokeRect(x, y, width, height);

  // Title bar
  desktopCtx.fillStyle = '#0078d4';
  desktopCtx.fillRect(x, y, width, 25);

  // Title text
  desktopCtx.font = 'bold 14px Arial';
  desktopCtx.fillStyle = '#fff';
  desktopCtx.textAlign = 'left';
  desktopCtx.textBaseline = 'middle';
  desktopCtx.fillText(title, x + 10, y + 12.5);

  // Close button (X)
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
  // Simple gremlin: green circle with eyes
  desktopCtx.fillStyle = '#4caf50';
  desktopCtx.beginPath();
  desktopCtx.arc(x, y, 20, 0, Math.PI * 2);
  desktopCtx.fill();

  // Eyes
  desktopCtx.fillStyle = '#fff';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.fill();
  desktopCtx.beginPath();
  desktopCtx.arc(x + 8, y - 5, 6, 0, Math.PI * 2);
  desktopCtx.fill();

  // Pupils
  desktopCtx.fillStyle = '#000';
  desktopCtx.beginPath();
  desktopCtx.arc(x - 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.fill();
  desktopCtx.beginPath();
  desktopCtx.arc(x + 8, y - 5, 3, 0, Math.PI * 2);
  desktopCtx.fill();

  // Mouth
  desktopCtx.strokeStyle = '#000';
  desktopCtx.lineWidth = 2;
  desktopCtx.beginPath();
  desktopCtx.arc(x, y + 3, 5, 0, Math.PI);
  desktopCtx.stroke();
}

// ==================== Visitor Input ====================

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

    // Convert back to full desktop coordinates (scale = 2x)
    const desktopX = clickX * 2;
    const desktopY = clickY * 2;

    socket.emit('visitor:moveGremlin', { roomCode: gameState.roomCode, x: desktopX, y: desktopY });
  });
}

function processInput() {
  const speed = 5;
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
  gameState.localGremlinPos.x = Math.max(20, Math.min(desktopCanvas.width - 20, gameState.localGremlinPos.x));
  gameState.localGremlinPos.y = Math.max(20, Math.min(desktopCanvas.height - 20, gameState.localGremlinPos.y));

  if (moved) {
    socket.emit('visitor:moveGremlin', {
      roomCode: gameState.roomCode,
      x: gameState.localGremlinPos.x,
      y: gameState.localGremlinPos.y
    });
  }

  if (keys[' ']) {
    console.log('[VISITOR] Grab/interact pressed');
    // TODO: check for collision with icons/windows and initiate drag
  }
}

// ==================== Initialization ====================

console.log('🎮 Desktop Gremlin Client loaded');
showScreen('title');
