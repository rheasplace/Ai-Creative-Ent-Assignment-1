# Desktop Gremlin

A real-time multiplayer prank app where one user controls a mischievous gremlin character that can wander into their friend's simulated desktop, grab and move icons, close windows, and cause general chaos.

## Project Structure

```
desktop-gremlin/
├── server/
│   └── index.js              # Express + Socket.IO server
├── public/
│   ├── index.html            # Main HTML
│   ├── styles.css            # Styling
│   └── js/
│       └── client.js         # Client-side logic
├── package.json              # Dependencies
├── .env                       # Environment config
└── README.md
```

## Setup

### Prerequisites
- Node.js 14+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## How to Play

### Host
1. Click "Host a Session"
2. Share the 6-digit room code with a friend
3. Wait for them to join
4. Watch as they control a gremlin character on your simulated desktop

### Visitor (Guest)
1. Click "Join a Session"
2. Enter the room code from the host
3. Use **arrow keys** or **WASD** to move the gremlin
4. Press **Space** to grab and interact with objects
5. Click on the remote view to move the gremlin directly

## Features

### Core (Week 1-2)
- ✅ Room creation and joining via 6-digit codes
- ✅ Real-time state synchronization via Socket.IO
- ✅ Simulated desktop with draggable icons and windows
- ✅ Gremlin character (simple 2D rendering)
- ✅ Keyboard/click-based movement controls
- ✅ Window close interaction

### Planned (Week 2-3)
- [ ] Icon grab/drag by gremlin
- [ ] Confetti chaos effect
- [ ] Screen shake on interaction
- [ ] Gremlin animations (walk, idle, grab)
- [ ] Improved UI polish
- [ ] Session timeout/cleanup

### Stretch Goals / Future
- [ ] WebXR AR mode (gremlin on real desktop)
- [ ] Face-tracked floating head mode (via MediaPipe)
- [ ] Sound effects and music
- [ ] Multiple concurrent sessions per server
- [ ] Persistent session history / replays

## Technology Stack

- **Frontend**: HTML5, Canvas, Vanilla JavaScript
- **Backend**: Node.js, Express, Socket.IO
- **Hosting**: Can be deployed to Render, Railway, or Glitch for demo
- **Real-time Communication**: WebSocket (Socket.IO)

## Development Notes

### Game State Structure
```javascript
{
  icons: [{ id, x, y, type, label }],
  windows: [{ id, x, y, width, height, title, open }],
  gremlinPos: { x, y },
  gremlinMode: 'walk' | 'head-tracked'
}
```

### Socket Events

**Host → Server**
- `host:create` — create a new room
- `host:updateState` — broadcast desk state changes
- `host:interactionComplete` — confirm interaction result to visitor

**Visitor → Server**
- `visitor:join` — join a room by code
- `visitor:moveGremlin` — move gremlin position
- `visitor:interact` — attempt grab/interaction

**Server → Clients**
- `host:created` — room code and initial response
- `visitor:joined` — notify host of visitor
- `session:join` — confirm join for visitor
- `state:updated` — broadcast state to visitor
- `gremlin:moved` — broadcast gremlin position to host
- `gremlin:interact` — relay interaction to host

## Running Over the Internet

For local testing, use `localhost:3000`. To share with a friend over the internet:

1. Deploy to a free tier host like [Render](https://render.com) or [Railway](https://railway.app)
2. Or use `ngrok` for quick tunneling:
   ```bash
   ngrok http 3000
   ```
3. Share the public URL with your friend

## Known Limitations

- No real OS-level desktop integration (simulated desk only)
- No audio/voice chat (can use Discord/Zoom alongside)
- No user accounts or authentication (room codes are ephemeral)
- No persistence (server restart clears all rooms)

## Future Improvements

See "Stretch Goals" section in project spec for WebXR, face tracking, and additional polish.
