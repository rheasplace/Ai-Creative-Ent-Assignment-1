#!/usr/bin/env node

/**
 * Desktop Gremlin — Quick Start Guide
 * 
 * This file contains common commands and troubleshooting for local development.
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  🎮 Desktop Gremlin                          ║
║              Week 1 Setup — Ready to Go!                     ║
╚══════════════════════════════════════════════════════════════╝

📋 QUICK START:

  1. Start the server:
     $ npm start

  2. In your browser, open TWO tabs (or two windows):
     - http://localhost:3000 (first tab)
     - http://localhost:3000 (second tab)

  3. First tab (Host):
     Click "Host a Session" → note the 6-digit code

  4. Second tab (Visitor):
     Click "Join a Session" → enter the code → click Join

  5. Control the gremlin in the second tab:
     Use arrow keys or WASD to move it around
     Or click on the live preview to jump directly

═══════════════════════════════════════════════════════════════

📁 PROJECT STRUCTURE:

  server/index.js        - Express + Socket.IO relay server
  public/index.html      - Main HTML (title screen + game UI)
  public/styles.css      - CSS styling & animations
  public/js/client.js    - Client-side game logic
  package.json           - Dependencies & scripts
  README.md              - Full documentation
  PROGRESS.md            - Week-by-week roadmap

═══════════════════════════════════════════════════════════════

⚙️ COMMON TASKS:

  • Start server (auto-reload on file change):
    $ npm run dev
    (requires nodemon to be installed globally, or use npx nodemon)

  • Install dependencies:
    $ npm install

  • Run tests (not yet implemented):
    $ npm test

  • Check for vulnerabilities:
    $ npm audit

═══════════════════════════════════════════════════════════════

🐛 TROUBLESHOOTING:

  Q: Server won't start / "Port 3000 is already in use"
  A: Kill the process using that port or change PORT in .env to 3001

  Q: "Cannot find module 'express'"
  A: Run \`npm install\` first

  Q: Two browser tabs connected but nothing happens when Visitor moves gremlin
  A: Check browser console (F12) for errors; look for "gremlin:moved" in server logs

  Q: How do I test on two real computers?
  A: Use ngrok:
     \$ npm install -g ngrok
     \$ npm start        (in first terminal)
     \$ ngrok http 3000  (in second terminal)
     Share the public URL with your friend

═══════════════════════════════════════════════════════════════

📅 NEXT STEPS:

  Week 2 (Gremlin Interactions):
  • Implement icon dragging (when gremlin overlaps + Space pressed)
  • Implement window closing (click X button)
  • Add gremlin walk animation

  Week 3 (Polish & Deploy):
  • Add chaos effects (confetti, screen shake)
  • Test over the internet
  • Bug fixes

═══════════════════════════════════════════════════════════════

✅ VERIFIED FEATURES:

  ✓ Two clients can connect to the same room
  ✓ Gremlin position syncs in real-time via WebSocket
  ✓ Visitor can move with arrow keys or click
  ✓ Host sees the gremlin move on their desktop
  ✓ Clean UI with status indicators
  ✓ Room codes are ephemeral (reset on server restart)

═══════════════════════════════════════════════════════════════

Have fun building! 🚀
`);
