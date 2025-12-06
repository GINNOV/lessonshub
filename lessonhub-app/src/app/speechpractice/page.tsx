'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mic, Sparkles, Speaker, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

type MouthPart = 'lips' | 'tongue' | 'teeth' | 'throat';

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionResultItem = { 0: SpeechRecognitionResultLike; isFinal?: boolean };
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultItem[] };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type PracticeWord = {
  id: string;
  text: string;
  phonetic: string;
  part: MouthPart;
  tipEn: string;
  tipIt: string;
  keywords: string[];
  sentence?: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const INITIAL_WORDS: PracticeWord[] = [
  {
    id: 'squirrel',
    text: 'Squirrel',
    phonetic: 'SKWER-ol',
    part: 'throat',
    tipEn: "Don't roll the R. Bunch the tongue back like you have a potato in your mouth.",
    tipIt: "Non arrotolare la R! È un suono gutturale. La 'Qui' si dice come 'Kwu'.",
    keywords: ['squirrel', 'swirl', 'square'],
    sentence: 'The squirrel ran up the tree.',
  },
  {
    id: 'thorough',
    text: 'Thorough',
    phonetic: '/ˈθɜːr.oʊ/',
    part: 'teeth',
    tipEn: 'Stick your tongue between your teeth for the TH, then pull it back immediately.',
    tipIt: "Lingua tra i denti per il 'TH'. Non dire 'T' o 'D'. Fai sentire l'aria.",
    keywords: ['thorough', 'furrow', 'sorrow'],
    sentence: 'She did a thorough job cleaning.',
  },
  {
    id: 'literature',
    text: 'Literature',
    phonetic: '/ˈlɪt̬.ɚ.ə.tʃɚ/',
    part: 'tongue',
    tipEn: "The middle T is a 'flap T', it sounds like a soft D.",
    tipIt: "In Americano la T centrale suona come una D veloce (come in 'vedo').",
    keywords: ['literature'],
    sentence: 'He studies English literature.',
  },
  {
    id: 'colonel',
    text: 'Colonel',
    phonetic: '/ˈkɜːr.nəl/',
    part: 'throat',
    tipEn: "It sounds exactly like 'Kernel'. The first L is silent and changed to R.",
    tipIt: "Si pronuncia 'Kernel'. La prima 'o' e la 'l' sono mute e diventano una R.",
    keywords: ['colonel', 'kernel'],
    sentence: 'The colonel gave an order.',
  },
  {
    id: 'comfortable',
    text: 'Comfortable',
    phonetic: '/ˈkʌmf.tə.bəl/',
    part: 'lips',
    tipEn: 'Smash the middle. Comf-ter-bul. Not Com-for-ta-ble.',
    tipIt: "Mangia le lettere! Non dire 'com-for-ta-ble', ma 'Comf-t'bl'.",
    keywords: ['comfortable'],
    sentence: 'This chair is very comfortable.',
  },
  {
    id: 'schedule',
    text: 'Schedule',
    phonetic: '/ˈskedʒ.uːl/',
    part: 'teeth',
    tipEn: "Start with a hard K sound (sk), not a 'sh' sound.",
    tipIt: "Inizia con SK (come 'Scheletro'), non con SC (come 'Scena').",
    keywords: ['schedule'],
    sentence: 'Check the train schedule.',
  },
  {
    id: 'world',
    text: 'World',
    phonetic: '/wɜːrld/',
    part: 'tongue',
    tipEn: 'The hardest combo. Curl tongue for R, then lift tip for L.',
    tipIt: "Il mostro finale. Fai una R americana scura, poi alza subito la punta per la L.",
    keywords: ['world', 'whirled', 'word'],
    sentence: 'He traveled around the world.',
  },
];

const PART_COLORS: Record<MouthPart, string> = {
  lips: 'highlight-lips',
  tongue: 'highlight-tongue',
  teeth: 'highlight-teeth',
  throat: 'highlight-throat',
};

const PART_ACTIONS: Record<MouthPart, string> = {
  lips: '',
  tongue: '',
  teeth: 'highlight-teeth-action',
  throat: 'highlight-throat-action',
};

const focusPartFromGemini = (value: string | undefined): MouthPart => {
  if (value === 'lips' || value === 'tongue' || value === 'teeth' || value === 'throat') {
    return value;
  }
  return 'tongue';
};

const fetchGeminiApiKey = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/ai/config', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { geminiApiKey?: string | null };
      if (data.geminiApiKey) return data.geminiApiKey;
    }
  } catch (error) {
    console.warn('Unable to fetch Gemini API key from server', error);
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? null;
};

export default function SpeechPracticePage() {
  const [words, setWords] = useState<PracticeWord[]>(INITIAL_WORDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState('...');
  const [status, setStatus] = useState<'waiting' | 'listening' | 'success' | 'missed' | 'error'>('waiting');
  const [resultVisible, setResultVisible] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [browserWarning, setBrowserWarning] = useState(false);
  const [customWord, setCustomWord] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = useMemo(() => words[currentIndex] ?? words[0], [words, currentIndex]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      }
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchGeminiApiKey().then((key) => setHasGeminiKey(!!key));
  }, []);

  const resetTerminal = () => {
    setTranscript('...');
    setStatus('waiting');
    setResultVisible(false);
    setResultSuccess(null);
  };

  const handleSelectWord = (index: number) => {
    setCurrentIndex(index);
    resetTerminal();
  };

  const playAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(currentWord.text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const setupSpeechRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
    if (!SpeechRecognition) {
      setBrowserWarning(true);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('listening');
      setTranscript('');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setStatus('error');
      setIsRecording(false);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setTranscript(spoken);

      if (event.results[0].isFinal) {
        validatePronunciation(spoken);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const showResult = (success: boolean) => {
    setResultSuccess(success);
    setResultVisible(true);
    setStatus(success ? 'success' : 'missed');

    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = setTimeout(() => {
      setResultVisible(false);
    }, 2000);
  };

  const validatePronunciation = (spokenText: string) => {
    const cleanSpoken = spokenText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    const cleanTarget = currentWord.text.toLowerCase();
    const isMatch =
      cleanSpoken.includes(cleanTarget) || (currentWord.keywords && currentWord.keywords.some((k) => cleanSpoken.includes(k)));
    showResult(isMatch);
  };

  const toggleRecording = () => {
    const recognition = setupSpeechRecognition();
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      return;
    }
    resetTerminal();
    recognition.start();
  };

  const analyzeCustomWord = async () => {
    const word = customWord.trim();
    if (!word) return;
    const apiKey = await fetchGeminiApiKey();

    if (!apiKey) {
      alert('Missing Gemini API key. Please add one in the admin AI features panel.');
      return;
    }

    setAiLoading(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });

      const prompt = `Analyze the English word "${word}" for an Italian speaker learning American pronunciation.
Return a JSON object with NO markdown formatting. The JSON must have these keys:
- phonetic: The IPA transcription.
- italianPhonetic: A "faux-netic" transcription easy for Italians to read (e.g. "SKWER-ol").
- focusPart: One of "lips", "tongue", "teeth", "throat" representing the most difficult mechanical part.
- tipEn: A short tip in English about the mechanic.
- tipIt: A short tip in Italian about the mechanic.
- keywords: Array of 3 similar sounding English words for fuzzy matching.
- sentence: A simple practice sentence containing the word.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr);

      const newWord: PracticeWord = {
        id: `custom-${Date.now()}`,
        text: word.charAt(0).toUpperCase() + word.slice(1),
        phonetic: data.italianPhonetic || data.phonetic || word,
        part: focusPartFromGemini(data.focusPart),
        tipEn: data.tipEn || 'Keep sounds clean and relaxed.',
        tipIt: data.tipIt || 'Pronuncia lenta e chiara per sentire le differenze.',
        keywords: [word.toLowerCase(), ...(data.keywords || [])],
        sentence: data.sentence || `Practice saying ${word} clearly.`,
      };

      setWords((prev) => [newWord, ...prev]);
      setCurrentIndex(0);
      setCustomWord('');
      resetTerminal();
    } catch (error) {
      console.error('Gemini Error:', error);
      alert('Could not analyze word. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const highlightPart = currentWord?.part;
  const containerHighlightClass = highlightPart ? PART_ACTIONS[highlightPart] : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <style jsx global>{`
        .face-outline {
          fill: none;
          stroke: #334155;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .face-part {
          fill: #cbd5e1;
          stroke: #94a3b8;
          stroke-width: 1;
          transition: all 0.3s ease;
        }

        .teeth-line {
          stroke: #334155;
          stroke-width: 3;
          stroke-linecap: round;
        }

        @keyframes mechanic-lips {
          0%,
          100% {
            transform: scale(1) translateX(0);
          }
          50% {
            transform: scale(0.8) translateX(-5px);
          }
        }

        @keyframes mechanic-tongue-tap {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          40% {
            transform: translateY(-3px) translateX(2px) rotate(-5deg);
          }
        }

        @keyframes mechanic-tongue-th {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px) translateY(-2px);
          }
        }

        @keyframes mechanic-throat {
          0%,
          100% {
            transform: translateX(0) scale(1);
          }
          50% {
            transform: translateX(-3px) scale(0.95);
          }
        }

        .highlight-lips path {
          fill: #fca5a5 !important;
          stroke: #ef4444 !important;
          filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.4));
          transform-box: fill-box;
          transform-origin: center;
          animation: mechanic-lips 2s infinite ease-in-out;
        }

        .highlight-tongue path {
          fill: #fcd34d !important;
          stroke: #d97706 !important;
          filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.4));
          transform-box: fill-box;
          transform-origin: bottom center;
          animation: mechanic-tongue-tap 1.5s infinite ease-in-out;
        }

        .highlight-teeth path {
          stroke: #2563eb !important;
          filter: drop-shadow(0 0 5px rgba(37, 99, 235, 0.4));
        }

        .highlight-teeth-action #part-tongue path {
          animation: mechanic-tongue-th 2s infinite ease-in-out;
          transform-box: fill-box;
          transform-origin: bottom center;
          fill: #fcd34d !important;
          stroke: #d97706 !important;
        }

        .highlight-throat path {
          fill: #d8b4fe !important;
          stroke: #9333ea !important;
          filter: drop-shadow(0 0 5px rgba(147, 51, 234, 0.4));
        }

        .highlight-throat-action #part-tongue path {
          animation: mechanic-throat 2s infinite ease-in-out;
          transform-box: fill-box;
          transform-origin: center;
          fill: #fcd34d !important;
          stroke: #d97706 !important;
        }

        .mic-pulse {
          animation: pulse-red 1.5s infinite;
        }

        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .typing-cursor::after {
          content: '';
          display: inline-block;
          width: 3px;
          height: 0.8em;
          background-color: #94a3b8;
          margin-left: 4px;
          vertical-align: baseline;
          animation: blink 1s step-start infinite;
        }

        @keyframes blink {
          50% {
            opacity: 0;
          }
        }

        .word-list::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .word-list::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }

        .loader {
          border: 3px solid #f3f3f3;
          border-radius: 50%;
          border-top: 3px solid #3b82f6;
          width: 20px;
          height: 20px;
          -webkit-animation: spin 1s linear infinite;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 200ms ease-in;
        }
      `}</style>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full">
          <div className="mb-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Speech practice</span>
            <h1 className="text-3xl font-bold text-white">Accent Coach</h1>
            <p className="text-slate-400">American pronunciation drills with live articulation hints.</p>
          </div>
        </div>
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-2xl shadow-black/30 backdrop-blur md:flex-row">
          <div className="relative flex w-full flex-col border-b border-slate-800/70 p-6 md:w-1/2 md:border-b-0 md:border-r md:p-8">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-teal-400 to-indigo-500" />
            <header className="mb-6">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                Live Coach
                <span className="text-lg font-semibold text-teal-300">/speechpractice</span>
              </h2>
              <p className="text-sm text-slate-400">Perfect your American English pronunciation.</p>
            </header>

            <div className="mb-6 flex flex-grow flex-col items-center justify-center">
              <div className="mb-2 text-center text-4xl font-extrabold tracking-tight text-white transition-all duration-300 md:text-6xl" data-testid="current-word">
                {currentWord?.text ?? 'Select Word'}
              </div>
              <div className="mb-6 text-center font-mono text-lg text-slate-400 md:text-xl">{currentWord?.phonetic ?? '/select/'}</div>
              <div className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-inner shadow-black/20">
                <p className="mb-1 text-sm font-semibold text-teal-200">🇺🇸 Tip:</p>
                <p className="mb-3 text-sm italic text-slate-200">{currentWord?.tipEn ?? 'Choose a word from the list to start.'}</p>
                <p className="text-sm font-semibold text-emerald-300">🇮🇹 Per Italiani:</p>
                <p className="text-sm italic text-slate-200">{currentWord?.tipIt ?? 'Scegli una parola dalla lista per iniziare.'}</p>
              </div>
            </div>

            {hasGeminiKey ? (
              <div className="relative mb-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-teal-300">✨ AI Custom Word</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value)}
                    placeholder="Type any word (e.g. Jewelry)"
                    className="flex-grow rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                  />
                  <button
                    onClick={analyzeCustomWord}
                    disabled={aiLoading}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span>Analyze</span>
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                </div>
                <div
                  className={cn(
                    'absolute left-0 top-full mt-2 flex items-center gap-2 text-xs text-teal-300',
                    aiLoading ? 'block' : 'hidden'
                  )}
                >
                  <div className="loader" />
                  Analyzing mouth mechanics...
                </div>
              </div>
            ) : null}

            <div className="mt-auto grid grid-cols-2 gap-4">
              <button
                onClick={playAudio}
                className="group flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3 font-semibold text-slate-100 transition-all hover:border-teal-400/70 hover:bg-slate-900 active:scale-95"
              >
                <Speaker className="h-5 w-5 text-slate-400 transition-colors group-hover:text-teal-300" />
                Listen
              </button>
              <button
                onClick={toggleRecording}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all active:scale-95 shadow-lg shadow-teal-900/60',
                  isRecording ? 'bg-rose-600 hover:bg-rose-500 mic-pulse' : 'bg-teal-600 hover:bg-teal-500'
                )}
              >
                <Mic className="h-5 w-5" />
                <span>{isRecording ? 'Stop' : 'Speak'}</span>
              </button>
            </div>

            {browserWarning && (
              <div className="mt-4 flex items-center gap-2 rounded border border-rose-500/40 bg-rose-900/40 p-2 text-xs text-rose-100">
                <TriangleAlert className="h-4 w-4" />
                Please use Chrome, Edge or Safari for speech recognition.
              </div>
            )}
          </div>

          <div className="flex w-full flex-col bg-slate-950/60 p-6 md:w-1/2 md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">Vocal Tract Mechanics</h3>
              <span className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                Live Animation
              </span>
            </div>

            <div
              id="vocal-tract"
              className={cn(
                'relative mb-6 flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/30 md:h-64',
                containerHighlightClass
              )}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full max-w-[300px]">
                <path className="face-outline" d="M60,180 Q40,180 40,150 L40,80 Q40,20 100,20 Q160,20 160,80 L160,130" />
                <path className="face-outline" d="M160,80 L190,100 L165,110" />

                <g id="part-teeth" className={cn('face-part-group', highlightPart === 'teeth' && PART_COLORS.teeth)}>
                  <path className="teeth-line" d="M140,95 L140,105" />
                  <path className="teeth-line" d="M145,95 L145,105" />
                </g>
                <g id="part-lips" className={cn('face-part-group', highlightPart === 'lips' && PART_COLORS.lips)}>
                  <path className="face-part" d="M160,105 Q170,105 170,115 Q160,125 150,115" />
                </g>
                <g id="part-throat" className={cn('face-part-group', highlightPart === 'throat' && PART_COLORS.throat)}>
                  <path className="face-part" d="M90,140 Q80,140 80,120 L80,100 Q100,100 110,120" />
                </g>
                <g id="part-tongue" className={cn('face-part-group', highlightPart === 'tongue' && PART_COLORS.tongue)}>
                  <path className="face-part" d="M90,140 Q110,140 120,130 Q140,120 135,115" />
                </g>
              </svg>

              <div className="absolute bottom-2 right-2 flex flex-col gap-1 rounded bg-white/80 p-2 text-[10px] text-slate-400 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-300" />
                  Lips
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-amber-300" />
                  Tongue
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Teeth
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  Throat
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-slate-500" />
                  Neutral
                </div>
              </div>
            </div>

            <div className="flex flex-grow flex-col">
              <h3 className="mb-2 flex justify-between font-semibold text-slate-100">
                <span>Validation</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-normal',
                    status === 'listening' && 'bg-rose-500/20 text-rose-200 animate-pulse',
                    status === 'success' && 'bg-emerald-500/20 text-emerald-200',
                    status === 'missed' && 'bg-amber-500/20 text-amber-200',
                    status === 'error' && 'bg-rose-500/30 text-rose-100',
                    status === 'waiting' && 'bg-slate-800 text-slate-300'
                  )}
                >
                  {status === 'waiting' && 'Waiting...'}
                  {status === 'listening' && 'Listening...'}
                  {status === 'success' && 'Success'}
                  {status === 'missed' && 'Missed'}
                  {status === 'error' && 'Error'}
                </span>
              </h3>

              <div className="relative flex flex-grow flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-indigo-50 bg-indigo-50/50 p-6 text-center">
                <div className="mb-4 text-xs font-bold uppercase tracking-widest text-teal-300">I heard you say</div>
                <div className="text-3xl font-bold leading-tight text-white md:text-4xl">
                  <span className="typing-cursor">{transcript}</span>
                </div>

                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300',
                    resultVisible ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div
                    className={cn(
                      'text-center transition-transform duration-300',
                      resultVisible ? 'scale-100' : 'scale-90'
                    )}
                  >
                    <div className="mb-2 text-6xl drop-shadow-sm">{resultSuccess ? '🎉' : '🤔'}</div>
                    <div
                      className={cn(
                        'text-2xl font-bold',
                        resultSuccess ? 'text-emerald-300' : 'text-amber-300'
                      )}
                    >
                      {resultSuccess ? 'Perfect!' : 'Try Again'}
                    </div>
                  </div>
                </div>
              </div>

              {currentWord?.sentence && (
                <div className="mt-4 animate-fade-in rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 shadow-sm shadow-black/20">
                  <strong className="text-teal-300">✨ Practice:</strong> {currentWord.sentence}
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Select Word to Practice</label>
              <div className="word-list flex gap-2 overflow-x-auto pb-2">
                {words.map((word, index) => (
                  <button
                    key={word.id}
                    onClick={() => handleSelectWord(index)}
                    className={cn(
                      'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                      currentIndex === index
                        ? 'border-teal-400 bg-teal-500 text-white shadow-md shadow-teal-900/50'
                        : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-teal-400'
                    )}
                  >
                    {word.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
