// =====================
// Yono 777 Lottery Wheel (Full Script)
// - Fast spin
// - Winner modal + Next Spin
// - Confetti + sound
// - Performance cache for 1000+ UIDs
// =====================

const wheelCanvas = document.getElementById("wheel");
const wheelCtx = wheelCanvas.getContext("2d");

const confettiCanvas = document.getElementById("confetti");
const confettiCtx = confettiCanvas.getContext("2d");

// Data
let uids = [];
let winners = [];

// Spin state
let rotation = 0;
let spinning = false;

// Tick UI helpers
let lastTickIndex = null;
let tickCooldown = 0;

// Color palette (used in wheel cache rendering)
const SLICE_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

// ========== PERFORMANCE CACHE ==========
// Render wheel once to offscreen canvas; during animation, only rotate drawImage (fast).
const wheelCache = document.createElement("canvas");
const cacheCtx = wheelCache.getContext("2d");
let cacheDirty = true;

// ========== UI CLASS HOOKS ==========
function setSpinningUI(on) {
  document.body.classList.toggle("isSpinning", on);
}
function pulseTickUI() {
  document.body.classList.add("tickPulse");
  setTimeout(() => document.body.classList.remove("tickPulse"), 60);
}
function winFlashUI() {
  document.body.classList.add("winFlash");
  setTimeout(() => document.body.classList.remove("winFlash"), 450);
}

// ========== LOCAL STORAGE ==========
function saveData() {
  localStorage.setItem("uids", JSON.stringify(uids));
  localStorage.setItem("winners", JSON.stringify(winners));
}
function loadSaved() {
  uids = JSON.parse(localStorage.getItem("uids") || "[]");
  winners = JSON.parse(localStorage.getItem("winners") || "[]");
}
function setCounts() {
  const leftEl = document.getElementById("countLeft");
  const winEl = document.getElementById("countWinners");
  if (leftEl) leftEl.textContent = uids.length;
  if (winEl) winEl.textContent = winners.length;
}

// ========== CONFETTI ==========
let confettiPieces = [];
let confettiAnimating = false;

function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = confettiCanvas.clientWidth;
  confettiCanvas.height = confettiCanvas.clientHeight;
}

function launchConfetti() {
  if (!confettiCanvas) return;
  resizeConfetti();
  confettiPieces = [];

  const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"];
  const count = 180;

  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * confettiCanvas.height * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: 140 + Math.floor(Math.random() * 60),
    });
  }

  confettiAnimating = true;
  requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
  if (!confettiAnimating) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  for (const p of confettiPieces) {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.vy += 0.03; // gravity
    p.life++;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  }

  confettiPieces = confettiPieces.filter(
    (p) => p.life < p.maxLife && p.y < confettiCanvas.height + 40
  );

  if (confettiPieces.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimating = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ========== AUDIO (WIN CHIME + CLACK) ==========
let audioCtx = null;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playWinChime() {
  // bright arpeggio style chime
  try {
    ensureAudioCtx();
    const now = audioCtx.currentTime;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.20, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(audioCtx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      g.gain.setValueAtTime(0.0001, now + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.35, now + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.18);

      osc.connect(g);
      g.connect(master);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.22);
    });
  } catch (e) {
    // ignore if blocked
  }
}

function playClack() {
  // short mechanical clack at stop
  try {
    ensureAudioCtx();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(180, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch (e) {
    // ignore
  }
}

// ========== MODAL ==========
function showWinnerModal(uid) {
  const modal = document.getElementById("winnerModal");
  const uidEl = document.getElementById("modalWinnerUid");
  if (uidEl) uidEl.textContent = uid;
  if (modal) modal.classList.remove("hidden");
  playWinChime();
}

function closeWinnerModal() {
  const modal = document.getElementById("winnerModal");
  if (modal) modal.classList.add("hidden");
}

function nextSpin() {
  closeWinnerModal();
  setTimeout(() => {
    if (!spinning && uids.length > 0) spinWheel();
  }, 120);
}

// ========== WHEEL CACHE RENDER ==========
function rebuildWheelCache() {
  cacheDirty = false;

  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  wheelCache.width = w;
  wheelCache.height = h;

  cacheCtx.clearRect(0, 0, w, h);

  // base fill
  cacheCtx.beginPath();
  cacheCtx.fillStyle = "#ffffff";
  cacheCtx.arc(cx, cy, cx, 0, Math.PI * 2);
  cacheCtx.fill();

  if (uids.length === 0) {
    cacheCtx.save();
    cacheCtx.translate(cx, cy);
    cacheCtx.fillStyle = "#0f172a";
    cacheCtx.font = "bold 18px Arial";
    cacheCtx.textAlign = "center";
    cacheCtx.fillText("Load UIDs", 0, 6);
    cacheCtx.restore();
    return;
  }

  const n = uids.length;
  const slice = (2 * Math.PI) / n;
  const r = cx - 12;

  // Borders are expensive for huge lists; keep them for moderate sizes
  const drawBorders = n <= 2000;
  // Labels are unreadable for big lists; keep only for small lists
  const drawLabels = n <= 28;

  cacheCtx.save();
  cacheCtx.translate(cx, cy);

  for (let i = 0; i < n; i++) {
    const start = i * slice;
    const end = start + slice;

    const base = SLICE_COLORS[i % SLICE_COLORS.length];

    // gradient for depth
    const grad = cacheCtx.createRadialGradient(0, 0, 30, 0, 0, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.10, base);
    grad.addColorStop(1, "#0b1224");

    cacheCtx.beginPath();
    cacheCtx.moveTo(0, 0);
    cacheCtx.arc(0, 0, r, start, end);
    cacheCtx.closePath();
    cacheCtx.fillStyle = grad;
    cacheCtx.fill();

    if (drawBorders) {
      cacheCtx.lineWidth = 2;
      cacheCtx.strokeStyle = "rgba(255,255,255,.5)";
      cacheCtx.stroke();
    }

    if (drawLabels) {
      const mid = start + slice / 2;
      cacheCtx.save();
      cacheCtx.rotate(mid);
      cacheCtx.textAlign = "right";
      cacheCtx.fillStyle = "rgba(255,255,255,.98)";
      cacheCtx.font = "900 13px Arial";
      cacheCtx.shadowColor = "rgba(0,0,0,.35)";
      cacheCtx.shadowBlur = 6;
      cacheCtx.fillText(String(uids[i]), cx - 28, 6);
      cacheCtx.restore();
    }
  }

  cacheCtx.restore();

  // outer ring glow
  cacheCtx.beginPath();
  cacheCtx.arc(cx, cy, cx - 8, 0, Math.PI * 2);
  cacheCtx.lineWidth = 8;
  cacheCtx.strokeStyle = "rgba(255,255,255,.25)";
  cacheCtx.stroke();
}

function drawWheel() {
  if (cacheDirty) rebuildWheelCache();

  const w = wheelCanvas.width;
  const h = wheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  wheelCtx.clearRect(0, 0, w, h);

  // rotate cached wheel
  wheelCtx.save();
  wheelCtx.translate(cx, cy);
  wheelCtx.rotate(rotation);
  wheelCtx.drawImage(wheelCache, -cx, -cy);
  wheelCtx.restore();
}

function getIndexUnderPointer() {
  const slice = (2 * Math.PI) / uids.length;
  let angle = (-Math.PI / 2 - rotation) % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  return Math.floor(angle / slice);
}

// ========== ACTIONS ==========
function loadUIDs() {
  const input = document.getElementById("uidInput").value;
  uids = input.split("\n").map((s) => s.trim()).filter(Boolean);

  cacheDirty = true; // rebuild once
  saveData();
  setCounts();
  drawWheel();

  const w = document.getElementById("winnerText");
  if (w) w.textContent = "Loaded. Ready to spin!";
}

function spinWheel() {
  if (spinning) return;
  if (uids.length === 0) return alert("No UIDs in the wheel. Load UIDs first.");

  spinning = true;
  setSpinningUI(true);
  lastTickIndex = null;
  tickCooldown = 0;

  // pick a random target index
  const chosenIndex = Math.floor(Math.random() * uids.length);

  const slice = (2 * Math.PI) / uids.length;
  const targetAngleForIndex = chosenIndex * slice + slice / 2;

  // pointer at -90deg
  let targetRotation = -Math.PI / 2 - targetAngleForIndex;

  // FAST spin
  const extraSpins = (3 + Math.random() * 2) * 2 * Math.PI;
  targetRotation -= extraSpins;

  const startRotation = rotation;
  const duration = 1300; // x2 faster
  const startTime = performance.now();

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    rotation = startRotation + (targetRotation - startRotation) * easeOutQuart(t);
    drawWheel();

    // pointer tick pulse (feels mechanical, cheap)
    if (uids.length > 0) {
      const idx = getIndexUnderPointer();
      if (idx !== lastTickIndex && tickCooldown <= 0) {
        lastTickIndex = idx;
        pulseTickUI();
        tickCooldown = uids.length > 1500 ? 3 : 2; // less spam for huge lists
      }
      tickCooldown--;
    }

    if (t < 1) return requestAnimationFrame(tick);

    // finalize stop
    rotation = targetRotation;
    drawWheel();

    // mechanical wobble settle
    const wobble = 0.06;
    rotation += wobble; drawWheel();
    setTimeout(() => { rotation -= wobble * 0.7; drawWheel(); }, 70);
    setTimeout(() => { rotation += wobble * 0.35; drawWheel(); }, 140);
    setTimeout(() => { rotation -= wobble * 0.20; drawWheel(); }, 210);

    // lock in winner based on final rotation
    const finalIndex = getIndexUnderPointer();
    const winnerUID = uids[finalIndex];

    // stop sound + stage flash
    playClack();
    winFlashUI();

    const w = document.getElementById("winnerText");
    if (w) w.textContent = `🎉 Winner UID: ${winnerUID} (removed)`;

    winners.push(winnerUID);
    uids.splice(finalIndex, 1);

    // rebuild cached wheel (once)
    cacheDirty = true;

    saveData();
    setCounts();

    launchConfetti();
    showWinnerModal(winnerUID);

    spinning = false;
    setSpinningUI(false);
  }

  requestAnimationFrame(tick);
}

// ========== INIT ==========
window.addEventListener("resize", resizeConfetti);

window.onload = () => {
  loadSaved();
  setCounts();
  resizeConfetti();
  cacheDirty = true;
  drawWheel();

  const w = document.getElementById("winnerText");
  if (w) w.textContent = uids.length ? "Ready to spin!" : "Paste UIDs and click Load UIDs.";
};

// Expose for HTML onclick
window.loadUIDs = loadUIDs;
window.spinWheel = spinWheel;
window.closeWinnerModal = closeWinnerModal;
window.nextSpin = nextSpin;
