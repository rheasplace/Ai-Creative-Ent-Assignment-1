/**
 * Desktop Gremlin — Server
 * 
 * Express HTTP server + Socket.IO real-time WebSocket relay.
 * Manages ephemeral 6-digit multiplayer rooms and synchronizes desktop state,
 * 2D gremlin coordinates, and 3D face tracking telemetry between Host and Visitor.
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable Cross-Origin Resource Sharing (CORS) for both Express and Socket.IO
app.use(cors());
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static frontend assets from the public/ directory
app.use(express.static('public'));

// Health check endpoint for uptime monitoring and staging deployments
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// In-Memory Session / Room Management
// ==========================================
// Structure:
// rooms[roomCode] = {
//   hostId: socket.id,
//   visitorId: socket.id | null,
//   hostSocket: socket,
//   visitorSocket: socket | null,
//   state: { icons, windows, gremlinPos, gremlinMode, gremlinPose }
// }
const rooms = {};

/**
 * Generate a random 6-digit alphanumeric room code.
 * Re-rolls if the code is currently in use.
 */
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[code]);
  return code;
}

// ==========================================
// Socket.IO Real-Time Event Handlers
// ==========================================
io.on('connection', (socket) => {
  console.log(`[CONNECT] Socket connected: ${socket.id}`);

  // 1. Host creates a new session room
  socket.on('host:create', () => {
    const roomCode = generateRoomCode();
    // Default interactive desktop environment state
    const defaultDesktopState = {
      icons: [
        { id: 'icon-1', x: 120, y: 100, type: 'folder', label: 'Pictures', isHeld: false },
        { id: 'icon-2', x: 220, y: 100, type: 'file', label: 'Secret_Plans.txt', isHeld: false },
        { id: 'icon-3', x: 320, y: 100, type: 'app', label: 'Gremlin_Chaos.exe', isHeld: false },
        { id: 'icon-4', x: 420, y: 100, type: 'folder', label: 'Downloads', isHeld: false },
        { id: 'icon-5', x: 120, y: 220, type: 'file', label: 'Homework.docx', isHeld: false },
        { id: 'icon-6', x: 220, y: 220, type: 'trash', label: 'Recycle Bin', isHeld: false }
      ],
      windows: [
        {
          id: 'win-1',
          x: 480,
          y: 120,
          width: 320,
          height: 220,
          title: 'System Security Alert',
          open: true,
          content: 'WARNING: Unauthorized Gremlin detected on desktop!\nAll files subject to relocation.'
        }
      ],
      stamps: [], // graffiti, stickers, footprints
      stickyNotes: [],
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
      },
      screenShareActive: false
    };

    rooms[roomCode] = {
      hostId: socket.id,
      visitorId: null,
      hostSocket: socket,
      visitorSocket: null,
      state: defaultDesktopState
    };

    socket.emit('host:created', { roomCode });
    console.log(`[HOST] Room #${roomCode} created by host ${socket.id}`);
  });

  // 2. Visitor joins an existing room using 6-digit code
  socket.on('visitor:join', ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit('error', { message: 'Room not found. Please check your code.' });
      console.log(`[VISITOR] ${socket.id} attempted to join invalid room ${roomCode}`);
      return;
    }

    if (room.visitorId !== null) {
      socket.emit('error', { message: 'This room already has an active guest.' });
      console.log(`[VISITOR] ${socket.id} attempted to join full room ${roomCode}`);
      return;
    }

    room.visitorId = socket.id;
    room.visitorSocket = socket;

    // Notify both peers of successful connection
    room.hostSocket.emit('visitor:joined', { visitorId: socket.id });
    socket.emit('session:join', { roomCode, role: 'visitor', state: room.state });
    console.log(`[VISITOR] ${socket.id} joined room #${roomCode}`);
  });

  // 3. Host updates the full desktop state
  socket.on('host:updateState', ({ roomCode, state }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.state = Object.assign(room.state, state);
      if (room.visitorSocket) {
        room.visitorSocket.emit('state:updated', room.state);
      }
    }
  });

  // 4. Visitor moves the gremlin position via keyboard or canvas click
  socket.on('visitor:moveGremlin', ({ roomCode, x, y }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      room.state.gremlinPos = { x, y };
      if (room.state.gremlinPose) {
        room.state.gremlinPose.x = x;
        room.state.gremlinPose.y = y;
      }
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:moved', { x, y });
      }
    }
  });

  // 5. Visitor streams real-time 3D facial telemetry (yaw, pitch, roll, mouth, eyes)
  socket.on('visitor:faceUpdate', ({ roomCode, pose }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      room.state.gremlinPose = Object.assign(room.state.gremlinPose || {}, pose);
      if (pose.x !== undefined && pose.y !== undefined) {
        room.state.gremlinPos = { x: pose.x, y: pose.y };
      }
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:faceUpdate', pose);
      }
    }
  });

  // 6. Visitor toggles between 3D Head ('head-tracked') and 2D sprite ('walk') mode
  socket.on('visitor:toggleMode', ({ roomCode, mode }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      room.state.gremlinMode = mode;
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:modeChanged', { mode });
      }
    }
  });

  // 7. Interactive Desktop: Icon Drag & Drop
  socket.on('desktop:moveIcon', ({ roomCode, iconId, x, y, isHeld }) => {
    const room = rooms[roomCode];
    if (room) {
      const icon = room.state.icons.find(i => i.id === iconId);
      if (icon) {
        icon.x = x;
        icon.y = y;
        icon.isHeld = !!isHeld;
      }
      // Broadcast to other peer
      const target = socket.id === room.hostId ? room.visitorSocket : room.hostSocket;
      if (target) {
        target.emit('desktop:iconMoved', { iconId, x, y, isHeld });
      }
    }
  });

  // 8. Interactive Desktop: Window Close
  socket.on('desktop:closeWindow', ({ roomCode, windowId }) => {
    const room = rooms[roomCode];
    if (room) {
      const win = room.state.windows.find(w => w.id === windowId);
      if (win) {
        win.open = false;
      }
      // Broadcast to both peers
      if (room.hostSocket) room.hostSocket.emit('desktop:windowClosed', { windowId });
      if (room.visitorSocket) room.visitorSocket.emit('desktop:windowClosed', { windowId });
    }
  });

  // 9. Interactive Desktop: Window Move
  socket.on('desktop:moveWindow', ({ roomCode, windowId, x, y }) => {
    const room = rooms[roomCode];
    if (room) {
      const win = room.state.windows.find(w => w.id === windowId);
      if (win) {
        win.x = x;
        win.y = y;
      }
      const target = socket.id === room.hostId ? room.visitorSocket : room.hostSocket;
      if (target) {
        target.emit('desktop:windowMoved', { windowId, x, y });
      }
    }
  });

  // 10. Interactive Desktop: Spawn New Prank Window
  socket.on('desktop:openWindow', ({ roomCode, windowData }) => {
    const room = rooms[roomCode];
    if (room) {
      room.state.windows.push(windowData);
      if (room.hostSocket) room.hostSocket.emit('desktop:windowOpened', windowData);
      if (room.visitorSocket) room.visitorSocket.emit('desktop:windowOpened', windowData);
    }
  });

  // 11. Interactive Chaos: Trigger Chaos FX (shake, confetti, sound)
  socket.on('desktop:triggerChaos', ({ roomCode, effect, details }) => {
    const room = rooms[roomCode];
    if (room) {
      if (room.hostSocket) room.hostSocket.emit('desktop:chaosTriggered', { effect, details });
      if (room.visitorSocket) room.visitorSocket.emit('desktop:chaosTriggered', { effect, details });
    }
  });

  // 12. Interactive Desktop: Graffiti & Stickers
  socket.on('desktop:addStamp', ({ roomCode, stamp }) => {
    const room = rooms[roomCode];
    if (room) {
      room.state.stamps.push(stamp);
      if (room.hostSocket) room.hostSocket.emit('desktop:stampAdded', stamp);
      if (room.visitorSocket) room.visitorSocket.emit('desktop:stampAdded', stamp);
    }
  });

  // 13. Interactive Desktop: Sticky Notes
  socket.on('desktop:addStickyNote', ({ roomCode, note }) => {
    const room = rooms[roomCode];
    if (room) {
      if (!room.state.stickyNotes) room.state.stickyNotes = [];
      room.state.stickyNotes.push(note);
      if (room.hostSocket) room.hostSocket.emit('desktop:stickyNoteAdded', note);
      if (room.visitorSocket) room.visitorSocket.emit('desktop:stickyNoteAdded', note);
    }
  });

  // 14. Real Screen Share Signaling (WebRTC Relay)
  socket.on('screenShare:status', ({ roomCode, active }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.state.screenShareActive = active;
      if (room.visitorSocket) {
        room.visitorSocket.emit('screenShare:statusChanged', { active });
      }
    }
  });

  socket.on('webrtc:offer', ({ roomCode, sdp }) => {
    const room = rooms[roomCode];
    if (room && room.visitorSocket) {
      room.visitorSocket.emit('webrtc:offer', { sdp });
    }
  });

  socket.on('webrtc:answer', ({ roomCode, sdp }) => {
    const room = rooms[roomCode];
    if (room && room.hostSocket) {
      room.hostSocket.emit('webrtc:answer', { sdp });
    }
  });

  socket.on('webrtc:iceCandidate', ({ roomCode, candidate }) => {
    const room = rooms[roomCode];
    if (room) {
      const target = socket.id === room.hostId ? room.visitorSocket : room.hostSocket;
      if (target) {
        target.emit('webrtc:iceCandidate', { candidate });
      }
    }
  });

  // 15. Legacy interaction fallback
  socket.on('visitor:interact', ({ roomCode, action, targetId }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:interact', { action, targetId });
      }
    }
  });

  // 9. Clean up sessions when either party disconnects
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Socket disconnected: ${socket.id}`);

    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.hostId === socket.id) {
        // If host left, notify visitor and tear down room
        if (room.visitorSocket) {
          room.visitorSocket.emit('session:ended', { reason: 'host_disconnected' });
        }
        delete rooms[roomCode];
        console.log(`[CLEANUP] Room #${roomCode} deleted (host disconnected)`);
      } else if (room.visitorId === socket.id) {
        // If visitor left, notify host and reopen slot
        if (room.hostSocket) {
          room.hostSocket.emit('visitor:left');
        }
        room.visitorId = null;
        room.visitorSocket = null;
        console.log(`[CLEANUP] Visitor left room #${roomCode}`);
      }
    }
  });
});

// ==========================================
// Server Initialization with Auto-Port Fallback
// ==========================================
const DEFAULT_PORT = process.env.PORT || 3000;

/**
 * Starts the HTTP server on `port`.
 * If the port is already in use (EADDRINUSE), automatically tries the next port (port + 1)
 * up to `maxAttempts` times to guarantee a clean launch without crashing.
 */
function startServer(port, maxAttempts = 10) {
  const currentPort = Number(port);

  const serverInstance = server.listen(currentPort, () => {
    console.log(`\n🎮 Desktop Gremlin Server running on http://localhost:${currentPort}`);
    console.log(`📡 Ready for connections...\n`);
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${currentPort} is currently in use.`);
      if (maxAttempts > 0) {
        console.log(`   Trying next port: http://localhost:${currentPort + 1}...`);
        startServer(currentPort + 1, maxAttempts - 1);
      } else {
        console.error('❌ Exceeded maximum port retry attempts. Please free up a port.');
      }
    } else {
      console.error('❌ Server startup error:', err);
    }
  });
}

startServer(DEFAULT_PORT);

