"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { resolveLocale, UiLanguagePreference } from "@/lib/locale";

type GameMode = "VISUAL" | "AUDIO";
type GameState = "START" | "PLAYING" | "GAMEOVER";

type WordPair = { it: string; en: string };
type Bullet = { x: number; y: number; speed: number };
type Enemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  word: string;
  isTarget: boolean;
  speed: number;
  color: string;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Star = { x: number; y: number; size: number; speed: number };

const VOCABULARY: WordPair[] = [
  { it: "Mela", en: "Apple" },
  { it: "Cane", en: "Dog" },
  { it: "Gatto", en: "Cat" },
  { it: "Casa", en: "House" },
  { it: "Libro", en: "Book" },
  { it: "Ciao", en: "Hello" },
  { it: "Amico", en: "Friend" },
  { it: "Acqua", en: "Water" },
  { it: "Tempo", en: "Time" },
  { it: "Uomo", en: "Man" },
  { it: "Donna", en: "Woman" },
  { it: "Bambino", en: "Child" },
  { it: "Lavoro", en: "Work" },
  { it: "Soldi", en: "Money" },
  { it: "Mondo", en: "World" },
  { it: "Amore", en: "Love" },
  { it: "Felice", en: "Happy" },
  { it: "Triste", en: "Sad" },
  { it: "Grande", en: "Big" },
  { it: "Piccolo", en: "Small" },
  { it: "Nuovo", en: "New" },
  { it: "Vecchio", en: "Old" },
  { it: "Buono", en: "Good" },
  { it: "Male", en: "Bad" },
  { it: "Notte", en: "Night" },
  { it: "Giorno", en: "Day" },
  { it: "Sole", en: "Sun" },
  { it: "Luna", en: "Moon" },
  { it: "Mare", en: "Sea" },
  { it: "Cielo", en: "Sky" },
];

type Locale = "en" | "it";

const translations: Record<
  Locale,
  {
    titleLine1: string;
    titleLine2: string;
    tagline: string;
    doubleTap: string;
    visualMode: string;
    visualSub: string;
    audioMode: string;
    audioSub: string;
    speedLabel: string;
    snailLabel: string;
    normalLabel: string;
    controlsHint: string;
    translateLabel: string;
    listenLabel: string;
    listenCTA: string;
    scoreLabel: string;
    livesLabel: string;
    finalScoreLabel: string;
    tryAgain: string;
    gameOverTitle: string;
    endGame: string;
    cloudSpeedUp: string;
  }
> = {
  en: {
    titleLine1: "VOCABOLARIO",
    titleLine2: "INVADERS",
    tagline: "Defend the galaxy by learning words!",
    doubleTap: "Double tap to fire.",
    visualMode: "VISUAL MODE",
    visualSub: "READ ITALIAN → SHOOT ENGLISH",
    audioMode: "LISTEN TO KILL",
    audioSub: "HEAR ENGLISH → SHOOT ENGLISH",
    speedLabel: "Slow Playback Speed",
    snailLabel: "SNAIL (0.1)",
    normalLabel: "NORMAL-ISH (0.9)",
    controlsHint: "DRAG TO MOVE • DOUBLE TAP TO SHOOT",
    translateLabel: "TRANSLATE",
    listenLabel: "LISTEN & FIND",
    listenCTA: "🔊 LISTEN",
    scoreLabel: "SCORE",
    livesLabel: "LIVES",
    finalScoreLabel: "Final Score",
    tryAgain: "TRY AGAIN",
    gameOverTitle: "GAME OVER",
    endGame: "End Game",
    cloudSpeedUp: "Cloud river speeding up!",
  },
  it: {
    titleLine1: "VOCABOLARIO",
    titleLine2: "INVADERS",
    tagline: "Difendi la galassia imparando vocaboli!",
    doubleTap: "Doppio tap per sparare.",
    visualMode: "MODALITÀ VISIVA",
    visualSub: "LEGGI ITALIANO → SPARA INGLESE",
    audioMode: "ASCOLTA E COLPISCI",
    audioSub: "ASCOLTA INGLESE → SPARA INGLESE",
    speedLabel: "Velocità di riproduzione lenta",
    snailLabel: "LUMACA (0.1)",
    normalLabel: "QUASI NORMALE (0.9)",
    controlsHint: "TRASCINA PER MUOVERTI • DOPPIO TAP PER SPARARE",
    translateLabel: "TRADUCI",
    listenLabel: "ASCOLTA E TROVA",
    listenCTA: "🔊 ASCOLTA",
    scoreLabel: "PUNTEGGIO",
    livesLabel: "VITE",
    finalScoreLabel: "Punteggio finale",
    tryAgain: "RIPROVA",
    gameOverTitle: "GAME OVER",
    endGame: "Termina partita",
    cloudSpeedUp: "Il fiume di nuvole accelera!",
  },
};

function InvasionGame() {
  const { data: session } = useSession();
  const [locale, setLocale] = useState<Locale>("en");
  const copy = translations[locale];
  const copyRef = useRef(copy);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startScreenRef = useRef<HTMLDivElement | null>(null);
  const gameOverScreenRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const targetDisplayRef = useRef<HTMLDivElement | null>(null);
  const targetLabelRef = useRef<HTMLDivElement | null>(null);
  const controlsHintRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef<HTMLSpanElement | null>(null);
  const livesRef = useRef<HTMLSpanElement | null>(null);
  const currentTargetRef = useRef<HTMLDivElement | null>(null);
  const finalScoreRef = useRef<HTMLDivElement | null>(null);
  const startVisualRef = useRef<HTMLButtonElement | null>(null);
  const startAudioRef = useRef<HTMLButtonElement | null>(null);
  const restartRef = useRef<HTMLButtonElement | null>(null);
  const endGameRef = useRef<HTMLButtonElement | null>(null);
  const ttsRateRef = useRef<HTMLInputElement | null>(null);
  const ttsRateDisplayRef = useRef<HTMLSpanElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const preference = ((session?.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
    const detectedLocales = typeof navigator !== "undefined" ? [...(navigator.languages ?? [])] : [];
    const resolved = resolveLocale({
      preference,
      detectedLocales,
      supportedLocales: ["en", "it"],
      fallback: "en",
    }) as Locale;
    setLocale(resolved);
    // session?.user changes re-run this effect
  }, [session?.user]);

  useEffect(() => {
    copyRef.current = translations[locale];
  }, [locale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const startScreen = startScreenRef.current;
    const gameOverScreen = gameOverScreenRef.current;
    const hud = hudRef.current;
    const targetDisplay = targetDisplayRef.current;
    const targetLabel = targetLabelRef.current;
    const controlsHint = controlsHintRef.current;
    const scoreEl = scoreRef.current;
    const livesEl = livesRef.current;
    const currentTargetEl = currentTargetRef.current;
    const finalScoreEl = finalScoreRef.current;
    const startVisualBtn = startVisualRef.current;
    const startAudioBtn = startAudioRef.current;
    const restartBtn = restartRef.current;
    const endGameBtn = endGameRef.current;
    const rateSlider = ttsRateRef.current;
    const rateDisplay = ttsRateDisplayRef.current;
    const toastEl = toastRef.current;

    if (
      !canvas ||
      !startScreen ||
      !gameOverScreen ||
      !hud ||
      !targetDisplay ||
      !targetLabel ||
      !controlsHint ||
      !scoreEl ||
      !livesEl ||
      !currentTargetEl ||
      !finalScoreEl ||
      !startVisualBtn ||
      !startAudioBtn ||
      !restartBtn ||
      !endGameBtn ||
      !rateSlider ||
      !rateDisplay ||
      !toastEl
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let gameState: GameState = "START";
    let gameMode: GameMode = "VISUAL";
    let lastTime = 0;
    let score = 0;
    let lives = 3;
    let ttsSlowRate = 0.5;
    let rafId: number | undefined;
    let spawnTimer: number | undefined;
    let toastTimer: number | undefined;

    let currentTargetPair: WordPair | null = null;

    const player = { x: 0, y: 0, width: 40, height: 40, color: "#4ade80" };
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let particles: Particle[] = [];
    let stars: Star[] = [];
    let clearLanes: { start: number; end: number }[] = [];
    let correctHits = 0;
    let isMobileScreen = false;

    const refreshDeviceProfile = () => {
      isMobileScreen = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
    };

    const getBaseStarSpeed = () => (isMobileScreen ? 3 : 4.5);
    const getStarSpeedIncrement = () => (isMobileScreen ? 0.6 : 0.8);
    const getMaxStarSpeed = () => (isMobileScreen ? 8 : 10);
    const getBaseStarCount = () => (isMobileScreen ? 8 : 12);
    const getMinStarCount = () => (isMobileScreen ? 4 : 6);
    let currentStarSpeed = getBaseStarSpeed();

    let input = { x: 0, isDown: false, tapped: false };
    let lastTapTime = 0;

    const AudioSys = {
      ctx: null as AudioContext | null,
      ttsTimer: null as number | null,
      ttsStage: 0,
      musicBuffer: null as AudioBuffer | null,
      musicSource: null as AudioBufferSourceNode | null,
      musicGain: null as GainNode | null,
      musicLoading: false,
      init: () => {
        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          AudioSys.ctx = new AudioCtx();
        }
        window.speechSynthesis.cancel();
      },
      loadMusic: async () => {
        if (AudioSys.musicBuffer || AudioSys.musicLoading) return;
        if (!AudioSys.ctx) return;
        AudioSys.musicLoading = true;
        try {
          const res = await fetch("/games/space1_1.mp3");
          const arrayBuffer = await res.arrayBuffer();
          AudioSys.musicBuffer = await AudioSys.ctx.decodeAudioData(arrayBuffer);
        } catch (error) {
          console.warn("Failed to load music track", error);
        } finally {
          AudioSys.musicLoading = false;
        }
      },
      playMusic: () => {
        if (!AudioSys.ctx || !AudioSys.musicBuffer) return;
        AudioSys.stopMusic();
        const source = AudioSys.ctx.createBufferSource();
        source.buffer = AudioSys.musicBuffer;
        source.loop = true;
        const gain = AudioSys.musicGain ?? AudioSys.ctx.createGain();
        gain.gain.value = 0.18;
        source.connect(gain);
        gain.connect(AudioSys.ctx.destination);
        source.start();
        AudioSys.musicSource = source;
        AudioSys.musicGain = gain;
      },
      stopMusic: () => {
        if (AudioSys.musicSource) {
          try {
            AudioSys.musicSource.stop();
          } catch (error) {
            console.warn("Music stop failed", error);
          }
        }
        AudioSys.musicSource = null;
      },
      playTone: (freq: number, type: OscillatorType, duration: number) => {
        if (!AudioSys.ctx) return;
        const osc = AudioSys.ctx.createOscillator();
        const gain = AudioSys.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, AudioSys.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, AudioSys.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioSys.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(AudioSys.ctx.destination);
        osc.start();
        osc.stop(AudioSys.ctx.currentTime + duration);
      },
      shoot: () => AudioSys.playTone(400, "square", 0.1),
      explosion: () => AudioSys.playTone(100, "sawtooth", 0.3),
      success: () => {
        if (!AudioSys.ctx) return;
        AudioSys.playTone(600, "sine", 0.1);
        setTimeout(() => AudioSys.playTone(800, "sine", 0.2), 100);
      },
      error: () => AudioSys.playTone(150, "sawtooth", 0.4),
      stopTTS: () => {
        if (AudioSys.ttsTimer) {
          clearTimeout(AudioSys.ttsTimer);
          AudioSys.ttsTimer = null;
        }
        window.speechSynthesis.cancel();
      },
      startTTSLoop: (word: string) => {
        if (!("speechSynthesis" in window)) return;
        AudioSys.stopTTS();
        AudioSys.ttsStage = 0;

        const speak = () => {
          if (gameState !== "PLAYING") return;

          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = "en-US";
          utterance.rate = AudioSys.ttsStage % 2 === 0 ? 1 : ttsSlowRate;
          utterance.pitch = 1.1;

          utterance.onend = () => {
            if (gameState !== "PLAYING") return;
            AudioSys.ttsStage += 1;
            AudioSys.ttsTimer = window.setTimeout(speak, 1500);
          };

          utterance.onerror = () => {};

          window.speechSynthesis.speak(utterance);
        };

        speak();
      },
    };

    const isInClearLane = (y: number) => clearLanes.some((lane) => y >= lane.start && y <= lane.end);

    const computeClearLanes = () => {
      const gapHeight = Math.max(isMobileScreen ? 140 : 110, canvas.height * (isMobileScreen ? 0.16 : 0.14));
      const padding = isMobileScreen ? 24 : 20;
      const laneCenters = [0.3, 0.5, 0.7]; // three vertical corridors
      clearLanes = laneCenters.map((ratio) => {
        const center = canvas.height * ratio;
        const start = Math.max(0, center - gapHeight - padding);
        const end = Math.min(canvas.height, center + gapHeight + padding);
        return { start, end };
      });
    };

    const getLaneIndex = (x: number) => {
      const laneWidth = Math.max(80, canvas.width / 6);
      return Math.max(0, Math.floor(x / laneWidth));
    };

    const laneHasSpace = (laneIndex: number, existing: Star[], ignore?: Star) => {
      const count = existing.reduce((acc, s) => (s !== ignore && getLaneIndex(s.x) === laneIndex ? acc + 1 : acc), 0);
      return count < 5;
    };

    const applyStarSpeed = () => {
      stars.forEach((s) => {
        // keep clouds moving together at the same pace
        s.speed = currentStarSpeed;
      });
    };

    const adjustStarDensity = () => {
      const speedLevel = Math.max(0, Math.round((currentStarSpeed - getBaseStarSpeed()) / getStarSpeedIncrement()));
      const targetCount = Math.max(getMinStarCount(), getBaseStarCount() - speedLevel * 12);
      if (stars.length > targetCount) {
        stars.splice(targetCount);
      } else if (stars.length < targetCount) {
        const needed = targetCount - stars.length;
        for (let i = 0; i < needed; i += 1) {
          stars.push(spawnStar(stars));
        }
      }
    };

    const showSpeedToast = (message: string) => {
      toastEl.textContent = message;
      toastEl.classList.add("show");
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toastEl.classList.remove("show");
      }, 2500);
    };

    const increaseStarSpeed = () => {
      const baseSpeed = getBaseStarSpeed();
      const nextSpeed = Math.min(getMaxStarSpeed(), currentStarSpeed + getStarSpeedIncrement());
      if (nextSpeed > currentStarSpeed) {
        currentStarSpeed = nextSpeed;
        applyStarSpeed();
        adjustStarDensity();
        const percentIncrease = Math.max(0, Math.round(((currentStarSpeed - baseSpeed) / baseSpeed) * 100));
        showSpeedToast(`${copyRef.current.cloudSpeedUp} +${percentIncrease}%`);
      }
    };

    const spawnStar = (existing: Star[] = stars) => {
      const minGap = isMobileScreen ? 55 : 70;
      let y = Math.random() * canvas.height;
      let x = Math.random() * canvas.width;
      let attempts = 0;

      const collides = (nx: number, ny: number) =>
        existing.some((s) => Math.hypot(s.x - nx, s.y - ny) < minGap);

      while (attempts < 25) {
        const laneIndex = getLaneIndex(x);
        if (!isInClearLane(y) && !collides(x, y) && laneHasSpace(laneIndex, existing)) break;
        y = Math.random() * canvas.height;
        x = Math.random() * canvas.width;
        attempts += 1;
      }

      return {
        x,
        y,
        size: Math.random() * 2 + 0.3,
        speed: currentStarSpeed,
      };
    };

    const initStars = () => {
      const targetCount = getBaseStarCount();

      stars = [];
      for (let i = 0; i < targetCount; i += 1) {
        stars.push(spawnStar(stars));
      }
    };

    const resize = () => {
      refreshDeviceProfile();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      player.y = canvas.height - 80;
      player.x = canvas.width / 2;
      currentStarSpeed = Math.max(currentStarSpeed, getBaseStarSpeed());
      computeClearLanes();
      initStars();
      applyStarSpeed();
      adjustStarDensity();
    };

    const updateUI = () => {
      scoreEl.textContent = `${score}`;
      livesEl.textContent = `${lives}`;
    };

    const pickNewTarget = () => {
      currentTargetPair = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];

      if (gameMode === "VISUAL") {
        targetLabel.textContent = "";
        currentTargetEl.textContent = currentTargetPair.it.toUpperCase();
        currentTargetEl.classList.remove("audio-mode");
        AudioSys.stopTTS();
      } else {
        targetLabel.textContent = "";
        currentTargetEl.textContent = copyRef.current.listenCTA;
        currentTargetEl.classList.add("audio-mode");
        AudioSys.startTTSLoop(currentTargetPair.en);
      }
    };

    const createExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 15; i += 1) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.5) * 300,
          life: 0.5,
          color,
          size: Math.random() * 4 + 2,
        });
      }
    };

    const spawnEnemyWave = () => {
      if (gameState !== "PLAYING" || !currentTargetPair) return;

      const enemyWidth = 80;
      const laneCount = Math.floor(canvas.width / enemyWidth);
      const lanes = Array.from({ length: laneCount }, (_, i) => i);

      const maxSpawnable = Math.max(1, laneCount - 1); // keep at least one lane untouched
      const count = Math.min(maxSpawnable, Math.floor(Math.random() * 2) + 1);
      const enemyLaneCapacity = 2;
      const enemyVerticalSpacing = 220;
      const laneOffset = (canvas.width - laneCount * enemyWidth) / 2;
      const safeLaneIndex = Math.max(0, Math.floor(laneCount / 2));

      for (let i = lanes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = lanes[i];
        lanes[i] = lanes[j];
        lanes[j] = temp;
      }

      const recentlyUsed = new Set<string>();
      const existingWords = enemies.map((enemy) => enemy.word);
      existingWords.forEach((word) => recentlyUsed.add(word));

      let correctSpawned = enemies.some((enemy) => enemy.word === currentTargetPair?.en);

      let spawned = 0;
      for (let i = 0; i < lanes.length && spawned < count; i += 1) {
        const laneIndex = lanes[i];
        if (laneIndex === safeLaneIndex) continue;
        const laneEnemies = enemies.filter((enemy) => Math.floor((enemy.x - laneOffset) / enemyWidth) === laneIndex);
        if (laneEnemies.length >= enemyLaneCapacity) continue;

        const spawnY = -50 - Math.random() * 100;
        const tooClose = laneEnemies.some((enemy) => Math.abs(enemy.y - spawnY) < enemyVerticalSpacing);
        if (tooClose) continue;

        const x = laneIndex * enemyWidth + enemyWidth / 2 + laneOffset;

        let word = "";
        let isTarget = false;

        if (!correctSpawned) {
          word = currentTargetPair.en;
          isTarget = true;
          correctSpawned = true;
        } else {
          let randomPair: WordPair;
          do {
            randomPair = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
          } while (randomPair.en === currentTargetPair.en || recentlyUsed.has(randomPair.en));
          word = randomPair.en;
        }

        recentlyUsed.add(word);

        enemies.push({
          x,
          y: spawnY,
          width: 70,
          height: 40,
          word,
          isTarget,
          speed: (Math.random() * 50 + 50) * (1 + score / 500),
          color: isTarget ? "#f472b6" : "#a78bfa",
        });
        spawned += 1;
      }

      const spawnDelay = Math.max(1000, 3000 - score * 5);
      spawnTimer = window.setTimeout(spawnEnemyWave, spawnDelay);
    };

    const stopTimers = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (spawnTimer) clearTimeout(spawnTimer);
    };

    const showMenu = () => {
      gameState = "START";
      stopTimers();
      AudioSys.stopTTS();
      AudioSys.stopMusic();
      bullets = [];
      enemies = [];
      particles = [];
      correctHits = 0;
      currentStarSpeed = getBaseStarSpeed();
      applyStarSpeed();
      adjustStarDensity();
      toastEl.classList.remove("show");
      toastEl.textContent = "";
      if (toastTimer) window.clearTimeout(toastTimer);
      score = 0;
      lives = 3;
      updateUI();
      currentTargetEl.textContent = "---";
      targetLabel.textContent = "";
      startScreen.classList.remove("hidden");
      gameOverScreen.classList.add("hidden");
      hud.classList.add("hidden");
      targetDisplay.classList.add("hidden");
      controlsHint.classList.add("hidden");
      endGameBtn.classList.add("hidden");
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const gameOver = () => {
      gameState = "GAMEOVER";
      AudioSys.error();
      AudioSys.stopTTS();
      AudioSys.stopMusic();
      stopTimers();
      finalScoreEl.textContent = `${score}`;
      gameOverScreen.classList.remove("hidden");
      hud.classList.add("hidden");
      targetDisplay.classList.add("hidden");
      controlsHint.classList.add("hidden");
      endGameBtn.classList.add("hidden");
    };

    const startGame = (mode: GameMode) => {
      AudioSys.init();
      gameState = "PLAYING";
      gameMode = mode;
      score = 0;
      lives = 3;
      bullets = [];
      enemies = [];
      particles = [];
      correctHits = 0;
      currentStarSpeed = getBaseStarSpeed();
      applyStarSpeed();
      adjustStarDensity();
      AudioSys.ctx?.resume?.();
      void AudioSys.loadMusic().then(() => AudioSys.playMusic());

      updateUI();
      pickNewTarget();
      spawnEnemyWave();

      startScreen.classList.add("hidden");
      gameOverScreen.classList.add("hidden");
      hud.classList.remove("hidden");
      targetDisplay.classList.remove("hidden");
      controlsHint.classList.remove("hidden");
      endGameBtn.classList.remove("hidden");

      player.x = canvas.width / 2;
      input.x = player.x;

      lastTime = performance.now();
      rafId = requestAnimationFrame(gameLoop);
    };

    const handlePlayerHit = () => {
      createExplosion(player.x, player.y, "#ff0000");
      lives -= 1;
      updateUI();
      AudioSys.explosion();
      if (lives <= 0) gameOver();
    };

    const update = (dt: number) => {
      const targetX = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, input.x));
      player.x += (targetX - player.x) * 0.2;

      if (input.tapped) {
        bullets.push({ x: player.x, y: player.y - 20, speed: 600 });
        AudioSys.shoot();
        input.tapped = false;
      }

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const b = bullets[i];
        b.y -= b.speed * dt;
        if (b.y < -10) bullets.splice(i, 1);
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const e = enemies[i];
        e.y += e.speed * dt;

        if (e.y > canvas.height) {
          enemies.splice(i, 1);
          continue;
        }

        const collidesWithPlayer =
          player.x - player.width / 2 < e.x + e.width / 2 &&
          player.x + player.width / 2 > e.x - e.width / 2 &&
          player.y - player.height / 2 < e.y + e.height / 2 &&
          player.y + player.height / 2 > e.y - e.height / 2;

        if (collidesWithPlayer) {
          enemies.splice(i, 1);
          handlePlayerHit();
          continue;
        }

        for (let j = bullets.length - 1; j >= 0; j -= 1) {
          const b = bullets[j];
          const hit =
            b.x > e.x - e.width / 2 &&
            b.x < e.x + e.width / 2 &&
            b.y > e.y - e.height / 2 &&
            b.y < e.y + e.height / 2;

          if (hit) {
            bullets.splice(j, 1);
            createExplosion(e.x, e.y, e.isTarget ? "#4ade80" : "#ef4444");
            enemies.splice(i, 1);

            if (e.isTarget) {
              score += 10;
              correctHits += 1;
              if (correctHits % 3 === 0) increaseStarSpeed();
              AudioSys.success();
              pickNewTarget();
              spawnEnemyWave();
            } else {
              lives = Math.max(0, lives - 1);
              score = Math.max(0, score - 5);
              AudioSys.error();
              if (lives <= 0) gameOver();
            }
            updateUI();
            break;
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      stars.forEach((s) => {
        const star = s;
        star.speed = currentStarSpeed;
        star.y += star.speed * dt;
        if (isInClearLane(star.y)) {
          const lane = clearLanes.find((l) => star.y >= l.start && star.y <= l.end);
          if (lane) {
            star.y = lane.end + star.size + 1; // nudge below lane to keep it clear
          }
        }
        if (star.y > canvas.height + star.size) {
          let attempts = 0;
          const minGap = isMobileScreen ? 55 : 70;
          let nx = Math.random() * canvas.width;
          let ny = -star.size;
          const collides = () => stars.some((other) => other !== star && Math.hypot(other.x - nx, other.y - ny) < minGap);
          while ((isInClearLane(ny) || collides() || !laneHasSpace(getLaneIndex(nx), stars, star)) && attempts < 25) {
            nx = Math.random() * canvas.width;
            ny = -star.size;
            attempts += 1;
          }
          star.x = nx;
          star.y = ny;
          star.speed = currentStarSpeed;
        }
      });
    };

    const draw = () => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      stars.forEach((s) => {
        // skip drawing inside the navigation lanes to keep paths clear
        if (clearLanes.some((lane) => s.y >= lane.start && s.y <= lane.end)) return;
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 15);
      ctx.lineTo(0, 10);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(0, 25 + Math.random() * 10);
      ctx.lineTo(5, 15);
      ctx.fill();
      ctx.restore();

      enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);

        ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const w = e.width / 2;
        const h = e.height / 2;
        ctx.moveTo(-w, h - 5);
        ctx.bezierCurveTo(-w - 15, h - 10, -w - 10, -h - 5, -10, -h);
        ctx.bezierCurveTo(10, -h - 15, w + 15, -h, w, h - 5);
        ctx.bezierCurveTo(w + 5, h + 10, -w - 5, h + 10, -w, h - 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 0;
        ctx.font = "bold 16px Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.word, 0, 0);

        ctx.restore();
      });

      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 10;
      bullets.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life / 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const gameLoop = (timestamp: number) => {
      if (gameState !== "PLAYING") return;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      update(dt);
      draw();
      rafId = requestAnimationFrame(gameLoop);
    };

    const updateInputCoordinates = (event: MouseEvent | TouchEvent) => {
      if ("touches" in event && event.touches.length > 0) {
        input.x = event.touches[0]?.clientX ?? input.x;
      } else if ("clientX" in event) {
        input.x = event.clientX;
      }
    };

    const handleInputStart = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      input.isDown = true;
      updateInputCoordinates(event);

      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;

      if (tapLength < 300 && tapLength > 0 && gameState === "PLAYING") {
        input.tapped = true;
      }
      lastTapTime = currentTime;
    };

    const handleInputMove = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      if (input.isDown) updateInputCoordinates(event);
    };

    const handleInputEnd = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      input.isDown = false;
    };

    const handleRateChange = (value: string) => {
      ttsSlowRate = parseFloat(value);
      rateDisplay.textContent = `${ttsSlowRate}`;
    };

    const handleRestart = () => {
      showMenu();
    };

    const exitToMenu = () => {
      showMenu();
    };

    const handleCleanup = () => {
      gameState = "GAMEOVER";
      if (rafId) cancelAnimationFrame(rafId);
      if (spawnTimer) clearTimeout(spawnTimer);
      AudioSys.stopTTS();
      AudioSys.stopMusic();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleInputStart);
      canvas.removeEventListener("mousemove", handleInputMove);
      canvas.removeEventListener("mouseup", handleInputEnd);
      canvas.removeEventListener("touchstart", handleInputStart);
      canvas.removeEventListener("touchmove", handleInputMove);
      canvas.removeEventListener("touchend", handleInputEnd);
      startVisualBtn.removeEventListener("click", startVisualHandler);
      startAudioBtn.removeEventListener("click", startAudioHandler);
      restartBtn.removeEventListener("click", handleRestart);
      endGameBtn.removeEventListener("click", exitToMenu);
      rateSlider.removeEventListener("input", rateInputHandler);
      if (toastTimer) window.clearTimeout(toastTimer);
    };

    const startVisualHandler = () => startGame("VISUAL");
    const startAudioHandler = () => startGame("AUDIO");
    const rateInputHandler = (event: Event) => {
      const target = event.target as HTMLInputElement;
      handleRateChange(target.value);
    };

    window.addEventListener("resize", resize);

    canvas.addEventListener("mousedown", handleInputStart);
    canvas.addEventListener("mousemove", handleInputMove);
    canvas.addEventListener("mouseup", handleInputEnd);

    canvas.addEventListener("touchstart", handleInputStart, { passive: false });
    canvas.addEventListener("touchmove", handleInputMove, { passive: false });
      canvas.addEventListener("touchend", handleInputEnd, { passive: false });

      startVisualBtn.addEventListener("click", startVisualHandler);
      startAudioBtn.addEventListener("click", startAudioHandler);
      restartBtn.addEventListener("click", handleRestart);
      endGameBtn.addEventListener("click", exitToMenu);
      rateSlider.addEventListener("input", rateInputHandler);

      handleRateChange(rateSlider.value);
      resize();
      player.x = canvas.width / 2;
      input.x = player.x;

      return handleCleanup;
    }, []);

  return (
    <div className="relative min-h-[100dvh] w-full text-white bg-slate-900">
      <div
        id="game-container"
        className="relative h-[100dvh] min-h-[100dvh] w-full max-w-full overflow-hidden"
        aria-label="Vocabolario Invaders game area"
      >
        <div ref={hudRef} id="hud" className="hud hidden pointer-events-auto">
          <div>
            {copy.scoreLabel}: <span ref={scoreRef}>0</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              ref={endGameRef}
              type="button"
              className="hidden pointer-events-auto rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-rose-500"
            >
              {copy.endGame}
            </button>
            <div>
              {copy.livesLabel}: <span ref={livesRef}>3</span>
            </div>
          </div>
        </div>

        <div ref={targetDisplayRef} id="target-display" className="target-display hidden">
          <div ref={targetLabelRef} className="text-sm text-gray-400 mb-1" aria-hidden="true" />
          <div ref={currentTargetRef} id="current-target" className="target-word">
            ---
          </div>
        </div>

        <canvas ref={canvasRef} id="gameCanvas" className="absolute inset-0" />

        <div ref={controlsHintRef} id="controls-hint" className="hidden">
          {copy.controlsHint}
        </div>

        <div ref={toastRef} className="speed-toast" aria-live="polite" />

        <div ref={startScreenRef} id="start-screen" className="overlay">
          <h1 className="pixel-font text-4xl text-yellow-400 mb-4 neon-text leading-snug text-center start-title">
            {copy.titleLine1}
            <br />
            {copy.titleLine2}
          </h1>
          <p className="text-gray-300 mb-6 max-w-md text-center start-tagline">
            {copy.tagline}
            <br />
            <br />
            {copy.doubleTap}
          </p>

          <div className="flex flex-col gap-4 w-full max-w-xs start-actions">
            <button
              ref={startVisualRef}
              id="start-btn-visual"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 pixel-font text-sm w-full"
              type="button"
            >
              {copy.visualMode}
              <br />
              <span className="text-[10px] opacity-70 font-sans">{copy.visualSub}</span>
            </button>

            <div className="bg-slate-800 p-4 rounded-xl border border-pink-900/50 shadow-lg mt-2 start-panel">
              <button
                ref={startAudioRef}
                id="start-btn-audio"
                className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 pixel-font text-sm w-full mb-4"
                type="button"
              >
                {copy.audioMode}
                <br />
                <span className="text-[10px] opacity-70 font-sans">{copy.audioSub}</span>
              </button>

              <div className="text-left px-2">
                <label className="block text-[10px] text-pink-300 mb-3 font-sans uppercase tracking-wider font-bold">
                  {copy.speedLabel}:{" "}
                  <span ref={ttsRateDisplayRef} id="rate-display" className="text-white text-base ml-1">
                    0.5
                  </span>
                  x
                </label>
                <input ref={ttsRateRef} type="range" id="tts-rate-slider" min="0.1" max="0.9" step="0.1" defaultValue="0.5" />
                <div className="flex justify-between text-[9px] text-gray-400 font-sans mt-2">
                  <span>{copy.snailLabel}</span>
                  <span>{copy.normalLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref={gameOverScreenRef} id="game-over-screen" className="overlay hidden">
          <h1 className="pixel-font text-red-500 text-4xl mb-4 neon-text">{copy.gameOverTitle}</h1>
          <p className="text-xl mb-2">{copy.finalScoreLabel}</p>
          <p ref={finalScoreRef} id="final-score" className="pixel-font text-3xl text-yellow-400 mb-8">
            0
          </p>
          <button
            ref={restartRef}
            id="restart-btn"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 pixel-font text-sm"
            type="button"
          >
            {copy.tryAgain}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Roboto:wght@400;700&display=swap");

        :root {
          color-scheme: dark;
        }

        body {
          background-color: #0f172a;
          color: white;
          overflow: hidden;
          font-family: "Roboto", sans-serif;
          touch-action: none;
        }

        #game-container {
          position: relative;
          min-height: 100dvh;
          width: 100%;
          max-width: 100vw;
        }

        canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        .pixel-font {
          font-family: "Press Start 2P", cursive;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: rgba(15, 23, 42, 0.95);
          z-index: 10;
          padding: 20px;
          text-align: center;
        }

        .hidden {
          display: none !important;
        }

        .neon-text {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.7), 0 0 20px rgba(255, 255, 255, 0.5);
        }

        .hud {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0) + 10px);
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 0 20px;
          pointer-events: none;
          z-index: 5;
          font-family: "Press Start 2P", cursive;
          font-size: 12px;
          color: #fbbf24;
        }

        .hud button {
          pointer-events: auto;
        }

        .hud .flex {
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .target-display {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0) + 50px);
          width: 100%;
          text-align: center;
          pointer-events: none;
          z-index: 4;
        }

        .target-word {
          font-size: 2rem;
          font-weight: bold;
          color: #38bdf8;
          text-shadow: 0 0 15px #0284c7;
          background: rgba(0, 0, 0, 0.5);
          padding: 5px 15px;
          border-radius: 8px;
          display: inline-block;
        }

        .target-word.audio-mode {
          color: #f472b6;
          text-shadow: 0 0 15px #db2777;
          animation: pulse-audio 1.5s infinite;
        }

        @keyframes pulse-audio {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        #controls-hint {
          position: absolute;
          bottom: calc(env(safe-area-inset-bottom, 0) + 20px);
          width: 100%;
          text-align: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 12px;
          pointer-events: none;
        }

        .speed-toast {
          position: fixed;
          left: 50%;
          top: calc(env(safe-area-inset-top, 0) + 10px);
          transform: translate(-50%, -12px);
          background: rgba(15, 23, 42, 0.95);
          color: #fbbf24;
          padding: 10px 14px;
          border-radius: 12px;
          font-family: "Press Start 2P", cursive;
          font-size: 12px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35), 0 0 18px rgba(250, 204, 21, 0.38);
          border: 1px solid rgba(250, 204, 21, 0.6);
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 50;
          pointer-events: none;
        }

        .speed-toast.show {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          margin-top: -10px;
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.8);
          border: 2px solid #fff;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #334155;
          border-radius: 4px;
        }

        input[type="range"]::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.8);
        }

        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #334155;
          border-radius: 4px;
        }

        input[type="range"]:focus {
          outline: none;
        }

        @media (max-width: 640px) {
          .overlay {
            padding: 16px;
          }

          .start-title {
            font-size: 2rem;
            line-height: 1.2;
          }

          .start-tagline {
            font-size: 0.95rem;
          }

          .start-actions {
            max-width: 100%;
          }

          .start-panel {
            padding: 12px;
          }

          .hud {
            top: calc(env(safe-area-inset-top, 0) + 6px);
            padding: 0 12px;
            font-size: 11px;
            gap: 6px;
            flex-direction: row;
            justify-content: space-between;
          }

          .target-display {
            top: calc(env(safe-area-inset-top, 0) + 32px);
          }

          .target-word {
            font-size: 1.35rem;
            padding: 6px 12px;
          }

          #controls-hint {
            font-size: 10px;
            padding: 0 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default InvasionGame;
