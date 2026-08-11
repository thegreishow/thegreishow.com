(() => {
  "use strict";

  const API = "https://grei-arcade-api.thegreishow.workers.dev";
  const GAME_ID = "rodeo-are-you-ready";
  const SONG_BPM = 90;
  const SONG_BEAT_SECONDS = 60 / SONG_BPM;
  const SONG_DURATION_FALLBACK = 173.136;
  const MODES = {
    ride: {
      label: "Ride the Rhythm",
      shortLabel: "Ride",
      levelBase: 0,
      description: "Match every buck on the beat and stay mounted as long as you can."
    },
    matador: {
      label: "Dodge the Bull",
      shortLabel: "Dodge",
      levelBase: 2,
      description: "Read the charge line, move clear, and build an Olé streak."
    },
    catch: {
      label: "Catch the Cow",
      shortLabel: "Lasso",
      levelBase: 4,
      description: "Chase on horseback, close the gap, and throw your lasso before the cow breaks free."
    },
    race: {
      label: "Run the Track",
      shortLabel: "Race",
      levelBase: 6,
      description: "Time each gallop tap to the beat, earn Heat for Perfects, and counter rival surges with your boost."
    }
  };
  const DIFFICULTIES = {
    easy: {
      label: "Easy",
      promptBpm: 45,
      interval: 60 / 45,
      level: 1,
      bullSpeed: 310,
      telegraph: .95,
      recovery: .56,
      cowSpeed: 148,
      cowTimer: 9,
      lassoRange: 300,
      lassoCooldown: .72,
      escapeDamage: 27,
      raceSpeed: 184,
      rivalSpeed: 152,
      laps: 3
    },
    standard: {
      label: "Standard",
      promptBpm: 90,
      interval: 60 / 90,
      level: 2,
      bullSpeed: 445,
      telegraph: .58,
      recovery: .34,
      cowSpeed: 205,
      cowTimer: 6.8,
      lassoRange: 178,
      lassoCooldown: .95,
      escapeDamage: 34,
      raceSpeed: 208,
      rivalSpeed: 175,
      laps: 3
    }
  };
  const DIRECTIONS = ["left", "up", "down", "right"];
  const ICONS = { left: "←", up: "↑", down: "↓", right: "→" };
  const RIDE_LABELS = { left: "LEAN LEFT", up: "LEAN FORWARD", down: "LEAN BACK", right: "LEAN RIGHT" };
  const MOVE_LABELS = { left: "MOVE LEFT", up: "MOVE UP", down: "MOVE DOWN", right: "MOVE RIGHT" };
  const RACE_LABELS = { left: "STEER LEFT", up: "TAP TO GALLOP", down: "BRAKE", right: "STEER RIGHT" };
  const KEY_ACTION = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowRight: "right", d: "right", D: "right"
  };
  const NOTES = {
    E3: 164.81, B3: 246.94, E4: 329.63, FS4: 369.99,
    GS4: 415.30, B4: 493.88, CS5: 554.37, DS5: 622.25,
    E5: 659.25, GS5: 830.61, B5: 987.77
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("start");
  const titleEl = document.getElementById("overlayTitle");
  const copyEl = document.getElementById("overlayCopy");
  const kickerEl = document.getElementById("kicker");
  const modePicker = document.getElementById("modePicker");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const difficultyPicker = document.getElementById("difficultyPicker");
  const difficultyNote = document.getElementById("difficultyNote");
  const difficultyButtons = [...document.querySelectorAll("[data-difficulty]")];
  const results = document.getElementById("results");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const timeEl = document.getElementById("time");
  const heatEl = document.getElementById("heat");
  const audioStatus = document.getElementById("audioStatus");
  const musicChip = document.getElementById("musicChip");
  const directionAnnounce = document.getElementById("directionAnnounce");
  const controlHint = document.getElementById("controlHint");
  const controls = document.getElementById("controls");
  const controlButtons = [...document.querySelectorAll("[data-action]")];
  const lassoButton = document.getElementById("lassoButton");
  const music = document.getElementById("music");
  const arenaVideo = document.getElementById("arenaVideo");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let arenaVideoFailed = false;

  const arena = new Image();
  arena.src = "assets/rodeo-arena.webp";
  const rideSprite = new Image();
  rideSprite.src = "assets/ride-sprite.webp";
  const rideAnimation = new Image();
  rideAnimation.src = "assets/ride-animation.webp";
  const matadorSprites = new Image();
  matadorSprites.src = "assets/matador-sprites.webp";
  const matadoraAnimation = new Image();
  matadoraAnimation.src = "assets/matadora-animation.webp";
  const chargingBullAnimation = new Image();
  chargingBullAnimation.src = "assets/charging-bull-animation.webp";
  const catchCowSprites = new Image();
  catchCowSprites.src = "assets/catch-cow-sprites.webp";
  const horsebackRiderAnimation = new Image();
  horsebackRiderAnimation.src = "assets/horseback-rider-animation.webp";
  const runawayCowAnimation = new Image();
  runawayCowAnimation.src = "assets/runaway-cow-animation.webp";
  const ANIMATION_FRAMES = 4;

  let modeId = MODES[localStorage.getItem("grei-rodeo-mode")] ? localStorage.getItem("grei-rodeo-mode") : "ride";
  let difficultyId = DIFFICULTIES[localStorage.getItem("grei-rodeo-difficulty")] ? localStorage.getItem("grei-rodeo-difficulty") : "standard";
  const mode = () => MODES[modeId];
  const difficulty = () => DIFFICULTIES[difficultyId];
  const audioLabel = () => `Rodeo instrumental · official ${SONG_BPM} BPM · loops`;
  const bestKey = () => `grei-rodeo-best-${modeId}-${difficultyId}`;

  class AudioDirector {
    constructor(track) {
      this.track = track;
      this.context = null;
      this.enabled = true;
      this.unlocked = false;
      this.track.loop = true;
      this.track.volume = 0;
    }

    ensureContext() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.context = new AudioContext();
      }
      if (this.context?.state === "suspended") this.context.resume().catch(() => {});
      return this.context;
    }

    async unlock() {
      this.ensureContext();
      if (!this.enabled) return;
      try {
        this.track.currentTime = 0;
        this.track.volume = 0;
        await this.track.play();
        this.unlocked = true;
        audioStatus.textContent = audioLabel();
      } catch {
        audioStatus.textContent = "Tap the sound button to enable music";
        musicChip.classList.add("muted");
      }
    }

    begin() {
      if (!this.enabled) return;
      this.track.pause();
      this.track.currentTime = 0;
      this.track.loop = true;
      this.track.volume = .58;
      this.track.play().then(() => {
        this.unlocked = true;
        musicChip.classList.remove("muted");
      }).catch(() => {
        audioStatus.textContent = "Music blocked · tap sound, then retry";
      });
    }

    pause() { this.track.pause(); }
    resume() { if (this.enabled && running) this.track.play().catch(() => {}); }
    stop() { this.track.pause(); }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.track.muted = !this.enabled;
      musicChip.classList.toggle("muted", !this.enabled);
      audioStatus.textContent = this.enabled ? audioLabel() : "Music and game sounds muted";
      if (this.enabled && running && !paused) this.resume();
    }

    tone(frequency, duration = .08, type = "sine", volume = .055, delay = 0) {
      if (!this.enabled) return;
      const audioContext = this.ensureContext();
      if (!audioContext) return;
      const now = audioContext.currentTime + delay;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    }

    countdown(step) { this.tone([NOTES.E4, NOTES.FS4, NOTES.GS4, NOTES.B4][step] || NOTES.E5, .13, "triangle", .075); }
    beat(index) { this.tone(index % 4 === 0 ? NOTES.E4 : NOTES.B3, .045, "triangle", index % 4 === 0 ? .035 : .02); }
    warning() { this.tone(NOTES.E4, .11, "square", .035); this.tone(NOTES.B4, .12, "triangle", .03, .07); }
    rope() { this.tone(NOTES.B4, .08, "triangle", .04); this.tone(NOTES.CS5, .11, "sine", .035, .045); }
    good() { this.tone(NOTES.FS4, .08, "sine", .04); this.tone(NOTES.B4, .09, "sine", .035, .045); }
    perfect() { this.tone(NOTES.E5, .13, "triangle", .055); this.tone(NOTES.GS5, .14, "triangle", .045, .045); this.tone(NOTES.B5, .15, "triangle", .04, .09); }
    miss() { this.tone(NOTES.B3, .13, "sawtooth", .035); this.tone(NOTES.E3, .18, "triangle", .04, .07); }
  }

  class GameState {
    constructor() { this.reset(); }

    reset() {
      this.score = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.heat = 0;
      this.balance = 100;
      this.perfects = 0;
      this.misses = 0;
      this.dodges = 0;
      this.closeCalls = 0;
      this.hits = 0;
      this.catches = 0;
      this.quickCatches = 0;
      this.escapes = 0;
      this.overtakes = 0;
      this.racePlace = 4;
      this.raceWon = false;
      this.boosts = 0;
      this.perfectTaps = 0;
      this.prompt = null;
      this.answered = false;
      this.elapsed = 0;
      this.finished = false;
    }

    newPrompt(direction, now) {
      this.prompt = { direction, born: now, expires: now + difficulty().interval * 860 };
      this.answered = false;
    }

    answerRide(action, now) {
      if (!this.prompt || this.answered || this.finished) return null;
      this.answered = true;
      if (action !== this.prompt.direction) return this.takeHit(22);
      const age = now - this.prompt.born;
      const accuracy = Math.max(0, 1 - age / (this.prompt.expires - this.prompt.born));
      const perfect = accuracy > .42;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (perfect) this.perfects++;
      const multiplier = Math.min(3, 1 + Math.floor(this.combo / 8) * .25);
      const points = Math.round((perfect ? 140 : 90) * multiplier * (this.heat >= 100 ? 2 : 1));
      this.score += points;
      this.heat = Math.min(100, this.heat + (perfect ? 12 : 8));
      this.balance = Math.min(100, this.balance + 4);
      return { kind: perfect ? "perfect" : "good", points };
    }

    scoreDodge(closeCall) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.dodges++;
      if (closeCall) this.closeCalls++;
      const multiplier = Math.min(3, 1 + Math.floor(this.combo / 5) * .2);
      const points = Math.round((closeCall ? 300 : 180) * multiplier * (this.heat >= 100 ? 2 : 1));
      this.score += points;
      this.heat = Math.min(100, this.heat + (closeCall ? 15 : 9));
      this.balance = Math.min(100, this.balance + 2);
      return { kind: closeCall ? "perfect" : "good", points };
    }

    scoreCatch(quickCatch, distance) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.catches++;
      if (quickCatch) this.quickCatches++;
      const precision = Math.max(0, 1 - distance / difficulty().lassoRange);
      const multiplier = Math.min(3, 1 + Math.floor(this.combo / 4) * .2);
      const points = Math.round((quickCatch ? 360 : 220) * (1 + precision * .35) * multiplier * (this.heat >= 100 ? 2 : 1));
      this.score += points;
      this.heat = Math.min(100, this.heat + (quickCatch ? 16 : 10));
      this.balance = Math.min(100, this.balance + 3);
      return { kind: quickCatch ? "perfect" : "good", points };
    }

    scoreOvertake() {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.overtakes++;
      const points = Math.round(240 * Math.min(2.5, 1 + this.combo * .12) * (this.heat >= 100 ? 2 : 1));
      this.score += points;
      this.heat = Math.min(100, this.heat + 12);
      return points;
    }

    takeHit(damage = 18) {
      this.combo = 0;
      this.heat = Math.max(0, this.heat - 18);
      this.balance = Math.max(0, this.balance - damage);
      this.misses++;
      return { kind: "miss", points: 0 };
    }
  }

  const audio = new AudioDirector(music);
  const state = new GameState();
  const heldDirections = new Set();
  const dodge = {
    player: { x: 480, y: 405, vx: 0, vy: 0 },
    bull: { x: 480, y: 188, targetX: 480, targetY: 405, angle: Math.PI / 2, phase: "telegraph", timer: 0, speed: 0, vx: 0, vy: 0, travel: 0, maxTravel: 0, minDistance: 999, hit: false }
  };
  const chase = {
    player: { x: 330, y: 390, vx: 0, vy: 0, facing: 1 },
    cow: { x: 650, y: 310, angle: Math.PI, speed: 0, timer: 0, turnTimer: 0, phase: "run" },
    lasso: { active: false, timer: 0, duration: .42, cooldown: 0, hit: false, targetX: 0, targetY: 0 }
  };
  const race = {
    trackLength: 1800,
    duration: SONG_DURATION_FALLBACK,
    player: { distance: 0, lane: 0, speed: 0, cadence: 0, lastTapAt: 0, lastJudgedBeat: -1, boostTimer: 0, lastPlace: 4, overtakeCooldown: 0, lastGrade: "", gradeUntil: 0 },
    rivals: [
      { name: "Blaze", distance: 54, lane: -.58, speed: 0, color: "#ff625f", surgeTimer: 0, nextSurge: 9, laneTarget: -.58 },
      { name: "Storm", distance: 22, lane: .08, speed: 0, color: "#174e96", surgeTimer: 0, nextSurge: 13, laneTarget: .08 },
      { name: "Goldie", distance: -18, lane: .62, speed: 0, color: "#ffc857", surgeTimer: 0, nextSurge: 17, laneTarget: .62 }
    ]
  };

  let running = false;
  let paused = false;
  let counting = false;
  let last = 0;
  let nextBeatAt = difficulty().interval;
  let beatIndex = 0;
  let startedAt = 0;
  let feedback = "";
  let feedbackUntil = 0;
  let bullKick = 0;
  let bullDirection = "up";
  let riderLean = 0;
  let riderPitch = 0;
  let particles = [];
  let flashes = [];
  let best = loadBest();

  function loadBest() {
    const saved = localStorage.getItem(bestKey());
    if (saved !== null) return Number(saved) || 0;
    if (modeId === "ride") {
      const oldScoped = localStorage.getItem(`grei-rodeo-best-${difficultyId}`);
      if (oldScoped !== null) return Number(oldScoped) || 0;
      if (difficultyId === "standard") return Number(localStorage.getItem("grei-rodeo-best") || 0);
    }
    return 0;
  }

  function setFeedback(text, duration = 480) {
    feedback = text;
    feedbackUntil = performance.now() + duration;
  }

  function hud() {
    scoreEl.textContent = state.score;
    comboEl.textContent = `${state.combo}×`;
    if (modeId === "race") {
      const remaining = Math.max(0, Math.ceil(race.duration - state.elapsed));
      timeEl.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    } else {
      timeEl.textContent = Math.max(0, Math.floor(state.elapsed));
    }
    heatEl.style.width = `${state.heat}%`;
    stage.classList.toggle("heat", state.heat >= 100);
  }

  function showSelection() {
    results.hidden = true;
    modePicker.hidden = false;
    difficultyPicker.hidden = false;
    startButton.hidden = false;
    kickerEl.textContent = "Choose your event";
    titleEl.innerHTML = "ARE YOU<br>READY?";
    state.reset();
    resetDodge();
    resetChase();
    resetRace();
    updateSelectionUI();
    hud();
    draw();
  }

  function updateSelectionUI() {
    modeButtons.forEach(button => {
      const selected = button.dataset.mode === modeId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    difficultyButtons.forEach(button => {
      const selected = button.dataset.difficulty === difficultyId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const selectedDifficulty = difficulty();
    if (modeId === "ride") {
      difficultyNote.textContent = selectedDifficulty.promptBpm === SONG_BPM
        ? "Standard follows every beat of the official 90 BPM instrumental."
        : "Easy stays synced to the official track and prompts on every other beat at 45 BPM.";
    } else if (modeId === "matador") {
      difficultyNote.textContent = selectedDifficulty.promptBpm === SONG_BPM
        ? "Standard uses the official 90 BPM response window with faster charges."
        : "Easy uses a 45 BPM response window with a longer warning and slower bull.";
    } else if (modeId === "catch") {
      difficultyNote.textContent = selectedDifficulty.promptBpm === SONG_BPM
        ? "Standard gives you a faster cow, a tighter lasso range, and a 90 BPM chase."
        : "Easy gives you more chase time, a wider lasso range, and a 45 BPM pace.";
    } else {
      difficultyNote.textContent = selectedDifficulty.promptBpm === SONG_BPM
        ? "Standard: tap with the 90 BPM beat, build Heat, then unleash your boost."
        : "Easy: tap every other beat at 45 BPM, build Heat, then unleash your boost.";
    }
    if (audio.enabled) audioStatus.textContent = audioLabel();

    if (results.hidden && !running && !counting) copyEl.textContent = mode().description;
    const replay = results.hidden ? "" : " Again";
    startButton.textContent = modeId === "ride"
      ? `Ride${replay} at ${selectedDifficulty.promptBpm} BPM`
      : modeId === "matador"
        ? `Dodge${replay} at ${selectedDifficulty.promptBpm} BPM`
        : modeId === "catch"
          ? `Chase${replay} at ${selectedDifficulty.promptBpm} BPM`
          : `Race${replay} at ${selectedDifficulty.promptBpm} BPM`;
    stage.setAttribute("aria-label", `${mode().label} playfield`);

    const labels = modeId === "ride" ? RIDE_LABELS : modeId === "race" ? RACE_LABELS : MOVE_LABELS;
    controlButtons.forEach(button => {
      const action = button.dataset.action;
      button.setAttribute("aria-label", labels[action].toLowerCase());
      const small = button.querySelector("small");
      if (small) small.textContent = labels[action].replace("LEAN ", "").replace("MOVE ", "").replace("STEER ", "").replace(" TO GALLOP", "");
    });
    controlHint.textContent = modeId === "ride"
      ? "Arrow keys or W A S D · Match the glowing direction · Space pauses"
      : modeId === "matador"
        ? "Hold arrows or W A S D · Move clear of the charge line · Space pauses"
        : modeId === "catch"
          ? "Hold arrows or W A S D · Enter, Z, or Lasso to throw · Space pauses"
          : "Tap Up/W to gallop · Left/Right to pass · Enter/Z or Boost at full Heat";
    lassoButton.hidden = modeId !== "catch" && modeId !== "race";
    const specialIcon = lassoButton.querySelector("span");
    const specialLabel = lassoButton.querySelector("small");
    if (specialIcon) specialIcon.textContent = modeId === "race" ? "⚡" : "◎";
    if (specialLabel) specialLabel.textContent = modeId === "race" ? "Boost" : "Lasso";
    lassoButton.setAttribute("aria-label", modeId === "race" ? "Activate boost when Heat is full" : "Throw lasso");
    controls.classList.toggle("catch-controls", modeId === "catch" || modeId === "race");
    controls.setAttribute("aria-label", modeId === "ride" ? "Ride controls" : modeId === "matador" ? "Matador controls" : modeId === "catch" ? "Horseback chase controls" : "Horse racing controls");
  }

  function chooseMode(nextId) {
    if (running || counting || !MODES[nextId]) return;
    modeId = nextId;
    localStorage.setItem("grei-rodeo-mode", modeId);
    best = loadBest();
    if (!results.hidden) showSelection();
    else { updateSelectionUI(); draw(); }
  }

  function chooseDifficulty(nextId) {
    if (running || counting || !DIFFICULTIES[nextId]) return;
    difficultyId = nextId;
    localStorage.setItem("grei-rodeo-difficulty", difficultyId);
    best = loadBest();
    if (!results.hidden) showSelection();
    else { updateSelectionUI(); draw(); }
  }

  function randomDirection() {
    let next = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    if (next === state.prompt?.direction) next = DIRECTIONS[(DIRECTIONS.indexOf(next) + 1 + Math.floor(Math.random() * 3)) % 4];
    return next;
  }

  function burst(color, amount = 18, x = 480, y = 270) {
    for (let i = 0; i < amount; i++) {
      particles.push({ x, y, vx: (Math.random() - .5) * 330, vy: -80 - Math.random() * 230, life: .7 + Math.random() * .55, color, size: 2 + Math.random() * 6, spin: Math.random() * 6 });
    }
  }

  function respondRide(action) {
    if (!running || paused || counting || modeId !== "ride") return;
    const outcome = state.answerRide(action, performance.now());
    if (!outcome) return;
    const control = document.querySelector(`[data-action="${action}"]`);
    control?.classList.add("active");
    setTimeout(() => control?.classList.remove("active"), 130);
    if (outcome.kind === "miss") {
      setFeedback("WRONG WAY");
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 250);
      audio.miss();
    } else {
      setFeedback(outcome.kind === "perfect" ? `PERFECT +${outcome.points}` : `SMOOTH +${outcome.points}`);
      riderLean = { left: -1, right: 1, up: 0, down: 0 }[action] || 0;
      riderPitch = { up: -1, down: 1 }[action] || 0;
      burst(outcome.kind === "perfect" ? "#ffc857" : "#ff625f", outcome.kind === "perfect" ? 26 : 15);
      outcome.kind === "perfect" ? audio.perfect() : audio.good();
    }
    hud();
    if (state.balance <= 0) finish();
  }

  function rideBeat(now) {
    if (state.prompt && !state.answered) {
      state.answered = true;
      state.takeHit();
      setFeedback("HOLD ON", 430);
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 250);
      audio.miss();
      if (state.balance <= 0) { hud(); finish(); return; }
    }
    bullDirection = randomDirection();
    state.newPrompt(bullDirection, now);
    stage.dataset.direction = bullDirection;
    directionAnnounce.textContent = RIDE_LABELS[bullDirection];
    beatIndex++;
    bullKick = 1;
    if (beatIndex % 4 === 0) flashes.push({ x: 90 + Math.random() * 780, y: 170 + Math.random() * 180, life: .18 });
    audio.beat(beatIndex);
    hud();
  }

  function resetDodge() {
    dodge.player.x = 480;
    dodge.player.y = 405;
    dodge.player.vx = 0;
    dodge.player.vy = 0;
    spawnBull(true);
  }

  function spawnBull(first = false) {
    const spawnAngle = first ? -Math.PI / 2 : Math.random() * Math.PI * 2;
    dodge.bull.x = 480 + Math.cos(spawnAngle) * 345;
    dodge.bull.y = 350 + Math.sin(spawnAngle) * 172;
    dodge.bull.targetX = dodge.player.x;
    dodge.bull.targetY = dodge.player.y;
    dodge.bull.angle = Math.atan2(dodge.bull.targetY - dodge.bull.y, dodge.bull.targetX - dodge.bull.x);
    dodge.bull.phase = "telegraph";
    dodge.bull.timer = difficulty().telegraph;
    dodge.bull.speed = difficulty().bullSpeed;
    dodge.bull.vx = 0;
    dodge.bull.vy = 0;
    dodge.bull.travel = 0;
    dodge.bull.maxTravel = 0;
    dodge.bull.minDistance = 999;
    dodge.bull.hit = false;
    if (running && modeId === "matador") audio.warning();
  }

  function constrainPlayer() {
    const dx = (dodge.player.x - 480) / 288;
    const dy = (dodge.player.y - 350) / 132;
    const distance = Math.hypot(dx, dy);
    if (distance > 1) {
      dodge.player.x = 480 + dx / distance * 288;
      dodge.player.y = 350 + dy / distance * 132;
    }
  }

  function resolveDodge() {
    const closeCall = dodge.bull.minDistance < 78;
    const outcome = state.scoreDodge(closeCall);
    setFeedback(closeCall ? `OLÉ! +${outcome.points}` : `CLEAR +${outcome.points}`, 620);
    burst(closeCall ? "#ffc857" : "#ff625f", closeCall ? 28 : 18, dodge.player.x, dodge.player.y - 35);
    closeCall ? audio.perfect() : audio.good();
  }

  function updateMatador(dt) {
    let moveX = (heldDirections.has("right") ? 1 : 0) - (heldDirections.has("left") ? 1 : 0);
    let moveY = (heldDirections.has("down") ? 1 : 0) - (heldDirections.has("up") ? 1 : 0);
    const moveLength = Math.hypot(moveX, moveY) || 1;
    moveX /= moveLength;
    moveY /= moveLength;
    const playerSpeed = difficultyId === "easy" ? 285 : 265;
    dodge.player.vx = moveX * playerSpeed;
    dodge.player.vy = moveY * playerSpeed;
    dodge.player.x += dodge.player.vx * dt;
    dodge.player.y += dodge.player.vy * dt;
    constrainPlayer();

    const bull = dodge.bull;
    if (bull.phase === "telegraph") {
      bull.timer -= dt;
      if (bull.timer <= 0) {
        bull.phase = "charge";
        bull.angle = Math.atan2(bull.targetY - bull.y, bull.targetX - bull.x);
        const difficultyRamp = 1 + Math.min(.32, state.elapsed / 180 * .32);
        bull.speed = difficulty().bullSpeed * difficultyRamp;
        bull.vx = Math.cos(bull.angle) * bull.speed;
        bull.vy = Math.sin(bull.angle) * bull.speed;
        bull.maxTravel = Math.hypot(bull.targetX - bull.x, bull.targetY - bull.y) + 210;
        bull.travel = 0;
        beatIndex++;
        audio.beat(beatIndex);
        directionAnnounce.textContent = "Bull charging";
      }
      return;
    }

    if (bull.phase === "charge") {
      const stepX = bull.vx * dt;
      const stepY = bull.vy * dt;
      bull.x += stepX;
      bull.y += stepY;
      bull.travel += Math.hypot(stepX, stepY);
      const playerDistance = Math.hypot(bull.x - dodge.player.x, bull.y - dodge.player.y);
      bull.minDistance = Math.min(bull.minDistance, playerDistance);

      if (playerDistance < 42 && !bull.hit) {
        bull.hit = true;
        state.hits++;
        state.takeHit(34);
        setFeedback("CLIPPED!", 620);
        stage.classList.add("shake");
        setTimeout(() => stage.classList.remove("shake"), 250);
        audio.miss();
        burst("#ff625f", 24, dodge.player.x, dodge.player.y - 30);
        dodge.player.x += Math.cos(bull.angle) * 42;
        dodge.player.y += Math.sin(bull.angle) * 28;
        constrainPlayer();
        if (state.balance <= 0) { finish(); return; }
      }

      if (bull.travel >= bull.maxTravel) {
        if (!bull.hit) resolveDodge();
        bull.phase = "recover";
        bull.timer = difficulty().recovery;
      }
      return;
    }

    bull.timer -= dt;
    if (bull.timer <= 0) spawnBull();
  }

  function resetChase() {
    chase.player.x = 330;
    chase.player.y = 390;
    chase.player.vx = 0;
    chase.player.vy = 0;
    chase.player.facing = 1;
    chase.lasso.active = false;
    chase.lasso.timer = 0;
    chase.lasso.cooldown = 0;
    chase.lasso.hit = false;
    lassoButton.classList.remove("ready", "active");
    spawnCow(true);
  }

  function resetRace() {
    race.duration = Number.isFinite(music.duration) && music.duration > 60 ? music.duration : SONG_DURATION_FALLBACK;
    race.trackLength = difficulty().rivalSpeed * race.duration / difficulty().laps;
    race.player.distance = 0;
    race.player.lane = 0;
    race.player.speed = 0;
    race.player.cadence = 0;
    race.player.lastTapAt = 0;
    race.player.lastJudgedBeat = -1;
    race.player.boostTimer = 0;
    race.player.lastGrade = "";
    race.player.gradeUntil = 0;
    race.player.lastPlace = 4;
    race.player.overtakeCooldown = 0;
    const starts = [54, 22, -18];
    race.rivals.forEach((rival, index) => {
      rival.distance = starts[index];
      rival.lane = [-.58, .08, .62][index];
      rival.laneTarget = rival.lane;
      rival.speed = difficulty().rivalSpeed * (.96 + index * .025);
      rival.surgeTimer = 0;
      rival.nextSurge = 9 + index * 4;
    });
    race.player.lastPlace = racePlace();
    state.racePlace = race.player.lastPlace;
    state.balance = 0;
    lassoButton.classList.remove("ready", "active");
  }

  function racePlace() {
    return 1 + race.rivals.filter(rival => rival.distance > race.player.distance).length;
  }

  function tapGallop() {
    if (!running || paused || counting || modeId !== "race") return;
    const now = performance.now();
    if (now - race.player.lastTapAt < 105) return;
    race.player.lastTapAt = now;
    const beatLength = difficulty().interval;
    const songTime = Number.isFinite(music.currentTime) && music.currentTime > .02 ? music.currentTime : state.elapsed;
    const judgedBeat = Math.round(songTime / beatLength);
    if (judgedBeat === race.player.lastJudgedBeat) {
      race.player.lastGrade = "TOO SOON";
      race.player.gradeUntil = now + 300;
      stage.dataset.timing = "too-soon";
      setFeedback("TOO SOON · WAIT FOR THE FLASH", 300);
      return;
    }
    race.player.lastJudgedBeat = judgedBeat;
    const phase = (songTime % beatLength) / beatLength;
    const beatDistanceSeconds = Math.min(phase, 1 - phase) * beatLength;
    const perfectWindow = difficultyId === "easy" ? .18 : .115;
    const goodWindow = difficultyId === "easy" ? .36 : .24;
    const perfect = beatDistanceSeconds <= perfectWindow;
    const good = !perfect && beatDistanceSeconds <= goodWindow;
    const grade = perfect ? "PERFECT" : good ? "GOOD" : phase <= .5 ? "LATE" : "EARLY";
    const gain = perfect ? 32 : good ? 23 : 9;
    race.player.cadence = Math.min(100, race.player.cadence + gain);
    if (perfect || good) {
      state.combo++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
    } else {
      state.combo = 0;
      state.misses++;
    }
    if (perfect) state.perfectTaps++;
    const points = perfect ? 75 : good ? 40 : 8;
    const heatGain = perfect ? 10 : good ? 4 : 0;
    const awardedHeat = race.player.boostTimer > 0 ? 0 : heatGain;
    state.score += points;
    state.heat = Math.min(100, state.heat + awardedHeat);
    state.balance = race.player.cadence;
    race.player.lastGrade = grade;
    race.player.gradeUntil = now + 520;
    stage.dataset.timing = grade.toLowerCase();
    if (perfect || good) {
      setFeedback(`${grade} +${points}${awardedHeat ? ` · +${awardedHeat} HEAT` : ""}`, perfect ? 520 : 380);
      audio.good();
    } else {
      setFeedback(`${grade} · FIND THE BEAT`, 350);
      audio.warning();
    }
    if (state.combo > 0 && state.combo % 8 === 0) {
      state.score += 250;
      const streakHeat = race.player.boostTimer > 0 ? 0 : 15;
      state.heat = Math.min(100, state.heat + streakHeat);
      setFeedback(`8-TAP HOT STREAK!${streakHeat ? " +15 HEAT" : ""}`, 760);
      burst("#ffc857", 24, 480, 280);
      audio.perfect();
    }
    burst(perfect ? "#ffc857" : "#ffad86", perfect ? 7 : 3, 480, 300);
    lassoButton.classList.toggle("ready", state.heat >= 100);
    stage.dataset.cadence = String(Math.round(race.player.cadence));
  }

  function activateRaceBoost() {
    if (!running || paused || counting || modeId !== "race") return;
    if (state.heat < 100 || race.player.boostTimer > 0) {
      setFeedback(state.heat < 100 ? "FILL HEAT TO BOOST" : "BOOST ACTIVE", 520);
      return;
    }
    state.heat = 0;
    race.player.boostTimer = 4.5;
    state.boosts++;
    state.score += 500;
    lassoButton.classList.remove("ready");
    lassoButton.classList.add("active");
    setFeedback("FULL HEAT BOOST! +500", 900);
    burst("#ffc857", 38, 480, 270);
    flashes.push({ x: 480, y: 270, life: .45 });
    audio.perfect();
  }

  function updateRace(dt) {
    const player = race.player;
    const braking = heldDirections.has("down");
    const steering = (heldDirections.has("right") ? 1 : 0) - (heldDirections.has("left") ? 1 : 0);
    player.lane = Math.max(-.82, Math.min(.82, player.lane + steering * dt * 1.25));
    player.overtakeCooldown = Math.max(0, player.overtakeCooldown - dt);
    player.boostTimer = Math.max(0, player.boostTimer - dt);
    player.cadence = Math.max(0, player.cadence - (difficultyId === "easy" ? 17 : 23) * dt);
    const cadencePower = player.cadence / 100;
    const targetSpeed = braking ? difficulty().raceSpeed * .28 : difficulty().raceSpeed * (.36 + cadencePower * .64);
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * (braking ? 5.5 : 2.8));
    if (player.boostTimer > 0) player.speed = Math.max(player.speed, difficulty().raceSpeed * 1.38);

    let drafting = false;
    race.rivals.forEach((rival, index) => {
      rival.nextSurge -= dt;
      rival.surgeTimer = Math.max(0, rival.surgeTimer - dt);
      if (rival.nextSurge <= 0) {
        rival.surgeTimer = 2.6;
        rival.nextSurge = 13 + Math.random() * 10;
        rival.laneTarget = Math.max(-.75, Math.min(.75, rival.lane + (Math.random() - .5) * .9));
        stage.dataset.rivalSurge = rival.name.toLowerCase();
      }
      rival.lane += (rival.laneTarget - rival.lane) * Math.min(1, dt * 1.1);
      const rhythm = Math.sin(state.elapsed * (1.15 + index * .17) + index * 2.1) * 7;
      const rubberBand = Math.max(-20, Math.min(55, (player.distance - rival.distance) * .02));
      const rivalSurge = rival.surgeTimer > 0 ? 38 : 0;
      const finalSprint = state.elapsed >= race.duration - 22 ? 12 : 0;
      const target = difficulty().rivalSpeed * (.96 + index * .025) + rhythm + rubberBand + rivalSurge + finalSprint;
      rival.speed += (target - rival.speed) * Math.min(1, dt * 1.6);
      rival.distance += rival.speed * dt;
      const gap = rival.distance - player.distance;
      if (gap > 35 && gap < 130 && Math.abs(rival.lane - player.lane) < .34) drafting = true;
      if (Math.abs(gap) < 34 && Math.abs(rival.lane - player.lane) < .24) {
        player.speed *= Math.pow(.84, dt * 4);
        player.cadence = Math.max(0, player.cadence - 10 * dt);
      }
    });
    if (drafting) player.speed += 14 * dt;
    player.distance += player.speed * dt;
    state.balance = player.cadence;

    const place = racePlace();
    if (place < player.lastPlace && player.overtakeCooldown <= 0) {
      const points = state.scoreOvertake();
      player.overtakeCooldown = .7;
      setFeedback(`OVERTAKE +${points}`, 560);
      burst("#ffc857", 18, 480, 250);
      audio.good();
    }
    player.lastPlace = place;
    state.racePlace = place;
    const progress = Math.min(1, state.elapsed / race.duration);
    const lap = Math.min(difficulty().laps, Math.floor(progress * difficulty().laps) + 1);
    stage.dataset.lap = String(lap);
    stage.dataset.place = String(place);
    stage.dataset.cadence = String(Math.round(player.cadence));
    stage.dataset.boost = player.boostTimer > 0 ? "active" : state.heat >= 100 ? "ready" : "charging";
    lassoButton.classList.toggle("ready", state.heat >= 100 && player.boostTimer <= 0);
    lassoButton.classList.toggle("active", player.boostTimer > 0);
    directionAnnounce.textContent = `${place === 1 ? "First" : place === 2 ? "Second" : place === 3 ? "Third" : "Fourth"} place, lap ${lap} of ${difficulty().laps}`;

    if (state.elapsed >= race.duration) {
      state.raceWon = place === 1;
      state.score += [0, 3000, 1800, 1000, 500][place];
      state.heat = Math.min(100, state.heat + (place === 1 ? 30 : 12));
      finish();
    }
  }

  function spawnCow(first = false) {
    const angle = first ? -.12 : Math.random() * Math.PI * 2;
    const radius = first ? .30 : .42 + Math.random() * .28;
    chase.cow.x = 480 + Math.cos(angle) * 285 * radius;
    chase.cow.y = 350 + Math.sin(angle) * 132 * radius;
    chase.cow.angle = Math.atan2(chase.cow.y - chase.player.y, chase.cow.x - chase.player.x);
    chase.cow.speed = difficulty().cowSpeed;
    chase.cow.timer = difficulty().cowTimer;
    chase.cow.turnTimer = .2 + Math.random() * .35;
    chase.cow.wander = (Math.random() - .5) * .7;
    chase.cow.phase = "run";
    chase.lasso.active = false;
    chase.lasso.hit = false;
  }

  function constrainChaseEntity(entity, radiusX, radiusY) {
    const dx = (entity.x - 480) / radiusX;
    const dy = (entity.y - 350) / radiusY;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) return false;
    entity.x = 480 + dx / distance * radiusX;
    entity.y = 350 + dy / distance * radiusY;
    return true;
  }

  function throwLasso() {
    if (!running || paused || counting || modeId !== "catch" || chase.cow.phase !== "run" || chase.lasso.cooldown > 0) return;
    const distance = Math.hypot(chase.cow.x - chase.player.x, chase.cow.y - chase.player.y);
    const inRange = distance <= difficulty().lassoRange;
    chase.lasso.active = true;
    chase.lasso.timer = chase.lasso.duration;
    chase.lasso.cooldown = difficulty().lassoCooldown;
    chase.lasso.hit = inRange;
    chase.lasso.targetX = chase.cow.x;
    chase.lasso.targetY = chase.cow.y;
    lassoButton.classList.add("active");
    setTimeout(() => lassoButton.classList.remove("active"), 170);
    audio.rope();

    if (!inRange) {
      setFeedback("JUST MISSED", 520);
      state.heat = Math.max(0, state.heat - 3);
      return;
    }

    const quickCatch = chase.cow.timer >= difficulty().cowTimer * .58;
    const outcome = state.scoreCatch(quickCatch, distance);
    stage.dataset.catches = String(state.catches);
    chase.cow.phase = "caught";
    chase.cow.timer = .52;
    setFeedback(quickCatch ? `QUICK CATCH +${outcome.points}` : `ROPE 'EM +${outcome.points}`, 700);
    burst(quickCatch ? "#ffc857" : "#ffad86", quickCatch ? 30 : 22, chase.cow.x, chase.cow.y - 34);
    quickCatch ? audio.perfect() : audio.good();
  }

  function cowEscaped() {
    state.escapes++;
    stage.dataset.escapes = String(state.escapes);
    state.takeHit(difficulty().escapeDamage);
    setFeedback("COW GOT AWAY", 680);
    stage.classList.add("shake");
    setTimeout(() => stage.classList.remove("shake"), 250);
    audio.miss();
    burst("#ff625f", 18, chase.cow.x, chase.cow.y);
    if (state.balance <= 0) {
      finish();
      return;
    }
    spawnCow();
  }

  function updateCatch(dt) {
    let moveX = (heldDirections.has("right") ? 1 : 0) - (heldDirections.has("left") ? 1 : 0);
    let moveY = (heldDirections.has("down") ? 1 : 0) - (heldDirections.has("up") ? 1 : 0);
    const moveLength = Math.hypot(moveX, moveY) || 1;
    moveX /= moveLength;
    moveY /= moveLength;
    const riderSpeed = difficultyId === "easy" ? 274 : 252;
    chase.player.vx = moveX * riderSpeed;
    chase.player.vy = moveY * riderSpeed;
    if (Math.abs(moveX) > .05) chase.player.facing = moveX > 0 ? 1 : -1;
    chase.player.x += chase.player.vx * dt;
    chase.player.y += chase.player.vy * dt;
    constrainChaseEntity(chase.player, 292, 132);

    chase.lasso.cooldown = Math.max(0, chase.lasso.cooldown - dt);
    if (chase.lasso.active) {
      chase.lasso.timer -= dt;
      if (chase.lasso.timer <= 0) chase.lasso.active = false;
    }

    const cow = chase.cow;
    if (cow.phase === "caught") {
      cow.timer -= dt;
      lassoButton.classList.remove("ready");
      if (cow.timer <= 0) spawnCow();
      return;
    }

    cow.timer -= dt;
    if (cow.timer <= 0) {
      cowEscaped();
      return;
    }

    cow.turnTimer -= dt;
    if (cow.turnTimer <= 0) {
      cow.turnTimer = .38 + Math.random() * .52;
      cow.wander = (Math.random() - .5) * 1.05;
    }
    const fleeAngle = Math.atan2(cow.y - chase.player.y, cow.x - chase.player.x) + cow.wander;
    const turnDelta = Math.atan2(Math.sin(fleeAngle - cow.angle), Math.cos(fleeAngle - cow.angle));
    cow.angle += turnDelta * Math.min(1, dt * (difficultyId === "easy" ? 2.1 : 2.8));
    const chaseRamp = 1 + Math.min(.24, state.elapsed / 150 * .24);
    cow.speed = difficulty().cowSpeed * chaseRamp;
    cow.x += Math.cos(cow.angle) * cow.speed * dt;
    cow.y += Math.sin(cow.angle) * cow.speed * .72 * dt;
    if (constrainChaseEntity(cow, 304, 139)) {
      cow.angle = Math.atan2(350 - cow.y, 480 - cow.x) + (Math.random() - .5) * .8;
      cow.wander = 0;
    }

    const distance = Math.hypot(cow.x - chase.player.x, cow.y - chase.player.y);
    const ready = distance <= difficulty().lassoRange && chase.lasso.cooldown <= 0;
    lassoButton.classList.toggle("ready", ready);
    directionAnnounce.textContent = ready ? "Cow in lasso range" : "Close the gap";
    stage.dataset.playerX = String(Math.round(chase.player.x));
    stage.dataset.playerY = String(Math.round(chase.player.y));
    stage.dataset.cowX = String(Math.round(cow.x));
    stage.dataset.cowY = String(Math.round(cow.y));
    stage.dataset.lassoReady = String(ready);
    stage.dataset.catches = String(state.catches);
    stage.dataset.escapes = String(state.escapes);
  }

  function startCountUp() {
    if (counting || running) return;
    document.querySelector("[data-grei-discovery]")?.remove();
    if (!reduceMotion && !arenaVideoFailed) arenaVideo?.play().catch(() => {});
    audio.unlock();
    modePicker.hidden = true;
    difficultyPicker.hidden = true;
    results.hidden = true;
    startButton.hidden = true;
    kickerEl.textContent = mode().label;
    counting = true;
    let count = 0;
    const finale = modeId === "ride" ? "RIDE!" : modeId === "matador" ? "DODGE!" : modeId === "catch" ? "LASSO!" : "RACE!";
    const cards = [["1", ""], ["2", ""], ["3", ""], [finale, ""]];
    const tick = () => {
      const [first, second] = cards[count];
      titleEl.innerHTML = first + (second ? `<br>${second}` : "");
      copyEl.textContent = count < 3
        ? "Count it up. Find the beat."
        : modeId === "ride" ? "Stay smooth and keep riding." : modeId === "matador" ? "Watch the line and move." : modeId === "catch" ? "Close the gap and rope 'em." : "Tap to gallop. Fill Heat. Hit Boost.";
      audio.countdown(count);
      count++;
      if (count < cards.length) setTimeout(tick, SONG_BEAT_SECONDS * 1000);
      else setTimeout(begin, SONG_BEAT_SECONDS * 1000);
    };
    tick();
  }

  function begin() {
    state.reset();
    resetDodge();
    resetChase();
    resetRace();
    heldDirections.clear();
    lassoButton.classList.remove("ready", "active");
    running = true;
    paused = false;
    counting = false;
    startedAt = Date.now();
    last = performance.now();
    nextBeatAt = difficulty().interval;
    beatIndex = 0;
    feedback = "";
    particles = [];
    flashes = [];
    stage.classList.add("playing");
    document.body.classList.add("grei-game-playing");
    stage.dataset.mode = modeId;
    stage.dataset.direction = "";
    delete stage.dataset.playerX;
    delete stage.dataset.playerY;
    delete stage.dataset.cowX;
    delete stage.dataset.cowY;
    delete stage.dataset.lassoReady;
    delete stage.dataset.catches;
    delete stage.dataset.escapes;
    delete stage.dataset.lap;
    delete stage.dataset.place;
    delete stage.dataset.cadence;
    delete stage.dataset.boost;
    overlay.hidden = true;
    directionAnnounce.textContent = "";
    audio.begin();
    hud();
    requestAnimationFrame(loop);
  }

  function finish() {
    if (!running) return;
    running = false;
    state.finished = true;
    heldDirections.clear();
    lassoButton.classList.remove("ready", "active");
    stage.classList.remove("playing");
    document.body.classList.remove("grei-game-playing");
    stage.dataset.direction = "";
    directionAnnounce.textContent = "";
    audio.stop();
    best = Math.max(best, state.score);
    localStorage.setItem(bestKey(), String(best));

    overlay.hidden = false;
    modePicker.hidden = false;
    difficultyPicker.hidden = false;
    results.hidden = false;
    startButton.hidden = false;
    kickerEl.textContent = modeId === "ride" ? "Thrown from the saddle" : modeId === "matador" ? "The bull caught you" : modeId === "catch" ? "The cow broke free" : state.raceWon ? "First across the line" : `Finished in place ${state.racePlace}`;
    titleEl.innerHTML = modeId === "ride" ? "HOLD<br>TIGHT" : modeId === "matador" ? "OLÉ<br>AGAIN" : modeId === "catch" ? "ROPE<br>UP" : state.raceWon ? "TRACK<br>KING" : "RUN<br>AGAIN";
    copyEl.textContent = modeId === "ride"
      ? "Your ride is over, but the instrumental is ready to loop again."
      : modeId === "matador"
        ? "One more sidestep and you had it. Get back in the arena."
        : modeId === "catch"
          ? "Tighten that loop, mount up, and bring the next cow home."
          : state.raceWon ? "You found the beat, fired the boost, and owned the final stretch." : "Tap with the beat, draft the leaders, and save a boost for the final lap.";

    const rank = modeId === "ride"
      ? state.score >= 10000 ? "Rodeo Royalty" : state.score >= 6000 ? "Wild Rider" : state.score >= 2500 ? "Rodeo Ready" : state.score >= 900 ? "Stable Hand" : "First Timer"
      : modeId === "matador"
        ? state.dodges >= 30 ? "Arena Royalty" : state.dodges >= 18 ? "Cape Master" : state.dodges >= 9 ? "Matador Ready" : state.dodges >= 3 ? "Quick Step" : "First Olé"
        : modeId === "catch"
          ? state.catches >= 25 ? "Lasso Royalty" : state.catches >= 15 ? "Ranch Boss" : state.catches >= 8 ? "Cow Catcher" : state.catches >= 3 ? "Rope Ready" : "Greenhorn"
          : state.racePlace === 1 ? "Track Royalty" : state.racePlace === 2 ? "Photo Finish" : state.racePlace === 3 ? "Podium Rider" : "Trail Runner";
    const middleValue = modeId === "ride" ? `${state.bestCombo}×` : modeId === "matador" ? state.dodges : modeId === "catch" ? state.catches : `#${state.racePlace}`;
    const middleLabel = modeId === "ride" ? "Best combo" : modeId === "matador" ? "Dodges" : modeId === "catch" ? "Catches" : "Finish";
    const lastValue = modeId === "ride" ? state.perfects : modeId === "matador" ? state.closeCalls : modeId === "catch" ? state.quickCatches : state.boosts;
    const lastLabel = modeId === "ride" ? "Perfects" : modeId === "matador" ? "Close calls" : modeId === "catch" ? "Quick catches" : "Boosts";
    results.innerHTML = `<div class="result-grid"><div class="result"><b>${state.score}</b><span>Score</span></div><div class="result"><b>${middleValue}</b><span>${middleLabel}</span></div><div class="result"><b>${lastValue}</b><span>${lastLabel}</span></div></div><p><strong>${rank}</strong> · ${Math.floor(state.elapsed)}s · ${difficulty().label} ${difficulty().promptBpm} BPM · Best ${best}</p>`;
    updateSelectionUI();
    document.querySelector(".next-modes").textContent = "Four rodeo events · one endless instrumental";
    submit();
  }

  async function submit() {
    const name = (localStorage.getItem("grei_arcade_player_name") || "Rider").slice(0, 18);
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const level = mode().levelBase + difficulty().level;
    try {
      await fetch(`${API}/api/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: GAME_ID, name, score: state.score, level, duration })
      });
    } catch {}
  }

  function updateShared(dt) {
    bullKick = Math.max(0, bullKick - dt * 3.5);
    riderLean *= Math.pow(.035, dt);
    riderPitch *= Math.pow(.035, dt);
    particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 300 * dt;
      particle.life -= dt;
      particle.spin += dt * 8;
    });
    particles = particles.filter(particle => particle.life > 0);
    flashes.forEach(flash => { flash.life -= dt; });
    flashes = flashes.filter(flash => flash.life > 0);
  }

  function update(dt, now) {
    state.elapsed += dt;
    updateShared(dt);
    if (modeId === "ride") {
      while (state.elapsed >= nextBeatAt && running) {
        rideBeat(now);
        nextBeatAt += difficulty().interval;
      }
    } else if (modeId === "matador") {
      updateMatador(dt);
    } else if (modeId === "catch") {
      updateCatch(dt);
    } else {
      updateRace(dt);
    }
    hud();
  }

  function drawArena(now) {
    const animatedArenaReady = !reduceMotion && !arenaVideoFailed && arenaVideo?.readyState >= 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!animatedArenaReady && arena.complete && arena.naturalWidth) ctx.drawImage(arena, 0, 0, canvas.width, canvas.height);
    else if (!animatedArenaReady) {
      const fallback = ctx.createLinearGradient(0, 0, 0, 540);
      fallback.addColorStop(0, "#ff756d");
      fallback.addColorStop(.55, "#a33c42");
      fallback.addColorStop(1, "#12090d");
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, 960, 540);
    }
    const shade = ctx.createRadialGradient(480, 300, 80, 480, 290, 590);
    shade.addColorStop(0, "rgba(8,7,11,0)");
    shade.addColorStop(.68, "rgba(8,7,11,.08)");
    shade.addColorStop(1, "rgba(5,4,8,.64)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 960, 540);
    if (state.heat >= 100) {
      ctx.fillStyle = `rgba(255,98,95,${.04 + Math.sin(now / 130) * .018})`;
      ctx.fillRect(0, 0, 960, 540);
    }
    flashes.forEach(flash => {
      const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 85);
      glow.addColorStop(0, `rgba(255,248,216,${flash.life * 3})`);
      glow.addColorStop(1, "rgba(255,200,87,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(flash.x - 90, flash.y - 90, 180, 180);
    });
  }

  function spriteFrame(image, index, x, y, width, height) {
    if (!image.complete || !image.naturalWidth) return false;
    const frameWidth = image.naturalWidth / ANIMATION_FRAMES;
    const frame = ((Math.floor(index) % ANIMATION_FRAMES) + ANIMATION_FRAMES) % ANIMATION_FRAMES;
    ctx.drawImage(image, frame * frameWidth, 0, frameWidth, image.naturalHeight, x, y, width, height);
    return true;
  }

  function cycleFrame(now, fps, phase = 0) {
    return Math.floor(now / 1000 * fps + phase) % ANIMATION_FRAMES;
  }

  function drawRide(now) {
    const t = now / 1000;
    const directionalRoll = bullDirection === "left" ? -.08 : bullDirection === "right" ? .08 : 0;
    const directionalLift = bullDirection === "up" ? -10 : bullDirection === "down" ? 8 : 0;
    if (rideAnimation.complete && rideAnimation.naturalWidth) {
      const pivotCanvasX = 480;
      const pivotCanvasY = 465;
      const roll = Math.sin(t * 17) * bullKick * .04 + directionalRoll * bullKick + riderLean * .035;
      const lift = directionalLift * bullKick + riderPitch * 2;
      const rideFps = running ? difficulty().promptBpm / 15 : 2.5;
      const frame = cycleFrame(now, rideFps, bullDirection === "down" ? 2 : bullDirection === "up" ? 1 : 0);

      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.beginPath();
      ctx.ellipse(480, 492, 154, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, 475);
      ctx.clip();
      ctx.translate(pivotCanvasX, pivotCanvasY + lift);
      ctx.rotate(roll);
      ctx.shadowColor = state.heat >= 100 ? "rgba(255,200,87,.62)" : "rgba(255,98,95,.30)";
      ctx.shadowBlur = state.heat >= 100 ? 30 : 13;
      spriteFrame(rideAnimation, frame, -195, -390, 390, 390);
      ctx.restore();
      return;
    }

    if (rideSprite.complete && rideSprite.naturalWidth) {
      const scale = 500 / rideSprite.naturalWidth;
      const pivotX = 610;
      const pivotY = 1078;
      const pivotCanvasX = 480;
      const pivotCanvasY = 465;
      const roll = Math.sin(t * 17) * bullKick * .04 + directionalRoll * bullKick + riderLean * .035;
      const lift = directionalLift * bullKick + riderPitch * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, 475);
      ctx.clip();
      ctx.translate(pivotCanvasX, pivotCanvasY + lift);
      ctx.rotate(roll);
      ctx.drawImage(rideSprite, -pivotX * scale, -pivotY * scale, rideSprite.naturalWidth * scale, rideSprite.naturalHeight * scale);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(480, 360);
    ctx.rotate(directionalRoll * bullKick);
    ctx.fillStyle = "#142a4a";
    ctx.beginPath();
    ctx.ellipse(0, 105, 125, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#54251d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff625f";
    ctx.fillRect(-18, -100, 36, 75);
    ctx.restore();
  }

  function drawRidePrompt(now) {
    if (!state.prompt || !running || counting || modeId !== "ride") return;
    const remaining = Math.max(0, (state.prompt.expires - now) / (state.prompt.expires - state.prompt.born));
    const pulse = 1 + Math.sin(now / 70) * .035;
    ctx.save();
    ctx.translate(700, 84);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(34,13,14,.9)";
    ctx.shadowColor = state.heat >= 100 ? "#ffc857" : "#ff625f";
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 61, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = state.heat >= 100 ? "#ffc857" : "#ff625f";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, 61, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 72px system-ui";
    ctx.fillText(ICONS[state.prompt.direction], 0, -5);
    ctx.fillStyle = "#ffc857";
    ctx.font = "900 10px system-ui";
    ctx.fillText(RIDE_LABELS[state.prompt.direction], 0, 82);
    ctx.restore();
  }

  function drawMatadora() {
    const player = dodge.player;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.vx / 265 * .055);
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    const moving = Math.hypot(player.vx, player.vy) > 18;
    if (spriteFrame(matadoraAnimation, moving ? cycleFrame(performance.now(), 9) : 0, -72, -154, 144, 192)) {
      // Animated character strip.
    } else if (matadorSprites.complete && matadorSprites.naturalWidth) {
      const slotWidth = matadorSprites.naturalWidth / 2;
      ctx.drawImage(matadorSprites, 0, 0, slotWidth, matadorSprites.naturalHeight, -72, -154, 144, 192);
    } else {
      ctx.fillStyle = "#174e96";
      ctx.beginPath();
      ctx.arc(0, -35, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff625f";
      ctx.beginPath();
      ctx.moveTo(-12, -35);
      ctx.lineTo(-70, 10);
      ctx.lineTo(-5, 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChargingBull() {
    const bull = dodge.bull;
    ctx.save();
    ctx.translate(bull.x, bull.y);
    ctx.rotate(bull.angle - Math.PI * .75);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 54, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const bullFrame = bull.phase === "charge" ? cycleFrame(performance.now(), 11) : bull.phase === "recover" ? 3 : 0;
    if (spriteFrame(chargingBullAnimation, bullFrame, -93, -124, 186, 248)) {
      // Animated charge strip.
    } else if (matadorSprites.complete && matadorSprites.naturalWidth) {
      const slotWidth = matadorSprites.naturalWidth / 2;
      ctx.drawImage(matadorSprites, slotWidth, 0, slotWidth, matadorSprites.naturalHeight, -93, -124, 186, 248);
    } else {
      ctx.fillStyle = "#54251d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffc857";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-35, -20);
      ctx.lineTo(-70, -40);
      ctx.moveTo(35, -20);
      ctx.lineTo(70, -40);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMatadorMode(now) {
    ctx.save();
    ctx.fillStyle = "rgba(20,9,11,.18)";
    ctx.strokeStyle = state.heat >= 100 ? "rgba(255,200,87,.7)" : "rgba(255,200,87,.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(480, 350, 335, 170, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const bull = dodge.bull;
    if (bull.phase === "telegraph") {
      const urgency = 1 - Math.max(0, bull.timer / difficulty().telegraph);
      ctx.save();
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -now / 24;
      ctx.strokeStyle = `rgba(255,${Math.round(160 + urgency * 55)},87,${.45 + urgency * .45})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(bull.x, bull.y);
      ctx.lineTo(bull.targetX, bull.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,98,95,.85)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bull.targetX, bull.targetY, 34 + Math.sin(now / 70) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const entities = [
      { y: dodge.player.y, draw: drawMatadora },
      { y: bull.y, draw: drawChargingBull }
    ].sort((a, b) => a.y - b.y);
    entities.forEach(entity => entity.draw());

    if (bull.phase === "telegraph") {
      ctx.fillStyle = "#ffc857";
      ctx.textAlign = "center";
      ctx.font = "italic 900 17px Impact, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = 7;
      ctx.fillText("CHARGE INCOMING", 480, 116);
      ctx.shadowBlur = 0;
    }
  }

  function drawHorsebackRider(now) {
    const player = chase.player;
    const gallop = running && (Math.abs(player.vx) + Math.abs(player.vy) > 10) ? Math.sin(now / 72) * 3 : 0;
    ctx.save();
    ctx.translate(player.x, player.y + gallop);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath();
    ctx.ellipse(0, 48, 78, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(player.facing, 1);
    ctx.rotate(player.vy / 274 * .018);
    const gallopFrame = running ? cycleFrame(now, difficultyId === "easy" ? 6 : 9) : 0;
    if (spriteFrame(horsebackRiderAnimation, gallopFrame, -123, -248, 246, 328)) {
      // Animated horseback strip.
    } else if (catchCowSprites.complete && catchCowSprites.naturalWidth) {
      const slotWidth = catchCowSprites.naturalWidth / 2;
      ctx.drawImage(catchCowSprites, 0, 0, slotWidth, catchCowSprites.naturalHeight, -123, -248, 246, 328);
    } else {
      ctx.fillStyle = "#54251d";
      ctx.beginPath();
      ctx.ellipse(0, 5, 74, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff625f";
      ctx.fillRect(-8, -82, 24, 75);
    }
    ctx.restore();
  }

  function drawRunawayCow(now) {
    const cow = chase.cow;
    const facing = Math.cos(cow.angle) >= 0 ? 1 : -1;
    const bob = cow.phase === "run" ? Math.sin(now / 63) * 3 : 0;
    ctx.save();
    ctx.translate(cow.x, cow.y + bob);
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.beginPath();
    ctx.ellipse(0, 33, 49, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(facing, 1);
    ctx.rotate(Math.sin(cow.angle) * .025);
    const cowFrame = cow.phase === "run" ? cycleFrame(now, difficultyId === "easy" ? 7 : 10) : 0;
    if (spriteFrame(runawayCowAnimation, cowFrame, -88, -132, 176, 235)) {
      // Animated cow strip.
    } else if (catchCowSprites.complete && catchCowSprites.naturalWidth) {
      const slotWidth = catchCowSprites.naturalWidth / 2;
      ctx.drawImage(catchCowSprites, slotWidth, 0, slotWidth, catchCowSprites.naturalHeight, -88, -132, 176, 235);
    } else {
      ctx.fillStyle = "#b45424";
      ctx.beginPath();
      ctx.ellipse(0, 0, 55, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (cow.phase === "caught") {
      ctx.strokeStyle = "#ffc857";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 2, 50, 19, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLasso(now) {
    const cow = chase.cow;
    const player = chase.player;
    const distance = Math.hypot(cow.x - player.x, cow.y - player.y);
    const ready = cow.phase === "run" && distance <= difficulty().lassoRange && chase.lasso.cooldown <= 0;

    if (ready && !chase.lasso.active) {
      const pulse = 1 + Math.sin(now / 95) * .08;
      ctx.save();
      ctx.translate(cow.x, cow.y - 4);
      ctx.scale(pulse, pulse);
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = "rgba(255,240,178,.92)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 53, 29, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffc857";
      ctx.textAlign = "center";
      ctx.font = "italic 900 13px Impact, sans-serif";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 5;
      ctx.fillText("IN RANGE · THROW!", 0, -47);
      ctx.restore();
    }

    if (!chase.lasso.active) return;
    const progress = Math.min(1, Math.max(0, 1 - chase.lasso.timer / chase.lasso.duration));
    const reach = Math.min(1, progress / .7);
    const startX = player.x + player.facing * 4;
    const startY = player.y - 190;
    const endX = startX + (chase.lasso.targetX - startX) * reach;
    const endY = startY + (chase.lasso.targetY - startY) * reach;
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - 50 * Math.sin(reach * Math.PI);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(40,16,8,.78)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();
    ctx.strokeStyle = "#e7b85c";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.translate(endX, endY);
    ctx.rotate(Math.atan2(chase.lasso.targetY - startY, chase.lasso.targetX - startX));
    ctx.strokeStyle = chase.lasso.hit ? "#fff0b2" : "#dca64a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42 * reach, 22 * reach, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawCatchMode(now) {
    ctx.save();
    ctx.fillStyle = "rgba(20,9,11,.12)";
    ctx.strokeStyle = state.heat >= 100 ? "rgba(255,200,87,.72)" : "rgba(255,200,87,.34)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(480, 350, 335, 170, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const entities = [
      { y: chase.player.y, draw: () => drawHorsebackRider(now) },
      { y: chase.cow.y, draw: () => drawRunawayCow(now) }
    ].sort((a, b) => a.y - b.y);
    entities.forEach(entity => entity.draw());
    drawLasso(now);

    const remaining = chase.cow.phase === "run" ? Math.max(0, chase.cow.timer / difficulty().cowTimer) : 1;
    ctx.fillStyle = "rgba(8,7,12,.72)";
    ctx.beginPath();
    ctx.roundRect(366, 71, 228, 45, 12);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.textAlign = "center";
    ctx.font = "italic 900 12px Impact, sans-serif";
    ctx.fillText(chase.cow.phase === "caught" ? "CAUGHT!" : "BREAKAWAY", 480, 87);
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(389, 96, 182, 7);
    ctx.fillStyle = remaining > .35 ? "#ffc857" : "#ff625f";
    ctx.fillRect(389, 96, 182 * remaining, 7);
  }

  function trackPoint(distance, lane) {
    const wrapped = ((distance % race.trackLength) + race.trackLength) % race.trackLength;
    const angle = -Math.PI / 2 + wrapped / race.trackLength * Math.PI * 2;
    const radiusX = 292 + lane * 42;
    const radiusY = 142 + lane * 20;
    return { x: 480 + Math.cos(angle) * radiusX, y: 310 + Math.sin(angle) * radiusY, angle };
  }

  function drawRaceHorse(distance, lane, color, now, player = false, surged = false) {
    const point = trackPoint(distance, lane);
    const scale = player ? 1 : .82;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.angle + Math.PI / 2);
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 38 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = player ? 5 : 4;
    if (surged) {
      ctx.shadowColor = "#ffc857";
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    ctx.ellipse(0, 14, 43 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const frame = cycleFrame(now, Math.max(5, (player ? race.player.speed : difficulty().rivalSpeed) / 24));
    if (!spriteFrame(horsebackRiderAnimation, frame, -57 * scale, -100 * scale, 114 * scale, 152 * scale)) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 * scale, 16 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (player) {
      ctx.strokeStyle = "#fff6ec";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -15, 43, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-42 * scale, -57 * scale, player ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRaceBeatTarget(now) {
    const beatLength = difficulty().interval;
    const songTime = Number.isFinite(music.currentTime) && music.currentTime > .02 ? music.currentTime : state.elapsed;
    const phase = (songTime % beatLength) / beatLength;
    const distance = Math.min(phase, 1 - phase);
    const proximity = 1 - Math.min(1, distance / .5);
    const radius = 34 + (1 - proximity) * 68;
    const perfectWindow = (difficultyId === "easy" ? .18 : .115) / beatLength;
    const inPerfectWindow = distance <= perfectWindow;
    ctx.save();
    ctx.translate(480, 310);
    ctx.strokeStyle = inPerfectWindow ? "#fff6ec" : `rgba(255,200,87,${.36 + proximity * .54})`;
    ctx.lineWidth = inPerfectWindow ? 8 : 5;
    ctx.shadowColor = "#ffc857";
    ctx.shadowBlur = inPerfectWindow ? 30 : 8 + proximity * 12;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = inPerfectWindow ? "#ffc857" : "rgba(255,246,236,.86)";
    ctx.textAlign = "center";
    ctx.font = "italic 900 13px Impact, sans-serif";
    ctx.fillText(inPerfectWindow ? "TAP!" : "TIME THE RING", 0, 5);
    if (race.player.lastGrade && now < race.player.gradeUntil) {
      ctx.fillStyle = race.player.lastGrade === "PERFECT" ? "#ffc857" : race.player.lastGrade === "GOOD" ? "#fff6ec" : "#ff8b7f";
      ctx.font = "italic 900 18px Impact, sans-serif";
      ctx.fillText(race.player.lastGrade, 0, 31);
    }
    ctx.restore();
  }

  function drawRaceMode(now) {
    ctx.save();
    ctx.fillStyle = "rgba(45,18,13,.64)";
    ctx.strokeStyle = "rgba(255,200,87,.5)";
    ctx.lineWidth = 74;
    ctx.beginPath();
    ctx.ellipse(480, 310, 292, 142, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,246,236,.25)";
    ctx.lineWidth = 2;
    [-42, 0, 42].forEach(offset => {
      ctx.beginPath();
      ctx.ellipse(480, 310, 292 + offset, 142 + offset * .48, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(12,40,30,.48)";
    ctx.beginPath();
    ctx.ellipse(480, 310, 220, 91, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (row + col) % 2 ? "#fff6ec" : "#1b1513";
        ctx.fillRect(466 + col * 14, 136 + row * 12, 14, 12);
      }
    }
    ctx.restore();

    drawRaceBeatTarget(now);

    const horses = race.rivals.map(rival => ({ distance: rival.distance, lane: rival.lane, color: rival.color, player: false, surged: rival.surgeTimer > 0 }));
    horses.push({ distance: race.player.distance, lane: race.player.lane, color: "#fff6ec", player: true, surged: race.player.boostTimer > 0 });
    horses.sort((a, b) => trackPoint(a.distance, a.lane).y - trackPoint(b.distance, b.lane).y);
    horses.forEach(horse => drawRaceHorse(horse.distance, horse.lane, horse.color, now, horse.player, horse.surged));

    const songProgress = Math.min(1, state.elapsed / race.duration);
    const lap = Math.min(difficulty().laps, Math.floor(songProgress * difficulty().laps) + 1);
    const place = state.racePlace;
    ctx.fillStyle = "rgba(8,7,12,.78)";
    ctx.beginPath();
    ctx.roundRect(355, 70, 250, 50, 12);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.textAlign = "center";
    ctx.font = "italic 900 17px Impact, sans-serif";
    ctx.fillText(`LAP ${lap}/${difficulty().laps}  ·  PLACE ${place}/4`, 480, 91);
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fillRect(382, 103, 196, 7);
    ctx.fillStyle = race.player.boostTimer > 0 ? "#fff6ec" : "#ffc857";
    ctx.fillRect(382, 103, 196 * songProgress, 7);
    ctx.fillStyle = state.heat >= 100 ? "#ffc857" : "#fff6ec";
    ctx.font = "italic 900 15px Impact, sans-serif";
    const surgingRival = race.rivals.find(rival => rival.surgeTimer > 0);
    const raceCallout = race.player.boostTimer > 0
      ? `BOOST ${race.player.boostTimer.toFixed(1)}s`
      : state.heat >= 100
        ? "BOOST READY!"
        : surgingRival
          ? `${surgingRival.name.toUpperCase()} SURGES!`
          : "TAP ↑ ON THE FLASH";
    ctx.fillText(raceCallout, 480, 143);
  }

  function drawCanvasHud() {
    ctx.fillStyle = "rgba(8,7,12,.68)";
    ctx.beginPath();
    ctx.roundRect(18, 18, 170, 39, 10);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.font = "800 10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(modeId === "ride" ? "BALANCE" : modeId === "matador" ? "NERVE" : modeId === "catch" ? "GRIT" : "GALLOP", 29, 34);
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(29, 41, 146, 7);
    const balanceGradient = ctx.createLinearGradient(29, 0, 175, 0);
    balanceGradient.addColorStop(0, "#ff625f");
    balanceGradient.addColorStop(.55, "#ffc857");
    balanceGradient.addColorStop(1, "#fef5e7");
    ctx.fillStyle = balanceGradient;
    ctx.fillRect(29, 41, 146 * state.balance / 100, 7);

    ctx.fillStyle = "rgba(8,7,12,.68)";
    ctx.beginPath();
    ctx.roundRect(772, 18, 170, 39, 10);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.font = "900 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${difficulty().label.toUpperCase()} · ${difficulty().promptBpm} BPM`, 857, 42);
  }

  function drawFeedback(now) {
    if (feedback && now < feedbackUntil) {
      ctx.fillStyle = feedback.includes("PERFECT") || feedback.includes("OLÉ") ? "#ffc857" : "#fff";
      ctx.textAlign = "center";
      ctx.font = "italic 900 24px Impact, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(feedback, 480, modeId === "ride" ? 220 : 150);
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles() {
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 1.7);
      ctx.restore();
    });
  }

  function draw(now = performance.now()) {
    drawArena(now);
    if (modeId === "ride") {
      drawRide(now);
      drawRidePrompt(now);
    } else if (modeId === "matador") {
      drawMatadorMode(now);
    } else if (modeId === "catch") {
      drawCatchMode(now);
    } else {
      drawRaceMode(now);
    }
    drawFeedback(now);
    drawCanvasHud();
    drawParticles();
  }

  function loop(now) {
    if (!running || paused) return;
    const dt = Math.min((now - last) / 1000, .034);
    last = now;
    update(dt, now);
    draw(now);
    if (running && !paused) requestAnimationFrame(loop);
  }

  startButton.addEventListener("click", startCountUp);
  modeButtons.forEach(button => button.addEventListener("click", () => chooseMode(button.dataset.mode)));
  difficultyButtons.forEach(button => button.addEventListener("click", () => chooseDifficulty(button.dataset.difficulty)));

  addEventListener("keydown", event => {
    if ((modeId === "catch" || modeId === "race") && (event.key === "Enter" || event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (!event.repeat) modeId === "race" ? activateRaceBoost() : throwLasso();
      return;
    }
    const action = KEY_ACTION[event.key];
    if (!action) return;
    event.preventDefault();
    if (modeId === "ride") {
      if (!event.repeat) respondRide(action);
    } else if (modeId === "race" && action === "up") {
      if (!event.repeat) tapGallop();
    } else if (running && !paused && !counting) {
      heldDirections.add(action);
    }
  });
  addEventListener("keyup", event => {
    const action = KEY_ACTION[event.key];
    if (action) heldDirections.delete(action);
  });
  addEventListener("blur", () => heldDirections.clear());

  function bindGameControl(button, onPress, onRelease = () => {}) {
    let pressed = false;
    const press = event => {
      if (event.cancelable) event.preventDefault();
      if (pressed) return;
      pressed = true;
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      stage.dataset.lastInput = button.dataset.action || "lasso";
      onPress();
    };
    const release = event => {
      if (!pressed) return;
      if (event?.cancelable) event.preventDefault();
      pressed = false;
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
      onRelease();
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("touchstart", press, { passive: false });
    button.addEventListener("touchmove", event => event.preventDefault(), { passive: false });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("touchend", release, { passive: false });
    button.addEventListener("touchcancel", release, { passive: false });
    button.addEventListener("click", event => { if (event.detail === 0) { press(event); release(event); } });
    window.addEventListener("pointerup", release);
    window.addEventListener("touchend", release, { passive: false });
    window.addEventListener("blur", release);
  }

  controlButtons.forEach(button => {
    const action = button.dataset.action;
    bindGameControl(button, () => {
      if (modeId === "ride") respondRide(action);
      else if (modeId === "race" && action === "up") tapGallop();
      else if (running && !paused && !counting) heldDirections.add(action);
    }, () => heldDirections.delete(action));
  });
  bindGameControl(lassoButton, () => modeId === "race" ? activateRaceBoost() : throwLasso());

  addEventListener("grei:pause", event => {
    paused = event.detail.paused;
    if (paused) {
      heldDirections.clear();
      audio.pause();
    } else if (running) {
      last = performance.now();
      audio.resume();
      requestAnimationFrame(loop);
    }
  });
  addEventListener("grei:sound", event => audio.setEnabled(event.detail.enabled));
  music.addEventListener("error", () => {
    audioStatus.textContent = "Instrumental unavailable · game sounds still work";
    musicChip.classList.add("muted");
  });
  if (reduceMotion) arenaVideo?.pause();
  arenaVideo?.addEventListener("loadeddata", () => { if (!running) draw(); });
  arenaVideo?.addEventListener("error", () => { arenaVideoFailed = true; stage.classList.add("video-fallback"); if (!running) draw(); });
  [
    arena, rideSprite, rideAnimation, matadorSprites, matadoraAnimation,
    chargingBullAnimation, catchCowSprites, horsebackRiderAnimation, runawayCowAnimation
  ].forEach(image => image.addEventListener("load", () => { if (!running) draw(); }));

  state.reset();
  resetDodge();
  resetChase();
  resetRace();
  updateSelectionUI();
  hud();
  draw();
})();
