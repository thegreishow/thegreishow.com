(() => {
  "use strict";

  const API = "https://grei-arcade-api.thegreishow.workers.dev";
  const GAME_ID = "rodeo-are-you-ready";
  const SONG_BPM = 90;
  const SONG_BEAT_SECONDS = 60 / SONG_BPM;
  const SONG_DURATION_FALLBACK = 173.136;
  const MODES = {
    ride: {
      label: "Ride the Riddim",
      shortLabel: "Ride",
      levelBase: 0
    },
    matador: {
      label: "Raging Bull",
      shortLabel: "Rage",
      levelBase: 2
    },
    catch: {
      label: "Rolling Calf",
      shortLabel: "Calf",
      levelBase: 4
    },
    race: {
      label: "Run the Track",
      shortLabel: "Race",
      levelBase: 6
    }
  };
  const HOW_TO_PLAY = {
    ride: {
      steps: [
        "Tap the direction shown in front of the rider before its ring runs out.",
        "Respond closer to the ideal moment for Perfect timing, more points, and more Heat.",
        "When Balance reaches zero, you lose a life and get a short recovery window."
      ],
      meters: [
        ["Balance", "Your grip on the bull. Keep it above zero to stay mounted."],
        ["Lives", "Standard starts with five; Easy starts with six."],
        ["Heat", "Fill five tougher bars to unlock ×2, ×4, ×6, ×8, and ×10 scoring. A fall drops one tier."]
      ]
    },
    matador: {
      steps: [
        "Use the joystick to move, then tap Vault once as the raging bull enters the glowing jump window.",
        "Stay close to the horns without getting clipped: close and razor dodges earn the biggest rewards.",
        "Chain clean dodges for longer streaks, OLÉ celebrations, and the ×2 to ×10 multiplier ladder."
      ],
      meters: [
        ["Nerve", "Your survival meter. Bull hits drain it; the run ends at zero."],
        ["Heat", "Fill five tougher bars through clean, close, and jumping dodges. A hit drops one multiplier tier."]
      ]
    },
    catch: {
      steps: [
        "Use the joystick to chase the Rolling Calf and close the distance.",
        "When the target ring turns gold and Lasso lights up, throw before the calf breaks free.",
        "Fast, accurate catches trigger longer rope-down animations, celebrations, and more Heat."
      ],
      meters: [
        ["Grit", "Your chase stamina. Escaped calves drain it; the run ends at zero."],
        ["Heat", "Precise and quick catches fill five tougher bars from ×2 through ×10. An escape drops one tier."]
      ]
    },
    race: {
      steps: [
        "Tap Gallop when the center flash hits to build speed; timing it perfectly builds more Heat.",
        "Steer left or right to find a clear lane and pass your rivals.",
        "When Heat is full, tap Boost to spend it on a burst of speed."
      ],
      meters: [
        ["Gallop", "Your current speed rhythm. It rises with well-timed taps and slowly fades."],
        ["Heat", "Your boost charge. Fill it, then spend it with the Boost button."],
        ["Multiplier", "Perfect gallops and overtakes climb a separate ×2 to ×10 scoring ladder."]
      ]
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
      cowTimer: 12,
      lassoRange: 230,
      lassoCooldown: .58,
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
      cowTimer: 9,
      lassoRange: 190,
      lassoCooldown: .78,
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
    E2: 82.41, B2: 123.47,
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
  const difficultyButtons = [...document.querySelectorAll("[data-difficulty]")];
  const results = document.getElementById("results");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const timeEl = document.getElementById("time");
  const heatEl = document.getElementById("heat");
  const heatMeter = document.getElementById("heatMeter");
  const heatLabel = document.getElementById("heatLabel");
  const heatPurpose = document.getElementById("heatPurpose");
  const heatTiers = document.getElementById("heatTiers");
  const heatValue = document.getElementById("heatValue");
  const audioStatus = document.getElementById("audioStatus");
  const directionAnnounce = document.getElementById("directionAnnounce");
  const controlHint = document.getElementById("controlHint");
  const controls = document.getElementById("controls");
  const joystickWrap = document.getElementById("joystickWrap");
  const joystickPad = document.getElementById("joystickPad");
  const joystickThumb = document.getElementById("joystickThumb");
  const joystickLabel = document.getElementById("joystickLabel");
  const controlButtons = [...document.querySelectorAll("[data-action]")];
  const lassoButton = document.getElementById("lassoButton");
  const jumpButton = document.getElementById("jumpButton");
  const gameMenuButton = document.getElementById("gameMenuButton");
  const music = document.getElementById("music");
  const arenaVideo = document.getElementById("arenaVideo");
  let arenaVideoFailed = false;

  const makeAsset = source => ({ image: new Image(), source, promise: null });
  const assets = {
    arena: makeAsset("assets/rodeo-arena.webp"),
    rideAnimation: makeAsset("assets/ride-animation-v3.png"),
    rideFallAnimation: makeAsset("assets/ride-fall-animation-v2.png"),
    matadorSprites: makeAsset("assets/matador-sprites.webp"),
    matadoraAnimation: makeAsset("assets/matadora-animation-v4.png"),
    ragingBullHitAnimation: makeAsset("assets/raging-bull-hit-v1.png"),
    chargingBullAnimation: makeAsset("assets/charging-bull-animation-v3.png"),
    catchCowSprites: makeAsset("assets/catch-cow-sprites.webp"),
    horsebackRiderAnimation: makeAsset("assets/horseback-rider-animation-v3.png"),
    runawayCowAnimation: makeAsset("assets/runaway-cow-animation-v2.webp"),
    rollingCalfEventsAnimation: makeAsset("assets/rolling-calf-events-v1.png")
  };
  const MODE_ASSETS = {
    ride: ["rideAnimation", "rideFallAnimation"],
    matador: ["matadorSprites", "matadoraAnimation", "ragingBullHitAnimation", "chargingBullAnimation"],
    catch: ["catchCowSprites", "horsebackRiderAnimation", "runawayCowAnimation", "rollingCalfEventsAnimation"],
    race: ["horsebackRiderAnimation"]
  };
  function loadAsset(key) {
    const asset = assets[key];
    if (!asset) return Promise.resolve(false);
    if (asset.image.naturalWidth) return Promise.resolve(true);
    if (!asset.promise) {
      asset.promise = new Promise(resolve => {
        asset.image.addEventListener("load", () => resolve(true), { once: true });
        asset.image.addEventListener("error", () => resolve(false), { once: true });
        asset.image.src = asset.source;
      });
    }
    return asset.promise;
  }
  const arena = assets.arena.image;
  const rideAnimation = assets.rideAnimation.image;
  const rideFallAnimation = assets.rideFallAnimation.image;
  const matadorSprites = assets.matadorSprites.image;
  const matadoraAnimation = assets.matadoraAnimation.image;
  const ragingBullHitAnimation = assets.ragingBullHitAnimation.image;
  const chargingBullAnimation = assets.chargingBullAnimation.image;
  const catchCowSprites = assets.catchCowSprites.image;
  const horsebackRiderAnimation = assets.horsebackRiderAnimation.image;
  const runawayCowAnimation = assets.runawayCowAnimation.image;
  const rollingCalfEventsAnimation = assets.rollingCalfEventsAnimation.image;
  loadAsset("arena");
  const ANIMATION_FRAMES = 4;
  const RIDE_ANIMATION_FRAMES = 8;
  const RIDE_FALL_FRAMES = 6;
  const EVENT_ANIMATION_FRAMES = 6;
  const DODGE_ANIMATION_FRAMES = 8;
  const BULL_ANIMATION_FRAMES = 4;
  const CHASE_ANIMATION_FRAMES = 8;
  const HORSEBACK_ANIMATION_FRAMES = 4;
  const RACE_GALLOP_FRAMES = 4;
  const RIDE_LIVES = { easy: 6, standard: 5 };
  const RIDE_RECOVERY_MS = { easy: 4000, standard: 3500 };
  const RIDE_WRONG_DAMAGE = { easy: 10, standard: 14 };
  const RIDE_MISSED_DAMAGE = { easy: 8, standard: 11 };
  const SCORE_MULTIPLIERS = [1, 2, 4, 6, 8, 10];
  const MULTIPLIER_COLORS = ["#fff6ec", "#59d8ff", "#66e38f", "#ffc857", "#ff7a59", "#e785ff"];
  const SKILL_TARGETS = {
    matador: [3, 5, 7, 9, 12],
    catch: [3, 5, 7, 9, 12],
    race: [6, 8, 10, 12, 16]
  };
  const RIDE_HEAT_TARGETS = [56, 76, 104, 138, 180];
  const RIDE_DIRECTION_FRAMES = { left: 3, up: 2, down: 4, right: 5 };
  const RIDE_IDLE_FRAMES = [0, 1, 6, 7];
  const RIDE_CHEERS = ["YEEHAW!", "WOO!", "RIDE IT!", "LET'S GO!", "GIDDY UP!"];
  const JUMP_STYLE = { id: "vault", label: "CAPE VAULT", velocity: 448, color: "#59d8ff" };
  const JUMP_WINDOW = {
    easy: { open: 210, close: 30 },
    standard: { open: 184, close: 30 }
  };
  const MULTIPLIER_CELEBRATIONS = {
    2: { title: "BLUE SPARK", cheer: "YEEHAW!", style: "rings", haptic: [35, 35, 55] },
    4: { title: "GREEN STAMPEDE", cheer: "WOO!", style: "stars", haptic: [45, 25, 45, 25, 70] },
    6: { title: "GOLD RUSH", cheer: "GIDDY UP!", style: "confetti", haptic: [60, 25, 90] },
    8: { title: "FIRESTORM", cheer: "RIDE IT!", style: "flames", haptic: [40, 20, 60, 20, 100] },
    10: { title: "RODEO ROYALTY", cheer: "LEGENDARY!", style: "crown", haptic: [70, 25, 70, 25, 130] }
  };
  const STREAK_CHEERS = { 3: "WARMING UP!", 5: "ON FIRE!", 8: "CROWD ROARING!", 12: "UNTOUCHABLE!", 16: "RODEO ROYALTY!", 20: "LEGENDARY!", 25: "CAPE MASTER!", 30: "ARENA ICON!", 40: "ALL-TIME GREAT!" };
  const VOICE_CUE_FILES = {
    three: "assets/voice/three-v2.mp3",
    two: "assets/voice/two-v2.mp3",
    one: "assets/voice/one-v2.mp3",
    "start-ride": "assets/voice/start-ride-v2.mp3",
    "start-raging": "assets/voice/start-raging-v2.mp3",
    "start-calf": "assets/voice/start-calf-v2.mp3",
    "start-race": "assets/voice/start-race-v2.mp3",
    yeehaw: "assets/voice/yeehaw-v2.mp3",
    ole: "assets/voice/ole-v2.mp3",
    legendary: "assets/voice/legendary-v2.mp3"
  };
  const announcer = new Audio();
  announcer.preload = "metadata";
  announcer.playsInline = true;
  let activeVoiceCue = null;
  let musicMixFrame = 0;

  let modeId = MODES[localStorage.getItem("grei-rodeo-mode")] ? localStorage.getItem("grei-rodeo-mode") : "ride";
  let difficultyId = DIFFICULTIES[localStorage.getItem("grei-rodeo-difficulty")] ? localStorage.getItem("grei-rodeo-difficulty") : "standard";
  const mode = () => MODES[modeId];
  const difficulty = () => DIFFICULTIES[difficultyId];
  const audioLabel = () => "Music on";
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
        announcer.src = VOICE_CUE_FILES.one;
        announcer.muted = true;
        const voiceUnlock = announcer.play().then(() => {
          announcer.pause();
          announcer.currentTime = 0;
          announcer.muted = false;
        }).catch(() => { announcer.muted = false; });
        await this.track.play();
        await voiceUnlock;
        this.unlocked = true;
        audioStatus.textContent = audioLabel();
      } catch {
        audioStatus.textContent = "Tap the sound button to enable music";
      }
    }

    begin() {
      if (!this.enabled) return;
      this.track.pause();
      this.track.currentTime = 0;
      this.track.loop = true;
      this.track.volume = activeVoiceCue ? .18 : .58;
      this.track.play().then(() => {
        this.unlocked = true;
      }).catch(() => {
        audioStatus.textContent = "Music blocked · tap sound, then retry";
      });
    }

    pause() { this.track.pause(); stopVoiceCue(); }
    resume() { if (this.enabled && running) this.track.play().catch(() => {}); }
    stop() { this.track.pause(); stopVoiceCue(); }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.track.muted = !this.enabled;
      if (!this.enabled) stopVoiceCue();
      audioStatus.textContent = this.enabled ? audioLabel() : "Music and game sounds muted";
      if (this.enabled && running && !paused) {
        setMusicMix(activeVoiceCue ? .18 : .58, 90);
        this.resume();
      }
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
    celebrate(level = 1) {
      const delay = Math.max(.035, .08 - level * .007);
      [NOTES.E4, NOTES.GS4, NOTES.B4, NOTES.E5, NOTES.GS5, NOTES.B5].slice(0, Math.min(6, level + 2)).forEach((note, index) => {
        this.tone(note, .15 + index * .01, index % 2 ? "triangle" : "sine", .045, index * delay);
      });
    }
    impact(strength = .5) {
      const weight = Math.max(.18, Math.min(1, strength));
      this.tone(NOTES.E2, .095, "sine", .025 + weight * .035);
      this.tone(NOTES.B2, .065, "triangle", .012 + weight * .018, .012);
    }
    noise(duration = .28, volume = .035, frequency = 1200) {
      if (!this.enabled) return;
      const audioContext = this.ensureContext();
      if (!audioContext) return;
      const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
      const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index++) {
        const fade = Math.pow(1 - index / length, .7);
        data[index] = (Math.random() * 2 - 1) * fade;
      }
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency, now);
      filter.Q.setValueAtTime(.7, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start(now);
      source.stop(now + duration + .02);
    }
    whoosh(strength = .7) {
      const weight = Math.max(.25, Math.min(1.2, strength));
      this.noise(.22 + weight * .12, .022 + weight * .025, 1150 + weight * 850);
      this.tone(180 + weight * 85, .16, "sine", .018 + weight * .012);
    }
    crowd(level = 1) {
      const weight = Math.max(1, Math.min(5, level));
      this.noise(.42 + weight * .07, .016 + weight * .007, 520 + weight * 90);
      this.tone(NOTES.E4, .18, "triangle", .018 + weight * .004);
      this.tone(NOTES.B4, .24, "sine", .014 + weight * .003, .06);
    }
    miss() { this.tone(NOTES.B3, .13, "sawtooth", .035); this.tone(NOTES.E3, .18, "triangle", .04, .07); }
  }

  class GameState {
    constructor() { this.reset(); }

    reset() {
      this.score = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.heat = 0;
      this.rideHeat = 0;
      this.rideTier = 0;
      this.bestRideMultiplier = 1;
      this.skillProgress = 0;
      this.skillTier = 0;
      this.bestMultiplier = 1;
      this.balance = 100;
      this.lives = RIDE_LIVES[difficultyId];
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
      this.prompt = { direction, born: now, expires: now + difficulty().interval * 920 };
      this.answered = false;
    }

    rideMultiplier() { return SCORE_MULTIPLIERS[this.rideTier]; }

    modeMultiplier() { return modeId === "ride" ? this.rideMultiplier() : SCORE_MULTIPLIERS[this.skillTier]; }

    multiplierColor(tier = modeId === "ride" ? this.rideTier : this.skillTier) {
      return MULTIPLIER_COLORS[Math.max(0, Math.min(MULTIPLIER_COLORS.length - 1, tier))];
    }

    skillTarget() {
      const targets = SKILL_TARGETS[modeId] || SKILL_TARGETS.matador;
      return targets[Math.min(this.skillTier, targets.length - 1)];
    }

    syncSkillHeat() {
      if (modeId === "race") return;
      this.heat = this.skillTier >= SCORE_MULTIPLIERS.length - 1
        ? 100
        : Math.min(100, this.skillProgress / this.skillTarget() * 100);
    }

    addSkillProgress(amount) {
      if (this.skillTier >= SCORE_MULTIPLIERS.length - 1) return null;
      this.skillProgress += amount;
      const target = this.skillTarget();
      if (this.skillProgress < target) { this.syncSkillHeat(); return null; }
      this.skillProgress -= target;
      this.skillTier++;
      this.bestMultiplier = Math.max(this.bestMultiplier, this.modeMultiplier());
      if (this.skillTier >= SCORE_MULTIPLIERS.length - 1) this.skillProgress = 0;
      this.syncSkillHeat();
      return this.modeMultiplier();
    }

    coolSkillProgress(portion = .35) {
      if (this.skillTier >= SCORE_MULTIPLIERS.length - 1) {
        this.skillTier--;
        this.skillProgress = this.skillTarget() * .55;
      } else {
        this.skillProgress = Math.max(0, this.skillProgress - this.skillTarget() * portion);
      }
      this.syncSkillHeat();
    }

    dropSkillTier() {
      if (this.skillTier > 0) this.skillTier--;
      this.skillProgress = 0;
      this.syncSkillHeat();
      return this.modeMultiplier();
    }

    rideHeatTarget() { return RIDE_HEAT_TARGETS[Math.min(this.rideTier, RIDE_HEAT_TARGETS.length - 1)]; }

    syncRideHeat() {
      this.heat = this.rideTier >= RIDE_HEAT_TARGETS.length
        ? 100
        : Math.min(100, this.rideHeat / this.rideHeatTarget() * 100);
    }

    addRideHeat(amount) {
      if (this.rideTier >= RIDE_HEAT_TARGETS.length) return null;
      this.rideHeat += amount;
      const target = this.rideHeatTarget();
      if (this.rideHeat < target) { this.syncRideHeat(); return null; }
      this.rideHeat -= target;
      this.rideTier++;
      this.bestRideMultiplier = Math.max(this.bestRideMultiplier, this.rideMultiplier());
      this.bestMultiplier = Math.max(this.bestMultiplier, this.rideMultiplier());
      if (this.rideTier >= RIDE_HEAT_TARGETS.length) this.rideHeat = 0;
      this.syncRideHeat();
      return this.rideMultiplier();
    }

    coolRideHeat(portion = .2) {
      if (this.rideTier >= RIDE_HEAT_TARGETS.length) {
        this.rideTier = RIDE_HEAT_TARGETS.length - 1;
        this.rideHeat = this.rideHeatTarget() * .72;
      } else {
        this.rideHeat = Math.max(0, this.rideHeat - this.rideHeatTarget() * portion);
      }
      this.syncRideHeat();
    }

    dropRideTier() {
      if (this.rideTier > 0) this.rideTier--;
      this.rideHeat = 0;
      this.syncRideHeat();
      return this.rideMultiplier();
    }

    answerRide(action, now) {
      if (!this.prompt || this.answered || this.finished) return null;
      this.answered = true;
      if (action !== this.prompt.direction) return this.takeHit(RIDE_WRONG_DAMAGE[difficultyId]);
      const age = now - this.prompt.born;
      const accuracy = Math.max(0, 1 - age / (this.prompt.expires - this.prompt.born));
      const perfect = accuracy > .42;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (perfect) this.perfects++;
      const comboMultiplier = Math.min(3, 1 + Math.floor(this.combo / 8) * .25);
      const scoreMultiplier = this.rideMultiplier();
      const points = Math.round((perfect ? 140 : 90) * comboMultiplier * scoreMultiplier);
      this.score += points;
      const heatUpgrade = this.addRideHeat(perfect ? 14 : 9);
      this.balance = Math.min(100, this.balance + (difficultyId === "easy" ? 8 : 6));
      return { kind: perfect ? "perfect" : "good", points, scoreMultiplier, heatUpgrade };
    }

    scoreDodge(minDistance, jumpType = null) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.dodges++;
      const razor = minDistance < 58;
      const closeCall = minDistance < 88;
      if (closeCall) this.closeCalls++;
      const scoreMultiplier = this.modeMultiplier();
      const base = razor ? 420 : closeCall ? 300 : 180;
      const jumpBonus = jumpType ? 1.3 : 1;
      const points = Math.round(base * jumpBonus * scoreMultiplier);
      this.score += points;
      const multiplierUpgrade = this.addSkillProgress((razor ? 3 : closeCall ? 2 : 1) + (jumpType ? 1 : 0));
      this.balance = Math.min(100, this.balance + 2);
      return { kind: razor ? "razor" : closeCall ? "close" : "clear", points, scoreMultiplier, multiplierUpgrade, jumped: Boolean(jumpType), jumpType };
    }

    scoreCatch(quickCatch, distance) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.catches++;
      if (quickCatch) this.quickCatches++;
      const precision = Math.max(0, 1 - distance / difficulty().lassoRange);
      const scoreMultiplier = this.modeMultiplier();
      const points = Math.round((quickCatch ? 360 : 220) * (1 + precision * .35) * scoreMultiplier);
      this.score += points;
      const multiplierUpgrade = this.addSkillProgress(quickCatch ? 2.5 : precision > .62 ? 2 : 1);
      this.balance = Math.min(100, this.balance + 3);
      return { kind: quickCatch ? "perfect" : "good", points, scoreMultiplier, multiplierUpgrade };
    }

    scoreOvertake() {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.overtakes++;
      const scoreMultiplier = this.modeMultiplier();
      const points = Math.round(240 * scoreMultiplier);
      this.score += points;
      const multiplierUpgrade = this.addSkillProgress(1.5);
      return { points, scoreMultiplier, multiplierUpgrade };
    }

    takeHit(damage = 18) {
      this.combo = 0;
      if (modeId === "ride") this.coolRideHeat();
      else if (modeId === "matador" || modeId === "catch") this.dropSkillTier();
      else this.coolSkillProgress(.5);
      this.balance = Math.max(0, this.balance - damage);
      this.misses++;
      return { kind: "miss", points: 0 };
    }
  }

  const audio = new AudioDirector(music);
  const state = new GameState();
  const heldDirections = new Set();
  const joystick = { active: false, id: null, x: 0, y: 0 };
  const dodge = {
    player: { x: 480, y: 350, vx: 0, vy: 0, jumpHeight: 0, jumpVelocity: 0, airborne: false, landedAt: 0, jumpType: "vault", jumpStartedAt: 0, jumpLockUntil: 0, jumpHintAt: 0 },
    bull: { x: 480, y: 178, targetX: 480, targetY: 350, angle: Math.PI / 2, facing: 1, phase: "telegraph", timer: 0, speed: 0, vx: 0, vy: 0, travel: 0, maxTravel: 0, minDistance: 999, hit: false, jumped: false, jumpFlashed: false, jumpAttempted: false },
    ole: { startedAt: 0, until: 0, level: 0 },
    hit: { startedAt: 0, until: 0, angle: 0, gameOver: false },
    celebration: { startedAt: 0, until: 0, type: "cape", level: 0 }
  };
  const chase = {
    player: { x: 330, y: 390, vx: 0, vy: 0, facing: 1, celebrateUntil: 0, celebrationType: "rope" },
    cow: { x: 650, y: 310, angle: Math.PI, speed: 0, timer: 0, turnTimer: 0, phase: "run", phaseStartedAt: 0 },
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
  let countdownToken = 0;
  let rideRecoveryUntil = 0;
  let rideReaction = { direction: "up", startedAt: 0, until: 0 };
  let rideTransition = { phase: "mounted", startedAt: 0, fallUntil: 0, remountAt: 0, until: 0 };
  let multiplierCelebration = { multiplier: 1, tier: 0, style: "rings", title: "", startedAt: 0, until: 0, x: 480, y: 270 };
  let last = 0;
  let nextBeatAt = difficulty().interval;
  let beatIndex = 0;
  let startedAt = 0;
  let feedback = "";
  let feedbackUntil = 0;
  let feedbackBig = false;
  let feedbackColor = "#ffc857";
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

  function setFeedback(text, duration = 480, options = {}) {
    feedback = text;
    feedbackUntil = performance.now() + duration;
    feedbackBig = Boolean(options.big);
    feedbackColor = options.color || (text.includes("PERFECT") || text.includes("OLÉ") ? "#ffc857" : "#fff6ec");
  }

  function stopVoiceCue() {
    announcer.pause();
    try { announcer.currentTime = 0; } catch {}
    activeVoiceCue = null;
    stage.classList.remove("voice-active");
    if (running && audio.enabled) setMusicMix(.58, 220);
  }

  function setMusicMix(target, duration = 140) {
    cancelAnimationFrame(musicMixFrame);
    const from = music.volume;
    const startedAt = performance.now();
    const change = target - from;
    const updateMix = now => {
      const progress = Math.min(1, (now - startedAt) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      music.volume = Math.max(0, Math.min(1, from + change * eased));
      if (progress < 1) musicMixFrame = requestAnimationFrame(updateMix);
    };
    musicMixFrame = requestAnimationFrame(updateMix);
  }

  function playVoiceCue(id, volume = 1) {
    if (!audio.enabled || !VOICE_CUE_FILES[id]) return;
    stopVoiceCue();
    activeVoiceCue = id;
    announcer.src = VOICE_CUE_FILES[id];
    announcer.volume = Math.max(.9, Math.min(1, volume));
    announcer.muted = false;
    stage.classList.add("voice-active");
    if (running) setMusicMix(.18, 90);
    const finishCue = () => {
      if (activeVoiceCue !== id) return;
      activeVoiceCue = null;
      stage.classList.remove("voice-active");
      if (running && audio.enabled) setMusicMix(.58, 240);
    };
    announcer.onended = finishCue;
    announcer.onerror = finishCue;
    announcer.play().catch(finishCue);
  }

  function haptic(pattern = 24, options = {}) {
    const duration = Array.isArray(pattern) ? pattern.reduce((sum, value) => sum + value, 0) : Number(pattern) || 24;
    const strength = options.strength ?? Math.max(.22, Math.min(1, duration / 180));
    let hardwareFeedback = false;
    try {
      if (typeof navigator.vibrate === "function" && document.visibilityState !== "hidden") {
        navigator.vibrate(0);
        hardwareFeedback = navigator.vibrate(pattern) || hardwareFeedback;
      }
      const gamepad = navigator.getGamepads?.()?.find(Boolean);
      const actuator = gamepad?.vibrationActuator;
      if (actuator?.playEffect) {
        hardwareFeedback = true;
        actuator.playEffect("dual-rumble", {
          duration,
          strongMagnitude: Math.max(.34, strength),
          weakMagnitude: Math.max(.48, Math.min(1, strength + .2))
        }).catch(() => {});
      }
    } catch {}
    audio.impact(hardwareFeedback ? strength * .4 : strength);
    stage.dataset.haptics = hardwareFeedback ? "hardware" : "audio-visual";
    if (options.subtle) return;
    stage.style.setProperty("--impact-shift", `${(1.2 + strength * 3.2).toFixed(1)}px`);
    stage.classList.remove("impact-pulse");
    void stage.offsetWidth;
    stage.classList.add("impact-pulse");
    clearTimeout(haptic.clearTimer);
    haptic.clearTimer = setTimeout(() => stage.classList.remove("impact-pulse"), 190);
  }

  function streakCheer() { return STREAK_CHEERS[state.combo] || ""; }

  function updateHudStat(element, value) {
    const nextValue = String(value);
    if (element.textContent === nextValue) return;
    element.textContent = nextValue;
    if (!running) return;
    const stat = element.closest(".stat");
    stat?.classList.remove("stat-pop");
    void stat?.offsetWidth;
    stat?.classList.add("stat-pop");
    clearTimeout(element.statPopTimer);
    element.statPopTimer = setTimeout(() => stat?.classList.remove("stat-pop"), 320);
  }

  function hud() {
    updateHudStat(scoreEl, state.score);
    updateHudStat(comboEl, state.combo);
    comboEl.closest(".stat")?.classList.toggle("streak-hot", state.combo >= 5);
    if (modeId === "race") {
      const remaining = Math.max(0, Math.ceil(race.duration - state.elapsed));
      timeEl.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    } else {
      timeEl.textContent = Math.max(0, Math.floor(state.elapsed));
    }
    heatEl.style.width = `${state.heat}%`;
    const multiplier = state.modeMultiplier();
    const tierIndex = modeId === "ride" ? state.rideTier : state.skillTier;
    const maxMultiplier = tierIndex >= SCORE_MULTIPLIERS.length - 1;
    const multiplierColor = state.multiplierColor(tierIndex);
    const nextColor = state.multiplierColor(Math.min(tierIndex + 1, SCORE_MULTIPLIERS.length - 1));
    stage.style.setProperty("--multiplier-color", multiplierColor);
    stage.style.setProperty("--multiplier-next-color", nextColor);
    stage.dataset.scoreMultiplier = String(multiplier);
    stage.dataset.multiplierTier = String(tierIndex);
    stage.classList.toggle("streak-live", state.combo >= 5);

    if (modeId !== "race") {
      const nextMultiplier = SCORE_MULTIPLIERS[Math.min(tierIndex + 1, SCORE_MULTIPLIERS.length - 1)];
      const meterUse = maxMultiplier ? "Maximum ×10 scoring" : `Next: ×${nextMultiplier}`;
      heatLabel.textContent = multiplier > 1 ? `Heat ×${multiplier}` : "Heat";
      heatPurpose.textContent = meterUse;
      heatValue.textContent = maxMultiplier ? "MAX" : `${Math.round(state.heat)}%`;
      heatMeter.setAttribute("aria-label", `Heat multiplier ×${multiplier}. ${meterUse}. Current bar ${Math.round(state.heat)} percent.`);
      [...heatTiers.children].forEach((tier, index) => {
        tier.style.setProperty("--tier-color", MULTIPLIER_COLORS[index + 1]);
        tier.classList.toggle("unlocked", index < tierIndex);
        tier.classList.toggle("current", !maxMultiplier && index === tierIndex);
      });
      stage.classList.toggle("heat", tierIndex > 0);
    } else {
      const boostReady = state.heat >= 100;
      heatLabel.textContent = boostReady ? "Boost" : "Heat";
      heatPurpose.textContent = boostReady ? "Boost ready" : "Fills boost";
      heatValue.textContent = `${Math.round(state.heat)}%`;
      heatMeter.setAttribute("aria-label", `Boost charge: ${Math.round(state.heat)} percent. ${boostReady ? "Boost ready." : "Fill to activate boost."}`);
      [...heatTiers.children].forEach(tier => tier.classList.remove("unlocked", "current"));
      stage.classList.toggle("heat", boostReady);
    }

    if (modeId === "ride") {
      stage.dataset.lives = String(state.lives);
      stage.dataset.rideMultiplier = String(multiplier);
      stage.dataset.rideTier = String(tierIndex);
    } else {
      delete stage.dataset.lives;
      delete stage.dataset.rideMultiplier;
      delete stage.dataset.rideTier;
    }
  }

  function showSelection() {
    results.hidden = true;
    modePicker.hidden = false;
    difficultyPicker.hidden = false;
    startButton.hidden = false;
    kickerEl.textContent = "Choose your event";
    titleEl.innerHTML = "ARE YOU<br>READY?";
    copyEl.hidden = true;
    rideRecoveryUntil = 0;
    rideReaction = { direction: "up", startedAt: 0, until: 0 };
    rideTransition = { phase: "mounted", startedAt: 0, fallUntil: 0, remountAt: 0, until: 0 };
    multiplierCelebration.until = 0;
    stage.dataset.rideAnimation = "mounted";
    delete stage.dataset.rideMove;
    delete stage.dataset.recovering;
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

    if (audio.enabled) audioStatus.textContent = audioLabel();

    const replay = results.hidden ? "" : " Again";
    startButton.textContent = modeId === "ride"
      ? `Ride${replay}`
      : modeId === "matador"
        ? `Rage${replay}`
        : modeId === "catch"
          ? `Roll${replay}`
          : `Race${replay}`;
    stage.setAttribute("aria-label", `${mode().label} playfield`);
    stage.dataset.mode = modeId;

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
        ? "Joystick to dodge · Tap Vault or press J as the bull closes in · Space pauses"
        : modeId === "catch"
          ? "Use the joystick to chase · Throw when Lasso turns gold · Space pauses"
          : "Tap Up/W to gallop · Left/Right to pass · Enter/Z or Boost at full Heat";
    lassoButton.hidden = modeId !== "catch" && modeId !== "race";
    jumpButton.hidden = modeId !== "matador";
    const specialIcon = lassoButton.querySelector("span");
    const specialLabel = lassoButton.querySelector("small");
    if (specialIcon) specialIcon.textContent = modeId === "race" ? "⚡" : "◎";
    if (specialLabel) specialLabel.textContent = modeId === "race" ? "Boost" : "Lasso";
    lassoButton.setAttribute("aria-label", modeId === "race" ? "Activate boost when Heat is full" : "Throw lasso");
    const usesJoystick = modeId === "matador" || modeId === "catch";
    controls.classList.toggle("catch-controls", modeId === "catch" || modeId === "race");
    controls.classList.toggle("jump-controls", modeId === "matador");
    controls.classList.toggle("joystick-controls", usesJoystick);
    joystickWrap.hidden = !usesJoystick;
    joystickLabel.textContent = modeId === "catch" ? "Chase Calf" : "Move";
    controls.setAttribute("aria-label", modeId === "ride" ? "Ride controls" : modeId === "matador" ? "Matador controls" : modeId === "catch" ? "Horseback chase controls" : "Horse racing controls");
    hud();
  }

  function chooseMode(nextId) {
    if (running || counting || !MODES[nextId]) return;
    modeId = nextId;
    localStorage.setItem("grei-rodeo-mode", modeId);
    MODE_ASSETS[modeId].forEach(loadAsset);
    best = loadBest();
    if (!results.hidden) showSelection();
    else { state.reset(); resetDodge(); resetChase(); resetRace(); updateSelectionUI(); hud(); draw(); }
  }

  function chooseDifficulty(nextId) {
    if (running || counting || !DIFFICULTIES[nextId]) return;
    difficultyId = nextId;
    localStorage.setItem("grei-rodeo-difficulty", difficultyId);
    best = loadBest();
    if (!results.hidden) showSelection();
    else { state.reset(); resetDodge(); resetChase(); resetRace(); updateSelectionUI(); hud(); draw(); }
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

  function celebrateMultiplier(multiplier, x = 480, y = 270) {
    const tier = SCORE_MULTIPLIERS.indexOf(multiplier);
    const color = MULTIPLIER_COLORS[Math.max(0, tier)];
    const celebration = MULTIPLIER_CELEBRATIONS[multiplier] || { title: "MULTIPLIER UP", cheer: RIDE_CHEERS[0], style: "rings", haptic: 55 };
    const now = performance.now();
    multiplierCelebration = { multiplier, tier, style: celebration.style, title: celebration.title, startedAt: now, until: now + 1850, x, y };
    setFeedback(`${celebration.cheer}  ${celebration.title} ×${multiplier}!`, 1750, { big: true, color });
    const primaryAmount = [0, 42, 50, 58, 68, 84][tier] || 42;
    burst(color, primaryAmount, x, y);
    burst(tier >= 4 ? "#ff625f" : tier >= 3 ? "#ffc857" : "#fff6ec", 18 + tier * 5, x, y - 38);
    flashes.push({ x: x - 100, y: y - 34, life: .55 }, { x: x + 100, y: y - 34, life: .55 });
    stage.classList.remove("multiplier-up");
    void stage.offsetWidth;
    stage.classList.add("multiplier-up");
    setTimeout(() => stage.classList.remove("multiplier-up"), 760);
    audio.celebrate(Math.max(1, tier));
    audio.crowd(Math.max(1, tier));
    playVoiceCue(multiplier >= 10 ? "legendary" : "yeehaw", 1);
    haptic(celebration.haptic);
    if (modeId === "ride") {
      bullKick = 1.7 + tier * .12;
      riderLean = tier % 2 ? -1 : 1;
      riderPitch = tier >= 4 ? -1 : 0;
    }
  }

  function respondRide(action) {
    const now = performance.now();
    if (!running || paused || counting || modeId !== "ride" || rideRecoveryUntil > now) return;
    const outcome = state.answerRide(action, now);
    if (!outcome) return;
    rideReaction = { direction: action, startedAt: now, until: now + 560 };
    stage.dataset.rideMove = action;
    const control = document.querySelector(`[data-action="${action}"]`);
    control?.classList.add("active");
    setTimeout(() => {
      control?.classList.remove("active");
      if (performance.now() >= rideReaction.until) delete stage.dataset.rideMove;
    }, 570);
    if (outcome.kind === "miss") {
      setFeedback("WRONG WAY");
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 250);
      audio.miss();
      haptic([55, 30, 80]);
    } else {
      riderLean = { left: -1, right: 1, up: 0, down: 0 }[action] || 0;
      riderPitch = { up: -1, down: 1 }[action] || 0;
      if (outcome.heatUpgrade) {
        celebrateMultiplier(outcome.heatUpgrade, 480, 280);
      } else {
        const milestone = streakCheer();
        const cheer = milestone
          ? `${milestone}  `
          : outcome.kind === "perfect" && state.combo > 0 && state.combo % 4 === 0
            ? `${RIDE_CHEERS[(state.combo / 4 - 1) % RIDE_CHEERS.length]}  `
            : "";
        const multiplierCopy = outcome.scoreMultiplier > 1 ? ` · ×${outcome.scoreMultiplier}` : "";
        setFeedback(outcome.kind === "perfect" ? `${cheer}PERFECT +${outcome.points}${multiplierCopy}` : `SMOOTH +${outcome.points}${multiplierCopy}`, cheer ? 900 : 560, { big: Boolean(milestone), color: state.multiplierColor() });
        outcome.kind === "perfect" ? audio.perfect() : audio.good();
        if (milestone) audio.crowd(Math.min(5, 1 + Math.floor(state.combo / 5)));
        haptic(outcome.kind === "perfect" ? [22, 18, 36] : 18);
      }
      burst(outcome.kind === "perfect" ? "#ffc857" : "#ff625f", outcome.kind === "perfect" ? 26 : 15);
    }
    hud();
    if (state.balance <= 0) loseRideLife(now);
  }

  function loseRideLife(now = performance.now()) {
    const previousMultiplier = state.rideMultiplier();
    state.lives = Math.max(0, state.lives - 1);
    state.combo = 0;
    state.prompt = null;
    state.answered = true;
    const cooledMultiplier = state.dropRideTier();
    stage.dataset.direction = "";
    stage.dataset.lives = String(state.lives);
    stage.dataset.rideAnimation = "fall";
    delete stage.dataset.rideMove;
    rideReaction.until = 0;
    const tierDrop = previousMultiplier > cooledMultiplier ? ` · ×${previousMultiplier} → ×${cooledMultiplier}` : "";
    if (state.lives <= 0) {
      state.balance = 0;
      rideRecoveryUntil = now + 980;
      rideTransition = { phase: "fall", startedAt: now, fallUntil: now + 900, remountAt: Infinity, until: now + 980 };
      stage.dataset.recovering = "true";
      setFeedback(`THROWN!${tierDrop}`, 900);
      burst("#ff625f", 42, 480, 330);
      audio.miss();
      haptic([90, 40, 130]);
      setTimeout(() => {
        if (running && modeId === "ride" && state.lives <= 0) finish();
      }, 980);
      hud();
      return;
    }
    const recoveryMs = RIDE_RECOVERY_MS[difficultyId];
    state.balance = 100;
    rideRecoveryUntil = now + recoveryMs;
    rideTransition = { phase: "fall", startedAt: now, fallUntil: now + 850, remountAt: now + recoveryMs - 1050, until: rideRecoveryUntil };
    nextBeatAt = state.elapsed + recoveryMs / 1000 + difficulty().interval;
    stage.dataset.recovering = "true";
    directionAnnounce.textContent = `${state.lives} rides left. Recovering.`;
    setFeedback(`THROWN! ${state.lives} RIDES LEFT${tierDrop}`, 1300);
    burst("#ff625f", 38, 480, 330);
    flashes.push({ x: 480, y: 290, life: .5 });
    audio.miss();
    haptic([90, 40, 130]);
    hud();
  }

  function rideBeat(now) {
    if (state.prompt && !state.answered) {
      state.answered = true;
      state.takeHit(RIDE_MISSED_DAMAGE[difficultyId]);
      setFeedback("HOLD ON", 430);
      stage.classList.add("shake");
      setTimeout(() => stage.classList.remove("shake"), 250);
      audio.miss();
      if (state.balance <= 0) { loseRideLife(now); return; }
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
    dodge.player.y = 350;
    dodge.player.vx = 0;
    dodge.player.vy = 0;
    dodge.player.jumpHeight = 0;
    dodge.player.jumpVelocity = 0;
    dodge.player.airborne = false;
    dodge.player.landedAt = 0;
    dodge.player.jumpType = "vault";
    dodge.player.jumpStartedAt = 0;
    dodge.player.jumpLockUntil = 0;
    dodge.player.jumpHintAt = 0;
    dodge.ole.until = 0;
    dodge.hit.until = 0;
    dodge.hit.gameOver = false;
    dodge.celebration.until = 0;
    if (jumpButton) jumpButton.classList.remove("ready", "active");
    updateJumpButton();
    delete stage.dataset.jump;
    resetJoystick();
    spawnBull(true);
  }

  function updateJumpButton() {
    if (!jumpButton) return;
    const label = jumpButton.querySelector("small");
    if (label) label.textContent = "Vault";
    jumpButton.setAttribute("aria-label", "Vault over the raging bull");
    jumpButton.setAttribute("aria-disabled", "true");
    jumpButton.style.setProperty("--jump-color", JUMP_STYLE.color);
  }

  function spawnBull(first = false) {
    const spawnAngle = first ? -Math.PI / 2 : Math.random() * Math.PI * 2;
    dodge.bull.x = 480 + Math.cos(spawnAngle) * 345;
    dodge.bull.y = 350 + Math.sin(spawnAngle) * 172;
    dodge.bull.targetX = dodge.player.x;
    dodge.bull.targetY = dodge.player.y;
    dodge.bull.angle = Math.atan2(dodge.bull.targetY - dodge.bull.y, dodge.bull.targetX - dodge.bull.x);
    dodge.bull.facing = Math.cos(dodge.bull.angle) >= 0 ? 1 : -1;
    dodge.bull.phase = "telegraph";
    dodge.bull.timer = difficulty().telegraph;
    dodge.bull.speed = difficulty().bullSpeed;
    dodge.bull.vx = 0;
    dodge.bull.vy = 0;
    dodge.bull.travel = 0;
    dodge.bull.maxTravel = 0;
    dodge.bull.minDistance = 999;
    dodge.bull.hit = false;
    dodge.bull.jumped = false;
    dodge.bull.jumpFlashed = false;
    dodge.bull.jumpAttempted = false;
    dodge.hit.until = 0;
    dodge.hit.gameOver = false;
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

  function jumpMatadora() {
    const player = dodge.player;
    const now = performance.now();
    if (!running || paused || counting || modeId !== "matador" || player.airborne || now < player.jumpLockUntil || now < dodge.hit.until) return;
    const bull = dodge.bull;
    const window = JUMP_WINDOW[difficultyId];
    const distance = Math.hypot(bull.x - player.x, bull.y - player.y);
    const jumpReady = bull.phase === "charge" && !bull.jumpAttempted && distance <= window.open && distance > window.close;
    if (!jumpReady) {
      if (bull.phase === "charge" && !bull.jumpAttempted && now >= player.jumpHintAt) {
        player.jumpHintAt = now + 520;
        setFeedback(distance > window.open ? "WAIT FOR THE HORNS" : "TOO LATE — MOVE!", 360, { color: "#d7b8ad" });
        audio.warning();
      }
      return;
    }
    bull.jumpAttempted = true;
    player.jumpType = JUMP_STYLE.id;
    player.jumpStartedAt = now;
    player.airborne = true;
    player.jumpHeight = 1;
    player.jumpVelocity = JUMP_STYLE.velocity + (difficultyId === "easy" ? 24 : 0);
    const direction = Math.sign(player.vx || joystick.x || 1);
    player.vx += direction * 58;
    stage.dataset.jump = JUMP_STYLE.id;
    jumpButton?.classList.remove("ready");
    jumpButton?.setAttribute("aria-disabled", "true");
    setFeedback(`${JUMP_STYLE.label}!`, 430, { color: JUMP_STYLE.color });
    audio.whoosh(.82);
    audio.good();
    haptic([22, 14, 34], { strength: .46 });
    burst("#d7b8ad", 9, player.x, player.y + 5);
  }

  function resolveDodge() {
    const outcome = state.scoreDodge(dodge.bull.minDistance, dodge.bull.jumped ? dodge.player.jumpType : null);
    const closeCall = outcome.kind === "close" || outcome.kind === "razor";
    const now = performance.now();
    const celebrationTypes = ["cape", "fist"];
    const celebrationType = celebrationTypes[(state.dodges + state.skillTier) % celebrationTypes.length];
    dodge.celebration = { startedAt: now, until: now + (closeCall ? 1180 : 760), type: celebrationType, level: outcome.kind === "razor" ? 2 : 1 };
    if (closeCall) {
      dodge.ole = { startedAt: now, until: now + (outcome.kind === "razor" ? 1180 : 880), level: outcome.kind === "razor" ? 2 : 1 };
      stage.dataset.ole = outcome.kind;
      setTimeout(() => { if (performance.now() >= dodge.ole.until) delete stage.dataset.ole; }, 1200);
    }
    if (outcome.multiplierUpgrade) {
      celebrateMultiplier(outcome.multiplierUpgrade, dodge.player.x, dodge.player.y - 40);
    } else {
      const cheer = streakCheer();
      const jumpName = outcome.jumpType ? JUMP_STYLE.label : "";
      const title = outcome.kind === "razor" ? "RAZOR OLÉ!" : outcome.kind === "close" ? "OLÉ!" : jumpName ? `${jumpName} CLEAR!` : "CLEAR!";
      const streak = cheer ? `${cheer}  ` : "";
      setFeedback(`${streak}${title} +${outcome.points} · ×${outcome.scoreMultiplier}`, cheer || closeCall ? 920 : 620, { big: outcome.kind === "razor" || Boolean(cheer), color: state.multiplierColor() });
      closeCall ? audio.perfect() : audio.good();
      if (cheer) audio.crowd(Math.min(5, 1 + Math.floor(state.combo / 5)));
      if (closeCall) playVoiceCue("ole", 1);
    }
    haptic(outcome.kind === "razor" ? [45, 24, 70] : closeCall ? [32, 22, 45] : 22);
    burst(state.multiplierColor(), outcome.kind === "razor" ? 42 : closeCall ? 30 : 18, dodge.player.x, dodge.player.y - 35);
    hud();
  }

  function updateMatador(dt) {
    const keyboardX = (heldDirections.has("right") ? 1 : 0) - (heldDirections.has("left") ? 1 : 0);
    const keyboardY = (heldDirections.has("down") ? 1 : 0) - (heldDirections.has("up") ? 1 : 0);
    let moveX = joystick.active ? joystick.x : keyboardX;
    let moveY = joystick.active ? joystick.y : keyboardY;
    const hitActive = performance.now() < dodge.hit.until;
    if (hitActive) { moveX = 0; moveY = 0; }
    const moveLength = Math.hypot(moveX, moveY);
    if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }
    const playerSpeed = difficultyId === "easy" ? 310 : 288;
    dodge.player.vx += (moveX * playerSpeed - dodge.player.vx) * Math.min(1, dt * 14);
    dodge.player.vy += (moveY * playerSpeed - dodge.player.vy) * Math.min(1, dt * 14);
    dodge.player.x += dodge.player.vx * dt;
    dodge.player.y += dodge.player.vy * dt;
    constrainPlayer();
    if (dodge.player.airborne) {
      dodge.player.jumpVelocity -= 1420 * dt;
      dodge.player.jumpHeight += dodge.player.jumpVelocity * dt;
      if (dodge.player.jumpHeight <= 0) {
        dodge.player.jumpHeight = 0;
        dodge.player.jumpVelocity = 0;
        dodge.player.airborne = false;
        dodge.player.landedAt = performance.now();
        dodge.player.jumpLockUntil = dodge.player.landedAt + 220;
        stage.dataset.jump = "landed";
        setTimeout(() => { if (!dodge.player.airborne) delete stage.dataset.jump; }, 240);
        burst("#d7b8ad", 12, dodge.player.x, dodge.player.y + 7);
        haptic(18, { strength: .28 });
      }
    }
    const jumpWindow = JUMP_WINDOW[difficultyId];
    const jumpDistance = Math.hypot(dodge.bull.x - dodge.player.x, dodge.bull.y - dodge.player.y);
    const jumpReady = !dodge.player.airborne && !hitActive && performance.now() >= dodge.player.jumpLockUntil
      && dodge.bull.phase === "charge" && !dodge.bull.jumpAttempted
      && jumpDistance <= jumpWindow.open && jumpDistance > jumpWindow.close;
    jumpButton?.classList.toggle("ready", jumpReady);
    jumpButton?.setAttribute("aria-disabled", String(!jumpReady));
    stage.dataset.jumpWindow = jumpReady ? "open" : "closed";
    stage.dataset.playerX = String(Math.round(dodge.player.x));
    stage.dataset.playerY = String(Math.round(dodge.player.y));

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

      if (playerDistance < 56 && dodge.player.airborne && dodge.player.jumpHeight > 36) {
        bull.jumped = true;
        if (!bull.jumpFlashed) {
          bull.jumpFlashed = true;
          stage.dataset.jump = "cleared";
          setFeedback("HORN CLEAR!", 360, { color: "#59d8ff" });
          flashes.push({ x: dodge.player.x, y: dodge.player.y - dodge.player.jumpHeight, life: .4 });
        }
      }

      if (playerDistance < 42 && !bull.hit && !(dodge.player.airborne && dodge.player.jumpHeight > 32)) {
        bull.hit = true;
        state.hits++;
        state.takeHit(34);
        const impactNow = performance.now();
        dodge.hit = { startedAt: impactNow, until: impactNow + 1320, angle: bull.angle, gameOver: state.balance <= 0 };
        dodge.celebration.until = 0;
        dodge.ole.until = 0;
        dodge.player.airborne = false;
        dodge.player.jumpHeight = 0;
        bull.phase = "impact";
        bull.timer = 1.32;
        setFeedback(state.balance <= 0 ? "RAGING BULL KNOCKOUT!" : "HORN HIT! RECOVER!", 980, { big: state.balance <= 0, color: "#ff625f" });
        stage.classList.add("shake");
        setTimeout(() => stage.classList.remove("shake"), 430);
        audio.miss();
        haptic([90, 40, 140]);
        burst("#ff625f", 42, dodge.player.x, dodge.player.y - 30);
        flashes.push({ x: dodge.player.x, y: dodge.player.y - 38, life: .65 });
        return;
      }

      if (bull.travel >= bull.maxTravel) {
        if (!bull.hit) resolveDodge();
        bull.phase = "recover";
        bull.timer = difficulty().recovery;
      }
      return;
    }

    bull.timer -= dt;
    if (bull.phase === "impact" && bull.timer <= 0) {
      if (dodge.hit.gameOver) finish();
      else spawnBull();
      return;
    }
    if (bull.timer <= 0) spawnBull();
  }

  function resetChase() {
    chase.player.x = 480;
    chase.player.y = 392;
    chase.player.vx = 0;
    chase.player.vy = 0;
    chase.player.facing = 1;
    chase.player.celebrateUntil = 0;
    chase.player.celebrationType = "rope";
    chase.lasso.active = false;
    chase.lasso.timer = 0;
    chase.lasso.cooldown = 0;
    chase.lasso.hit = false;
    resetJoystick();
    lassoButton.classList.remove("ready", "active");
    jumpButton?.classList.remove("ready", "active");
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
    if (modeId === "race") state.balance = 0;
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
      state.coolSkillProgress(.18);
    }
    if (perfect) state.perfectTaps++;
    const scoreMultiplier = state.modeMultiplier();
    const points = (perfect ? 75 : good ? 40 : 8) * scoreMultiplier;
    const heatGain = perfect ? 10 : good ? 4 : 0;
    const awardedHeat = race.player.boostTimer > 0 ? 0 : heatGain;
    state.score += points;
    const multiplierUpgrade = perfect || good ? state.addSkillProgress(perfect ? 1.25 : .65) : null;
    state.heat = Math.min(100, state.heat + awardedHeat);
    state.balance = race.player.cadence;
    race.player.lastGrade = grade;
    race.player.gradeUntil = now + 520;
    stage.dataset.timing = grade.toLowerCase();
    if (multiplierUpgrade) {
      celebrateMultiplier(multiplierUpgrade, 480, 280);
    } else if (perfect || good) {
      setFeedback(`${grade} +${points} · ×${scoreMultiplier}${awardedHeat ? ` · +${awardedHeat} HEAT` : ""}`, perfect ? 520 : 380, { color: state.multiplierColor() });
      audio.good();
      haptic(perfect ? [20, 14, 30] : 16);
    } else {
      setFeedback(`${grade} · FIND THE BEAT`, 350);
      audio.warning();
    }
    const streakCallout = streakCheer();
    if (streakCallout && !multiplierUpgrade) {
      const streakBonus = state.combo * 40 * state.modeMultiplier();
      state.score += streakBonus;
      const streakHeat = race.player.boostTimer > 0 ? 0 : Math.min(24, 8 + state.combo);
      state.heat = Math.min(100, state.heat + streakHeat);
      setFeedback(`${streakCallout} +${streakBonus} · ×${state.modeMultiplier()}${streakHeat ? ` · +${streakHeat} HEAT` : ""}`, 920, { big: state.combo >= 8, color: state.multiplierColor() });
      burst(state.multiplierColor(), 22 + Math.min(28, state.combo), 480, 280);
      audio.perfect();
      audio.crowd(Math.min(5, 1 + Math.floor(state.combo / 5)));
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
    const boostPoints = 500 * state.modeMultiplier();
    state.score += boostPoints;
    lassoButton.classList.remove("ready");
    lassoButton.classList.add("active");
    setFeedback(`FULL HEAT BOOST! +${boostPoints} · ×${state.modeMultiplier()}`, 900, { big: state.modeMultiplier() >= 4, color: state.multiplierColor() });
    burst("#ffc857", 38, 480, 270);
    flashes.push({ x: 480, y: 270, life: .45 });
    audio.whoosh(1.15);
    audio.perfect();
    haptic([55, 22, 85]);
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
      const outcome = state.scoreOvertake();
      player.overtakeCooldown = .7;
      if (outcome.multiplierUpgrade) celebrateMultiplier(outcome.multiplierUpgrade, 480, 250);
      else {
        const cheer = streakCheer();
        setFeedback(`${cheer ? `${cheer}  ` : ""}OVERTAKE +${outcome.points} · ×${outcome.scoreMultiplier}`, cheer ? 820 : 560, { color: state.multiplierColor() });
        audio.good();
      }
      burst(state.multiplierColor(), 18, 480, 250);
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
      state.score += [0, 3000, 1800, 1000, 500][place] * state.modeMultiplier();
      state.heat = Math.min(100, state.heat + (place === 1 ? 30 : 12));
      finish();
    }
  }

  function spawnCow(first = false) {
    const angle = first ? -.85 : Math.random() * Math.PI * 2;
    const radius = first ? .90 : .68 + Math.random() * .22;
    chase.cow.x = 480 + Math.cos(angle) * 285 * radius;
    chase.cow.y = 350 + Math.sin(angle) * 132 * radius;
    chase.cow.angle = Math.atan2(chase.cow.y - chase.player.y, chase.cow.x - chase.player.x);
    chase.cow.speed = difficulty().cowSpeed;
    chase.cow.timer = difficulty().cowTimer;
    chase.cow.turnTimer = .2 + Math.random() * .35;
    chase.cow.wander = (Math.random() - .5) * .7;
    chase.cow.phase = "run";
    chase.cow.phaseStartedAt = performance.now();
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
    audio.whoosh(.52);
    audio.rope();
    haptic(22);

    if (!inRange) {
      const gap = Math.max(0, Math.round(distance - difficulty().lassoRange));
      setFeedback(`GET ${gap} CLOSER`, 620);
      return;
    }

    const quickCatch = chase.cow.timer >= difficulty().cowTimer * .58;
    const outcome = state.scoreCatch(quickCatch, distance);
    stage.dataset.catches = String(state.catches);
    chase.cow.phase = "caught";
    chase.cow.phaseStartedAt = performance.now();
    chase.cow.timer = quickCatch ? 1.85 : 1.55;
    chase.player.celebrateUntil = performance.now() + chase.cow.timer * 1000;
    chase.player.celebrationType = state.combo >= 8 ? "twirl" : quickCatch ? "rope" : "salute";
    if (outcome.multiplierUpgrade) {
      celebrateMultiplier(outcome.multiplierUpgrade, chase.cow.x, chase.cow.y - 34);
    } else {
      const cheer = streakCheer();
      const action = quickCatch ? "QUICK CALF CATCH" : "ROPE 'EM";
      setFeedback(`${cheer ? `${cheer}  ` : ""}${action} +${outcome.points} · ×${outcome.scoreMultiplier}`, cheer ? 880 : 700, { big: Boolean(cheer), color: state.multiplierColor() });
      quickCatch ? audio.perfect() : audio.good();
      if (cheer) audio.crowd(Math.min(5, 1 + Math.floor(state.combo / 5)));
    }
    burst(state.multiplierColor(), quickCatch ? 30 : 22, chase.cow.x, chase.cow.y - 34);
    haptic(quickCatch ? [38, 22, 60] : [28, 20, 38]);
    hud();
  }

  function cowEscaped() {
    if (chase.cow.phase === "escaping") return;
    state.escapes++;
    stage.dataset.escapes = String(state.escapes);
    state.takeHit(difficulty().escapeDamage);
    chase.cow.phase = "escaping";
    chase.cow.phaseStartedAt = performance.now();
    chase.cow.timer = 1.25;
    chase.cow.angle = Math.atan2(chase.cow.y - chase.player.y, chase.cow.x - chase.player.x);
    setFeedback("ROLLING CALF BREAKS FREE!", 940, { color: "#ff625f" });
    stage.classList.add("shake");
    setTimeout(() => stage.classList.remove("shake"), 250);
    audio.miss();
    haptic([75, 35, 95]);
    burst("#ff625f", 18, chase.cow.x, chase.cow.y);
  }

  function updateCatch(dt) {
    const keyboardX = (heldDirections.has("right") ? 1 : 0) - (heldDirections.has("left") ? 1 : 0);
    const keyboardY = (heldDirections.has("down") ? 1 : 0) - (heldDirections.has("up") ? 1 : 0);
    let moveX = joystick.active ? joystick.x : keyboardX;
    let moveY = joystick.active ? joystick.y : keyboardY;
    const moveLength = Math.hypot(moveX, moveY);
    if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }
    const riderSpeed = difficultyId === "easy" ? 304 : 286;
    chase.player.vx += (moveX * riderSpeed - chase.player.vx) * Math.min(1, dt * 11);
    chase.player.vy += (moveY * riderSpeed - chase.player.vy) * Math.min(1, dt * 11);
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

    if (cow.phase === "escaping") {
      cow.timer -= dt;
      const escapeBoost = difficulty().cowSpeed * 1.85;
      cow.x += Math.cos(cow.angle) * escapeBoost * dt;
      cow.y += Math.sin(cow.angle) * escapeBoost * .72 * dt;
      directionAnnounce.textContent = "Rolling Calf escaped";
      if (cow.timer <= 0) {
        if (state.balance <= 0) finish();
        else spawnCow();
      }
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
    const chaseRamp = 1 + Math.min(.16, state.elapsed / 180 * .16);
    const playerGap = Math.hypot(cow.x - chase.player.x, cow.y - chase.player.y);
    const pressureSlowdown = playerGap < difficulty().lassoRange * 1.35 ? .72 : .86;
    cow.speed = difficulty().cowSpeed * chaseRamp * pressureSlowdown;
    cow.x += Math.cos(cow.angle) * cow.speed * dt;
    cow.y += Math.sin(cow.angle) * cow.speed * .72 * dt;
    if (constrainChaseEntity(cow, 304, 139)) {
      cow.angle = Math.atan2(350 - cow.y, 480 - cow.x) + (Math.random() - .5) * .8;
      cow.wander = 0;
    }

    const distance = Math.hypot(cow.x - chase.player.x, cow.y - chase.player.y);
    const ready = distance <= difficulty().lassoRange && chase.lasso.cooldown <= 0;
    lassoButton.classList.toggle("ready", ready);
    directionAnnounce.textContent = ready ? "Rolling Calf in lasso range" : "Close the gap";
    stage.dataset.playerX = String(Math.round(chase.player.x));
    stage.dataset.playerY = String(Math.round(chase.player.y));
    stage.dataset.cowX = String(Math.round(cow.x));
    stage.dataset.cowY = String(Math.round(cow.y));
    stage.dataset.lassoReady = String(ready);
    stage.dataset.catchDistance = String(Math.round(distance));
    stage.dataset.catches = String(state.catches);
    stage.dataset.escapes = String(state.escapes);
  }

  async function ensureSelectedAvatar() {
    const loaded = await Promise.all(MODE_ASSETS[modeId].map(loadAsset));
    return loaded.every(Boolean);
  }

  async function startCountUp() {
    if (counting || running) return;
    const token = ++countdownToken;
    counting = true;
    startButton.disabled = true;
    const previousButtonCopy = startButton.textContent;
    startButton.textContent = `Preparing ${mode().shortLabel}…`;
    const avatarReady = await ensureSelectedAvatar();
    if (token !== countdownToken) return;
    startButton.disabled = false;
    startButton.textContent = previousButtonCopy;
    if (!avatarReady) {
      counting = false;
      kickerEl.textContent = "Event still loading";
      titleEl.innerHTML = "SADDLE<br>UP";
      copyEl.hidden = false;
      copyEl.textContent = "The event art did not finish loading. Check your connection and tap again.";
      return;
    }
    document.querySelector("[data-grei-discovery]")?.remove();
    if (!arenaVideoFailed) arenaVideo?.play().catch(() => {});
    await audio.unlock();
    if (token !== countdownToken) return;
    modePicker.hidden = true;
    difficultyPicker.hidden = true;
    results.hidden = true;
    startButton.hidden = true;
    kickerEl.textContent = mode().label;
    copyEl.hidden = false;
    let count = 0;
    const finale = modeId === "ride" ? "RIDE!" : modeId === "matador" ? "RAGE!" : modeId === "catch" ? "ROLL!" : "RACE!";
    const finaleVoice = modeId === "ride" ? "start-ride" : modeId === "matador" ? "start-raging" : modeId === "catch" ? "start-calf" : "start-race";
    const cards = [["1", "", "one"], ["2", "", "two"], ["3", "", "three"], [finale, "", finaleVoice]];
    const tick = () => {
      if (token !== countdownToken) return;
      const [first, second, voiceLine] = cards[count];
      titleEl.innerHTML = first + (second ? `<br>${second}` : "");
      copyEl.textContent = count < 3
        ? "Hear the count. Feel the pulse."
        : modeId === "ride" ? "Stay smooth and keep riding." : modeId === "matador" ? "Face the Raging Bull." : modeId === "catch" ? "Track down the Rolling Calf." : "Tap to gallop. Fill Heat. Hit Boost.";
      audio.countdown(count);
      playVoiceCue(voiceLine, count < 3 ? .96 : 1);
      haptic(count < 3 ? 28 : [45, 20, 80]);
      count++;
      if (count < cards.length) setTimeout(tick, SONG_BEAT_SECONDS * 1000);
      else setTimeout(() => { if (token === countdownToken) begin(); }, SONG_BEAT_SECONDS * 1000);
    };
    tick();
  }

  function begin() {
    state.reset();
    resetDodge();
    resetChase();
    resetRace();
    heldDirections.clear();
    multiplierCelebration.until = 0;
    lassoButton.classList.remove("ready", "active");
    running = true;
    paused = false;
    counting = false;
    startedAt = Date.now();
    last = performance.now();
    nextBeatAt = difficulty().interval;
    rideRecoveryUntil = 0;
    rideReaction = { direction: "up", startedAt: 0, until: 0 };
    rideTransition = { phase: "mounted", startedAt: 0, fallUntil: 0, remountAt: 0, until: 0 };
    beatIndex = 0;
    feedback = "";
    particles = [];
    flashes = [];
    stage.classList.add("playing");
    document.body.classList.add("grei-game-playing");
    stage.dataset.mode = modeId;
    stage.dataset.rideAnimation = "mounted";
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
    delete stage.dataset.recovering;
    delete stage.dataset.rideMove;
    overlay.hidden = true;
    directionAnnounce.textContent = "";
    audio.begin();
    hud();
    requestAnimationFrame(loop);
  }

  function finish() {
    if (!running) return;
    running = false;
    countdownToken++;
    rideRecoveryUntil = 0;
    rideTransition.phase = "mounted";
    multiplierCelebration.until = 0;
    state.finished = true;
    heldDirections.clear();
    resetJoystick();
    lassoButton.classList.remove("ready", "active");
    jumpButton?.classList.remove("ready", "active");
    stage.classList.remove("playing");
    document.body.classList.remove("grei-game-playing");
    stage.dataset.direction = "";
    delete stage.dataset.recovering;
    delete stage.dataset.rideMove;
    delete stage.dataset.jump;
    delete stage.dataset.ole;
    directionAnnounce.textContent = "";
    audio.stop();
    best = Math.max(best, state.score);
    localStorage.setItem(bestKey(), String(best));

    overlay.hidden = false;
    modePicker.hidden = false;
    difficultyPicker.hidden = false;
    results.hidden = false;
    startButton.hidden = false;
    copyEl.hidden = false;
    kickerEl.textContent = modeId === "ride" ? "Thrown from the saddle" : modeId === "matador" ? "The Raging Bull caught you" : modeId === "catch" ? "The Rolling Calf broke free" : state.raceWon ? "First across the line" : `Finished in place ${state.racePlace}`;
    titleEl.innerHTML = modeId === "ride" ? "HOLD<br>TIGHT" : modeId === "matador" ? "OLÉ<br>AGAIN" : modeId === "catch" ? "ROPE<br>UP" : state.raceWon ? "TRACK<br>KING" : "RUN<br>AGAIN";
    copyEl.textContent = modeId === "ride"
      ? "Your rides are spent. Mount up again and beat your high score."
      : modeId === "matador"
        ? "One more sidestep and you had it. Get back in the arena."
        : modeId === "catch"
          ? "Tighten that loop, mount up, and secure the next Rolling Calf."
          : state.raceWon ? "You found the beat, fired the boost, and owned the final stretch." : "Tap with the beat, draft the leaders, and save a boost for the final lap.";

    const rank = modeId === "ride"
      ? state.score >= 10000 ? "Rodeo Royalty" : state.score >= 6000 ? "Wild Rider" : state.score >= 2500 ? "Rodeo Ready" : state.score >= 900 ? "Stable Hand" : "First Timer"
      : modeId === "matador"
        ? state.dodges >= 30 ? "Arena Royalty" : state.dodges >= 18 ? "Cape Master" : state.dodges >= 9 ? "Matador Ready" : state.dodges >= 3 ? "Quick Step" : "First Olé"
        : modeId === "catch"
          ? state.catches >= 25 ? "Rolling Calf Royalty" : state.catches >= 15 ? "Ranch Boss" : state.catches >= 8 ? "Calf Catcher" : state.catches >= 3 ? "Rope Ready" : "Greenhorn"
          : state.racePlace === 1 ? "Track Royalty" : state.racePlace === 2 ? "Photo Finish" : state.racePlace === 3 ? "Podium Rider" : "Trail Runner";
    const middleValue = modeId === "race" ? `#${state.racePlace}` : state.bestCombo;
    const middleLabel = modeId === "race" ? "Finish" : "Best streak";
    const lastValue = `×${state.bestMultiplier}`;
    const lastLabel = "Peak multiplier";
    results.innerHTML = `<div class="result-grid"><div class="result"><b>${state.score}</b><span>Score</span></div><div class="result"><b>${middleValue}</b><span>${middleLabel}</span></div><div class="result"><b>${lastValue}</b><span>${lastLabel}</span></div></div><p><strong>${rank}</strong> · ${Math.floor(state.elapsed)}s · ${difficulty().label} · Best ${best}</p><p class="score-sync" data-state="saving" role="status" aria-live="polite">Saving to the ${mode().shortLabel} · ${difficulty().label} board…</p>`;
    updateSelectionUI();
    submit();
  }

  function leaveCurrentRun() {
    countdownToken++;
    running = false;
    counting = false;
    rideRecoveryUntil = 0;
    heldDirections.clear();
    resetJoystick();
    lassoButton.classList.remove("ready", "active");
    jumpButton?.classList.remove("ready", "active");
    stage.classList.remove("playing", "shake", "heat");
    document.body.classList.remove("grei-game-playing");
    stage.dataset.direction = "";
    delete stage.dataset.recovering;
    directionAnnounce.textContent = "";
    audio.stop();
    if (window.greiIsPaused?.()) document.querySelector("[data-grei-pause]")?.click();
    paused = false;
  }

  function returnToEvents() {
    leaveCurrentRun();
    overlay.hidden = false;
    showSelection();
  }

  function restartCurrentEvent() {
    leaveCurrentRun();
    overlay.hidden = false;
    showSelection();
    startCountUp();
  }

  function configureGameMenu() {
    const shellPauseButton = document.querySelector("[data-grei-pause]");
    const pauseCard = document.querySelector(".grei-pause-screen > div");
    if (!shellPauseButton || !pauseCard || !gameMenuButton) return;
    pauseCard.classList.add("rodeo-pause-card");
    pauseCard.innerHTML = `
      <div class="rodeo-pause-view" data-rodeo-pause-main>
        <p class="rodeo-pause-kicker">Rodeo menu</p>
        <h2>PAUSED</h2>
        <p>Continue, restart, learn the event, or head back to the arena menu.</p>
        <div class="rodeo-pause-actions">
          <button type="button" data-rodeo-resume>Continue</button>
          <button type="button" data-rodeo-help>How to play</button>
          <button type="button" data-rodeo-restart>Restart event</button>
          <button type="button" data-rodeo-events>Choose event</button>
        </div>
      </div>
      <div class="rodeo-pause-view" data-rodeo-help-view hidden>
        <p class="rodeo-pause-kicker">How to play</p>
        <div class="rodeo-howto" data-rodeo-howto></div>
        <button type="button" data-rodeo-back>Back</button>
      </div>`;
    const pauseMain = pauseCard.querySelector("[data-rodeo-pause-main]");
    const helpView = pauseCard.querySelector("[data-rodeo-help-view]");
    const howTo = pauseCard.querySelector("[data-rodeo-howto]");
    const renderHowTo = () => {
      const guide = HOW_TO_PLAY[modeId];
      howTo.innerHTML = `
        <h3>${mode().label}</h3>
        <ol>${guide.steps.map(step => `<li>${step}</li>`).join("")}</ol>
        <div class="rodeo-meter-guide">${guide.meters.map(([name, purpose]) => `<div><strong>${name}</strong>${purpose}</div>`).join("")}</div>`;
    };
    const showPauseMain = () => {
      pauseMain.hidden = false;
      helpView.hidden = true;
    };
    const showHelp = () => {
      renderHowTo();
      pauseMain.hidden = true;
      helpView.hidden = false;
      pauseCard.querySelector("[data-rodeo-back]")?.focus();
    };
    pauseCard.addEventListener("click", event => event.stopPropagation());
    pauseCard.querySelector("[data-rodeo-resume]")?.addEventListener("click", () => {
      if (window.greiIsPaused?.()) shellPauseButton.click();
    });
    pauseCard.querySelector("[data-rodeo-help]")?.addEventListener("click", showHelp);
    pauseCard.querySelector("[data-rodeo-back]")?.addEventListener("click", showPauseMain);
    pauseCard.querySelector("[data-rodeo-restart]")?.addEventListener("click", restartCurrentEvent);
    pauseCard.querySelector("[data-rodeo-events]")?.addEventListener("click", returnToEvents);
    gameMenuButton.addEventListener("click", () => {
      if (running && !window.greiIsPaused?.()) {
        showPauseMain();
        renderHowTo();
        shellPauseButton.click();
      }
    });
    addEventListener("grei:pause", event => { if (event.detail.paused) { showPauseMain(); renderHowTo(); } });
  }

  async function submit() {
    const name = (localStorage.getItem("grei_arcade_player_name") || "Rider").slice(0, 18);
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const level = mode().levelBase + difficulty().level;
    const status = results.querySelector(".score-sync");
    try {
      const response = await fetch(`${API}/api/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: GAME_ID, name, score: state.score, level, duration })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Leaderboard unavailable");
      if (status) {
        status.dataset.state = "saved";
        status.textContent = `${data.improved ? "New online best" : "Online best kept"} · Rank #${data.rank} on ${mode().shortLabel} ${difficulty().label}`;
      }
    } catch {
      if (status) {
        status.dataset.state = "local";
        status.textContent = "Best saved on this phone · online leaderboard unavailable";
      }
    }
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
      if (rideRecoveryUntil > now) {
        const seconds = Math.max(1, Math.ceil((rideRecoveryUntil - now) / 1000));
        stage.dataset.recovering = "true";
        directionAnnounce.textContent = `Recovering. ${seconds}`;
        hud();
        return;
      }
      if (rideRecoveryUntil) {
        rideRecoveryUntil = 0;
        rideTransition = { phase: "mounted", startedAt: 0, fallUntil: 0, remountAt: 0, until: 0 };
        stage.dataset.rideAnimation = "mounted";
        delete stage.dataset.recovering;
        directionAnnounce.textContent = "Back in the saddle";
        setFeedback("YEEHAW! BACK IN THE SADDLE", 900);
        burst("#ffc857", 24, 480, 285);
        bullKick = 1.65;
        riderPitch = -1;
        audio.good();
        haptic([32, 18, 52]);
      }
      while (state.elapsed >= nextBeatAt && running) {
        rideBeat(now);
        if (rideRecoveryUntil > now) break;
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
    const animatedArenaReady = !arenaVideoFailed && arenaVideo?.readyState >= 2;
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
    const rideHeatGlow = modeId === "ride" ? state.rideTier / RIDE_HEAT_TARGETS.length : state.heat >= 100 ? 1 : 0;
    if (rideHeatGlow > 0) {
      ctx.fillStyle = `rgba(255,98,95,${.022 + rideHeatGlow * .055 + Math.sin(now / 130) * .012})`;
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

  function spriteFrame(image, index, x, y, width, height, frameCount = ANIMATION_FRAMES) {
    if (!image.complete || !image.naturalWidth) return false;
    const frameWidth = image.naturalWidth / frameCount;
    const frame = ((Math.floor(index) % frameCount) + frameCount) % frameCount;
    ctx.drawImage(image, frame * frameWidth, 0, frameWidth, image.naturalHeight, x, y, width, height);
    return true;
  }

  function cycleFrame(now, fps, phase = 0, frameCount = ANIMATION_FRAMES) {
    return Math.floor(now / 1000 * fps + phase) % frameCount;
  }

  function drawDetailedRideTransition(now) {
    if (rideTransition.phase !== "fall" || now >= rideTransition.until || !rideFallAnimation.complete || !rideFallAnimation.naturalWidth) return false;
    const falling = now < rideTransition.fallUntil;
    const waiting = !falling && now < rideTransition.remountAt;
    let frame = 0;
    let x = 480;
    let y = 408;
    let rotation = 0;
    let scale = 1;
    let alpha = 1;

    if (falling) {
      const progress = Math.min(1, (now - rideTransition.startedAt) / Math.max(1, rideTransition.fallUntil - rideTransition.startedAt));
      frame = Math.min(3, Math.floor(progress * 4));
      x = 480 + progress * 176;
      y = 398 - Math.sin(progress * Math.PI) * 126 + progress * 28;
      rotation = progress < .52 ? progress * .34 : .18 - (progress - .52) * .34;
      scale = 1 - progress * .08;
      stage.dataset.rideAnimation = ["thrown", "tumble", "brace", "roll"][frame];

      if (progress < .22 && rideAnimation.complete && rideAnimation.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 1 - progress / .22;
        ctx.translate(480 - progress * 34, 405);
        ctx.rotate(-progress * .16);
        spriteFrame(rideAnimation, RIDE_DIRECTION_FRAMES.down, -195, -390, 390, 390, RIDE_ANIMATION_FRAMES);
        ctx.restore();
      }
    } else if (waiting) {
      const waitSpan = Math.max(1, rideTransition.remountAt - rideTransition.fallUntil);
      const progress = Math.min(1, (now - rideTransition.fallUntil) / waitSpan);
      frame = progress < .36 ? 3 : 4;
      x = 650 - Math.min(1, progress * 1.3) * 38;
      y = frame === 3 ? 428 : 413;
      scale = .92;
      stage.dataset.rideAnimation = frame === 3 ? "down" : "recovering";
    } else {
      const progress = Math.min(1, (now - rideTransition.remountAt) / Math.max(1, rideTransition.until - rideTransition.remountAt));
      if (progress < .24) {
        frame = 4;
        x = 612;
        y = 413 - progress * 20;
        rotation = -.08 * (1 - progress / .24);
        stage.dataset.rideAnimation = "stand-up";
      } else if (progress < .62) {
        const run = (progress - .24) / .38;
        frame = 5;
        x = 612 - run * 102;
        y = 408 - Math.abs(Math.sin(run * Math.PI * 4)) * 13;
        rotation = -.08 + Math.sin(run * Math.PI * 4) * .035;
        stage.dataset.rideAnimation = "run-to-bull";
      } else {
        const leap = (progress - .62) / .38;
        frame = 5;
        x = 510 - leap * 30;
        y = 402 - Math.sin(leap * Math.PI) * 96 - leap * 18;
        rotation = -.12 + leap * .12;
        scale = .94 + leap * .06;
        alpha = leap > .72 ? 1 - (leap - .72) / .28 : 1;
        stage.dataset.rideAnimation = leap < .72 ? "leap-to-saddle" : "saddle-settle";
      }

      if (progress > .62 && rideAnimation.complete && rideAnimation.naturalWidth) {
        const mountedAlpha = Math.min(1, (progress - .62) / .38);
        const settle = Math.sin(mountedAlpha * Math.PI) * 16;
        ctx.save();
        ctx.globalAlpha = mountedAlpha;
        ctx.translate(480, 405 - settle);
        ctx.rotate(Math.sin(mountedAlpha * Math.PI * 2) * .025);
        ctx.scale(.88 + mountedAlpha * .12, .88 + mountedAlpha * .12);
        const remountFrame = mountedAlpha < .48 ? RIDE_DIRECTION_FRAMES.up : RIDE_IDLE_FRAMES[0];
        spriteFrame(rideAnimation, remountFrame, -195, -390, 390, 390, RIDE_ANIMATION_FRAMES);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${.3 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, 430, (frame === 3 ? 76 : 50) * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.shadowColor = "rgba(255,98,95,.38)";
    ctx.shadowBlur = 14;
    spriteFrame(rideFallAnimation, frame, -136, -246, 272, 272, RIDE_FALL_FRAMES);
    ctx.restore();
    return true;
  }

  function drawRide(now) {
    if (drawDetailedRideTransition(now)) return;
    const t = now / 1000;
    const reactionActive = now < rideReaction.until && rideTransition.phase === "mounted";
    const reactionDuration = Math.max(1, rideReaction.until - rideReaction.startedAt);
    const reactionProgress = reactionActive ? Math.min(1, (now - rideReaction.startedAt) / reactionDuration) : 0;
    const reactionStrength = reactionActive ? Math.sin(reactionProgress * Math.PI) : 0;
    const direction = reactionActive ? rideReaction.direction : bullDirection;
    const idleIndex = Math.floor(now / (running ? 235 : 320)) % RIDE_IDLE_FRAMES.length;
    let frame = reactionActive ? RIDE_DIRECTION_FRAMES[direction] : RIDE_IDLE_FRAMES[idleIndex];
    let x = reactionActive ? ({ left: -28, right: 28, up: 0, down: 0 }[direction] || 0) * reactionStrength : 0;
    let y = reactionActive ? ({ up: -24, down: 18, left: 2, right: 2 }[direction] || 0) * reactionStrength : 0;
    let roll = Math.sin(t * 17) * bullKick * .035 + riderLean * .025;
    let scale = 1;
    let alpha = 1;
    let shadowAlpha = .34;
    if (reactionActive) roll += ({ left: -.12, right: .12, up: -.035, down: .045 }[direction] || 0) * reactionStrength;
    const promotionActive = modeId === "ride" && now < multiplierCelebration.until && rideTransition.phase === "mounted";
    if (promotionActive) {
      const promotionProgress = Math.min(1, (now - multiplierCelebration.startedAt) / Math.max(1, multiplierCelebration.until - multiplierCelebration.startedAt));
      const performance = Math.sin(promotionProgress * Math.PI);
      const tierFrames = [0, RIDE_DIRECTION_FRAMES.left, RIDE_DIRECTION_FRAMES.right, RIDE_DIRECTION_FRAMES.up, RIDE_DIRECTION_FRAMES.down, RIDE_IDLE_FRAMES[7]];
      frame = tierFrames[multiplierCelebration.tier] || RIDE_IDLE_FRAMES[0];
      y -= performance * (16 + multiplierCelebration.tier * 5);
      x += Math.sin(promotionProgress * Math.PI * (2 + multiplierCelebration.tier)) * (5 + multiplierCelebration.tier * 2);
      roll += Math.sin(promotionProgress * Math.PI * 2) * (.025 + multiplierCelebration.tier * .009);
      scale += performance * (.025 + multiplierCelebration.tier * .006);
      stage.dataset.rideAnimation = `celebrate-${multiplierCelebration.multiplier}`;
    }

    if (rideTransition.phase === "fall" && now < rideTransition.until) {
      if (now < rideTransition.fallUntil) {
        const progress = Math.min(1, (now - rideTransition.startedAt) / Math.max(1, rideTransition.fallUntil - rideTransition.startedAt));
        frame = progress < .48 ? RIDE_DIRECTION_FRAMES.down : RIDE_DIRECTION_FRAMES.right;
        x += progress * 205;
        y += -Math.sin(progress * Math.PI) * 132 + progress * 84;
        roll += progress * .82;
        scale = 1 - progress * .13;
        alpha = 1 - progress * .6;
        shadowAlpha *= 1 - progress * .7;
        stage.dataset.rideAnimation = "fall";
      } else if (now < rideTransition.remountAt) {
        frame = RIDE_DIRECTION_FRAMES.right;
        x = 205;
        y = 84;
        roll = .82;
        scale = .87;
        alpha = .06;
        shadowAlpha = .08;
        stage.dataset.rideAnimation = "off";
      } else {
        const progress = Math.min(1, (now - rideTransition.remountAt) / Math.max(1, rideTransition.until - rideTransition.remountAt));
        const eased = 1 - Math.pow(1 - progress, 3);
        frame = progress < .55 ? RIDE_DIRECTION_FRAMES.up : RIDE_IDLE_FRAMES[0];
        x = -176 * (1 - eased);
        y = -112 * (1 - eased) - Math.sin(progress * Math.PI) * 24;
        roll = -.38 * (1 - eased);
        scale = .8 + eased * .2;
        alpha = .3 + eased * .7;
        shadowAlpha = .12 + eased * .22;
        stage.dataset.rideAnimation = "remount";
      }
    } else if (!promotionActive) {
      stage.dataset.rideAnimation = reactionActive ? direction : "mounted";
    }

    if (rideAnimation.complete && rideAnimation.naturalWidth) {
      const pivotCanvasX = 480;
      const pivotCanvasY = 405;

      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(480 + x * .2, 433, 154 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, 430);
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.translate(pivotCanvasX + x, pivotCanvasY + y + riderPitch * 2);
      ctx.rotate(roll);
      ctx.scale(scale, scale);
      const heatStrength = state.rideTier / RIDE_HEAT_TARGETS.length;
      ctx.shadowColor = heatStrength > 0 ? `rgba(255,200,87,${.32 + heatStrength * .42})` : "rgba(255,98,95,.30)";
      ctx.shadowBlur = heatStrength > 0 ? 16 + heatStrength * 24 : 13;
      spriteFrame(rideAnimation, frame, -195, -390, 390, 390, RIDE_ANIMATION_FRAMES);
      ctx.restore();
      return;
    }

    // The run waits for the approved cowgirl art; never draw a polygon replacement.
  }

  function drawRidePrompt(now) {
    if (!running || counting || modeId !== "ride") return;
    if (rideRecoveryUntil > now) {
      const seconds = Math.max(1, Math.ceil((rideRecoveryUntil - now) / 1000));
      const recoveryLabel = now < rideTransition.fallUntil ? "THROWN" : now >= rideTransition.remountAt ? "MOUNT UP" : "RESET";
      ctx.save();
      ctx.translate(700, 270);
      ctx.fillStyle = "rgba(34,13,14,.92)";
      ctx.shadowColor = "#ffc857";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffc857";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 61, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 48px system-ui";
      ctx.fillText(seconds, 0, -3);
      ctx.fillStyle = "#ffc857";
      ctx.font = "900 10px system-ui";
      ctx.fillText(recoveryLabel, 0, 82);
      ctx.restore();
      return;
    }
    if (!state.prompt) return;
    const remaining = Math.max(0, (state.prompt.expires - now) / (state.prompt.expires - state.prompt.born));
    const pulse = 1 + Math.sin(now / 70) * .035;
    ctx.save();
    ctx.translate(700, 270);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(34,13,14,.9)";
    ctx.shadowColor = state.rideTier > 0 ? state.multiplierColor() : "#ff625f";
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
    ctx.strokeStyle = state.rideTier > 0 ? state.multiplierColor() : "#ff625f";
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

  function drawMatadora(now = performance.now()) {
    const player = dodge.player;
    const hitActive = now < dodge.hit.until;
    if (hitActive && ragingBullHitAnimation.complete && ragingBullHitAnimation.naturalWidth) {
      const progress = Math.min(1, (now - dodge.hit.startedAt) / Math.max(1, dodge.hit.until - dodge.hit.startedAt));
      const frame = Math.min(EVENT_ANIMATION_FRAMES - 1, Math.floor(progress * EVENT_ANIMATION_FRAMES));
      const push = Math.sin(progress * Math.PI) * 54 + progress * 72;
      const impactX = player.x + Math.cos(dodge.hit.angle) * push;
      const impactY = player.y + Math.sin(dodge.hit.angle) * push * .35 - Math.sin(progress * Math.PI) * 34;
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${.28 - Math.sin(progress * Math.PI) * .12})`;
      ctx.beginPath();
      ctx.ellipse(impactX, player.y + 12, 46 + (frame === 3 ? 22 : 0), 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(impactX, impactY);
      ctx.rotate(Math.sin(progress * Math.PI) * Math.sign(Math.cos(dodge.hit.angle) || 1) * .18);
      ctx.shadowColor = "rgba(255,98,95,.58)";
      ctx.shadowBlur = frame < 3 ? 20 : 9;
      spriteFrame(ragingBullHitAnimation, frame, -112, -198, 224, 224, EVENT_ANIMATION_FRAMES);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    const jumpRatio = Math.min(1, player.jumpHeight / 64);
    ctx.fillStyle = `rgba(0,0,0,${.32 - jumpRatio * .17})`;
    ctx.beginPath();
    ctx.ellipse(0, 10, 42 - jumpRatio * 13, 12 - jumpRatio * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(player.x, player.y - player.jumpHeight);
    const motion = Math.min(1, Math.hypot(player.vx, player.vy) / 260);
    const footfall = player.airborne ? 0 : Math.sin(now / 54) * motion;
    ctx.translate(0, footfall * 2.5);
    ctx.scale(1 + Math.abs(footfall) * .018, 1 - Math.abs(footfall) * .012);
    const justLanded = now - player.landedAt < 220;
    const oleActive = now < dodge.ole.until;
    const oleProgress = oleActive ? Math.min(1, (now - dodge.ole.startedAt) / Math.max(1, dodge.ole.until - dodge.ole.startedAt)) : 0;
    const celebrationActive = now < dodge.celebration.until;
    const groundedLean = player.airborne ? 0 : player.vx / 265 * .045;
    const capeLean = !player.airborne && oleActive ? Math.sin(oleProgress * Math.PI * 2) * .045 : 0;
    ctx.rotate(groundedLean + capeLean);
    if (justLanded) {
      const landing = Math.max(0, 1 - (now - player.landedAt) / 220);
      ctx.scale(1 + landing * .07, 1 - landing * .09);
    }
    if (oleActive) {
      const sweep = oleProgress * Math.PI * 1.7;
      for (let trail = 0; trail < 3; trail++) {
        ctx.strokeStyle = `rgba(255,98,95,${.34 - trail * .08})`;
        ctx.lineWidth = 16 - trail * 4;
        ctx.beginPath();
        ctx.arc(-8, -62, 56 + trail * 9, Math.PI * .6 + sweep - trail * .12, Math.PI * 1.45 + sweep - trail * .12);
        ctx.stroke();
      }
    }
    const moving = Math.hypot(player.vx, player.vy) > 18;
    const matadoraFrame = player.airborne
      ? player.jumpVelocity > 120 ? 1 : player.jumpVelocity > -135 ? 6 : 5
      : justLanded ? 5
        : celebrationActive ? dodge.celebration.type === "fist" ? 7 : 6
          : oleActive ? (dodge.ole.level > 1 && oleProgress > .52 ? 7 : 6)
          : moving ? cycleFrame(now, 18, 0, DODGE_ANIMATION_FRAMES) : 0;
    spriteFrame(matadoraAnimation, matadoraFrame, -72, -154, 144, 192, DODGE_ANIMATION_FRAMES);
    ctx.restore();
  }

  function drawOleFlourish(now) {
    if (now >= dodge.ole.until) return;
    const progress = Math.min(1, (now - dodge.ole.startedAt) / Math.max(1, dodge.ole.until - dodge.ole.startedAt));
    const strength = Math.sin(progress * Math.PI);
    const color = state.multiplierColor();
    ctx.save();
    ctx.translate(dodge.player.x, dodge.player.y - 88);
    ctx.globalAlpha = strength;
    ctx.strokeStyle = color;
    ctx.lineWidth = dodge.ole.level > 1 ? 7 : 4;
    ctx.setLineDash([18, 10]);
    ctx.lineDashOffset = -now / 18;
    ctx.beginPath();
    ctx.arc(0, 0, 82 + progress * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.font = `italic 900 ${dodge.ole.level > 1 ? 34 : 25}px Impact, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 10;
    ctx.fillText(dodge.ole.level > 1 ? "¡OLÉ!" : "OLÉ", 0, -88 - progress * 20);
    ctx.restore();
  }

  function drawDodgeCelebration(now) {
    if (now >= dodge.celebration.until) return;
    const progress = Math.min(1, (now - dodge.celebration.startedAt) / Math.max(1, dodge.celebration.until - dodge.celebration.startedAt));
    const strength = Math.sin(progress * Math.PI);
    const color = state.multiplierColor();
    ctx.save();
    ctx.translate(dodge.player.x, dodge.player.y - 66);
    ctx.globalAlpha = strength * .9;
    if (dodge.celebration.type === "cape") {
      ctx.strokeStyle = "#ff625f";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-12, 5, 70 + progress * 18, Math.PI * .55, Math.PI * 1.58 + progress * .55);
      ctx.stroke();
      ctx.strokeStyle = "#ffc857";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      for (let ray = 0; ray < 10; ray++) {
        ctx.save();
        ctx.rotate(ray / 10 * Math.PI * 2 + progress);
        ctx.fillRect(58, -3, 18 + strength * 18, 6);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawChargingBull() {
    const bull = dodge.bull;
    ctx.save();
    ctx.translate(bull.x, bull.y);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 62, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const stride = bull.phase === "charge" ? Math.sin(performance.now() / 58) : 0;
    ctx.translate(0, stride * 1.6);
    ctx.scale((bull.facing || 1) * (1 + stride * .012), 1 - stride * .008);
    const bullFrame = bull.phase === "charge"
      ? cycleFrame(performance.now(), 16, 0, BULL_ANIMATION_FRAMES)
      : bull.phase === "recover" ? 3 : 0;
    if (spriteFrame(chargingBullAnimation, bullFrame, -106, -153, 212, 212, BULL_ANIMATION_FRAMES)) {
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
    drawDodgeCelebration(now);
    drawOleFlourish(now);

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
    const celebrating = now < player.celebrateUntil;
    const celebrationProgress = celebrating ? Math.min(1, (player.celebrateUntil - now) / 1850) : 0;
    const gallop = celebrating ? -Math.sin(now / 90) * 5 : running && (Math.abs(player.vx) + Math.abs(player.vy) > 10) ? Math.sin(now / 72) * 3 : 0;
    ctx.save();
    const chaseSpeed = Math.min(1, Math.hypot(player.vx, player.vy) / 290);
    const stride = Math.sin(now / 58) * chaseSpeed;
    ctx.translate(player.x, player.y + gallop + stride * 2.8);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath();
    ctx.ellipse(0, 48, 78, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(player.facing * (1 + Math.abs(stride) * .018), 1 - Math.abs(stride) * .012);
    ctx.rotate(player.vy / 274 * .028 + player.vx / 310 * .018 + (celebrating && player.celebrationType === "twirl" ? Math.sin(now / 90) * .045 : 0));
    const gallopFrame = celebrating
      ? player.celebrationType === "twirl" ? 2 + cycleFrame(now, 10, 0, 2)
        : player.celebrationType === "salute" ? 0
          : 1 + cycleFrame(now, 9, 0, 3)
      : running ? cycleFrame(now, difficultyId === "easy" ? 12 : 18, 0, HORSEBACK_ANIMATION_FRAMES) : 0;
    if (spriteFrame(horsebackRiderAnimation, gallopFrame, -123, -248, 246, 328, HORSEBACK_ANIMATION_FRAMES)) {
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
    if (celebrating) {
      ctx.save();
      ctx.scale(player.facing, 1);
      ctx.globalAlpha = .4 + celebrationProgress * .45;
      ctx.strokeStyle = state.multiplierColor();
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -now / 18;
      ctx.beginPath();
      ctx.arc(0, -100, 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRunawayCow(now) {
    const cow = chase.cow;
    const facing = Math.cos(cow.angle) >= 0 ? 1 : -1;
    const bob = cow.phase === "run" || cow.phase === "escaping" ? Math.sin(now / 63) * 3 : 0;
    ctx.save();
    ctx.translate(cow.x, cow.y + bob);
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.beginPath();
    ctx.ellipse(0, 33, 49, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    const runStride = cow.phase === "run" || cow.phase === "escaping" ? Math.sin(now / 48) : 0;
    ctx.scale(facing * (1 + Math.abs(runStride) * .022), 1 - Math.abs(runStride) * .016);
    ctx.rotate(Math.sin(cow.angle) * .025);
    const eventElapsed = Math.max(0, now - cow.phaseStartedAt);
    const eventFrame = cow.phase === "caught"
      ? Math.min(3, 1 + Math.floor(eventElapsed / 410))
      : cow.phase === "escaping" ? Math.min(5, 4 + Math.floor(eventElapsed / 340)) : -1;
    const cowFrame = cycleFrame(now, difficultyId === "easy" ? 14 : 20, 0, CHASE_ANIMATION_FRAMES);
    if (eventFrame >= 0 && spriteFrame(rollingCalfEventsAnimation, eventFrame, -92, -132, 184, 184, EVENT_ANIMATION_FRAMES)) {
      // Dedicated rope-down and escape animation strip.
    } else if (spriteFrame(runawayCowAnimation, cowFrame, -88, -132, 176, 235, CHASE_ANIMATION_FRAMES)) {
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
    if (cow.phase === "caught" && eventFrame < 0) {
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

    if (cow.phase === "run") {
      const rangeProgress = Math.max(0, Math.min(1, 1 - (distance - difficulty().lassoRange) / 230));
      ctx.save();
      ctx.setLineDash([7, 9]);
      ctx.strokeStyle = ready ? "rgba(255,200,87,.78)" : `rgba(255,246,236,${.12 + rangeProgress * .28})`;
      ctx.lineWidth = ready ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 36);
      ctx.lineTo(cow.x, cow.y - 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

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
      ctx.fillText("LOCKED · LASSO!", 0, -47);
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

  function drawRollingCalfMoment(now) {
    const cow = chase.cow;
    if (cow.phase !== "caught" && cow.phase !== "escaping") return;
    const elapsed = Math.max(0, now - cow.phaseStartedAt);
    const progress = Math.min(1, elapsed / (cow.phase === "caught" ? 1500 : 1100));
    const strength = Math.sin(progress * Math.PI);
    ctx.save();
    ctx.translate(cow.x, cow.y - 56);
    ctx.globalAlpha = Math.max(.18, strength);
    ctx.strokeStyle = cow.phase === "caught" ? state.multiplierColor() : "#ff625f";
    ctx.lineWidth = 5;
    for (let ring = 0; ring < 2; ring++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 62 + ring * 18 + progress * 15, 34 + ring * 10, progress * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = cow.phase === "caught" ? state.multiplierColor() : "#ff625f";
    ctx.textAlign = "center";
    ctx.font = "italic 900 20px Impact, sans-serif";
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 8;
    ctx.fillText(cow.phase === "caught" ? "CALF SECURED!" : "BROKE FREE!", 0, -65 - strength * 14);
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
    drawRollingCalfMoment(now);

    const remaining = chase.cow.phase === "run" ? Math.max(0, chase.cow.timer / difficulty().cowTimer) : 1;
    const catchDistance = Math.hypot(chase.cow.x - chase.player.x, chase.cow.y - chase.player.y);
    const catchReady = chase.cow.phase === "run" && catchDistance <= difficulty().lassoRange && chase.lasso.cooldown <= 0;
    ctx.fillStyle = "rgba(8,7,12,.72)";
    ctx.beginPath();
    ctx.roundRect(366, 71, 228, 45, 12);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.textAlign = "center";
    ctx.font = "italic 900 12px Impact, sans-serif";
    const chaseCallout = chase.cow.phase === "caught" ? "ROLLING CALF SECURED!"
      : chase.cow.phase === "escaping" ? "CALF BREAKING FREE!"
        : catchReady ? "LOCKED · THROW LASSO" : `CHASE · ${Math.round(catchDistance)} AWAY`;
    ctx.fillText(chaseCallout, 480, 87);
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
    const facing = -Math.sin(point.angle) >= 0 ? 1 : -1;
    ctx.save();
    const horseSpeed = player ? race.player.speed : difficulty().rivalSpeed;
    const stride = Math.sin(now / Math.max(38, 70 - horseSpeed / 9));
    ctx.translate(point.x, point.y + stride * (player ? 3.2 : 2.3));
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
    ctx.rotate(Math.cos(point.angle) * .035 + stride * .012);
    ctx.scale(facing * (1 + Math.abs(stride) * .022), 1 - Math.abs(stride) * .016);
    const frame = cycleFrame(now, Math.max(7, (player ? race.player.speed : difficulty().rivalSpeed) / 19), 0, RACE_GALLOP_FRAMES);
    if (!spriteFrame(horsebackRiderAnimation, frame, -70 * scale, -114 * scale, 140 * scale, 140 * scale, RACE_GALLOP_FRAMES)) {
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
    const statusLabel = modeId === "ride" ? "BALANCE" : modeId === "matador" ? "NERVE" : modeId === "catch" ? "GRIT" : "GALLOP";
    const statusPurpose = modeId === "ride" ? "STAY MOUNTED" : modeId === "matador" ? "SURVIVAL" : modeId === "catch" ? "CHASE STAMINA" : "CURRENT SPEED";
    ctx.fillStyle = "rgba(8,7,12,.68)";
    ctx.beginPath();
    ctx.roundRect(18, 18, 220, 53, 10);
    ctx.fill();
    ctx.fillStyle = "#ffc857";
    ctx.font = "800 10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(statusLabel, 29, 34);
    if (modeId === "ride") {
      ctx.fillStyle = state.lives > 1 ? "#ffc857" : "#ff625f";
      ctx.textAlign = "right";
      ctx.font = "900 10px system-ui";
      ctx.fillText(`♥ × ${state.lives}`, 227, 34);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#fff6ec";
      ctx.textAlign = "right";
      ctx.font = "900 10px system-ui";
      ctx.fillText(`${Math.round(state.balance)}%`, 227, 34);
      ctx.textAlign = "left";
    }
    ctx.fillStyle = "rgba(255,246,236,.72)";
    ctx.font = "800 8px system-ui";
    ctx.fillText(statusPurpose, 29, 48);
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(29, 55, 198, 7);
    const balanceGradient = ctx.createLinearGradient(29, 0, 227, 0);
    balanceGradient.addColorStop(0, "#ff625f");
    balanceGradient.addColorStop(.55, "#ffc857");
    balanceGradient.addColorStop(1, "#fef5e7");
    ctx.fillStyle = balanceGradient;
    ctx.fillRect(29, 55, 198 * state.balance / 100, 7);

    ctx.fillStyle = "rgba(8,7,12,.68)";
    ctx.beginPath();
    ctx.roundRect(792, 18, 150, 54, 10);
    ctx.fill();
    const multiplier = state.modeMultiplier();
    const tierIndex = modeId === "ride" ? state.rideTier : state.skillTier;
    ctx.fillStyle = state.multiplierColor(tierIndex);
    ctx.font = "italic 900 18px Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = state.multiplierColor(tierIndex);
    ctx.shadowBlur = tierIndex > 0 ? 11 : 0;
    ctx.fillText(`×${multiplier} SCORE`, 867, 40);
    ctx.shadowBlur = 0;
    for (let index = 0; index < 5; index++) {
      ctx.fillStyle = index < tierIndex ? MULTIPLIER_COLORS[index + 1] : "rgba(255,255,255,.14)";
      ctx.fillRect(817 + index * 20, 55, 15, 4);
    }
  }

  function drawMultiplierCelebration(now) {
    if (now >= multiplierCelebration.until || multiplierCelebration.tier <= 0) return;
    const progress = Math.min(1, (now - multiplierCelebration.startedAt) / Math.max(1, multiplierCelebration.until - multiplierCelebration.startedAt));
    const strength = Math.sin(progress * Math.PI);
    const color = MULTIPLIER_COLORS[multiplierCelebration.tier];
    const { style, x, y, multiplier } = multiplierCelebration;
    ctx.save();
    ctx.translate(x, y - 30);
    ctx.globalAlpha = Math.max(0, strength);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    if (style === "rings") {
      for (let ring = 0; ring < 4; ring++) {
        ctx.strokeStyle = ring % 2 ? "#fff6ec" : color;
        ctx.lineWidth = 7 - ring;
        ctx.beginPath();
        ctx.arc(0, 0, 45 + ring * 30 + progress * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (style === "stars") {
      ctx.fillStyle = color;
      for (let star = 0; star < 12; star++) {
        ctx.save();
        ctx.rotate(star / 12 * Math.PI * 2 + progress * .8);
        ctx.translate(72 + strength * 54, 0);
        ctx.rotate(progress * Math.PI * 3);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
    } else if (style === "confetti") {
      for (let ribbon = 0; ribbon < 18; ribbon++) {
        const angle = ribbon / 18 * Math.PI * 2;
        ctx.strokeStyle = ribbon % 3 === 0 ? "#fff6ec" : ribbon % 2 ? color : "#ff625f";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 35, Math.sin(angle) * 35);
        ctx.quadraticCurveTo(Math.cos(angle + .4) * 94, Math.sin(angle + .4) * 94, Math.cos(angle) * (135 + progress * 35), Math.sin(angle) * (135 + progress * 35));
        ctx.stroke();
      }
    } else if (style === "flames") {
      for (let flame = 0; flame < 9; flame++) {
        const angle = flame / 9 * Math.PI * 2 + progress * .6;
        const radius = 78 + flame % 3 * 17;
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(radius, 0);
        ctx.fillStyle = flame % 2 ? color : "#ffc857";
        ctx.beginPath();
        ctx.moveTo(-10, 18);
        ctx.quadraticCurveTo(0, -38 - strength * 28, 10, 18);
        ctx.quadraticCurveTo(0, 8, -10, 18);
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-92, 12);
      ctx.lineTo(-64, -58);
      ctx.lineTo(-22, -20);
      ctx.lineTo(0, -82 - strength * 24);
      ctx.lineTo(22, -20);
      ctx.lineTo(64, -58);
      ctx.lineTo(92, 12);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(231,133,255,.2)";
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = "italic 900 48px Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`×${multiplier}`, 0, -9);
    }
    ctx.restore();
  }

  function drawFeedback(now) {
    if (feedback && now < feedbackUntil) {
      const multiplierMoment = feedbackBig;
      ctx.save();
      if (multiplierMoment) {
        const pulse = 1 + Math.sin(now / 70) * .045;
        ctx.translate(480, 145);
        ctx.scale(pulse, pulse);
        const banner = ctx.createLinearGradient(-235, 0, 235, 0);
        banner.addColorStop(0, "rgba(45,13,15,0)");
        banner.addColorStop(.2, "rgba(38,18,28,.9)");
        banner.addColorStop(.5, "rgba(86,37,68,.96)");
        banner.addColorStop(.8, "rgba(38,18,28,.9)");
        banner.addColorStop(1, "rgba(45,13,15,0)");
        ctx.fillStyle = banner;
        ctx.fillRect(-250, -36, 500, 72);
        ctx.strokeStyle = feedbackColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-205, -27);
        ctx.lineTo(205, -27);
        ctx.moveTo(-205, 27);
        ctx.lineTo(205, 27);
        ctx.stroke();
      }
      ctx.fillStyle = feedbackColor;
      ctx.textAlign = "center";
      ctx.font = `italic 900 ${multiplierMoment ? 38 : 24}px Impact, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = multiplierMoment ? 16 : 8;
      ctx.lineWidth = multiplierMoment ? 5 : 3;
      ctx.strokeStyle = "rgba(75,22,18,.9)";
      if (multiplierMoment) {
        ctx.strokeText(feedback, 0, 12, 470);
        ctx.fillText(feedback, 0, 12, 470);
      } else {
        const feedbackY = modeId === "ride" ? 205 : modeId === "matador" ? 188 : 160;
        ctx.strokeText(feedback, 480, feedbackY, 760);
        ctx.fillText(feedback, 480, feedbackY, 760);
      }
      ctx.restore();
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
    drawMultiplierCelebration(now);
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

  function resetJoystick() {
    joystick.active = false;
    joystick.id = null;
    joystick.x = 0;
    joystick.y = 0;
    joystickWrap?.classList.remove("active");
    if (joystickThumb) joystickThumb.style.transform = "translate(-50%, -50%)";
  }

  function updateJoystick(event) {
    const rect = joystickPad.getBoundingClientRect();
    const radius = rect.width * .31;
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > radius) { x = x / distance * radius; y = y / distance * radius; }
    const normalizedX = x / radius;
    const normalizedY = y / radius;
    const magnitude = Math.hypot(normalizedX, normalizedY);
    const deadZone = .12;
    const power = magnitude <= deadZone ? 0 : Math.min(1, (magnitude - deadZone) / (1 - deadZone));
    joystick.x = magnitude ? normalizedX / magnitude * power : 0;
    joystick.y = magnitude ? normalizedY / magnitude * power : 0;
    joystickThumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    stage.dataset.lastInput = "joystick";
    stage.dataset.joystickX = joystick.x.toFixed(2);
    stage.dataset.joystickY = joystick.y.toFixed(2);
  }

  joystickPad.addEventListener("pointerdown", event => {
    if (!running || paused || counting || (modeId !== "matador" && modeId !== "catch")) return;
    if (event.cancelable) event.preventDefault();
    joystick.active = true;
    joystick.id = event.pointerId;
    joystickWrap.classList.add("active");
    joystickPad.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  });
  joystickPad.addEventListener("pointermove", event => {
    if (!joystick.active || joystick.id !== event.pointerId) return;
    if (event.cancelable) event.preventDefault();
    updateJoystick(event);
  });
  const releaseJoystick = event => {
    if (joystick.id !== event.pointerId) return;
    resetJoystick();
  };
  joystickPad.addEventListener("pointerup", releaseJoystick);
  joystickPad.addEventListener("pointercancel", releaseJoystick);

  addEventListener("keydown", event => {
    if (event.key === "Escape" && running && !event.repeat) {
      event.preventDefault();
      document.querySelector("[data-grei-pause]")?.click();
      return;
    }
    if (modeId === "matador" && (event.key === "j" || event.key === "J")) {
      event.preventDefault();
      if (!event.repeat) jumpMatadora();
      return;
    }
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
      haptic(10, { strength: .16, subtle: true });
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
  bindGameControl(jumpButton, jumpMatadora);

  addEventListener("grei:pause", event => {
    paused = event.detail.paused;
    gameMenuButton?.setAttribute("aria-expanded", String(paused));
    if (paused) {
      heldDirections.clear();
      resetJoystick();
      audio.pause();
    } else if (running) {
      last = performance.now();
      audio.resume();
      requestAnimationFrame(loop);
    }
  });
  addEventListener("grei:sound", event => audio.setEnabled(event.detail.enabled));
  music.addEventListener("error", () => {
    audioStatus.textContent = "Music unavailable · game sounds still work";
  });
  const keepArenaMoving = () => {
    if (!arenaVideoFailed && arenaVideo?.paused) arenaVideo.play().catch(() => {});
  };
  arenaVideo?.addEventListener("loadeddata", () => { arenaVideo.classList.add("is-live"); keepArenaMoving(); if (!running) draw(); });
  arenaVideo?.addEventListener("playing", () => { arenaVideo.classList.add("is-live"); stage.dataset.background = "mp4"; });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) keepArenaMoving(); });
  addEventListener("pointerdown", keepArenaMoving, { once: true });
  arenaVideo?.addEventListener("error", () => { arenaVideoFailed = true; stage.classList.add("video-fallback"); stage.dataset.background = "poster"; if (!running) draw(); });
  if (arenaVideo?.readyState >= 2) {
    arenaVideo.classList.add("is-live");
    stage.dataset.background = "mp4";
    keepArenaMoving();
  }
  MODE_ASSETS[modeId].forEach(loadAsset);
  [
    arena, rideAnimation, rideFallAnimation, matadorSprites, matadoraAnimation, ragingBullHitAnimation,
    chargingBullAnimation, catchCowSprites, horsebackRiderAnimation, runawayCowAnimation, rollingCalfEventsAnimation
  ].forEach(image => image.addEventListener("load", () => { if (!running) draw(); }));

  configureGameMenu();
  state.reset();
  resetDodge();
  resetChase();
  resetRace();
  updateSelectionUI();
  hud();
  draw();
})();
