const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// In-memory room storage: { roomCode: { hostId, visitorId, hostSocket, visitorSocket, state } }
const rooms = {};

// Generate a random 4-6 digit room code
function generateRoomCode() {
  return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000).toString();
}

// Serve static files (client-side app)
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${socket.id}] User connected`);

  // Host creates a session
  socket.on('host:create', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      hostId: socket.id,
      visitorId: null,
      hostSocket: socket,
      visitorSocket: null,
      state: {
        icons: [], // Array of { id, x, y, type }
        windows: [], // Array of { id, x, y, width, height, title, open }
        gremlinPos: { x: 0, y: 0 },
        gremlinMode: 'walk' // 'walk' or 'head-tracked'
      }
    };

    socket.emit('host:created', { roomCode });
    console.log(`[HOST] Room ${roomCode} created by ${socket.id}`);
  });

  // Visitor joins a session
  socket.on('visitor:join', ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      console.log(`[VISITOR] ${socket.id} tried to join non-existent room ${roomCode}`);
      return;
    }

    if (room.visitorId !== null) {
      socket.emit('error', { message: 'Room is full' });
      console.log(`[VISITOR] ${socket.id} tried to join full room ${roomCode}`);
      return;
    }

    room.visitorId = socket.id;
    room.visitorSocket = socket;

    // Notify both peers
    room.hostSocket.emit('visitor:joined', { visitorId: socket.id });
    socket.emit('session:join', { roomCode, role: 'visitor', state: room.state });

    console.log(`[VISITOR] ${socket.id} joined room ${roomCode}`);
  });

  // Host sends updated desk state
  socket.on('host:updateState', ({ roomCode, state }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.state = state;
      // Broadcast to visitor
      if (room.visitorSocket) {
        room.visitorSocket.emit('state:updated', state);
      }
    }
  });

  // Visitor sends gremlin control command
  socket.on('visitor:moveGremlin', ({ roomCode, x, y }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      room.state.gremlinPos = { x, y };
      // Broadcast to host
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:moved', { x, y });
      }
    }
  });

  // Visitor requests drag/interaction
  socket.on('visitor:interact', ({ roomCode, action, targetId }) => {
    const room = rooms[roomCode];
    if (room && room.visitorId === socket.id) {
      if (room.hostSocket) {
        room.hostSocket.emit('gremlin:interact', { action, targetId });
      }
    }
  });

  // Host confirms interaction result (e.g., icon moved, window closed)
  socket.on('host:interactionComplete', ({ roomCode, result }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      if (room.visitorSocket) {
        room.visitorSocket.emit('interaction:complete', result);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[${socket.id}] User disconnected`);

    // Find and clean up room
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      if (room.hostId === socket.id) {
        if (room.visitorSocket) {
          room.visitorSocket.emit('session:ended', { reason: 'host_disconnected' });
        }
        delete rooms[roomCode];
        console.log(`[CLEANUP] Room ${roomCode} deleted (host left)`);
      } else if (room.visitorId === socket.id) {
        if (room.hostSocket) {
          room.hostSocket.emit('visitor:left');
        }
        room.visitorId = null;
        room.visitorSocket = null;
        console.log(`[CLEANUP] Visitor left room ${roomCode}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 Desktop Gremlin Server running on http://localhost:${PORT}\n`);
  console.log('Waiting for connections...\n');
});
