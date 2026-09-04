# Desktop Gremlin — Week 1 Setup Summary

## ✅ Completed: Core Plumbing & Project Structure

### What's Been Set Up

**1. Server (Node.js + Socket.IO)**
- ✅ Express server running on `http://localhost:3000`
- ✅ Socket.IO WebSocket relay configured with CORS enabled
- ✅ Room management system using in-memory storage (room codes are 6-digit random numbers)
- ✅ Event handlers for:
  - Host room creation (`host:create`)
  - Visitor joining (`visitor:join`)
  - State synchronization (`host:updateState`, `state:updated`)
  - Gremlin movement (`visitor:moveGremlin`, `gremlin:moved`)
  - Interaction events (`visitor:interact`, `gremlin:interact`)

**2. Client (HTML + Canvas + Vanilla JS)**
- ✅ Title screen with "Host" and "Join" buttons
- ✅ Room code display screen (for host sharing)
- ✅ Join screen (for visitor entering room code)
- ✅ Game screen with dual views:
  - **Host view**: Full-size Canvas rendering the simulated desktop
  - **Visitor view**: Control panel with input instructions + remote preview canvas
- ✅ Socket.IO client that handles all connection lifecycle

**3. Simulated Desktop UI**
- ✅ Desktop background (gold gradient with grid pattern)
- ✅ 4 draggable icon sprites (Folder, File, App types) with labels
- ✅ 1 fake window (System Info) with title bar and close button (X)
- ✅ Gremlin character (simple green circle with eyes + mouth) that renders at received position

**4. Input System (Visitor Control)**
- ✅ Keyboard input: Arrow keys + WASD for movement
- ✅ Click-to-move: Click on remote canvas to move gremlin directly
- ✅ Movement is bound to canvas and clamped to avoid off-screen
- ✅ Sends position updates to host in real-time via Socket.IO

**5. File Structure**
```
desktop-gremlin/
├── server/index.js               # Full server + event handlers
├── public/
│   ├── index.html               # All UI screens in one file
│   ├── styles.css               # Responsive design + animations
│   └── js/client.js             # Main client logic (all in one file for simplicity)
├── package.json                 # Dependencies: express, socket.io, cors, dotenv
├── .env                         # PORT=3000
└── README.md                    # Full documentation
```

### Project Dependencies
- **express**: Web server
- **socket.io**: Real-time bidirectional WebSocket communication
- **cors**: Cross-origin request handling
- **dotenv**: Environment configuration
- **nodemon** (dev): Auto-restart on file changes

---

## 🎮 How to Use Right Now

### Start the server
```bash
npm start
```
Server runs on `http://localhost:3000`

### In browser (two tabs, or two computers)
1. **Tab/Computer 1 (Host)**
   - Open `http://localhost:3000`
   - Click "Host a Session"
   - Copy the 6-digit room code shown

2. **Tab/Computer 2 (Visitor)**
   - Open `http://localhost:3000`
   - Click "Join a Session"
   - Paste the room code from host
   - Click "Join"

3. **Control the gremlin**
   - Use arrow keys or WASD to move
   - Or click on the remote canvas to move directly
   - Watch it move on the host's desktop in real-time

---

## 🛠️ What's Next (Remaining Weeks)

### Week 2 Priority: Interactions
- [ ] Icon dragging: When gremlin overlaps icon + space pressed, start dragging that icon
- [ ] Window closing: When gremlin reaches close button + space pressed, remove window
- [ ] Gremlin animations: Idle (blink), walk cycle (4-frame spritesheet), grab pose
- [ ] Add 1-2 more draggable windows to the desk
- [ ] Visual feedback: Highlight icon/window when gremlin is hovering over it

### Week 3 Polish:
- [ ] UI refinement (title screen, better fonts, theme)
- [ ] Chaos effect #1: Confetti burst when window closes
- [ ] Chaos effect #2: Screen shake CSS animation
- [ ] Sound effects (optional, can skip if time is tight)
- [ ] Test over actual internet (ngrok or free deploy)
- [ ] Bug fixes and stability

### Stretch Goals (if time):
- [ ] WebXR AR mode (gremlin appears on real desktop via phone)
- [ ] Face-tracked floating head (MediaPipe + Three.js)
- [ ] Multiple concurrent sessions

---

## 📝 Socket.IO Event Flow

### Host Creates Session
```
Host clicks "Host"
  → client emits: host:create
  → server generates roomCode, stores in rooms[roomCode]
  → server emits back: host:created { roomCode }
  → Host sees code on screen
```

### Visitor Joins
```
Visitor enters code, clicks "Join"
  → client emits: visitor:join { roomCode }
  → server checks if room exists, adds visitorId
  → server emits to host: visitor:joined { visitorId }
  → server emits to visitor: session:join { roomCode, role, state }
  → Both screens show "Game Screen" with their respective views
```

### Gremlin Movement (Continuous)
```
Visitor presses arrow key
  → client emits: visitor:moveGremlin { roomCode, x, y }
  → server receives, updates rooms[roomCode].state.gremlinPos
  → server emits to host: gremlin:moved { x, y }
  → host's canvas re-renders gremlin at new position
```

---

## 🧪 Quick Test Checklist

Before moving to Week 2, verify:
- [ ] Server starts without errors (`npm start`)
- [ ] Two browser tabs can both open `http://localhost:3000`
- [ ] Host can create a room and see the code
- [ ] Visitor can join with the code (no "Room not found" error)
- [ ] Both see "Connected" status indicator turn green
- [ ] Visitor can move gremlin with arrow keys; it shows up on host's canvas in real-time
- [ ] Visitor can click remote canvas and gremlin jumps to that position
- [ ] Refreshing one side doesn't break the other's ability to move

---

## 💡 Code Notes for Next Week

### To Add Icon Dragging
Look in `public/js/client.js` → TODO comment near "if (keys[' '])" — implement:
1. Check if gremlin overlaps any icon (distance formula)
2. Store that icon as "grabbed"
3. On each frame, update that icon's position to match gremlin
4. On space release, snap icon to a grid or just drop it there
5. Emit `host:updateState` to broadcast new icon positions

### To Add Window Closing
Same section — when gremlin overlaps window close button (top-right X):
1. Detect collision with close button hitbox
2. On space press, remove window from `gameState.deskState.windows`
3. Emit `host:updateState` with updated windows array
4. Optional: emit `host:interactionComplete` to give visitor feedback

### Animation Notes
- Gremlin draw function is in `drawGremlin()` — currently just a static circle
- To add animations, swap the static draw for a spritesheet-based function
- Track gremlin direction (last movement direction) and elapsed time to pick animation frame

---

## 🚀 Deployment Notes (Future)

When ready to share over the internet:
1. **Local testing with ngrok**: `ngrok http 3000` → gives public URL
2. **Free deployment**:
   - https://render.com (Node.js, free tier with limits)
   - https://railway.app (very simple deploy)
   - https://glitch.com (easiest remix/fork workflow)

No database needed — rooms live in memory (reset on server restart, which is fine for a class demo).

---

## 📚 Reference Docs

- [Socket.IO Docs](https://socket.io/docs/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Express Static Files](https://expressjs.com/en/starter/static-files.html)

Enjoy! 🎮
