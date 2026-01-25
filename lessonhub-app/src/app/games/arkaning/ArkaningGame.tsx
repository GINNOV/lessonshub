'use client';

import { useEffect, useRef, useState } from 'react';
import Confetti from '@/app/components/Confetti';

type AnswerChoice = 'ing' | 'not-ing';

type Question = {
  prompt: string;
  answer: AnswerChoice;
  reveal: string;
};

type ArkaningSettings = {
  roundsPerCorrect: number;
  pointsPerCorrect: number;
  eurosPerCorrect: number;
  lives: number;
  loseLifeOnWrong: boolean;
  wrongsPerLife: number;
};

type Brick = {
  row: number;
  col: number;
  alive: boolean;
};

const DEFAULT_QUESTIONS: Question[] = [
  { prompt: 'I enjoy ___ (read) before bed.', answer: 'ing', reveal: 'reading' },
  { prompt: 'She decided ___ (study) harder.', answer: 'not-ing', reveal: 'to study' },
  { prompt: 'We avoid ___ (drive) at night.', answer: 'ing', reveal: 'driving' },
  { prompt: 'He hopes ___ (get) a new job.', answer: 'not-ing', reveal: 'to get' },
  { prompt: 'They admitted ___ (cheat).', answer: 'ing', reveal: 'cheating' },
  { prompt: 'I need ___ (finish) this today.', answer: 'not-ing', reveal: 'to finish' },
  { prompt: 'She kept ___ (ask) questions.', answer: 'ing', reveal: 'asking' },
  { prompt: 'We plan ___ (travel) in July.', answer: 'not-ing', reveal: 'to travel' },
  { prompt: 'He suggested ___ (meet) earlier.', answer: 'ing', reveal: 'meeting' },
  { prompt: 'I want ___ (learn) more English.', answer: 'not-ing', reveal: 'to learn' },
  { prompt: 'She finished ___ (clean) the room.', answer: 'ing', reveal: 'cleaning' },
  { prompt: 'They agreed ___ (wait) outside.', answer: 'not-ing', reveal: 'to wait' },
];

const DEFAULT_SETTINGS: ArkaningSettings = {
  roundsPerCorrect: 3,
  pointsPerCorrect: 10,
  eurosPerCorrect: 5,
  lives: 5,
  loseLifeOnWrong: true,
  wrongsPerLife: 1,
};

const START_ROWS = 4;
const BRICK_COLS = 9;
const BRICK_GAP = 10;
const BRICK_HEIGHT = 22;
const BRICK_TOP_OFFSET = 70;
const PADDLE_HEIGHT = 16;
const PADDLE_WIDTH = 130;
const PADDLE_MARGIN = 30;
const QUESTION_SAFE_PADDING = 24;
const QUESTION_PANEL_HEIGHT = 170;
const PADDLE_DROP = 0;
const BALL_RADIUS = 8;
const ROUND_DELAY_MS = 3000;
const OUTBOUND_MS = 650;
const RETURN_MS = 650;
const PENALTY_POINTS = 50;
const PENALTY_EUROS = 50;

export default function ArkaningGame({
  questions = DEFAULT_QUESTIONS,
  settings = DEFAULT_SETTINGS,
  embedded = false,
  assignmentId,
}: {
  questions?: Question[];
  settings?: ArkaningSettings;
  embedded?: boolean;
  assignmentId?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<HTMLDivElement | null>(null);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const gameOverRef = useRef<HTMLDivElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const feedbackRevealRef = useRef<HTMLSpanElement | null>(null);
  const feedbackChipRef = useRef<HTMLDivElement | null>(null);
  const countdownRef = useRef<HTMLDivElement | null>(null);
  const pointsRef = useRef<HTMLDivElement | null>(null);
  const eurosRef = useRef<HTMLDivElement | null>(null);
  const livesRef = useRef<HTMLDivElement | null>(null);
  const answerIngRef = useRef<HTMLButtonElement | null>(null);
  const answerNotIngRef = useRef<HTMLButtonElement | null>(null);
  const questionPanelRef = useRef<HTMLDivElement | null>(null);
  const questionProgressRef = useRef<HTMLDivElement | null>(null);
  const gameOverTitleRef = useRef<HTMLDivElement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const playfield = playfieldRef.current;
    const canvas = canvasRef.current;
    const startScreen = startRef.current;
    const startButton = startButtonRef.current;
    const gameOverScreen = gameOverRef.current;
    const restartButton = restartButtonRef.current;
    const questionEl = questionRef.current;
    const feedbackEl = feedbackRef.current;
    const feedbackRevealEl = feedbackRevealRef.current;
    const feedbackChipEl = feedbackChipRef.current;
    const countdownEl = countdownRef.current;
    const pointsEl = pointsRef.current;
    const eurosEl = eurosRef.current;
    const livesEl = livesRef.current;
    const answerIngBtn = answerIngRef.current;
    const answerNotIngBtn = answerNotIngRef.current;
    const questionPanel = questionPanelRef.current;
    const questionProgressEl = questionProgressRef.current;
    const gameOverTitleEl = gameOverTitleRef.current;

    if (
      !container ||
      !canvas ||
      !startScreen ||
      !startButton ||
      !gameOverScreen ||
      !restartButton ||
      !questionEl ||
      !feedbackEl ||
      !feedbackRevealEl ||
      !feedbackChipEl ||
      !countdownEl ||
      !pointsEl ||
      !eurosEl ||
      !livesEl ||
      !answerIngBtn ||
      !answerNotIngBtn ||
      !questionPanel ||
      !playfield ||
      !questionProgressEl ||
      !gameOverTitleEl
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let isDisposed = false;
    let isGameStarted = false;
    let isGameOver = false;
    let canAnswer = false;
    let questionIndex = 0;
    let questionsAnswered = 0;
    let hadWrongAnswer = false;
    let shouldEndAfterRound = false;
    let shouldWinAtEnd = false;
    let hasRecordedOutcome = false;

    let points = 0;
    let euros = 0;
    let lives = Math.max(1, settings.lives);
    let wrongAnswerCount = 0;
    let bricks: Brick[] = [];
    let maxRow = START_ROWS - 1;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let brickWidth = 0;
    let paddleX = 0;
    let paddleY = 0;

    let roundState: 'idle' | 'countdown' | 'outbound' | 'returning' = 'idle';
    let countdownEnd = 0;
    let outboundStart = 0;
    let returnStart = 0;
    let tripsRemaining = 0;
    let lastCountdownNumber = 0;
    let targetBrick: Brick | null = null;
    let outboundFrom = { x: 0, y: 0 };
    let outboundTo = { x: 0, y: 0 };
    let returnFrom = { x: 0, y: 0 };
    let returnTo = { x: 0, y: 0 };

    const ball = { x: 0, y: 0, r: BALL_RADIUS };
    let isDragging = false;
    const paddleSprite = new Image();
    paddleSprite.src = '/games/arkaning/sprites/Player.gif';
    const ballSprite = new Image();
    ballSprite.src = '/games/arkaning/sprites/EnergyBall.png';
    const brickSpritePaths = [
      '/games/arkaning/sprites/BlueWall.png',
      '/games/arkaning/sprites/GoldWall.png',
      '/games/arkaning/sprites/GreenWall.png',
      '/games/arkaning/sprites/LightBlueWall.png',
      '/games/arkaning/sprites/OrangeWall.png',
      '/games/arkaning/sprites/PinkWall.png',
      '/games/arkaning/sprites/RedWall.png',
      '/games/arkaning/sprites/SilverWall.png',
      '/games/arkaning/sprites/WhiteWall.png',
      '/games/arkaning/sprites/YellowWall.png',
    ];
    const brickSprites = brickSpritePaths.map((path) => {
      const img = new Image();
      img.src = path;
      return img;
    });

    const countdownSound = new Audio('/games/arkaning/sounds/bump.mp3');
    const brickHitSound = new Audio('/games/arkaning/sounds/brickhit.wav');
    const failSound = new Audio('/games/arkaning/sounds/fail.wav');
    const ballStartSounds = [
      new Audio('/games/arkaning/sounds/ballstart.wav'),
      new Audio('/games/arkaning/sounds/ballstart2.wav'),
    ];

    const playSound = (audio: HTMLAudioElement) => {
      const node = audio.cloneNode(true) as HTMLAudioElement;
      node.play().catch(() => {});
    };

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const getQuestionSource = () => (questions.length ? questions : DEFAULT_QUESTIONS);
    const questionTotal = getQuestionSource().length;

    const updateHud = () => {
      pointsEl.innerText = `${points} pts`;
      eurosEl.innerText = `€ ${euros}`;
      livesEl.innerText = `Lives: ${lives}`;
    };
    const updateQuestionProgress = () => {
      const remaining = Math.max(0, questionTotal - questionsAnswered);
      questionProgressEl.innerText = `${remaining} question${remaining === 1 ? '' : 's'} left`;
    };

    const recordOutcome = async (outcome: 'correct' | 'wrong') => {
      if (!assignmentId) {
        return {
          pointsDelta: outcome === 'correct' ? settings.pointsPerCorrect : -PENALTY_POINTS,
          eurosDelta: outcome === 'correct' ? settings.eurosPerCorrect : -PENALTY_EUROS,
        };
      }
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/arkaning`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Unable to record score.');
        }
        return await response.json();
      } catch {
        setFeedback('Unable to save score. Please retry.', 'neutral');
        return null;
      }
    };

    const setFeedback = (
      message: string,
      variant: 'correct' | 'wrong' | 'neutral',
      reveal?: string,
    ) => {
      feedbackEl.innerText = message;
      if (reveal) {
        feedbackRevealEl.innerText = reveal;
        feedbackRevealEl.className =
          'ml-2 inline-flex items-center rounded-full border border-amber-300/60 bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100';
      } else {
        feedbackRevealEl.innerText = '';
        feedbackRevealEl.className = 'hidden';
      }
      if (variant === 'correct') {
        feedbackChipEl.innerText = 'Correct';
        feedbackChipEl.className =
          'rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100';
      } else if (variant === 'wrong') {
        feedbackChipEl.innerText = 'Wrong';
        feedbackChipEl.className =
          'rounded-full border border-rose-400/60 bg-rose-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100';
      } else {
        feedbackChipEl.innerText = '';
        feedbackChipEl.className = 'hidden';
      }
    };

    const clearFeedback = () => {
      feedbackEl.innerText = '';
      feedbackRevealEl.innerText = '';
      feedbackRevealEl.className = 'hidden';
      feedbackChipEl.innerText = '';
      feedbackChipEl.className = 'hidden';
    };

    const nextQuestion = () => {
      const source = getQuestionSource();
      const question = source[questionIndex % source.length];
      questionIndex += 1;
      questionEl.innerText = question.prompt;
      questionEl.dataset.answer = question.answer;
      questionEl.dataset.reveal = question.reveal;
    };

    const initBricks = (rows: number) => {
      bricks = [];
      maxRow = rows - 1;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < BRICK_COLS; col += 1) {
          bricks.push({ row, col, alive: true });
        }
      }
    };

    const addBrickRow = () => {
      maxRow += 1;
      for (let col = 0; col < BRICK_COLS; col += 1) {
        bricks.push({ row: maxRow, col, alive: true });
      }
    };

    const activeBricks = () => bricks.filter((brick) => brick.alive);

    const getBrickCenter = (brick: Brick) => {
      const x = (canvasWidth - brickWidth * BRICK_COLS - BRICK_GAP * (BRICK_COLS - 1)) / 2;
      const brickX = x + brick.col * (brickWidth + BRICK_GAP);
      const brickY = BRICK_TOP_OFFSET + brick.row * (BRICK_HEIGHT + BRICK_GAP);
      return { x: brickX + brickWidth / 2, y: brickY + BRICK_HEIGHT / 2 };
    };

    const checkBricksOverflow = () => {
      const bottom = BRICK_TOP_OFFSET + (maxRow + 1) * (BRICK_HEIGHT + BRICK_GAP);
      return bottom >= paddleY - 10;
    };

    const resetRound = () => {
      roundState = 'idle';
      tripsRemaining = 0;
      lastCountdownNumber = 0;
      countdownEl.innerText = '';
      countdownEl.classList.add('hidden');
      targetBrick = null;
      ball.x = paddleX;
      ball.y = paddleY - ball.r - 2;
    };

    const startCountdown = () => {
      roundState = 'countdown';
      lastCountdownNumber = 0;
      countdownEnd = performance.now() + ROUND_DELAY_MS;
      countdownEl.innerText = '3';
      countdownEl.classList.remove('hidden');
    };

    const startOutbound = () => {
      roundState = 'outbound';
      outboundStart = performance.now();
      outboundFrom = { x: paddleX, y: paddleY - ball.r - 2 };
      outboundTo = targetBrick ? getBrickCenter(targetBrick) : { x: paddleX, y: BRICK_TOP_OFFSET };
      const ballStart = ballStartSounds[Math.floor(Math.random() * ballStartSounds.length)];
      playSound(ballStart);
    };

    const startReturn = () => {
      roundState = 'returning';
      returnStart = performance.now();
      returnFrom = { x: ball.x, y: ball.y };
      returnTo = { x: paddleX, y: paddleY - ball.r - 2 };
    };

    const startNextTrip = (withCountdown: boolean) => {
      const available = activeBricks();
      if (available.length === 0) {
        initBricks(START_ROWS);
      }
      const pool = activeBricks();
      const columns = Array.from(new Set(pool.map((brick) => brick.col)));
      const chosenColumn = columns[Math.floor(Math.random() * columns.length)];
      const columnBricks = pool.filter((brick) => brick.col === chosenColumn);
      targetBrick =
        columnBricks.sort((a, b) => b.row - a.row)[0] ??
        pool[Math.floor(Math.random() * pool.length)] ??
        null;
      if (withCountdown) {
        startCountdown();
      } else {
        roundState = 'idle';
        countdownEl.innerText = '';
        countdownEl.classList.add('hidden');
        startOutbound();
      }
    };

    const startRound = () => {
      tripsRemaining = Math.max(1, settings.roundsPerCorrect);
      startNextTrip(true);
    };

    const recordGameOutcome = async (won: boolean) => {
      if (!assignmentId || hasRecordedOutcome) return;
      hasRecordedOutcome = true;
      await fetch(`/api/assignments/${assignmentId}/arkaning/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: won ? 'win' : 'lose' }),
      }).catch(() => {});
    };

    const finalizeGame = (won: boolean) => {
      isGameOver = true;
      canAnswer = false;
      roundState = 'idle';
      countdownEl.innerText = '';
      countdownEl.classList.add('hidden');
      gameOverTitleEl.textContent = won ? 'Lesson Complete' : 'Game Over';
      gameOverTitleEl.className = `text-3xl font-black uppercase tracking-[0.25em] ${
        won ? 'text-emerald-200' : 'text-rose-200'
      }`;
      setShowConfetti(won);
      recordGameOutcome(won);
      gameOverScreen.classList.remove('hidden');
      const scoreEl = gameOverScreen.querySelector('[data-score]');
      if (scoreEl) {
        scoreEl.textContent = `€${euros} • ${points} pts`;
      }
    };

    const registerAnswer = (wasCorrect: boolean) => {
      questionsAnswered += 1;
      if (!wasCorrect) {
        hadWrongAnswer = true;
      }
      updateQuestionProgress();
      if (questionsAnswered >= questionTotal) {
        if (wasCorrect) {
          shouldEndAfterRound = true;
          shouldWinAtEnd = !hadWrongAnswer;
        } else {
          finalizeGame(false);
        }
        return true;
      }
      return false;
    };

    const handleCorrectAnswer = async () => {
      const result = await recordOutcome('correct');
      if (!result) {
        canAnswer = true;
        return;
      }
      const isLast = registerAnswer(true);
      points += result.pointsDelta;
      euros += result.eurosDelta;
      updateHud();
      setFeedback(
        `Correct! You earned ${settings.pointsPerCorrect} points and €${settings.eurosPerCorrect} in savings.`,
        'correct',
      );
      canAnswer = false;
      if (isLast) {
        startRound();
        return;
      }
      startRound();
    };

    const handleWrongAnswer = async (question: Question) => {
      const result = await recordOutcome('wrong');
      if (!result) {
        canAnswer = true;
        return;
      }
      const isLast = registerAnswer(false);
      points += result.pointsDelta;
      euros += result.eurosDelta;
      wrongAnswerCount += 1;
      playSound(failSound);
      if (settings.loseLifeOnWrong) {
        lives -= 1;
        wrongAnswerCount = 0;
      } else if (settings.wrongsPerLife > 0 && wrongAnswerCount >= settings.wrongsPerLife) {
        lives -= 1;
        wrongAnswerCount = 0;
      }
      updateHud();
      setFeedback(
        `The correct answer is`,
        'wrong',
        question.reveal,
      );
      addBrickRow();
      if (isLast && isGameOver) {
        return;
      }
      if (lives <= 0 || checkBricksOverflow()) {
        finalizeGame(false);
        return;
      }
      nextQuestion();
      canAnswer = true;
    };

    const handleAnswer = async (choice: AnswerChoice) => {
      if (!isGameStarted || isGameOver || !canAnswer) return;
      canAnswer = false;
      const source = getQuestionSource();
      const question = source[(questionIndex - 1 + source.length) % source.length];
      const correct = question.answer === choice;
      if (correct) {
        await handleCorrectAnswer();
      } else {
        await handleWrongAnswer(question);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isGameStarted || isGameOver || !isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      paddleX = clamp(x, PADDLE_WIDTH / 2 + 16, canvasWidth - PADDLE_WIDTH / 2 - 16);
      if (roundState === 'idle' || roundState === 'countdown') {
        ball.x = paddleX;
        ball.y = paddleY - ball.r - 2;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isGameStarted || isGameOver) return;
      isDragging = true;
      canvas.setPointerCapture(event.pointerId);
      handlePointerMove(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isGameStarted || isGameOver) return;
      isDragging = false;
      canvas.releasePointerCapture(event.pointerId);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isGameStarted || isGameOver) return;
      if (event.key === 'ArrowLeft') {
        paddleX = clamp(paddleX - 28, PADDLE_WIDTH / 2 + 16, canvasWidth - PADDLE_WIDTH / 2 - 16);
      }
      if (event.key === 'ArrowRight') {
        paddleX = clamp(paddleX + 28, PADDLE_WIDTH / 2 + 16, canvasWidth - PADDLE_WIDTH / 2 - 16);
      }
    };

    const resizeCanvas = () => {
      const rect = playfield.getBoundingClientRect();
      const dpr = window.devicePixelRatio ?? 1;
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      brickWidth =
        (canvasWidth - BRICK_GAP * (BRICK_COLS - 1) - 80) / BRICK_COLS;
      brickWidth = Math.max(46, brickWidth);
      paddleY = canvasHeight - PADDLE_MARGIN + PADDLE_DROP;
      paddleX = clamp(paddleX || canvasWidth / 2, PADDLE_WIDTH / 2 + 16, canvasWidth - PADDLE_WIDTH / 2 - 16);
      if (roundState === 'idle') {
        ball.x = paddleX;
        ball.y = paddleY - ball.r - 2;
      }
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    };

    const drawBricks = () => {
      const leftMargin = (canvasWidth - brickWidth * BRICK_COLS - BRICK_GAP * (BRICK_COLS - 1)) / 2;
      bricks.forEach((brick) => {
        if (!brick.alive) return;
        const x = leftMargin + brick.col * (brickWidth + BRICK_GAP);
        const y = BRICK_TOP_OFFSET + brick.row * (BRICK_HEIGHT + BRICK_GAP);
        const sprite = brickSprites[(brick.row + brick.col) % brickSprites.length];
        if (sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(sprite, x, y, brickWidth, BRICK_HEIGHT);
        } else {
          const hue = (brick.row * 35 + brick.col * 18) % 360;
          ctx.fillStyle = `hsl(${hue} 70% 55%)`;
          ctx.fillRect(x, y, brickWidth, BRICK_HEIGHT);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, brickWidth - 2, BRICK_HEIGHT - 2);
        }
      });
    };

    const drawPaddle = () => {
      if (paddleSprite.complete && paddleSprite.naturalWidth > 0) {
        ctx.drawImage(
          paddleSprite,
          paddleX - PADDLE_WIDTH / 2,
          paddleY - PADDLE_HEIGHT / 2,
          PADDLE_WIDTH,
          PADDLE_HEIGHT
        );
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(paddleX - PADDLE_WIDTH / 2, paddleY - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.strokeRect(paddleX - PADDLE_WIDTH / 2, paddleY - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
      }
    };

    const drawBall = () => {
      if (ballSprite.complete && ballSprite.naturalWidth > 0) {
        ctx.drawImage(ballSprite, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
      } else {
        ctx.beginPath();
        ctx.fillStyle = '#fbbf24';
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const updateRoundState = (now: number) => {
      if (roundState === 'countdown') {
        const remaining = Math.max(0, countdownEnd - now);
        const count = Math.ceil(remaining / 1000);
        countdownEl.innerText = `${count}`;
        if (count !== lastCountdownNumber) {
          lastCountdownNumber = count;
          playSound(countdownSound);
        }
        ball.x = paddleX;
        ball.y = paddleY - ball.r - 2;
        if (remaining <= 0) {
          countdownEl.innerText = '';
          countdownEl.classList.add('hidden');
          startOutbound();
        }
      } else if (roundState === 'outbound') {
        const progress = clamp((now - outboundStart) / OUTBOUND_MS, 0, 1);
        ball.x = outboundFrom.x + (outboundTo.x - outboundFrom.x) * progress;
        ball.y = outboundFrom.y + (outboundTo.y - outboundFrom.y) * progress;
        if (progress >= 1) {
          if (targetBrick) {
            targetBrick.alive = false;
            playSound(brickHitSound);
          }
          startReturn();
        }
      } else if (roundState === 'returning') {
        const progress = clamp((now - returnStart) / RETURN_MS, 0, 1);
        ball.x = returnFrom.x + (returnTo.x - returnFrom.x) * progress;
        ball.y = returnFrom.y + (returnTo.y - returnFrom.y) * progress;
        if (progress >= 1) {
          if (tripsRemaining > 1) {
            tripsRemaining -= 1;
            roundState = 'idle';
            clearFeedback();
            startNextTrip(false);
          } else {
            resetRound();
            clearFeedback();
            if (shouldEndAfterRound) {
              finalizeGame(shouldWinAtEnd);
              return;
            }
            canAnswer = true;
            nextQuestion();
          }
        }
      } else {
        ball.x = paddleX;
        ball.y = paddleY - ball.r - 2;
      }
    };

    const loop = (now: number) => {
      if (isDisposed) return;
      updateRoundState(now);
      drawBackground();
      drawBricks();
      drawPaddle();
      drawBall();
      animationId = requestAnimationFrame(loop);
    };

    const startGame = () => {
      isGameStarted = true;
      isGameOver = false;
      points = 0;
      euros = 0;
      lives = Math.max(1, settings.lives);
      wrongAnswerCount = 0;
      questionsAnswered = 0;
      hadWrongAnswer = false;
      shouldEndAfterRound = false;
      shouldWinAtEnd = false;
      hasRecordedOutcome = false;
      setShowConfetti(false);
      updateHud();
      updateQuestionProgress();
      initBricks(START_ROWS);
      resetRound();
      nextQuestion();
      canAnswer = true;
      setFeedback('Answer to launch the ball.', 'neutral');
      startScreen.classList.add('hidden');
      gameOverScreen.classList.add('hidden');
    };

    const handleStartClick = () => {
      if (!isGameStarted) {
        countdownSound.play().then(() => {
          countdownSound.pause();
          countdownSound.currentTime = 0;
        }).catch(() => {});
        startGame();
      }
    };

    const handleRestartClick = () => {
      countdownSound.play().then(() => {
        countdownSound.pause();
        countdownSound.currentTime = 0;
      }).catch(() => {});
      startGame();
    };

    const handleResize = () => {
      resizeCanvas();
    };

    const handleIngClick = () => handleAnswer('ing');
    const handleNotIngClick = () => handleAnswer('not-ing');

    startButton.addEventListener('click', handleStartClick);
    restartButton.addEventListener('click', handleRestartClick);
    answerIngBtn.addEventListener('click', handleIngClick);
    answerNotIngBtn.addEventListener('click', handleNotIngClick);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    resizeCanvas();
    requestAnimationFrame(() => resizeCanvas());
    updateHud();
    resetRound();
    updateQuestionProgress();
    animationId = requestAnimationFrame(loop);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationId);
      startButton.removeEventListener('click', handleStartClick);
      restartButton.removeEventListener('click', handleRestartClick);
      answerIngBtn.removeEventListener('click', handleIngClick);
      answerNotIngBtn.removeEventListener('click', handleNotIngClick);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [questions, settings, assignmentId]);

  return (
    <div
      className={`flex w-full items-center justify-center bg-slate-950 text-slate-100 ${
        embedded ? 'min-h-[70svh] py-6' : 'min-h-[100svh]'
      }`}
    >
      <div className="relative h-[78svh] w-full max-w-5xl px-4 sm:px-8">
        <div
          ref={containerRef}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
        >
          {showConfetti ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <Confetti />
            </div>
          ) : null}
          <div ref={playfieldRef} className="relative flex-1">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none"
            />

            <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-4 rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide font-arcade">
              <div ref={pointsRef}>0 pts</div>
              <div ref={eurosRef}>€ 0</div>
              <div ref={livesRef}>Lives: {settings.lives}</div>
              <div ref={questionProgressRef}>0 questions left</div>
            </div>

            <div
              ref={countdownRef}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/70 bg-amber-400/20 px-6 py-2 text-2xl font-bold text-amber-200"
            />

            <div
              ref={startRef}
              className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-center"
            >
              <div className="max-w-sm space-y-4">
                <div className="text-4xl font-black uppercase tracking-[0.3em] text-slate-100">ArkanING</div>
                <p className="text-sm text-slate-400">
                  Answer the grammar question to launch each round. Move the paddle for 3 seconds before the ball lifts.
                </p>
                <button
                  ref={startButtonRef}
                  className="rounded-full border border-slate-700 bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  Start Game
                </button>
              </div>
            </div>

            <div
              ref={gameOverRef}
              className="hidden absolute inset-0 flex items-center justify-center bg-slate-950/95 text-center"
            >
              <div className="max-w-sm space-y-4">
                <div
                  ref={gameOverTitleRef}
                  className="text-3xl font-black uppercase tracking-[0.25em] text-rose-200"
                >
                  Game Over
                </div>
                <div data-score className="text-base font-semibold text-slate-100 font-arcade">
                  €0 • 0 pts
                </div>
                <button
                  ref={restartButtonRef}
                  className="rounded-full border border-slate-700 bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>

          <div
            ref={questionPanelRef}
            className="relative border-t border-slate-800 bg-slate-950/80 p-4 backdrop-blur"
          >
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">ArkanING</div>
            <div ref={questionRef} className="text-base font-semibold text-slate-100" />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <div ref={feedbackRef} />
                <span ref={feedbackRevealRef} className="hidden" />
              </div>
              <div ref={feedbackChipRef} className="hidden" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                ref={answerIngRef}
                className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30"
              >
                Use -ing
              </button>
              <button
                ref={answerNotIngRef}
                className="rounded-full border border-rose-400/50 bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/30"
              >
                Do not use -ing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
