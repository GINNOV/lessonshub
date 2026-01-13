'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import styles from './FrogVerbsGame.module.css';

const GRID_SIZE = 40;
const COLS = 13;
const ROWS = 13;
const GAME_WIDTH = COLS * GRID_SIZE;
const GAME_HEIGHT = ROWS * GRID_SIZE;

const COLORS = {
  water: '#1a1a5e',
  road: '#111',
  grass: '#2d1e2d',
  frog: '#00ff00',
  turtle: '#ff4400',
  log: '#8b4513',
  car1: '#ff0055',
  car2: '#ffff00',
  car3: '#00ccff',
  truck: '#ffffff',
};

const GRAMMAR_QUESTIONS = [
  { q: 'Past tense of: To Sink', a: 'sank' },
  { q: 'Past tense of: To Go', a: 'went' },
  { q: 'Past tense of: To Eat', a: 'ate' },
  { q: 'Past tense of: To Run', a: 'ran' },
  { q: 'Past tense of: To See', a: 'saw' },
  { q: 'Past tense of: To Buy', a: 'bought' },
  { q: 'Past tense of: To Think', a: 'thought' },
  { q: 'Past tense of: To Teach', a: 'taught' },
  { q: 'Past tense of: To Speak', a: 'spoke' },
  { q: 'Past tense of: To Write', a: 'wrote' },
  { q: 'Past tense of: To Fly', a: 'flew' },
  { q: 'Past tense of: To Drive', a: 'drove' },
  { q: 'Past tense of: To Sing', a: 'sang' },
  { q: 'Past tense of: To Swim', a: 'swam' },
];

type GrammarQuestion = (typeof GRAMMAR_QUESTIONS)[number];

type Goal = {
  xWorld: number;
  zWorld: number;
  filled: boolean;
  mesh: THREE.Mesh | null;
};

export default function FrogVerbsGame() {
  const gameViewRef = useRef<HTMLDivElement | null>(null);
  const startScreenRef = useRef<HTMLDivElement | null>(null);
  const settingsModalRef = useRef<HTMLDivElement | null>(null);
  const teacherPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const soundToggleRef = useRef<HTMLInputElement | null>(null);
  const teacherToggleRef = useRef<HTMLInputElement | null>(null);
  const closeSettingsRef = useRef<HTMLButtonElement | null>(null);
  const eurosRef = useRef<HTMLDivElement | null>(null);
  const pointsRef = useRef<HTMLDivElement | null>(null);
  const livesRef = useRef<HTMLDivElement | null>(null);
  const gameOverRef = useRef<HTMLDivElement | null>(null);
  const gameOverScoreRef = useRef<HTMLDivElement | null>(null);
  const gameOverLivesRef = useRef<HTMLDivElement | null>(null);
  const startScoreRef = useRef<HTMLDivElement | null>(null);
  const startLivesRef = useRef<HTMLDivElement | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);
  const qaQuestionRef = useRef<HTMLDivElement | null>(null);
  const qaInputRef = useRef<HTMLInputElement | null>(null);
  const qaSubmitRef = useRef<HTMLButtonElement | null>(null);
  const qaFeedbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = gameViewRef.current;
    const startScreen = startScreenRef.current;
    const settingsModal = settingsModalRef.current;
    const teacherPanel = teacherPanelRef.current;
    const settingsBtn = settingsBtnRef.current;
    const soundToggle = soundToggleRef.current;
    const teacherToggle = teacherToggleRef.current;
    const closeSettings = closeSettingsRef.current;
    const eurosEl = eurosRef.current;
    const pointsEl = pointsRef.current;
    const livesEl = livesRef.current;
    const gameOverScreen = gameOverRef.current;
    const gameOverScore = gameOverScoreRef.current;
    const gameOverLives = gameOverLivesRef.current;
    const startScore = startScoreRef.current;
    const startLives = startLivesRef.current;
    const retryButton = retryButtonRef.current;
    const qaQuestion = qaQuestionRef.current;
    const qaInput = qaInputRef.current;
    const qaSubmit = qaSubmitRef.current;
    const qaFeedback = qaFeedbackRef.current;

    if (
      !container ||
      !startScreen ||
      !settingsModal ||
      !teacherPanel ||
      !settingsBtn ||
      !soundToggle ||
      !teacherToggle ||
      !closeSettings ||
      !eurosEl ||
      !pointsEl ||
      !livesEl ||
      !gameOverScreen ||
      !gameOverScore ||
      !gameOverLives ||
      !startScore ||
      !startLives ||
      !retryButton ||
      !qaQuestion ||
      !qaInput ||
      !qaSubmit ||
      !qaFeedback
    ) {
      return;
    }

    const scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    const camSize = 350;
    const camera = new THREE.OrthographicCamera(
      -camSize * aspect,
      camSize * aspect,
      camSize,
      -camSize,
      1,
      1000,
    );
    camera.position.set(0, 100, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio ?? 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    let frog: Frog;
    const obstacles: Entity[] = [];
    const goals: Goal[] = [];
    let points = 0;
    let euros = 0;
    let lastPoints = 0;
    let lastEuros = 0;
    let lives = 3;

    let isPaused = true;
    let isGameStarted = false;
    let soundEnabled = true;
    let teacherMode = false;
    let teacherAIActive = false;
    let currentQuestion: GrammarQuestion | null = null;
    let lastTime = 0;
    let aiTimer = 0;
    let animationId = 0;
    let audioCtx: AudioContext | null = null;
    let isDisposed = false;
    const lifeIconSrc = '/games/frog-verbs/life.png';

    const Sound = {
      init: () => {
        if (!audioCtx) {
          const AudioContextConstructor =
            window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextConstructor) {
            audioCtx = new AudioContextConstructor();
          }
        }
      },
      playTone: (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if (!audioCtx || !soundEnabled) return;
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        } catch {
          // AudioContext may be suspended in some browsers.
        }
      },
      jump: () => Sound.playTone(300, 'square', 0.1),
      die: () => Sound.playTone(100, 'sawtooth', 0.3),
      win: () => {
        if (!soundEnabled) return;
        Sound.playTone(600, 'sine', 0.1);
        window.setTimeout(() => Sound.playTone(800, 'sine', 0.1), 100);
      },
      correct: () => Sound.playTone(1000, 'sine', 0.2),
      wrong: () => Sound.playTone(150, 'sawtooth', 0.2),
    };

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (url: string, smooth = false) => {
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
      texture.minFilter = smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
      return texture;
    };
    const createSpriteTexture = (source: THREE.Texture, frameCount: number) => {
      const texture = source.clone();
      texture.needsUpdate = true;
      texture.colorSpace = source.colorSpace;
      texture.magFilter = source.magFilter;
      texture.minFilter = source.minFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1 / frameCount, 1);
      texture.offset.set(0, 0);
      return texture;
    };

    const frogSheet = loadTexture('/games/frog-verbs/frog.png');
    const turtleSheet = loadTexture('/games/frog-verbs/turtle.png');
    const textures = {
      background: loadTexture('/games/frog-verbs/background.jpeg', true),
      frogSheet,
      turtleSheet,
      carFrames: [
        loadTexture('/games/frog-verbs/car-1.png'),
        loadTexture('/games/frog-verbs/car-2.png'),
        loadTexture('/games/frog-verbs/car-3.png'),
        loadTexture('/games/frog-verbs/car-4.png'),
      ],
      truck: loadTexture('/games/frog-verbs/truck.png'),
      logS: loadTexture('/games/frog-verbs/log1.png'),
      logM: loadTexture('/games/frog-verbs/log2.png'),
      logL: loadTexture('/games/frog-verbs/log3.png'),
      goal: loadTexture('/games/frog-verbs/goal.png'),
    };

    scene.background = null;

    type SpriteAnimation = {
      texture: THREE.Texture;
      frameCount: number;
      frame: number;
      timer: number;
      frameDuration: number;
    };

    const stepAnimation = (animation: SpriteAnimation, dt: number) => {
      animation.timer += dt;
      if (animation.timer < animation.frameDuration) return;
      animation.frame = (animation.frame + 1) % animation.frameCount;
      animation.texture.offset.x = animation.frame / animation.frameCount;
      animation.timer = 0;
    };

    class Entity {
      w: number;
      h: number;
      speed: number;
      mesh: THREE.Mesh;
      animation?: SpriteAnimation;
      row: number;
      laneType: 'road' | 'river';

      constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        texture: THREE.Texture,
        speed = 0,
        animation?: { texture: THREE.Texture; frameCount: number; frameDuration?: number },
      ) {
        this.w = w;
        this.h = h;
        this.speed = speed;
        this.row = y;
        this.laneType = y >= 7 && y <= 11 ? 'river' : 'road';
        if (animation) {
          this.animation = {
            texture: animation.texture,
            frameCount: animation.frameCount,
            frame: 0,
            timer: 0,
            frameDuration: animation.frameDuration ?? 0.2,
          };
        }
        const geometry = new THREE.PlaneGeometry(w, h);
        const material = new THREE.MeshBasicMaterial({
          map: this.animation?.texture ?? texture,
          transparent: true,
          side: THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(
          x * GRID_SIZE - GAME_WIDTH / 2 + w / 2,
          0,
          -(y * GRID_SIZE) + GAME_HEIGHT / 2 - GRID_SIZE / 2,
        );
        scene.add(this.mesh);
      }

      update(dt: number) {
        this.mesh.position.x += this.speed * dt;
        const limit = GAME_WIDTH / 2 + this.w;
        if (this.speed > 0 && this.mesh.position.x > limit) this.mesh.position.x = -limit;
        else if (this.speed < 0 && this.mesh.position.x < -limit) this.mesh.position.x = limit;
        if (this.animation) {
          stepAnimation(this.animation, dt);
        }
      }

      getBox() {
        const paddingX = 6;
        const paddingY = 6;
        return {
          x: this.mesh.position.x - this.w / 2 + paddingX,
          y: this.mesh.position.z - this.h / 2 + paddingY,
          w: this.w - paddingX * 2,
          h: this.h - paddingY * 2,
          speed: this.speed,
        };
      }
    }

    class Frog {
      w: number;
      h: number;
      gridX = 6;
      gridY = 0;
      isDead = false;
      onLogSpeed = 0;
      mesh: THREE.Mesh;
      animation: SpriteAnimation;

      constructor() {
        this.w = GRID_SIZE * 0.8;
        this.h = GRID_SIZE * 0.8;
        const spriteTexture = createSpriteTexture(textures.frogSheet, 8);
        this.animation = {
          texture: spriteTexture,
          frameCount: 8,
          frame: 0,
          timer: 0,
          frameDuration: 0.12,
        };
        const geometry = new THREE.PlaneGeometry(this.w, this.h);
        const material = new THREE.MeshBasicMaterial({ map: spriteTexture, transparent: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        scene.add(this.mesh);
        this.reset();
      }

      reset() {
        this.gridX = 6;
        this.gridY = 0;
        this.isDead = false;
        this.onLogSpeed = 0;
        this.updatePosition();
        this.mesh.rotation.z = 0;
      }

      move(dx: number, dy: number) {
        if (this.isDead || isPaused) return;
        const nextX = this.gridX + dx;
        const nextY = this.gridY + dy;

        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
          this.gridX = nextX;
          this.gridY = nextY;
          if (dx === 1) this.mesh.rotation.z = -Math.PI / 2;
          if (dx === -1) this.mesh.rotation.z = Math.PI / 2;
          if (dy === 1) this.mesh.rotation.z = 0;
          if (dy === -1) this.mesh.rotation.z = Math.PI;
          Sound.jump();
          this.updatePosition();
        }
      }

      updatePosition() {
        this.mesh.position.set(
          this.gridX * GRID_SIZE - GAME_WIDTH / 2 + GRID_SIZE / 2,
          1,
          -(this.gridY * GRID_SIZE) + GAME_HEIGHT / 2 - GRID_SIZE / 2,
        );
      }

      update(dt: number) {
        if (this.isDead) return;
        stepAnimation(this.animation, dt);
        if (this.gridY >= 7 && this.gridY <= 11) {
          this.mesh.position.x += this.onLogSpeed * dt;
        }
        if (this.mesh.position.x < -GAME_WIDTH / 2 || this.mesh.position.x > GAME_WIDTH / 2) {
          if (teacherMode && teacherAIActive) {
            this.mesh.position.x = Math.max(
              -GAME_WIDTH / 2 + 20,
              Math.min(GAME_WIDTH / 2 - 20, this.mesh.position.x),
            );
            const px = this.mesh.position.x + GAME_WIDTH / 2 - GRID_SIZE / 2;
            this.gridX = Math.round(px / GRID_SIZE);
          } else {
            handleDeath();
          }
        }
      }

      getBox() {
        const padding = 8;
        return {
          x: this.mesh.position.x - this.w / 2 + padding,
          y: this.mesh.position.z - this.h / 2 + padding,
          w: this.w - padding * 2,
          h: this.h - padding * 2,
        };
      }
    }

    const onResize = () => {
      const aspectRatio = container.clientWidth / container.clientHeight;
      camera.left = -camSize * aspectRatio;
      camera.right = camSize * aspectRatio;
      camera.top = camSize;
      camera.bottom = -camSize;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const handleInput = (event: KeyboardEvent) => {
      const settingsOpen = settingsModal.style.display === 'flex';
      if (settingsOpen) {
        if (event.key === 'Escape') closeSettingsMenu();
        return;
      }

      if (document.activeElement === qaInput) return;

      if (event.key === 'Escape') {
        openSettingsMenu();
        return;
      }

      if (teacherMode) return;

      if (event.key === 'ArrowUp') frog.move(0, 1);
      if (event.key === 'ArrowDown') frog.move(0, -1);
      if (event.key === 'ArrowLeft') frog.move(-1, 0);
      if (event.key === 'ArrowRight') frog.move(1, 0);
    };

    const toggleTeacherMode = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      teacherMode = target?.checked ?? false;

      if (teacherMode) {
        teacherPanel.style.display = 'flex';
        window.setTimeout(onResize, 50);
        if (isGameStarted) {
          frog.reset();
          startTeacherRound();
        }
      } else {
        teacherPanel.style.display = 'none';
        window.setTimeout(onResize, 50);
        teacherAIActive = false;

        if (isGameStarted) {
          isPaused = false;
          lastTime = performance.now();
          animationId = requestAnimationFrame(loop);
        }
      }
    };

    const startTeacherRound = () => {
      if (!teacherMode) return;
      teacherAIActive = false;
      isPaused = true;

      currentQuestion = GRAMMAR_QUESTIONS[Math.floor(Math.random() * GRAMMAR_QUESTIONS.length)];

      qaQuestion.innerText = currentQuestion.q;
      qaInput.value = '';
      qaInput.disabled = false;
      qaFeedback.innerText = '';
      qaInput.focus();
    };

    const submitAnswer = () => {
      if (!currentQuestion) return;
      const val = qaInput.value.trim().toLowerCase();

      if (val === currentQuestion.a) {
        euros += 5;
        points += 10;
        updateHUD();
        Sound.correct();
        qaFeedback.style.color = '#0f0';
        qaFeedback.innerText = 'CORRECT! Watching Frog...';
        qaInput.disabled = true;

        window.setTimeout(() => {
          isPaused = false;
          teacherAIActive = true;
          lastTime = performance.now();
          animationId = requestAnimationFrame(loop);
        }, 500);
      } else {
        euros -= 10;
        updateHUD();
        Sound.wrong();
        qaFeedback.style.color = '#ff0055';
        qaFeedback.innerText = 'WRONG! Try again.';
        qaInput.value = '';
        qaInput.focus();
      }
    };

    const updateAI = (dt: number) => {
      if (!teacherAIActive || frog.isDead) return;

      aiTimer += dt;
      if (aiTimer < 0.2) return;

      const updateGridFromPosition = () => {
        const px = frog.mesh.position.x + GAME_WIDTH / 2 - GRID_SIZE / 2;
        frog.gridX = Math.max(0, Math.min(COLS - 1, Math.round(px / GRID_SIZE)));
      };

      updateGridFromPosition();

      const inRiver = frog.gridY >= 7 && frog.gridY <= 11;
      const onLogNow = inRiver ? checkObstacleCollision(frog.getBox(), frog.gridY, 0, 'river') : false;

      const tryMove = (dx: number, dy: number) => {
        const nextX = frog.gridX + dx;
        const nextY = frog.gridY + dy;
        if (!isSafe(nextX, nextY)) return false;
        if (dx === 0 && dy === 0) return true;
        frog.move(dx, dy);
        return true;
      };

      if (inRiver) {
        const screenX = frog.mesh.position.x;
        const limit = GAME_WIDTH / 2 - 80;

        if (screenX > limit && tryMove(-1, 0)) {
          aiTimer = 0;
          return;
        }
        if (screenX < -limit && tryMove(1, 0)) {
          aiTimer = 0;
          return;
        }
      }

      const candidates = inRiver && !onLogNow
        ? [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
          ]
        : [
            { dx: 0, dy: 1 },
            { dx: 0, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
          ];

      for (const candidate of candidates) {
        if (tryMove(candidate.dx, candidate.dy)) {
          aiTimer = 0;
          return;
        }
      }

    };

    const isSafe = (gx: number, gy: number) => {
      if (gx < 0 || gx >= COLS || gy > 12) return false;
      if (gy === 0 || gy === 6 || gy === 12) return true;

      const testX = gx * GRID_SIZE - GAME_WIDTH / 2 + GRID_SIZE / 2;
      const testZ = -(gy * GRID_SIZE) + GAME_HEIGHT / 2 - GRID_SIZE / 2;

      const aiBuffer = 10;
      const box = {
        x: testX - 12 - aiBuffer,
        y: testZ - 12,
        w: 24 + aiBuffer * 2,
        h: 24,
      };

      if (gy >= 1 && gy <= 5) {
        if (checkObstacleCollision(box, gy, 0, 'road')) return false;
        if (checkObstacleCollision(box, gy, 0.35, 'road')) return false;
        return true;
      }

      if (gy >= 7 && gy <= 11) {
        return (
          checkObstacleCollision(box, gy, 0, 'river') &&
          checkObstacleCollision(box, gy, 0.35, 'river')
        );
      }

      return true;
    };

    const checkObstacleCollision = (
      box: { x: number; y: number; w: number; h: number },
      targetRow: number,
      timeOffset: number,
      laneType?: 'road' | 'river',
    ) => {
      for (const obs of obstacles) {
        if (obs.row === targetRow && (!laneType || obs.laneType === laneType)) {
          const ob = obs.getBox();
          const futureObsX = ob.x + ob.speed * timeOffset;

          if (
            box.x < futureObsX + ob.w &&
            box.x + box.w > futureObsX &&
            box.y < ob.y + ob.h &&
            box.y + box.h > ob.y
          ) {
            return true;
          }
        }
      }
      return false;
    };

    const createEnvironment = () => {
      const geo = new THREE.PlaneGeometry(GAME_WIDTH, GAME_HEIGHT);
      const mat = new THREE.MeshBasicMaterial({ map: textures.background });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, -1, 0);
      scene.add(mesh);
    };

    const createObstacles = () => {
      const addLane = (
        row: number,
        speed: number,
        texture: THREE.Texture | (() => THREE.Texture),
        width: number,
        spacing: number,
        offset = 0,
        animation?: { source: THREE.Texture; frameCount: number; frameDuration?: number },
      ) => {
        const count = Math.ceil(GAME_WIDTH / spacing) + 1;
        for (let i = 0; i < count; i += 1) {
          const x = (i * spacing) / GRID_SIZE + offset - COLS / 2;
          const chosenTexture = typeof texture === 'function' ? texture() : texture;
          const entityAnimation = animation
            ? {
                texture: createSpriteTexture(animation.source, animation.frameCount),
                frameCount: animation.frameCount,
                frameDuration: animation.frameDuration,
              }
            : undefined;
          obstacles.push(new Entity(x, row, width, GRID_SIZE * 0.8, chosenTexture, speed, entityAnimation));
        }
      };
      addLane(1, -60, () => textures.carFrames[Math.floor(Math.random() * textures.carFrames.length)], 40, 150);
      addLane(2, 40, textures.truck, 60, 200, 2);
      addLane(3, -90, () => textures.carFrames[Math.floor(Math.random() * textures.carFrames.length)], 40, 180, 1);
      addLane(4, 50, () => textures.carFrames[Math.floor(Math.random() * textures.carFrames.length)], 40, 160, 4);
      addLane(5, -50, textures.truck, 80, 250, 3);
      addLane(
        7,
        -50,
        textures.turtleSheet,
        40,
        100,
        0,
        {
          source: textures.turtleSheet,
          frameCount: 9,
          frameDuration: 0.18,
        },
      );
      addLane(8, 40, textures.logS, 80, 160);
      addLane(9, -70, textures.logL, 160, 300);
      addLane(10, 60, textures.logM, 120, 250);
      addLane(
        11,
        -80,
        textures.turtleSheet,
        40,
        120,
        2,
        {
          source: textures.turtleSheet,
          frameCount: 9,
          frameDuration: 0.18,
        },
      );
    };

    const createGoals = () => {
      const goalSlotRatios = [0.065, 0.279, 0.494, 0.706, 0.917];
      const goalZ = -GAME_HEIGHT / 2 + GAME_HEIGHT * 0.0375;
      for (let i = 0; i < goalSlotRatios.length; i += 1) {
        const xWorld = goalSlotRatios[i] * GAME_WIDTH - GAME_WIDTH / 2;
        goals.push({ xWorld, zWorld: goalZ, filled: false, mesh: null });
      }
    };

    const checkCollisions = () => {
      const fb = frog.getBox();

      if (frog.gridY === 12) {
        const snapDistance = GRID_SIZE * 0.7;
        const targetIndex = goals.findIndex(
          (goal) => !goal.filled && Math.abs(frog.mesh.position.x - goal.xWorld) <= snapDistance,
        );
        if (targetIndex !== -1) {
          winLevel(targetIndex);
        } else {
          handleDeath();
        }
        return;
      }

      let safeOnLog = false;
      const frogRow = frog.gridY;

      if ((frogRow >= 1 && frogRow <= 5) || (frogRow >= 7 && frogRow <= 11)) {
        for (const obs of obstacles) {
          if (obs.row === frogRow) {
            const ob = obs.getBox();
            const collision =
              fb.x < ob.x + ob.w &&
              fb.x + fb.w > ob.x &&
              fb.y < ob.y + ob.h &&
              fb.y + fb.h > ob.y;

            if (collision) {
              if (frogRow >= 7) {
                safeOnLog = true;
                frog.onLogSpeed = obs.speed;
              } else if (!teacherMode) {
                handleDeath();
              }
            }
          }
        }
      }

      if (frogRow >= 7 && frogRow <= 11) {
        if (!safeOnLog && !teacherMode) handleDeath();
      } else {
        frog.onLogSpeed = 0;
      }
    };

    const winLevel = (index: number) => {
      goals[index].filled = true;
      Sound.win();
      const goalMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshBasicMaterial({ map: textures.goal, transparent: true }),
      );
      goalMesh.rotation.x = -Math.PI / 2;
      goalMesh.position.set(
        goals[index].xWorld,
        2,
        goals[index].zWorld,
      );
      scene.add(goalMesh);
      goals[index].mesh = goalMesh;

      if (goals.every((goal) => goal.filled)) {
        window.alert('YOU WON! Resetting...');
        resetGame();
      } else {
        frog.reset();
        if (teacherMode) startTeacherRound();
      }
      updateHUD();
    };

    const handleDeath = () => {
      if (frog.isDead) return;
      frog.isDead = true;
      Sound.die();
      lives -= 1;
      updateHUD();

      if (lives <= 0) {
        window.setTimeout(() => {
          isPaused = true;
          gameOverScreen.style.display = 'flex';
        }, 500);
      } else {
        window.setTimeout(() => {
          frog.reset();
          if (teacherMode) {
            frog.reset();
            teacherAIActive = true;
          }
        }, 1000);
      }
    };

    const resetGame = () => {
      lastPoints = points;
      lastEuros = euros;
      points = 0;
      euros = 0;
      lives = 3;
      gameOverScreen.style.display = 'none';
      goals.forEach((goal) => {
        goal.filled = false;
        if (goal.mesh) {
          scene.remove(goal.mesh);
          goal.mesh = null;
        }
      });
      updateHUD();
      frog.reset();
      if (teacherMode) startTeacherRound();
    };

    const updateHUD = () => {
      eurosEl.innerText = `€ ${euros}`;
      pointsEl.innerText = `${points} pts`;
      livesEl.innerHTML = '';
      const label = document.createElement('span');
      label.textContent = 'LIVES';
      livesEl.appendChild(label);
      const lifeCount = Math.min(lives, 3);
      for (let i = 0; i < lifeCount; i += 1) {
        const icon = document.createElement('img');
        icon.src = lifeIconSrc;
        icon.alt = '';
        icon.className = styles.lifeIcon;
        livesEl.appendChild(icon);
      }
      gameOverScore.innerText = `€${euros} • ${points} pts`;
      gameOverLives.innerHTML = '';
      const livesLabel = document.createElement('span');
      livesLabel.textContent = 'LIVES';
      gameOverLives.appendChild(livesLabel);
      for (let i = 0; i < lifeCount; i += 1) {
        const icon = document.createElement('img');
        icon.src = lifeIconSrc;
        icon.alt = '';
        icon.className = styles.lifeIcon;
        gameOverLives.appendChild(icon);
      }

      startScore.innerText = `LAST €${lastEuros} • ${lastPoints} pts`;
      startLives.innerHTML = '';
      const startLivesLabel = document.createElement('span');
      startLivesLabel.textContent = 'LIVES';
      startLives.appendChild(startLivesLabel);
      for (let i = 0; i < lifeCount; i += 1) {
        const icon = document.createElement('img');
        icon.src = lifeIconSrc;
        icon.alt = '';
        icon.className = styles.lifeIcon;
        startLives.appendChild(icon);
      }
    };

    const openSettingsMenu = () => {
      isPaused = true;
      settingsModal.style.display = 'flex';
    };

    const closeSettingsMenu = () => {
      settingsModal.style.display = 'none';
      if (isGameStarted) {
        isPaused = false;
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
      }
    };

    const loop = (time: number) => {
      if (isDisposed || isPaused) return;
      animationId = requestAnimationFrame(loop);

      const dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.1) return;

      obstacles.forEach((obs) => obs.update(dt));
      frog.update(dt);

      if (teacherMode) updateAI(dt);

      checkCollisions();
      renderer.render(scene, camera);
    };

    const startGame = () => {
      Sound.init();
      startScreen.style.display = 'none';
      isGameStarted = true;
      isPaused = false;
      lastTime = performance.now();

      if (teacherMode) {
        teacherToggle.checked = true;
        toggleTeacherMode({ target: teacherToggle } as unknown as Event);
      } else {
        animationId = requestAnimationFrame(loop);
      }
    };

    const onSoundToggle = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      soundEnabled = target?.checked ?? true;
    };

    const onTeacherToggle = (event: Event) => toggleTeacherMode(event);

    const onQaKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') submitAnswer();
    };

    const onRetry = () => {
      resetGame();
      if (!teacherMode) {
        isPaused = false;
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
      }
    };

    const init = () => {
      createEnvironment();
      frog = new Frog();
      createObstacles();
      createGoals();
      updateHUD();

      window.addEventListener('keydown', handleInput);
      window.addEventListener('resize', onResize);
      startScreen.addEventListener('click', startGame);
      settingsBtn.addEventListener('click', openSettingsMenu);
      closeSettings.addEventListener('click', closeSettingsMenu);
      soundToggle.addEventListener('change', onSoundToggle);
      teacherToggle.addEventListener('change', onTeacherToggle);
      qaSubmit.addEventListener('click', submitAnswer);
      qaInput.addEventListener('keydown', onQaKeydown);
      retryButton.addEventListener('click', onRetry);

      teacherToggle.checked = true;
      toggleTeacherMode({ target: teacherToggle } as unknown as Event);
    };

    init();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('resize', onResize);
      startScreen.removeEventListener('click', startGame);
      settingsBtn.removeEventListener('click', openSettingsMenu);
      closeSettings.removeEventListener('click', closeSettingsMenu);
      soundToggle.removeEventListener('change', onSoundToggle);
      teacherToggle.removeEventListener('change', onTeacherToggle);
      qaSubmit.removeEventListener('click', submitAnswer);
      qaInput.removeEventListener('keydown', onQaKeydown);
      retryButton.removeEventListener('click', onRetry);

      textures.background.dispose();
      textures.frogSheet.dispose();
      textures.turtleSheet.dispose();
      textures.carFrames.forEach((texture) => texture.dispose());
      textures.truck.dispose();
      textures.logS.dispose();
      textures.logM.dispose();
      textures.logL.dispose();
      textures.goal.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={styles.appContainer}>
      <div ref={gameViewRef} className={styles.gameView}>
        <div className={styles.uiLayer}>
        <div className={styles.hud}>
          <div>
            <div ref={eurosRef}>€ 0</div>
            <div ref={pointsRef}>0 pts</div>
          </div>
          <button ref={settingsBtnRef} className={styles.settingsBtn} title="Settings" type="button">
            ⚙️
          </button>
          <div ref={livesRef} className={styles.lives} aria-label="Lives" />
        </div>
      </div>
    </div>

      <div ref={teacherPanelRef} className={styles.teacherPanel}>
        <h2>English Challenge</h2>
        <div className={styles.qaContainer}>
          <div ref={qaQuestionRef} className={styles.qaQuestion}>
            Waiting...
          </div>
          <div className={styles.qaInputRow}>
            <input
              ref={qaInputRef}
              className={styles.qaInput}
              type="text"
              placeholder="answer..."
              autoComplete="off"
            />
            <button ref={qaSubmitRef} className={styles.qaSubmit} type="button">
              GO
            </button>
          </div>
          <div ref={qaFeedbackRef} className={styles.qaFeedback} />
        </div>
      </div>

      <div ref={startScreenRef} className={`${styles.modal} ${styles.startScreen}`}>
        <Image
          className={styles.titleImage}
          src="/games/frog-verbs/froggerTitle.png"
          alt="Frogger 3D"
          width={420}
          height={180}
          priority
        />
        <div className={styles.startStats}>
          <div ref={startScoreRef} className={styles.startScore}>
            LAST €0 • 0 pts
          </div>
          <div ref={startLivesRef} className={styles.startLives}>
            LIVES
          </div>
        </div>
        <p>ARROWS to Move</p>
        <p className={styles.blink}>CLICK TO START</p>
      </div>

      <div ref={settingsModalRef} className={`${styles.modal} ${styles.settingsModal}`}>
        <h2>SETTINGS</h2>
        <div className={styles.settingRow}>
          <input
            ref={soundToggleRef}
            className={styles.toggle}
            id="sound-toggle"
            type="checkbox"
            defaultChecked
          />
          <label htmlFor="sound-toggle">SOUND EFFECTS</label>
        </div>
        <div className={styles.settingRow}>
          <input
            ref={teacherToggleRef}
            className={styles.toggle}
            id="teacher-toggle"
            type="checkbox"
            defaultChecked
          />
          <label htmlFor="teacher-toggle">ENGLISH TEACHER</label>
        </div>
        <button ref={closeSettingsRef} className={styles.closeBtn} type="button">
          RESUME
        </button>
      </div>

      <div ref={gameOverRef} className={`${styles.modal} ${styles.gameOver}`}>
        <Image
          className={styles.gameOverImage}
          src="/games/frog-verbs/gameOverScreen.png"
          alt="Game over"
          width={420}
          height={180}
          priority
        />
        <div className={styles.gameOverStats}>
          <div ref={gameOverScoreRef} className={styles.gameOverScore}>
            €0 • 0 pts
          </div>
          <div ref={gameOverLivesRef} className={styles.gameOverLives}>
            LIVES
          </div>
        </div>
        <button ref={retryButtonRef} className={styles.retryBtn} type="button">
          <Image src="/games/frog-verbs/RetryButton.png" alt="Retry" width={200} height={70} />
        </button>
      </div>
    </div>
  );
}
