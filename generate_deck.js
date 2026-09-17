const pptxgen = require('pptxgenjs');
const path = require('path');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'AI Creative Enterprise Team';
pres.company = 'Desktop Gremlin';
pres.title = 'Desktop Gremlin - Pitch Deck';

// Theme Colors
const BG_DARK = '111827';      // Deep slate
const CARD_BG = '1F2937';      // Dark gray card
const CARD_BORDER = '374151';  // Border line
const ACCENT_GREEN = '10B981'; // Gremlin neon green
const ACCENT_GOLD = 'F59E0B';  // Retro desk gold
const ACCENT_BLUE = '3B82F6';  // Tech blue
const ACCENT_PURPLE = '8B5CF6';// Creative purple
const TEXT_LIGHT = 'F9FAFB';   // Primary white
const TEXT_MUTED = '9CA3AF';   // Muted gray
const TEXT_DARK = '111827';

function addHeader(slide, title, category) {
  // Category Pill
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.5,
    w: 4.0,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: ACCENT_GREEN,
    fontFace: 'Arial'
  });

  // Main Slide Title
  slide.addText(title, {
    x: 0.8,
    y: 0.75,
    w: 11.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: TEXT_LIGHT,
    fontFace: 'Arial'
  });
}

// ==========================================
// SLIDE 1: Title Slide
// ==========================================
const slide1 = pres.addSlide();
slide1.background = { color: BG_DARK };

// Decorative backdrop card
slide1.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 0.8, w: 11.73, h: 5.6,
  fill: { color: CARD_BG },
  line: { color: CARD_BORDER, width: 1.5 },
  radius: 12
});

slide1.addText("🎭 MULTIPLAYER WEB PRANK APPLICATION", {
  x: 1.5, y: 1.6, w: 9.0, h: 0.4,
  fontSize: 12, bold: true, color: ACCENT_GREEN, fontFace: 'Arial'
});

slide1.addText("Desktop Gremlin", {
  x: 1.5, y: 2.1, w: 10.0, h: 1.2,
  fontSize: 52, bold: true, color: TEXT_LIGHT, fontFace: 'Arial'
});

slide1.addText("The Real-Time Multiplayer Prank App with 3D Face Puppetry", {
  x: 1.5, y: 3.3, w: 10.0, h: 0.6,
  fontSize: 20, color: ACCENT_GOLD, fontFace: 'Arial'
});

slide1.addText("Turn your webcam into an interactive 3D gremlin avatar. Wander into your friend's simulated desktop, steal icons, slam windows, and unleash delightful mischief.", {
  x: 1.5, y: 4.0, w: 9.5, h: 0.8,
  fontSize: 14, color: TEXT_MUTED, fontFace: 'Arial', lineSpacing: 22
});

// Footer tags
slide1.addShape(pres.ShapeType.roundRect, {
  x: 1.5, y: 5.2, w: 2.4, h: 0.45,
  fill: { color: '064E3B' }, line: { color: ACCENT_GREEN, width: 1 }, radius: 6
});
slide1.addText("Three.js 3D Engine", {
  x: 1.5, y: 5.2, w: 2.4, h: 0.45,
  fontSize: 11, bold: true, color: '6EE7B7', align: 'center', valign: 'middle'
});

slide1.addShape(pres.ShapeType.roundRect, {
  x: 4.1, y: 5.2, w: 2.6, h: 0.45,
  fill: { color: '1E3A8A' }, line: { color: ACCENT_BLUE, width: 1 }, radius: 6
});
slide1.addText("MediaPipe FaceMesh", {
  x: 4.1, y: 5.2, w: 2.6, h: 0.45,
  fontSize: 11, bold: true, color: '93C5FD', align: 'center', valign: 'middle'
});

slide1.addShape(pres.ShapeType.roundRect, {
  x: 6.9, y: 5.2, w: 2.2, h: 0.45,
  fill: { color: '581C87' }, line: { color: ACCENT_PURPLE, width: 1 }, radius: 6
});
slide1.addText("Socket.IO Relay", {
  x: 6.9, y: 5.2, w: 2.2, h: 0.45,
  fontSize: 11, bold: true, color: 'D8B4FE', align: 'center', valign: 'middle'
});

// ==========================================
// SLIDE 2: Problem & Market Opportunity
// ==========================================
const slide2 = pres.addSlide();
slide2.background = { color: BG_DARK };
addHeader(slide2, "The Problem: Online Hangouts Lost Their Playfulness", "Market Context");

// 3 Problem Cards
const problems = [
  {
    title: "Static Video Calls",
    badge: "PASSIVE",
    badgeColor: 'EF4444',
    desc: "Discord, Zoom, and Meet are built for conferencing. Screen-sharing is rigid, one-sided, and business-focused with zero playful co-presence."
  },
  {
    title: "Heavy Gaming Friction",
    badge: "FRICTION",
    badgeColor: 'F59E0B',
    desc: "Most multiplayer party games demand Steam downloads, gigabyte installations, account creation, or paid subscriptions just to have 5 minutes of fun."
  },
  {
    title: "Boring Virtual Avatars",
    badge: "DISCONNECTED",
    badgeColor: '8B5CF6',
    desc: "Existing avatar tools (VTubers, Memojis) live in their own boxed windows. They can't interact with the other user's workspace or environment."
  }
];

problems.forEach((p, idx) => {
  const x = 0.8 + idx * 4.0;
  slide2.addShape(pres.ShapeType.roundRect, {
    x, y: 1.6, w: 3.73, h: 4.8,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1 },
    radius: 8
  });

  slide2.addShape(pres.ShapeType.roundRect, {
    x: x + 0.3, y: 1.9, w: 1.6, h: 0.35,
    fill: { color: p.badgeColor }, radius: 4
  });
  slide2.addText(p.badge, {
    x: x + 0.3, y: 1.9, w: 1.6, h: 0.35,
    fontSize: 10, bold: true, color: TEXT_LIGHT, align: 'center', valign: 'middle'
  });

  slide2.addText(p.title, {
    x: x + 0.3, y: 2.5, w: 3.13, h: 0.6,
    fontSize: 18, bold: true, color: TEXT_LIGHT
  });

  slide2.addText(p.desc, {
    x: x + 0.3, y: 3.2, w: 3.13, h: 2.8,
    fontSize: 13, color: TEXT_MUTED, lineSpacing: 20
  });
});

// ==========================================
// SLIDE 3: The Solution - Desktop Gremlin
// ==========================================
const slide3 = pres.addSlide();
slide3.background = { color: BG_DARK };
addHeader(slide3, "The Solution: A Live Interactive Screen Invasion", "Product Overview");

// Left Column: Core Value Proposition
slide3.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 1.6, w: 5.6, h: 4.8,
  fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
});

slide3.addText("Zero Setup, Instant Chaos", {
  x: 1.1, y: 1.9, w: 5.0, h: 0.4,
  fontSize: 20, bold: true, color: ACCENT_GREEN
});

slide3.addText([
  { text: "• Instant Peer Access: ", options: { bold: true, color: TEXT_LIGHT } },
  { text: "Generate a 6-digit room code and start playing in 3 seconds directly in any browser.\n\n", options: { color: TEXT_MUTED } },
  { text: "• Simulated Retro Desktop: ", options: { bold: true, color: TEXT_LIGHT } },
  { text: "Safe sandbox environment featuring draggable icons, system folders, and fake active windows.\n\n", options: { color: TEXT_MUTED } },
  { text: "• Playful Prank Mechanics: ", options: { bold: true, color: TEXT_LIGHT } },
  { text: "Visitor controls the gremlin to rearrange files, slam active windows shut, and surprise the host.", options: { color: TEXT_MUTED } }
], {
  x: 1.1, y: 2.5, w: 5.0, h: 3.6,
  fontSize: 13, lineSpacing: 20
});

// Right Column: Dual-Role Experience
slide3.addShape(pres.ShapeType.roundRect, {
  x: 6.7, y: 1.6, w: 5.8, h: 2.3,
  fill: { color: CARD_BG }, line: { color: ACCENT_GOLD, width: 1.2 }, radius: 8
});
slide3.addText("👤 THE HOST", {
  x: 7.0, y: 1.8, w: 5.2, h: 0.35,
  fontSize: 14, bold: true, color: ACCENT_GOLD
});
slide3.addText("Shares room code & displays simulated desktop canvas. Watches in real time as their friend's face-controlled avatar invades their workspace.", {
  x: 7.0, y: 2.2, w: 5.2, h: 1.4,
  fontSize: 12, color: TEXT_MUTED, lineSpacing: 18
});

slide3.addShape(pres.ShapeType.roundRect, {
  x: 6.7, y: 4.1, w: 5.8, h: 2.3,
  fill: { color: CARD_BG }, line: { color: ACCENT_GREEN, width: 1.2 }, radius: 8
});
slide3.addText("🕹️ THE VISITOR (GREMLIN)", {
  x: 7.0, y: 4.3, w: 5.2, h: 0.35,
  fontSize: 14, bold: true, color: ACCENT_GREEN
});
slide3.addText("Joins via code. Pilots the gremlin using webcam face tracking + WASD keyboard controls. Sees live mirror feedback and a remote desktop radar view.", {
  x: 7.0, y: 4.7, w: 5.2, h: 1.4,
  fontSize: 12, color: TEXT_MUTED, lineSpacing: 18
});

// ==========================================
// SLIDE 4: Breakthrough Feature - 3D Face Puppetry
// ==========================================
const slide4 = pres.addSlide();
slide4.background = { color: BG_DARK };
addHeader(slide4, "Breakthrough: Real-Time 3D Face Puppetry", "Deep Tech Feature");

const faceFeatures = [
  {
    title: "MediaPipe 468-Point Mesh",
    badge: "COMPUTER VISION",
    desc: "Runs client-side in WebAssembly. Extracts 3D facial landmarks at 60 FPS with zero server GPU overhead or lag."
  },
  {
    title: "Full Euler Head Rotation",
    badge: "REAL-TIME POSE",
    desc: "Calculates Yaw (turning), Pitch (nodding), and Roll (tilting) with lerp-based stabilization to eliminate webcam jitter."
  },
  {
    title: "Articulated Jaw & Fangs",
    badge: "EXPRESSIVE RIG",
    desc: "Dynamic lower jaw hinge rotates down when user opens mouth, revealing cartoon teeth and goblin fangs."
  },
  {
    title: "Blinking & Pointed Ears",
    badge: "CHARACTER LIFE",
    desc: "Hemisphere eyelid shells track real user blinks, while oversized goblin ears wiggle naturally with head tilt."
  }
];

faceFeatures.forEach((f, idx) => {
  const x = 0.8 + (idx % 2) * 6.0;
  const y = 1.6 + Math.floor(idx / 2) * 2.45;

  slide4.addShape(pres.ShapeType.roundRect, {
    x, y, w: 5.7, h: 2.25,
    fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
  });

  slide4.addText(f.badge, {
    x: x + 0.3, y: y + 0.2, w: 5.1, h: 0.3,
    fontSize: 10, bold: true, color: ACCENT_GREEN
  });

  slide4.addText(f.title, {
    x: x + 0.3, y: y + 0.5, w: 5.1, h: 0.4,
    fontSize: 16, bold: true, color: TEXT_LIGHT
  });

  slide4.addText(f.desc, {
    x: x + 0.3, y: y + 0.95, w: 5.1, h: 1.1,
    fontSize: 12, color: TEXT_MUTED, lineSpacing: 18
  });
});

// ==========================================
// SLIDE 5: Architecture & Data Flow
// ==========================================
const slide5 = pres.addSlide();
slide5.background = { color: BG_DARK };
addHeader(slide5, "System Architecture: Sub-30ms Real-Time Pipeline", "Engineering");

// Step cards across
const steps = [
  { step: "01", title: "Webcam Ingestion", desc: "MediaPipe FaceMesh tracks face landmarks via getUserMedia at ~30 FPS on Visitor client.", color: ACCENT_PURPLE },
  { step: "02", title: "Pose Vectorization", desc: "Translates coordinates into Euler angles (yaw/pitch/roll), mouth openness %, and eye blinks.", color: ACCENT_BLUE },
  { step: "03", title: "Socket.IO Relay", desc: "Node.js WebSocket server routes ephemeral session packets between Host & Visitor.", color: ACCENT_GREEN },
  { step: "04", title: "Three.js Render", desc: "Host desktop Three.js WebGL layer renders 3D head smoothly floating over 2D canvas.", color: ACCENT_GOLD }
];

steps.forEach((s, idx) => {
  const x = 0.8 + idx * 3.0;
  slide5.addShape(pres.ShapeType.roundRect, {
    x, y: 1.6, w: 2.75, h: 4.8,
    fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
  });

  slide5.addText(s.step, {
    x: x + 0.25, y: 1.9, w: 2.25, h: 0.5,
    fontSize: 28, bold: true, color: s.color
  });

  slide5.addText(s.title, {
    x: x + 0.25, y: 2.5, w: 2.25, h: 0.6,
    fontSize: 16, bold: true, color: TEXT_LIGHT
  });

  slide5.addText(s.desc, {
    x: x + 0.25, y: 3.2, w: 2.25, h: 2.8,
    fontSize: 12, color: TEXT_MUTED, lineSpacing: 18
  });
});

// ==========================================
// SLIDE 6: Tech Stack & Reliability
// ==========================================
const slide6 = pres.addSlide();
slide6.background = { color: BG_DARK };
addHeader(slide6, "Technology Stack & Design Decisions", "Implementation");

const techCards = [
  {
    layer: "FRONTEND ENGINE",
    items: [
      "Three.js r128 (WebGL procedural rendering)",
      "HTML5 2D Canvas (Retro desktop & windows)",
      "MediaPipe FaceMesh (Vision tasks in WASM)",
      "Vanilla JS (Zero framework bundle bloat)"
    ]
  },
  {
    layer: "BACKEND & NETWORKING",
    items: [
      "Node.js + Express (Lightweight server)",
      "Socket.IO 4.6 (Bidirectional event relay)",
      "In-Memory Room Store (Zero DB overhead)",
      "CORS enabled for cross-origin tunneling"
    ]
  },
  {
    layer: "DEPLOYABILITY & RESILIENCE",
    items: [
      "Deployable on Render, Railway, or Glitch",
      "ngrok tunneling for instant internet demo",
      "Fallback Simulation Mode: Mouse & Keys work if camera is denied or unavailable",
      "Zero 3D asset lag (Procedural Three.js geometry)"
    ]
  }
];

techCards.forEach((c, idx) => {
  const x = 0.8 + idx * 4.0;
  slide6.addShape(pres.ShapeType.roundRect, {
    x, y: 1.6, w: 3.73, h: 4.8,
    fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
  });

  slide6.addText(c.layer, {
    x: x + 0.3, y: 1.9, w: 3.13, h: 0.35,
    fontSize: 11, bold: true, color: ACCENT_GREEN
  });

  const textList = c.items.map(item => ({
    text: `• ${item}\n\n`,
    options: { color: TEXT_LIGHT, fontSize: 13 }
  }));

  slide6.addText(textList, {
    x: x + 0.3, y: 2.5, w: 3.13, h: 3.6,
    lineSpacing: 18
  });
});

// ==========================================
// SLIDE 7: Roadmap & Feature Matrix
// ==========================================
const slide7 = pres.addSlide();
slide7.background = { color: BG_DARK };
addHeader(slide7, "Product Roadmap & Completed Milestones", "Milestones");

const phases = [
  {
    phase: "PHASE 1 (COMPLETED)",
    status: "100% COMPLETE",
    statusColor: '064E3B',
    textColor: '6EE7B7',
    bullets: [
      "✅ 6-Digit Ephemeral Room codes",
      "✅ Real-time Socket.IO synchronization",
      "✅ Simulated Desktop & Draggable Icons",
      "✅ Interactive Window Close system",
      "✅ WASD & Click-to-move input"
    ]
  },
  {
    phase: "PHASE 2 (NEWLY BUILT)",
    status: "DELIVERED",
    statusColor: '1E3A8A',
    textColor: '93C5FD',
    bullets: [
      "✅ Three.js 3D Gremlin Head Model",
      "✅ MediaPipe FaceMesh webcam tracking",
      "✅ Euler head rotation (Yaw/Pitch/Roll)",
      "✅ Articulated jaw & blinking eyelids",
      "✅ Live Visitor 3D Avatar mirror preview",
      "✅ Fallback Interactive Simulation mode"
    ]
  },
  {
    phase: "PHASE 3 (NEXT STEPS)",
    status: "PLANNED",
    statusColor: '581C87',
    textColor: 'D8B4FE',
    bullets: [
      "⏳ Confetti burst particle explosion",
      "⏳ Screen shake CSS feedback",
      "⏳ Mischievous sound FX & audio cues",
      "⏳ WebXR AR Mode (Gremlin on desk)",
      "⏳ Twitch / Streamer interactive bot"
    ]
  }
];

phases.forEach((ph, idx) => {
  const x = 0.8 + idx * 4.0;
  slide7.addShape(pres.ShapeType.roundRect, {
    x, y: 1.6, w: 3.73, h: 4.8,
    fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
  });

  slide7.addShape(pres.ShapeType.roundRect, {
    x: x + 0.3, y: 1.9, w: 1.8, h: 0.3,
    fill: { color: ph.statusColor }, radius: 4
  });
  slide7.addText(ph.status, {
    x: x + 0.3, y: 1.9, w: 1.8, h: 0.3,
    fontSize: 9, bold: true, color: ph.textColor, align: 'center', valign: 'middle'
  });

  slide7.addText(ph.phase, {
    x: x + 0.3, y: 2.3, w: 3.13, h: 0.4,
    fontSize: 14, bold: true, color: TEXT_LIGHT
  });

  const bulletsText = ph.bullets.map(b => ({
    text: `${b}\n\n`,
    options: { fontSize: 12, color: b.startsWith('✅') ? 'D1FAE5' : TEXT_MUTED }
  }));

  slide7.addText(bulletsText, {
    x: x + 0.3, y: 2.8, w: 3.13, h: 3.4,
    lineSpacing: 16
  });
});

// ==========================================
// SLIDE 8: Market & Use Cases
// ==========================================
const slide8 = pres.addSlide();
slide8.background = { color: BG_DARK };
addHeader(slide8, "Target Audience & Viral Potential", "Go-To-Market");

const useCases = [
  {
    title: "Casual Hangouts & Pranks",
    icon: "🎮",
    desc: "Friends on Discord, FaceTime, or Zoom can send a 6-digit code for quick 2-minute prank sessions during breaks."
  },
  {
    title: "Streamers & Content Creators",
    icon: "📺",
    desc: "Twitch and YouTube streamers can allow subscribers or guests to control a 3D desktop gremlin live during broadcast."
  },
  {
    title: "Remote Team Icebreakers",
    icon: "🏢",
    desc: "Creative agencies, design teams, and tech standups use it as a playful 5-minute team warm-up activity."
  }
];

useCases.forEach((u, idx) => {
  const x = 0.8 + idx * 4.0;
  slide8.addShape(pres.ShapeType.roundRect, {
    x, y: 1.6, w: 3.73, h: 4.8,
    fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }, radius: 8
  });

  slide8.addText(u.icon, {
    x: x + 0.3, y: 1.9, w: 1.0, h: 0.8,
    fontSize: 36
  });

  slide8.addText(u.title, {
    x: x + 0.3, y: 2.8, w: 3.13, h: 0.6,
    fontSize: 18, bold: true, color: TEXT_LIGHT
  });

  slide8.addText(u.desc, {
    x: x + 0.3, y: 3.5, w: 3.13, h: 2.5,
    fontSize: 13, color: TEXT_MUTED, lineSpacing: 20
  });
});

// ==========================================
// SLIDE 9: Conclusion & Live Demo
// ==========================================
const slide9 = pres.addSlide();
slide9.background = { color: BG_DARK };

slide9.addShape(pres.ShapeType.roundRect, {
  x: 0.8, y: 0.8, w: 11.73, h: 5.6,
  fill: { color: CARD_BG },
  line: { color: ACCENT_GREEN, width: 1.5 },
  radius: 12
});

slide9.addText("READY TO CAUSE SOME MISCHIEF?", {
  x: 1.5, y: 1.5, w: 9.0, h: 0.4,
  fontSize: 12, bold: true, color: ACCENT_GREEN
});

slide9.addText("Experience Desktop Gremlin Live", {
  x: 1.5, y: 2.0, w: 10.0, h: 1.0,
  fontSize: 44, bold: true, color: TEXT_LIGHT
});

slide9.addText("The web-based multiplayer prank app where your face becomes a 3D avatar living on your friend's screen.", {
  x: 1.5, y: 3.1, w: 9.5, h: 0.6,
  fontSize: 16, color: TEXT_MUTED
});

// Demo instructions box
slide9.addShape(pres.ShapeType.roundRect, {
  x: 1.5, y: 3.8, w: 10.33, h: 1.8,
  fill: { color: BG_DARK }, line: { color: CARD_BORDER, width: 1 }, radius: 8
});

slide9.addText([
  { text: "1. Run locally: ", options: { bold: true, color: ACCENT_GOLD } },
  { text: "npm start  ➔  Open http://localhost:3000 in two windows\n", options: { color: TEXT_LIGHT } },
  { text: "2. Host Session: ", options: { bold: true, color: ACCENT_GOLD } },
  { text: "Click 'Host a Session' and share the 6-digit room code\n", options: { color: TEXT_LIGHT } },
  { text: "3. Join & Track: ", options: { bold: true, color: ACCENT_GOLD } },
  { text: "Enter code, click '📷 Enable Camera', and control the 3D Gremlin Head with your face!", options: { color: TEXT_LIGHT } }
], {
  x: 1.8, y: 4.0, w: 9.7, h: 1.4,
  fontSize: 13, lineSpacing: 22
});

const outputPath = path.join(__dirname, 'Desktop_Gremlin_Pitch_Deck.pptx');
pres.writeFile({ fileName: outputPath })
  .then(fileName => {
    console.log(`Presentation successfully created at: ${fileName}`);
  })
  .catch(err => {
    console.error('Error creating presentation:', err);
    process.exit(1);
  });

