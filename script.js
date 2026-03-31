import * as THREE from "https://unpkg.com/three@0.162.0/build/three.module.js";

const STORAGE_KEY = "neon-reflex-stats-v1";
const MAX_HISTORY = 8;

const state = {
  phase: "idle",
  startTime: 0,
  waitTimeout: null,
  readyLocked: false,
  soundEnabled: false,
  stats: loadStats(),
  reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

const panel = document.querySelector(".panel");
const statusCard = document.getElementById("status-card");
const startBtn = document.getElementById("start-btn");
const retryBtn = document.getElementById("retry-btn");
const soundToggle = document.getElementById("sound-toggle");
const resetStatsBtn = document.getElementById("reset-stats-btn");

const stateBadge = document.getElementById("state-badge");
const statusTitle = document.getElementById("status-title");
const statusCopy = document.getElementById("status-copy");
const timingDisplay = document.getElementById("timing-display");
const statusPrompt = document.getElementById("status-prompt");

const bestScoreEl = document.getElementById("best-score");
const averageScoreEl = document.getElementById("average-score");
const attemptCountEl = document.getElementById("attempt-count");
const historyListEl = document.getElementById("history-list");

const uiCopy = {
  idle: {
    badge: "Idle",
    title: "Ready when you are",
    copy: "Press Start, or hit Space or Enter to begin.",
    timing: "---",
    prompt: "Awaiting input",
  },
  waiting: {
    badge: "Waiting",
    title: "Hold steady",
    copy: "Wait for the cue. Reacting early counts as a false start.",
    timing: "...",
    prompt: "Do not press yet",
  },
  ready: {
    badge: "React",
    title: "Now",
    copy: "Press immediately. Mouse, tap, Space, or Enter all work.",
    timing: "GO",
    prompt: "Respond now",
  },
  result: {
    badge: "Result",
    title: "Measured cleanly",
    copy: "That run is locked in. Go again and see if you can shave it down.",
    timing: "",
    prompt: "Press Try Again or hit Space",
  },
  error: {
    badge: "Too Early",
    title: "False start",
    copy: "You jumped the cue. Reset and try to hold the tension a little longer.",
    timing: "--",
    prompt: "Press Try Again",
  },
};

let sceneController = {
  setMood: () => {},
  burst: () => {},
  resize: () => {},
};

try {
  sceneController = createScene(document.getElementById("scene"), {
    reduceMotion: state.reduceMotion,
  });
} catch (error) {
  console.error("Scene creation failed:", error);
}

init();

function init() {
  soundToggle.checked = state.soundEnabled;
  updateStatsUI();
  setPhase("idle");

  startBtn.addEventListener("click", startTest);
  retryBtn.addEventListener("click", resetToIdle);
  soundToggle.addEventListener("change", () => {
    state.soundEnabled = soundToggle.checked;
  });
  resetStatsBtn.addEventListener("click", resetStats);

  statusCard.addEventListener("pointerup", handlePrimaryAction);

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", () => sceneController.resize());
}

function handlePrimaryAction() {
  if (state.phase === "idle") {
    startTest();
    return;
  }

  if (state.phase === "waiting") {
    triggerFalseStart();
    return;
  }

  if (state.phase === "ready") {
    captureReaction();
    return;
  }

  if (state.phase === "result" || state.phase === "error") {
    resetToIdle();
  }
}

function handleKeydown(event) {
  const key = event.key;
  const isTrigger = key === " " || key === "Enter";
  if (!isTrigger) return;

  const targetTag = document.activeElement?.tagName;
  const typingContext = targetTag === "INPUT" || targetTag === "TEXTAREA";
  if (typingContext) return;

  event.preventDefault();

  if (state.phase === "idle") {
    startTest();
    return;
  }

  if (state.phase === "waiting") {
    triggerFalseStart();
    return;
  }

  if (state.phase === "ready") {
    captureReaction();
    return;
  }

  if (state.phase === "result" || state.phase === "error") {
    resetToIdle();
  }
}

function startTest() {
  clearPendingWait();
  state.readyLocked = false;
  setPhase("waiting");
  retryBtn.hidden = true;
  startBtn.hidden = true;

  const delay = randomBetween(1600, 4200);
  sceneController.setMood("waiting");

  state.waitTimeout = window.setTimeout(() => {
    state.startTime = performance.now();
    state.readyLocked = true;
    setPhase("ready");
    sceneController.burst();
    sceneController.setMood("ready");
    if (state.soundEnabled) playTone(720, 0.08, "triangle");
  }, delay);
}

function captureReaction() {
  if (state.phase !== "ready" || !state.readyLocked) return;

  const elapsed = performance.now() - state.startTime;
  const rounded = Math.round(elapsed);

  state.readyLocked = false;
  setPhase("result", `${rounded} ms`);
  retryBtn.hidden = false;
  startBtn.hidden = true;

  applyReactionRating(rounded);
  addScore(rounded);
  sceneController.setMood("result");
  if (state.soundEnabled) playTone(420, 0.1, "sine");
}

function triggerFalseStart() {
  if (state.phase !== "waiting") return;

  clearPendingWait();
  state.readyLocked = false;
  setPhase("error");
  retryBtn.hidden = false;
  startBtn.hidden = true;
  sceneController.setMood("error");
  if (state.soundEnabled) playTone(180, 0.12, "sawtooth");
}

function resetToIdle() {
  clearPendingWait();
  state.readyLocked = false;
  setPhase("idle");
  startBtn.hidden = false;
  retryBtn.hidden = true;
  sceneController.setMood("idle");
}

function clearPendingWait() {
  if (state.waitTimeout) {
    window.clearTimeout(state.waitTimeout);
    state.waitTimeout = null;
  }
}

function setPhase(phase, timingOverride = null) {
  state.phase = phase;
  panel.dataset.state = phase;

  const copy = uiCopy[phase];
  stateBadge.textContent = copy.badge;
  statusTitle.textContent = copy.title;
  statusCopy.textContent = copy.copy;
  timingDisplay.textContent = timingOverride ?? copy.timing;
  statusPrompt.textContent = copy.prompt;

  if (phase === "ready") {
    statusCard.setAttribute("aria-label", "Cue active. React now.");
  } else if (phase === "waiting") {
    statusCard.setAttribute("aria-label", "Waiting. Do not react yet.");
  } else if (phase === "error") {
    statusCard.setAttribute("aria-label", "False start. Try again.");
  } else if (phase === "result") {
    statusCard.setAttribute(
      "aria-label",
      `Result recorded. ${timingOverride}.`,
    );
  } else {
    statusCard.setAttribute(
      "aria-label",
      "Reaction test area. Press Start, then wait for the cue.",
    );
  }
}

function addScore(score) {
  state.stats.attempts.push({
    value: score,
    at: new Date().toISOString(),
  });

  if (state.stats.attempts.length > MAX_HISTORY) {
    state.stats.attempts = state.stats.attempts.slice(-MAX_HISTORY);
  }

  saveStats(state.stats);
  updateStatsUI();
}

function updateStatsUI() {
  const values = state.stats.attempts.map((entry) => entry.value);
  const best = values.length ? Math.min(...values) : null;
  const average = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;

  bestScoreEl.textContent = best !== null ? `${best} ms` : "-- ms";
  averageScoreEl.textContent = average !== null ? `${average} ms` : "-- ms";
  attemptCountEl.textContent = String(values.length);

  historyListEl.innerHTML = "";

  if (!values.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No attempts yet. Your numbers will appear here.";
    historyListEl.appendChild(empty);
    return;
  }

  [...state.stats.attempts].reverse().forEach((attempt, index) => {
    const item = document.createElement("li");

    const label = document.createElement("span");
    label.textContent =
      index === 0 ? "Most recent" : `Attempt ${values.length - index}`;

    const value = document.createElement("span");
    value.className = "history-score";
    value.textContent = `${attempt.value} ms`;

    item.append(label, value);
    historyListEl.appendChild(item);
  });
}

function resetStats() {
  state.stats = { attempts: [] };
  saveStats(state.stats);
  updateStatsUI();
}

function applyReactionRating(score) {
  const rating = getReactionRating(score);
  stateBadge.textContent = rating.badge;
  statusTitle.textContent = rating.title;
  statusCopy.textContent = rating.copy;
  statusPrompt.textContent = rating.prompt;
  statusCard.setAttribute(
    "aria-label",
    `Result recorded. ${score} milliseconds. ${rating.badge}. ${rating.title}.`,
  );
}

function getReactionRating(score) {
  if (score <= 160) {
    return {
      badge: "Excellent",
      title: "Illegal in at least three timelines",
      copy: "That was absurdly fast. Either your reflexes are elite, or you briefly borrowed tomorrow's internet.",
      prompt: "Excellent · Run it back if you dare",
    };
  }

  if (score <= 220) {
    return {
      badge: "Great",
      title: "Reflexes with main-character energy",
      copy: "Clean, sharp, and just a little intimidating. You did not come here to hesitate.",
      prompt: "Great · Press Try Again or hit Space",
    };
  }

  if (score <= 280) {
    return {
      badge: "Good",
      title: "Certified quick human",
      copy: "Solid run. Your brain saw the cue, filed the paperwork, and got it done on time.",
      prompt: "Good · Press Try Again or hit Space",
    };
  }

  if (score <= 340) {
    return {
      badge: "Fair",
      title: "The gears were turning",
      copy: "Respectable. Not lightning, not fossils. More like a very determined office microwave.",
      prompt: "Fair · Press Try Again or hit Space",
    };
  }

  return {
    badge: "Poor",
    title: "Your coffee is still buffering",
    copy: "That one took the scenic route through the nervous system. No shame. We regroup, we click again.",
    prompt: "Poor · Press Try Again or hit Space",
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.attempts)) return { attempts: [] };
    return parsed;
  } catch {
    return { attempts: [] };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playTone(frequency, duration, type = "sine") {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + duration,
  );

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.onended = () => context.close();
}

function createScene(canvas, options = {}) {
  const reduceMotion = Boolean(options.reduceMotion);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 7.5);

  const group = new THREE.Group();
  scene.add(group);

  const coreGeometry = new THREE.IcosahedronGeometry(1.2, 0);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3b82f6"),
    emissive: new THREE.Color("#0b3b80"),
    roughness: 0.28,
    metalness: 0.5,
    flatShading: true,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  group.add(core);

  const ringGeometry = new THREE.TorusGeometry(2.2, 0.04, 16, 120);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#3b82f6"),
    transparent: true,
    opacity: 0.35,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI * 0.38;
  ring.rotation.y = Math.PI * 0.18;
  group.add(ring);

  const particleCount = 220;
  const particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }

  particlesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  const particlesMaterial = new THREE.PointsMaterial({
    color: new THREE.Color("#94a3b8"),
    size: 0.03,
    transparent: true,
    opacity: 0.55,
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x3b82f6, 16, 20, 2);
  keyLight.position.set(2.5, 2, 5.5);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x22c55e, 0, 16, 2);
  fillLight.position.set(-2.5, -1.5, 4);
  scene.add(fillLight);

  const target = {
    rotationSpeed: reduceMotion ? 0.0006 : 0.003,
    ringSpeed: reduceMotion ? 0.0008 : 0.004,
    bob: reduceMotion ? 0.03 : 0.12,
    scale: 1,
    coreColor: new THREE.Color("#3b82f6"),
    emissiveColor: new THREE.Color("#0b3b80"),
    ringColor: new THREE.Color("#3b82f6"),
    fillIntensity: 0,
    particleOpacity: 0.55,
  };

  const burstState = {
    amount: 0,
  };

  const clock = new THREE.Clock();

  function setMood(mood) {
    switch (mood) {
      case "waiting":
        target.scale = 0.92;
        target.rotationSpeed = reduceMotion ? 0.0008 : 0.005;
        target.ringSpeed = reduceMotion ? 0.001 : 0.007;
        target.coreColor.set("#3b82f6");
        target.emissiveColor.set("#0b3b80");
        target.ringColor.set("#3b82f6");
        target.fillIntensity = 0;
        target.particleOpacity = 0.45;
        break;
      case "ready":
        target.scale = 1.18;
        target.rotationSpeed = reduceMotion ? 0.0012 : 0.012;
        target.ringSpeed = reduceMotion ? 0.0018 : 0.018;
        target.coreColor.set("#22c55e");
        target.emissiveColor.set("#0f5f2d");
        target.ringColor.set("#22c55e");
        target.fillIntensity = 10;
        target.particleOpacity = 0.8;
        break;
      case "result":
        target.scale = 1;
        target.rotationSpeed = reduceMotion ? 0.0008 : 0.004;
        target.ringSpeed = reduceMotion ? 0.001 : 0.006;
        target.coreColor.set("#3b82f6");
        target.emissiveColor.set("#0b3b80");
        target.ringColor.set("#3b82f6");
        target.fillIntensity = 1.8;
        target.particleOpacity = 0.58;
        break;
      case "error":
        target.scale = 0.98;
        target.rotationSpeed = reduceMotion ? 0.0009 : 0.0045;
        target.ringSpeed = reduceMotion ? 0.0012 : 0.0065;
        target.coreColor.set("#ef4444");
        target.emissiveColor.set("#5f1515");
        target.ringColor.set("#ef4444");
        target.fillIntensity = 2.8;
        target.particleOpacity = 0.62;
        break;
      case "idle":
      default:
        target.scale = 1;
        target.rotationSpeed = reduceMotion ? 0.0006 : 0.003;
        target.ringSpeed = reduceMotion ? 0.0008 : 0.004;
        target.coreColor.set("#3b82f6");
        target.emissiveColor.set("#0b3b80");
        target.ringColor.set("#3b82f6");
        target.fillIntensity = 0;
        target.particleOpacity = 0.55;
        break;
    }
  }

  function burst() {
    burstState.amount = 1;
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let lastFrame = performance.now();

  function animate(now = performance.now()) {
    const elapsed = clock.getElapsedTime();
    const delta = Math.min((now - lastFrame) / 16.6667, 2);
    lastFrame = now;

    if (!reduceMotion) {
      core.rotation.x += target.rotationSpeed * 0.8 * delta;
      core.rotation.y += target.rotationSpeed * delta;
      ring.rotation.z += target.ringSpeed * delta;
      group.position.y = Math.sin(elapsed * 0.8) * target.bob;
      particles.rotation.y = elapsed * 0.01;
    }

    burstState.amount = THREE.MathUtils.lerp(burstState.amount, 0, 0.08);
    const scaleBurst = 1 + burstState.amount * 0.18;

    group.scale.x = THREE.MathUtils.lerp(
      group.scale.x,
      target.scale * scaleBurst,
      0.08,
    );
    group.scale.y = THREE.MathUtils.lerp(
      group.scale.y,
      target.scale * scaleBurst,
      0.08,
    );
    group.scale.z = THREE.MathUtils.lerp(
      group.scale.z,
      target.scale * scaleBurst,
      0.08,
    );

    coreMaterial.color.lerp(target.coreColor, 0.08);
    coreMaterial.emissive.lerp(target.emissiveColor, 0.08);
    ringMaterial.color.lerp(target.ringColor, 0.08);
    ringMaterial.opacity = THREE.MathUtils.lerp(
      ringMaterial.opacity,
      target.fillIntensity > 0 ? 0.5 : 0.35,
      0.08,
    );
    fillLight.intensity = THREE.MathUtils.lerp(
      fillLight.intensity,
      target.fillIntensity,
      0.08,
    );
    particlesMaterial.opacity = THREE.MathUtils.lerp(
      particlesMaterial.opacity,
      target.particleOpacity,
      0.08,
    );

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  setMood("idle");
  animate();

  return {
    setMood,
    burst,
    resize,
  };
}
