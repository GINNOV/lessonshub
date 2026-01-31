// file: src/app/assignments/[assignmentId]/page.tsx
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAssignmentById, recordLessonUsageForLatestLogin } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import LessonContentView from "@/app/components/LessonContentView";
import LessonInstructionsGate from "@/app/components/LessonInstructionsGate";
import MultiChoicePlayer from "@/app/components/MultiChoicePlayer";
import FlashcardPlayer from "@/app/components/FlashcardPlayer";
import ComposerLessonPlayer from "@/app/components/ComposerLessonPlayer";
import LyricLessonPlayer from "@/app/components/LyricLessonPlayer";
import LearningSessionPlayer from "@/app/components/LearningSessionPlayer";
import ArkaningLessonPlayer from "@/app/components/ArkaningLessonPlayer";
import NewsArticleLessonPlayer from "@/app/components/NewsArticleLessonPlayer";
import FlipperLessonPlayer from "@/app/components/FlipperLessonPlayer";
import { marked } from "marked";
import { AssignmentStatus, LessonType, PointReason } from "@prisma/client";
import Confetti from "@/app/components/Confetti";
import { cn } from "@/lib/utils";
import {
  parseMultiChoiceAnswers,
  normalizeMultiChoiceText,
  resolveSelectedLabel,
  resolveSelectedOption,
} from "@/lib/multiChoiceAnswers";
import LocaleDate from "@/app/components/LocaleDate";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, CheckCircle2, XCircle, GraduationCap, UserRound } from "lucide-react";
import Rating from "@/app/components/Rating";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import type { LyricLine, LyricLessonSettings } from "@/app/components/LyricLessonEditor";
import StudentExtensionRequest from "@/app/components/StudentExtensionRequest";
import { EXTENSION_POINT_COST } from "@/lib/lessonExtensions";
import { headers } from "next/headers";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";

marked.setOptions({
  gfm: true,
  breaks: true,
});
// --- SVG Icons ---
// Removed inline icons; using shared content view for attachments

const getGradeBackground = (score: number | null) => {
  if (score === null) return "bg-slate-900/70 border border-slate-800 text-slate-100";
  if (score >= 8) return "bg-gradient-to-br from-emerald-500/25 via-emerald-500/15 to-emerald-400/20 border border-emerald-300/50 text-emerald-50";
  if (score >= 6) return "bg-gradient-to-br from-blue-500/25 via-blue-500/15 to-sky-400/20 border border-sky-300/50 text-sky-50";
  if (score >= 4) return "bg-gradient-to-br from-amber-500/25 via-amber-500/15 to-orange-400/20 border border-amber-300/50 text-amber-50";
  return "bg-gradient-to-br from-rose-600/30 via-rose-500/15 to-red-500/20 border border-rose-300/50 text-rose-50";
};

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }
  const autoSaveEnabled = !((session.user as any)?.lessonAutoSaveOptOut ?? false);

  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ["en", "it"] as const,
    fallback: "en",
  });

  const { assignmentId } = await params;
  const query = searchParams ? await searchParams : {};
  const practiceParamRaw = query?.practice;
  const practiceParam = Array.isArray(practiceParamRaw) ? practiceParamRaw[0] : practiceParamRaw;
  const assignment = await getAssignmentById(assignmentId, session.user.id);

  if (!assignment) {
    const missingCopy = locale === "it"
      ? {
          title: "Compito non trovato",
          body: "Questo compito potrebbe non esistere o non hai i permessi per visualizzarlo.",
        }
      : {
          title: "Assignment not found",
          body: "This assignment may not exist or you may not have permission to view it.",
        };
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">{missingCopy.title}</h1>
        <p>{missingCopy.body}</p>
      </div>
    );
  }
  if (session.user.id === assignment.studentId) {
    await recordLessonUsageForLatestLogin(assignment.studentId, assignment.lessonId);
  }

  const studentReadBoostRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { readAlongPoints: true },
  });
  const availableReadBoosts = studentReadBoostRecord?.readAlongPoints ?? 0;

  const composerCopy = locale === "it"
    ? {
        neoTest: "NEO Test",
        extraTriesNone: "Tentativi extra: 0",
        extraTriesWithCost: "Tentativi extra: {count} · €{euros} + {points} pt",
        terminal: "Terminale",
        answered: "risposte",
        questionProgress: "Domanda {current} di {total}",
        tries: "Tentativi:",
        rateLesson: "Valuta questa lezione",
        previous: "Precedente",
        next: "Successiva",
        saveDraft: "Salva bozza",
        saving: "Salvataggio...",
        submit: "Invia compito",
        submitting: "Invio...",
        deadlinePassed: "La scadenza è passata. Le consegne sono disabilitate per questa lezione.",
        missingSentence: "Questa lezione composer non contiene una frase.",
        answerAll: "Rispondi a tutte le domande per rivelare la frase completa.",
        submitSuccess: "Composer inviato! La frase è svelata.",
        submitError: "Errore durante l'invio del compito.",
        draftSaved: "Bozza salvata.",
        draftError: "Impossibile salvare la bozza al momento.",
        missingConfig: "Dati della lezione composer mancanti. Contatta il supporto.",
      }
    : {
        neoTest: "NEO Test",
        extraTriesNone: "Extra tries: 0",
        extraTriesWithCost: "Extra tries: {count} · €{euros} + {points} pts",
        terminal: "Terminal",
        answered: "answered",
        questionProgress: "Question {current} of {total}",
        tries: "Tries:",
        rateLesson: "Rate this lesson",
        previous: "Previous",
        next: "Next",
        saveDraft: "Save Draft",
        saving: "Saving...",
        submit: "Submit assignment",
        submitting: "Submitting...",
        deadlinePassed: "The deadline has passed. Submissions are disabled for this lesson.",
        missingSentence: "This composer lesson is missing a sentence.",
        answerAll: "Answer every question to reveal the full sentence.",
        submitSuccess: "Composer submitted! Your sentence is revealed.",
        submitError: "There was an error submitting your assignment.",
        draftSaved: "Draft saved.",
        draftError: "Unable to save draft right now.",
        missingConfig: "Composer lesson data is missing. Please contact support.",
      };
  const notesCopy = locale === "it"
    ? {
        notesTitle: "Note",
        notesAvailable: "Note disponibili.",
        additionalInfoTitle: "Informazioni aggiuntive",
        additionalInfoAvailable: "Informazioni aggiuntive disponibili.",
      }
    : {
        notesTitle: "Notes",
        notesAvailable: "Notes available.",
        additionalInfoTitle: "Additional Information",
        additionalInfoAvailable: "Additional information available.",
      };
  const contentCopy = locale === "it"
    ? {
        supportingMaterial: "Materiale di supporto",
        listenOnSpotify: "Ascolta su Spotify",
        timingReference: "Riferimento tempi:",
        openTrack: "apri traccia",
        instructionsTitle: "👉🏼 ISTRUZIONI",
        materialTitle: "MATERIALE",
        viewAttachment: "Apri allegato",
      }
    : {
        supportingMaterial: "Supporting Material",
        listenOnSpotify: "Listen on Spotify",
        timingReference: "Timing reference:",
        openTrack: "open track",
        instructionsTitle: "👉🏼 INSTRUCTIONS",
        materialTitle: "MATERIAL",
        viewAttachment: "View Attachment",
      };
  const instructionsCopy = locale === "it"
    ? {
        title: "Istruzioni",
        show: "Mostra istruzioni",
        hide: "Nascondi istruzioni",
        emptyHtml: "<p>Nessuna istruzione disponibile.</p>",
        acknowledge: "Ho letto e compreso le istruzioni sopra.",
        continueLabel: "Continua",
        reviewPrompt: "Leggi e conferma le istruzioni prima di sbloccare il resto della lezione.",
      }
    : {
        title: "Instructions",
        show: "Show instructions",
        hide: "Hide instructions",
        emptyHtml: "<p>No instructions provided.</p>",
        acknowledge: "I've read and understood the instructions above.",
        continueLabel: "Continue",
        reviewPrompt: "Review and acknowledge the instructions before unlocking the rest of this lesson.",
      };
  const deadlineCopy = locale === "it"
    ? {
        extended: "Scadenza estesa.",
        updated: "Scadenza aggiornata.",
      }
    : {
        extended: "Deadline extended.",
        updated: "Deadline updated.",
      };
  const assignmentUiCopy = locale === "it"
    ? {
        deadlineLabel: "Scadenza:",
        timeElapsed: "Tempo trascorso",
        originalLabel: "Originale:",
        viewResultsPrompt:
          "I risultati sono nascosti finché non tocchi “Vedi risultati”. Non potrai vedere i risultati finché il tuo insegnante non valuterà questa lezione.",
        viewResultsCta: "Vedi risultati",
        deadlineMissedTitle: "Scadenza superata",
        deadlineMissedBody:
          "Non hai inviato questa lezione entro la scadenza. Il materiale resta visibile per ripassare, ma l'invio delle risposte è disabilitato.",
        yourResultsTitle: "I tuoi risultati",
        rightLabel: "Corretto",
        wrongLabel: "Sbagliato",
        practiceModeTitle: "Modalità pratica",
        practiceModeBody:
          "Rivedi le domande per fare pratica extra. Il voto originale resta invariato.",
        practiceDone: "Fine pratica",
        statusLabel: "Stato",
        scoreLabel: "Punteggio",
        scoreUnavailable: "N/D",
        takeTestAgain: "Ripeti il test",
        exitPracticeMode: "Esci dalla modalità pratica",
        yourRatingLabel: "La tua valutazione:",
        consultationMode: "Modalità consultazione: niente nuovi punti.",
        newsRateLabel: "Valuta",
        newsBannerKicker: "Ultima notizia",
        newsBannerSubhead: "Leggi, tocca e ascolta",
      }
    : {
        deadlineLabel: "Deadline:",
        timeElapsed: "Time elapsed",
        originalLabel: "Original:",
        viewResultsPrompt:
          "Your results are hidden until you tap “View Results.” You won't be able to see the results until your teacher grades this lesson.",
        viewResultsCta: "View Results",
        deadlineMissedTitle: "Deadline missed",
        deadlineMissedBody:
          "You didn't submit this lesson before the due date. The material remains visible so you can review it, but submitting answers is disabled.",
        yourResultsTitle: "Your Results",
        rightLabel: "Right",
        wrongLabel: "Wrong",
        practiceModeTitle: "Practice Mode",
        practiceModeBody: "Revisit the questions for extra practice. Your original grade stays the same.",
        practiceDone: "Done practicing",
        statusLabel: "Status",
        scoreLabel: "Score",
        scoreUnavailable: "N/A",
        takeTestAgain: "Take the test again",
        exitPracticeMode: "Exit practice mode",
        yourRatingLabel: "Your Rating:",
        consultationMode: "Consultation mode: no new points are awarded.",
        newsRateLabel: "Rate",
        newsBannerKicker: "Breaking story",
        newsBannerSubhead: "Read, tap, and listen",
      };
  const lessonCopy = locale === "it"
    ? {
        standard: {
          practiceNotice: "Modalità pratica attiva. Le risposte non vengono salvate o inviate.",
          deadlinePassed: "La scadenza è passata. Le consegne sono disabilitate per questa lezione.",
          submitSuccess: "Compito inviato con successo!",
          submitError: "Errore durante l'invio del compito.",
          draftSaved: "Bozza salvata. Puoi completarla più tardi.",
          draftError: "Impossibile salvare la bozza al momento.",
          answerPlaceholder: "La tua risposta...",
          notesLabel: "Note per il tuo insegnante (facoltative)",
          notesPlaceholder: "C'è qualcosa che vuoi aggiungere?",
          rateLesson: "Valuta questa lezione:",
          saveDraft: "Salva bozza",
          savingDraft: "Salvataggio...",
          submit: "Invia compito",
          submitting: "Invio...",
          lastSaved: "Ultimo salvataggio {time}",
          draftNotSaved: "Bozza non ancora salvata",
          confirmTitle: "Inviare il compito?",
          confirmDescription: "Non potrai modificare le risposte dopo l'invio.",
          confirmLabel: "Invia",
          confirmPending: "Invio...",
        },
        multiChoice: {
          practiceAnswerAll: "Rispondi a tutte le domande per vedere i risultati della pratica.",
          deadlinePassed: "La scadenza è passata. Le consegne sono disabilitate per questa lezione.",
          submitAnswerAll: "Rispondi a tutte le domande prima di inviare.",
          submitSuccess: "Compito inviato e valutato!",
          submitError: "Errore durante l'invio del compito.",
          draftSaved: "Bozza salvata. Completa quando vuoi.",
          draftError: "Impossibile salvare la bozza al momento.",
          resultsTitle: "Risultati",
          resultsSummary: "Hai risposto correttamente a {correct} su {total} domande.",
          tryAgain: "Riprova",
          donePracticing: "Fine pratica",
          finish: "Fine",
          rateLesson: "Valuta questa lezione",
          saveDraft: "Salva bozza",
          savingDraft: "Salvataggio...",
          submitAnswers: "Invia risposte",
          submitting: "Invio...",
          lastSaved: "Ultimo salvataggio {time}",
          draftNotSaved: "Bozza non ancora salvata",
          checkResults: "Vedi risultati",
        },
        flashcard: {
          intro:
            "Tocca la carta per girarla tra fronte e retro. Dopo averla girata, indica se hai risposto correttamente.",
          start: "Inizia",
          deadlinePassed: "La scadenza è passata. Le consegne sono disabilitate per questa lezione.",
          submitSuccess: "Risultati inviati!",
          submitError: "Invio dei risultati non riuscito.",
          resultsTitle: "Risultati",
          correct: "Corrette",
          incorrect: "Sbagliate",
          rateLesson: "Valuta questa lezione",
          restart: "Ricomincia",
          donePracticing: "Fine pratica",
          submitFinish: "Invia e termina",
          submitting: "Invio...",
          flip: "Gira",
          notes: "Note",
          wasWrong: "Ho sbagliato",
          wasRight: "Ho risposto bene",
        },
        lyric: {
          lyricLesson: "Lezione Lyric",
          readFill: "Leggi e completa",
          score: "Punteggio",
          previousShort: "Prec",
          timeLabel: "Tempo",
          readAlongUsed: "Read-along {count}",
          readAlong: "Read Along",
          readAlongWithCount: "Read Along ({count} rimasti)",
          fillBlanks: "Completa i vuoti",
          guideBoost: "Include +{count} guida{plural} bonus.",
          saveDraft: "Salva bozza",
          savingDraft: "Salvataggio...",
          referenceTrack: "Usa la traccia di riferimento per l'ascolto.",
          play: "Riproduci",
          pause: "Pausa",
          correctLabel: "Corretta:",
          checkAnswers: "Verifica risposte",
          submitting: "Invio...",
          reset: "Reimposta",
          draftSaved: "Bozza salvata {time}",
          draftNotSaved: "Bozza non ancora salvata",
          draftSavedToast: "Bozza salvata.",
          draftError: "Impossibile salvare la bozza al momento.",
          submissionSummary: "Hai risposto correttamente al {percent}%",
          submissionDetails: "{correct} su {total} vuoti · {time} totali",
          previousAttempt: "Tentativo precedente: {percent}% · {time}",
          readAlongSwitchesUsed: "Read-along usati: {count}",
          readAlongBoostError: "Impossibile usare il bonus read-along al momento. Riprova.",
          readAlongNoneRemaining: "Nessun cambio read-along disponibile.",
          submitError: "Impossibile inviare le risposte.",
          submitSuccess: "Risposte inviate!",
          playbackError: "Impossibile avviare la riproduzione. Controlla la sorgente audio.",
        },
        learningSession: {
          emptyCard: "Nessun contenuto disponibile per questa scheda.",
          noGuideCards: "Nessuna scheda guida è stata aggiunta.",
          cardProgress: "Scheda {current} di {total}",
          flipProgress: "Giro {current} di {total} · ciclo automatico",
          tapToFlip: "Tocca per girare · si ripete dopo l'ultimo passaggio",
          playing: "Riproduzione...",
          listen: "ASCOLTA",
          nextPlayback: "Prossima riproduzione: {mode}",
          nextPlaybackNormal: "velocità normale",
          nextPlaybackSlow: "velocità lenta",
          flipCard: "Gira scheda",
          nextCard: "Scheda successiva",
          viewing: "Stai visualizzando {title}. Puoi scorrere le schede con i tuoi tempi.",
          ttsEmpty: "Niente da leggere ad alta voce per questo passaggio.",
          ttsUnsupported: "La sintesi vocale non è supportata in questo browser.",
          ttsError: "Si è verificato un problema durante la riproduzione audio.",
        },
      }
    : {
        standard: {
          practiceNotice: "Practice mode is active. Your answers aren't saved or submitted.",
          deadlinePassed: "The deadline has passed. Submissions are disabled for this lesson.",
          submitSuccess: "Your assignment has been submitted successfully!",
          submitError: "There was an error submitting your assignment.",
          draftSaved: "Draft saved. You can finish later.",
          draftError: "Unable to save draft right now.",
          answerPlaceholder: "Your answer...",
          notesLabel: "Notes for your teacher (optional)",
          notesPlaceholder: "Anything you'd like to add?",
          rateLesson: "Rate this lesson:",
          saveDraft: "Save Draft",
          savingDraft: "Saving draft...",
          submit: "Submit Assignment",
          submitting: "Submitting...",
          lastSaved: "Last saved {time}",
          draftNotSaved: "Draft not saved yet",
          confirmTitle: "Submit assignment?",
          confirmDescription: "You will not be able to edit your answers after submitting.",
          confirmLabel: "Submit",
          confirmPending: "Submitting...",
        },
        multiChoice: {
          practiceAnswerAll: "Answer every question to see your practice results.",
          deadlinePassed: "The deadline has passed. Submissions are disabled for this lesson.",
          submitAnswerAll: "Please answer all questions before submitting.",
          submitSuccess: "Your assignment has been submitted and graded!",
          submitError: "There was an error submitting your assignment.",
          draftSaved: "Draft saved. Finish whenever you’re ready.",
          draftError: "Unable to save draft right now.",
          resultsTitle: "Results",
          resultsSummary: "You answered {correct} out of {total} questions correctly.",
          tryAgain: "Try Again",
          donePracticing: "Done practicing",
          finish: "Finish",
          rateLesson: "Rate this lesson",
          saveDraft: "Save Draft",
          savingDraft: "Saving draft...",
          submitAnswers: "Submit Answers",
          submitting: "Submitting...",
          lastSaved: "Last saved {time}",
          draftNotSaved: "Draft not saved yet",
          checkResults: "Check results",
        },
        flashcard: {
          intro:
            "Tap the card to flip between front and back. After flipping, choose whether you were right or wrong.",
          start: "Start",
          deadlinePassed: "The deadline has passed. Submissions are disabled for this lesson.",
          submitSuccess: "Your results have been submitted!",
          submitError: "Failed to submit your results.",
          resultsTitle: "Results",
          correct: "Correct",
          incorrect: "Incorrect",
          rateLesson: "Rate this lesson",
          restart: "Restart",
          donePracticing: "Done practicing",
          submitFinish: "Submit & Finish",
          submitting: "Submitting...",
          flip: "Flip",
          notes: "Notes",
          wasWrong: "I was wrong",
          wasRight: "I was right",
        },
        lyric: {
          lyricLesson: "Lyric lesson",
          readFill: "Read & fill",
          score: "Score",
          previousShort: "Prev",
          timeLabel: "Time",
          readAlongUsed: "Read-along {count}",
          readAlong: "Read Along",
          readAlongWithCount: "Read Along ({count} left)",
          fillBlanks: "Fill the Blanks",
          guideBoost: "Includes +{count} guide boost{plural}.",
          saveDraft: "Save Draft",
          savingDraft: "Saving…",
          referenceTrack: "Use the reference track for playback.",
          play: "Play",
          pause: "Pause",
          correctLabel: "Correct:",
          checkAnswers: "Check Answers",
          submitting: "Submitting…",
          reset: "Reset",
          draftSaved: "Draft saved {time}",
          draftNotSaved: "Draft not saved yet",
          draftSavedToast: "Draft saved.",
          draftError: "Unable to save draft right now.",
          submissionSummary: "You answered {percent}% correctly",
          submissionDetails: "{correct} of {total} blanks · {time} total time",
          previousAttempt: "Previous attempt: {percent}% · {time}",
          readAlongSwitchesUsed: "Read-along switches used: {count}",
          readAlongBoostError: "Unable to use read-along boost right now. Please try again.",
          readAlongNoneRemaining: "No read-along switches remaining.",
          submitError: "Unable to submit answers.",
          submitSuccess: "Answers submitted!",
          playbackError: "Unable to start playback. Please check the audio source.",
        },
        learningSession: {
          emptyCard: "No content available for this card.",
          noGuideCards: "No guide cards have been added yet.",
          cardProgress: "Card {current} of {total}",
          flipProgress: "Flip {current} of {total} · loops automatically",
          tapToFlip: "Tap to flip · loops after the final step",
          playing: "Playing…",
          listen: "LISTEN",
          nextPlayback: "Next playback: {mode}",
          nextPlaybackNormal: "normal speed",
          nextPlaybackSlow: "slow speed",
          flipCard: "Flip card",
          nextCard: "Next card",
          viewing: "You're viewing {title}. Feel free to loop through cards at your own pace.",
          ttsEmpty: "Nothing to read aloud for this step.",
          ttsUnsupported: "Text-to-speech is not supported in this browser.",
          ttsError: "Something went wrong while playing the audio.",
        },
      };
  const reviewCopy = locale === "it"
    ? {
        reviewTitle: "Rivedi il tuo invio",
        questionLabel: "Domanda {index}:",
        studentAnswerLabel: "Risposta studente",
        expectedAnswerLabel: "Risposta attesa",
        noAnswerProvided: "Nessuna risposta fornita.",
        yourRating: "La tua valutazione",
        teacherFeedbackTitle: "Feedback dell'insegnante",
      }
    : {
        reviewTitle: "Review Your Submission",
        questionLabel: "Question {index}:",
        studentAnswerLabel: "Student answer",
        expectedAnswerLabel: "Expected answer",
        noAnswerProvided: "No answer provided.",
        yourRating: "Your Rating",
        teacherFeedbackTitle: "Teacher's feedback",
      };
  
  const normalizeLyricLines = (value: unknown): LyricLine[] => {
    if (!Array.isArray(value)) return [];
    const normalized: LyricLine[] = [];
    value.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const record = item as Record<string, unknown>;
      const text = typeof record.text === "string" ? record.text : "";
      if (!text.trim()) return;
      const id = typeof record.id === "string" ? record.id : randomUUID();
      const startTimeValue =
        typeof record.startTime === "number"
          ? record.startTime
          : typeof record.startTime === "string" && record.startTime.trim()
          ? Number(record.startTime)
          : null;
      const endTimeValue =
        typeof record.endTime === "number"
          ? record.endTime
          : typeof record.endTime === "string" && record.endTime.trim()
          ? Number(record.endTime)
          : null;
      const hiddenWords =
        Array.isArray(record.hiddenWords)
          ? record.hiddenWords.filter((word): word is string => typeof word === "string" && word.trim().length > 0)
          : undefined;
      const startTime = Number.isFinite(startTimeValue) ? Number(startTimeValue) : null;
      const endTime = Number.isFinite(endTimeValue) ? Number(endTimeValue) : null;
      normalized.push({
        id,
        text,
        startTime,
        endTime,
        hiddenWords,
      });
    });
    return normalized;
  };

  const lyricAttempts = (assignment.lesson.lyricAttempts ?? []).map((attempt) => ({
    id: attempt.id,
    scorePercent: attempt.scorePercent ? Number(attempt.scorePercent.toString()) : null,
    timeTakenSeconds: attempt.timeTakenSeconds ?? null,
    answers: attempt.answers as Record<string, string[]> | null,
    readModeSwitchesUsed: typeof attempt.readModeSwitchesUsed === "number" ? attempt.readModeSwitchesUsed : null,
    createdAt: attempt.createdAt.toISOString(),
  }));

  const serializableAssignment = {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      price: assignment.lesson.price.toNumber(),
      newsArticleConfig: assignment.lesson.newsArticleConfig
        ? {
            markdown: assignment.lesson.newsArticleConfig.markdown,
            maxWordTaps: assignment.lesson.newsArticleConfig.maxWordTaps ?? null,
          }
        : null,
      lyricConfig: assignment.lesson.lyricConfig
        ? {
            ...assignment.lesson.lyricConfig,
            lines: normalizeLyricLines(assignment.lesson.lyricConfig.lines),
            settings: (assignment.lesson.lyricConfig.settings as LyricLessonSettings | null) ?? null,
          }
        : null,
      lyricAttempts,
    },
    answers: assignment.answers as any,
    lyricDraftAnswers: ((): Record<string, string[]> | null => {
      if (!assignment.lyricDraftAnswers || typeof assignment.lyricDraftAnswers !== 'object') return null;
      const result: Record<string, string[]> = {};
      let hasEntries = false;
      Object.entries(assignment.lyricDraftAnswers as Record<string, unknown>).forEach(([key, raw]) => {
        if (!Array.isArray(raw)) return;
        const arr = raw.every(item => typeof item === 'string')
          ? (raw as string[])
          : raw.map(item => (item === null || item === undefined ? '' : String(item)));
        result[key] = arr;
        hasEntries = true;
      });
      return hasEntries ? result : null;
    })(),
    lyricDraftMode:
      assignment.lyricDraftMode === 'read' || assignment.lyricDraftMode === 'fill'
        ? assignment.lyricDraftMode
        : null,
    lyricDraftReadSwitches:
      typeof assignment.lyricDraftReadSwitches === 'number' ? assignment.lyricDraftReadSwitches : null,
    lyricDraftUpdatedAt: assignment.lyricDraftUpdatedAt,
  };

  const isStudentOwner = session.user.id === serializableAssignment.studentId;
  const availabilitySource =
    serializableAssignment.startDate ||
    serializableAssignment.assignedAt ||
    serializableAssignment.deadline;
  const availabilityDate = availabilitySource ? new Date(availabilitySource) : null;
  const isAvailable =
    !availabilityDate ||
    Number.isNaN(availabilityDate.getTime()) ||
    availabilityDate <= new Date();
  const isEarlyAccessLocked =
    isStudentOwner &&
    serializableAssignment.status === AssignmentStatus.PENDING &&
    !isAvailable;

  const earlyAccessCopy = locale === "it"
    ? {
        title: "Questa lezione si sblocca presto",
        body: "Non puoi ancora iniziare questa lezione. Hai ricevuto un avviso in anticipo perché stai facendo un ottimo lavoro. Appena la lezione è disponibile, riceverai una notifica.",
        availability: "Sarà disponibile il",
        cta: "Torna alle mie lezioni",
      }
    : {
        title: "This lesson unlocks soon",
        body: "You can’t start this lesson yet. You’re getting an early heads-up because you’re doing great. You'll receive a notification when it's available.",
        availability: "It opens on",
        cta: "Back to My Lessons",
      };

  const { lesson } = serializableAssignment;
  const practiceEligible =
    (serializableAssignment.status === AssignmentStatus.GRADED ||
      serializableAssignment.status === AssignmentStatus.FAILED) &&
    (lesson.type === LessonType.MULTI_CHOICE ||
      lesson.type === LessonType.FLASHCARD ||
      lesson.type === LessonType.STANDARD);
  const practiceModeRequested = practiceParam === "1" || practiceParam === "true";
  const practiceMode = practiceEligible && practiceModeRequested;
  const practiceToggleHref = practiceMode
    ? `/assignments/${serializableAssignment.id}`
    : `/assignments/${serializableAssignment.id}?practice=1`;
  const practiceExitHref = `/assignments/${serializableAssignment.id}`;
  const viewResultsHref = `/assignments/${serializableAssignment.id}?view=results`;

  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : null;
  const notesHtml = lesson.notes ? ((await marked.parse(lesson.notes)) as string) : null;
  const instructionsHtml = lesson.assignment_text ? ((await marked.parse(lesson.assignment_text)) as string) : null;
  const studentExtensionUsed = Boolean(
    await prisma.pointTransaction.findFirst({
      where: {
        assignmentId: serializableAssignment.id,
        userId: serializableAssignment.studentId,
        points: -EXTENSION_POINT_COST,
        note: { contains: "Lesson extension" },
      },
      select: { id: true },
    }),
  );
  const marketplacePurchase = await prisma.pointTransaction.findFirst({
    where: {
      assignmentId: serializableAssignment.id,
      userId: serializableAssignment.studentId,
      reason: PointReason.MARKETPLACE_PURCHASE,
    },
    select: { id: true },
  });
  const isMarketplacePurchased = Boolean(marketplacePurchase);

  const showResultsArea =
    (serializableAssignment.status === AssignmentStatus.GRADED ||
      serializableAssignment.status === AssignmentStatus.FAILED) &&
    !practiceMode;
  const isPastDue =
    serializableAssignment.status === AssignmentStatus.PENDING &&
    new Date(serializableAssignment.deadline).getTime() < Date.now();
  const deadlineDate = new Date(serializableAssignment.deadline);
  const deadlineLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(deadlineDate);
  const deadlineStartSource =
    serializableAssignment.startDate ||
    serializableAssignment.assignedAt;
  const deadlineStartDate = deadlineStartSource ? new Date(deadlineStartSource) : null;
  const deadlineWindowMs = deadlineStartDate
    ? deadlineDate.getTime() - deadlineStartDate.getTime()
    : null;
  const deadlineElapsedMs = deadlineStartDate ? Date.now() - deadlineStartDate.getTime() : null;
  const deadlineProgress = deadlineWindowMs && deadlineWindowMs > 0 && deadlineElapsedMs !== null
    ? Math.min(100, Math.max(0, Math.round((deadlineElapsedMs / deadlineWindowMs) * 100)))
    : null;
  const canRequestExtension = isStudentOwner && serializableAssignment.status === AssignmentStatus.PENDING;
  const canRevealAnswers =
    serializableAssignment.status === AssignmentStatus.GRADED ||
    serializableAssignment.status === AssignmentStatus.FAILED;

  const isMultiChoice = lesson.type === LessonType.MULTI_CHOICE;
  const isFlashcard = lesson.type === LessonType.FLASHCARD;
  const isLyric = lesson.type === LessonType.LYRIC;
  const lyricAudioUrl = lesson.lyricConfig?.audioUrl ?? null;
  const lyricAudioStorageKey = lesson.lyricConfig?.audioStorageKey ?? null;
  const isLearningSession = lesson.type === LessonType.LEARNING_SESSION;
  const isNewsArticle = lesson.type === LessonType.NEWS_ARTICLE;
  const isComposer = lesson.type === LessonType.COMPOSER;
  const isArkaning = lesson.type === LessonType.ARKANING;
  const isFlipper = lesson.type === LessonType.FLIPPER;
  const showResponseArea =
    serializableAssignment.status === AssignmentStatus.PENDING ||
    ((isArkaning || isFlipper) && isMarketplacePurchased);
  const showNewsArticleConsultation =
    isNewsArticle && serializableAssignment.status !== AssignmentStatus.PENDING;
  const multiChoiceAnswers = isMultiChoice
    ? parseMultiChoiceAnswers(serializableAssignment.answers, lesson.multiChoiceQuestions)
    : {};
  const showConfetti = serializableAssignment.score === 10;
  const hasExtendedDeadline = Boolean(
    serializableAssignment.originalDeadline &&
      new Date(serializableAssignment.originalDeadline).getTime() !== new Date(serializableAssignment.deadline).getTime(),
  );
  const teacherAnswerCommentsMap: Record<number, string> = (() => {
    const src = (serializableAssignment as any).teacherAnswerComments;
    if (!src) return {};
    if (Array.isArray(src)) {
      return src.reduce((acc: Record<number, string>, value, index) => {
        if (typeof value === "string" && value.trim()) {
          acc[index] = value.trim();
        }
        return acc;
      }, {});
    }
    if (typeof src === "object") {
      return Object.entries(src as Record<string, unknown>).reduce(
        (acc: Record<number, string>, [key, value]) => {
          if (typeof value === "string" && value.trim()) {
            const numericKey = Number(key);
            if (!Number.isNaN(numericKey)) {
              acc[numericKey] = value.trim();
            }
          }
          return acc;
        },
        {},
      );
    }
    return {};
  })();

  if (isEarlyAccessLocked && availabilityDate) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-bold text-slate-100">{earlyAccessCopy.title}</h1>
        <p className="mt-3 text-slate-300">{earlyAccessCopy.body}</p>
        <div className="mt-5 rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4 text-teal-100">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">
            {earlyAccessCopy.availability}
          </p>
          <p className="text-lg font-bold">
            <LocaleDate date={availabilityDate.toISOString()} />
          </p>
        </div>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href="/my-lessons">{earlyAccessCopy.cta}</Link>
          </Button>
        </div>
      </div>
    );
  }
  const questionItems = Array.isArray(lesson.questions)
    ? (lesson.questions as any[]).map((item) => {
        if (typeof item === "string") return { question: item, expectedAnswer: "" };
        if (item && typeof item === "object") {
          return {
            question: typeof (item as any).question === "string" ? (item as any).question : "",
            expectedAnswer: typeof (item as any).expectedAnswer === "string" ? (item as any).expectedAnswer : "",
          };
        }
        return { question: String(item ?? ""), expectedAnswer: "" };
      }).filter((item) => item.question.trim())
    : [];
  const teacherCommentsBlock = serializableAssignment.teacherComments ? (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium">{reviewCopy.teacherFeedbackTitle}</p>
        <p className="whitespace-pre-wrap">{serializableAssignment.teacherComments}</p>
      </div>
    </div>
  ) : null;
  const content = (
    <>
      {!isFlashcard && (
        <div className="mt-1">
          <LessonContentView
            lesson={serializableAssignment.lesson}
            showInstructions={false}
            copy={{
              additionalInfoTitle: notesCopy.additionalInfoTitle,
              additionalInfoAvailable: notesCopy.additionalInfoAvailable,
              supportingMaterial: contentCopy.supportingMaterial,
              listenOnSpotify: contentCopy.listenOnSpotify,
              timingReference: contentCopy.timingReference,
              openTrack: contentCopy.openTrack,
              instructionsTitle: contentCopy.instructionsTitle,
              materialTitle: contentCopy.materialTitle,
              viewAttachment: contentCopy.viewAttachment,
            }}
          />
        </div>
      )}

      {showResponseArea || showNewsArticleConsultation ? (
        <div className="mt-1">
          {!isFlashcard && notesHtml && (
            <Accordion type="single" collapsible className="mb-2 rounded-lg border bg-gray-50 p-4 text-gray-800">
              <AccordionItem value="notes" className="border-none">
                <AccordionTrigger className="group py-0 text-left text-lg font-semibold text-gray-900 hover:no-underline">
                  <span className="flex flex-col gap-1">
                    <span>{notesCopy.notesTitle}</span>
                    <span className="text-xs font-normal text-gray-500 group-data-[state=open]:hidden">
                      {notesCopy.notesAvailable}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: notesHtml }} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {!isFlashcard && !isLearningSession && (
            <div className="mb-1" aria-hidden="true" />
          )}
          {isFlashcard ? (
            <FlashcardPlayer
              assignment={serializableAssignment}
              isSubmissionLocked={isPastDue}
              copy={lessonCopy.flashcard}
            />
          ) : isMultiChoice ? (
            <MultiChoicePlayer
              assignment={serializableAssignment}
              isSubmissionLocked={isPastDue}
              autoSaveEnabled={autoSaveEnabled}
              copy={lessonCopy.multiChoice}
            />
          ) : isComposer && lesson.composerConfig ? (
            <ComposerLessonPlayer
              assignment={serializableAssignment as any}
              isSubmissionLocked={isPastDue}
              autoSaveEnabled={autoSaveEnabled}
              copy={composerCopy}
            />
          ) : isLyric && lesson.lyricConfig ? (
            <LyricLessonPlayer
              assignmentId={serializableAssignment.id}
              studentId={serializableAssignment.studentId}
              lessonId={lesson.id}
              audioUrl={lyricAudioUrl}
              audioStorageKey={lyricAudioStorageKey}
              lines={lesson.lyricConfig.lines}
              settings={lesson.lyricConfig.settings}
              status={serializableAssignment.status}
              existingAttempt={lesson.lyricAttempts?.[0] ?? null}
              timingSourceUrl={lesson.lyricConfig.timingSourceUrl ?? null}
              lrcUrl={lesson.lyricConfig.lrcUrl ?? null}
              draftState={{
                answers: (serializableAssignment as any).lyricDraftAnswers ?? null,
                mode: (serializableAssignment as any).lyricDraftMode ?? null,
                readModeSwitches: (serializableAssignment as any).lyricDraftReadSwitches ?? null,
                updatedAt: (serializableAssignment as any).lyricDraftUpdatedAt ?? null,
              }}
              bonusReadSwitches={availableReadBoosts}
              autoSaveEnabled={autoSaveEnabled}
              copy={lessonCopy.lyric}
            />
          ) : isLearningSession ? (
            <LearningSessionPlayer
              cards={lesson.learningSessionCards ?? []}
              lessonTitle={lesson.title}
              copy={lessonCopy.learningSession}
            />
          ) : isNewsArticle && lesson.newsArticleConfig ? (
            <NewsArticleLessonPlayer
              assignmentId={serializableAssignment.id}
              markdown={lesson.newsArticleConfig.markdown}
              maxWordTaps={lesson.newsArticleConfig.maxWordTaps ?? null}
              initialTapCount={serializableAssignment.newsArticleTapCount ?? 0}
              lessonTitle={lesson.title}
              lessonPreview={lesson.lesson_preview}
              status={serializableAssignment.status}
              isPastDue={isPastDue}
              deadlineLabel={deadlineLabel}
              initialRating={serializableAssignment.rating ?? null}
              deadlineLabelText={assignmentUiCopy.deadlineLabel}
              consultationLabel={assignmentUiCopy.consultationMode}
              rateLabel={assignmentUiCopy.newsRateLabel}
              bannerKicker={assignmentUiCopy.newsBannerKicker}
              bannerSubhead={assignmentUiCopy.newsBannerSubhead}
            />
          ) : isArkaning ? (
            <ArkaningLessonPlayer
              config={(lesson as any).arkaningConfig ?? null}
              assignmentId={serializableAssignment.id}
            />
          ) : isFlipper ? (
            <FlipperLessonPlayer
              config={(lesson as any).flipperConfig ?? null}
              tiles={(lesson as any).flipperTiles ?? []}
              assignmentId={serializableAssignment.id}
            />
          ) : (
            <LessonResponseForm
              assignment={serializableAssignment}
              isSubmissionLocked={isPastDue}
              autoSaveEnabled={autoSaveEnabled}
              copy={lessonCopy.standard}
            />
          )}
        </div>
      ) : showResultsArea ? (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-4">{reviewCopy.reviewTitle}</h2>
          {lesson.type === LessonType.STANDARD && (
            <div className="mt-2 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-slate-100">
              {Array.isArray(serializableAssignment.answers) && questionItems.map((item, i) => {
                const teacherComment = teacherAnswerCommentsMap[i];
                const expectedAnswer = item.expectedAnswer?.trim();
                const studentAnswer = serializableAssignment.answers[i] || reviewCopy.noAnswerProvided;
                return (
                  <div key={i} className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-900/70 p-4">
                    <p className="text-sm font-semibold text-slate-100">
                      {reviewCopy.questionLabel.replace("{index}", String(i + 1))}{" "}
                      <span className="font-normal text-slate-200">{item.question}</span>
                    </p>

                    <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/90 p-3 text-slate-800">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-900">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {reviewCopy.studentAnswerLabel}
                        </p>
                        <p className="whitespace-pre-wrap">{studentAnswer}</p>
                      </div>
                    </div>

                    {expectedAnswer && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-sm text-emerald-900">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                          {reviewCopy.expectedAnswerLabel}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-medium">{expectedAnswer}</p>
                      </div>
                    )}

                    {teacherComment && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <GraduationCap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-200" />
                        <p className="whitespace-pre-wrap">{teacherComment}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {teacherCommentsBlock}
              {serializableAssignment.rating && (
                <div>
                  <p className="text-sm font-semibold text-slate-200">{reviewCopy.yourRating}</p>
                  <div className="mt-1">
                    <Rating initialRating={serializableAssignment.rating} readOnly={true} starSize={20} />
                  </div>
                </div>
              )}
            </div>
          )}
          {lesson.type === LessonType.MULTI_CHOICE && (
            <>
              <div className="space-y-6">
                {lesson.multiChoiceQuestions.map((q, i) => {
                  const studentAnswer = multiChoiceAnswers[q.id];
                  const selectedOption = resolveSelectedOption(q, studentAnswer);
                  const selectedLabel = resolveSelectedLabel(q, studentAnswer, selectedOption);
                  const correctOption = q.options.find(opt => opt.isCorrect);
                  const normalizedCorrect = correctOption
                    ? normalizeMultiChoiceText(correctOption.text)
                    : null;
                  return (
                    <div key={q.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-slate-100">
                      <p className="font-semibold">
                        {reviewCopy.questionLabel.replace("{index}", String(i + 1))} {q.question}
                      </p>
                      {!selectedOption && selectedLabel && (
                        <div className={cn(
                          "mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
                          canRevealAnswers
                            ? "border-rose-400/50 bg-rose-500/10 text-rose-100"
                            : "border-slate-700/70 bg-slate-900/70 text-slate-200"
                        )}>
                          <UserRound className="h-4 w-4" />
                          <span className="font-normal">{selectedLabel}</span>
                        </div>
                      )}
                      <div className="mt-2 space-y-2">
                        {q.options.map(opt => {
                          const isSelected = selectedOption?.id === opt.id;
                          const isCorrect = canRevealAnswers && (
                            opt.isCorrect ||
                            (normalizedCorrect && normalizeMultiChoiceText(opt.text) === normalizedCorrect)
                          );
                          return (
                            <div key={opt.id} className={cn(
                              "flex items-center gap-2 rounded-md p-2 border border-transparent",
                              isSelected && canRevealAnswers && !isCorrect && "border-rose-400/50 bg-rose-500/10 text-rose-100",
                              isCorrect && "border-emerald-300/50 bg-emerald-500/10",
                              isSelected && !canRevealAnswers && "border-slate-700/70 bg-slate-900/70"
                            )}>
                              {canRevealAnswers ? (
                                isSelected
                                  ? (isCorrect ? <Check className="h-5 w-5 text-emerald-300"/> : <X className="h-5 w-5 text-rose-300"/>)
                                  : (isCorrect ? <Check className="h-5 w-5 text-emerald-300"/> : <div className="h-5 w-5"/>)
                              ) : (
                                <div className="h-5 w-5" />
                              )}
                              <span className={cn(isSelected && "font-bold")}>{opt.text}</span>
                            </div>
                          )
                        })}
                      </div>
                      {!canRevealAnswers && (
                        <p className="mt-2 text-xs text-slate-400">
                          Answers unlock after grading.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.COMPOSER && Array.isArray(serializableAssignment.answers) && (
            <>
              <div className="space-y-4">
                {serializableAssignment.answers.map((answer: any, index: number) => {
                  const isCorrect = Boolean(answer?.isCorrect);
                  return (
                    <div
                      key={`${answer?.index ?? index}`}
                      className={cn(
                        "rounded-2xl border p-4",
                        canRevealAnswers
                          ? isCorrect
                            ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
                            : "border-rose-400/50 bg-rose-500/10 text-rose-100"
                          : "border-slate-700/70 bg-slate-900/70 text-slate-100"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-100">
                        {index + 1}. {answer?.prompt || 'Composer prompt'}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Selected</p>
                          <p className="font-semibold">{answer?.selectedWord || '—'}</p>
                        </div>
                        {canRevealAnswers && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">Correct word</p>
                            <p className="font-semibold">{answer?.correctWord || '—'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!canRevealAnswers && (
                <p className="mt-2 text-xs text-slate-400">
                  Answers unlock after grading.
                </p>
              )}
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.FLASHCARD && typeof serializableAssignment.answers === 'object' && serializableAssignment.answers !== null && (
            <>
              <div className="space-y-4">
                {lesson.flashcards.map((fc) => {
                  const studentPerformance = serializableAssignment.answers[fc.id];
                  return (
                    <div key={fc.id} className={cn("flex items-center justify-between rounded-2xl border p-4",
                        studentPerformance === 'correct' ? 'border-emerald-300/50 bg-emerald-500/10' : 'border-rose-400/50 bg-rose-500/10 text-rose-100'
                    )}>
                        <div>
                            <p className="font-semibold">{fc.term}</p>
                            <p className="text-sm text-slate-300">{fc.definition}</p>
                        </div>
                        {studentPerformance === 'correct' && (
                            <div className="flex items-center gap-1 text-emerald-200 font-semibold">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>{assignmentUiCopy.rightLabel}</span>
                            </div>
                        )}
                        {studentPerformance === 'incorrect' && (
                            <div className="flex items-center gap-1 text-rose-200 font-semibold">
                                <XCircle className="h-5 w-5" />
                                <span>{assignmentUiCopy.wrongLabel}</span>
                            </div>
                        )}
                    </div>
                  )
                })}
              </div>
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.LEARNING_SESSION && (
            <>
              <LearningSessionPlayer
                cards={lesson.learningSessionCards ?? []}
                lessonTitle={lesson.title}
              />
              {teacherCommentsBlock}
            </>
          )}
          {lesson.type === LessonType.LYRIC && lesson.lyricConfig && (
            <LyricLessonPlayer
              assignmentId={serializableAssignment.id}
              studentId={serializableAssignment.studentId}
              lessonId={lesson.id}
              audioUrl={lyricAudioUrl}
              audioStorageKey={lyricAudioStorageKey}
              lines={lesson.lyricConfig.lines}
              settings={lesson.lyricConfig.settings}
              status={serializableAssignment.status}
              existingAttempt={lesson.lyricAttempts?.[0] ?? null}
              timingSourceUrl={lesson.lyricConfig.timingSourceUrl ?? null}
              lrcUrl={lesson.lyricConfig.lrcUrl ?? null}
              bonusReadSwitches={availableReadBoosts}
            />
          )}
        </div>
      ) : !practiceMode && !isNewsArticle ? (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-slate-200">
            <p className="text-sm text-slate-300">
              {assignmentUiCopy.viewResultsPrompt}
            </p>
            <Button asChild size="sm" className="mt-3 border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:brightness-110">
              <Link href={viewResultsHref}>{assignmentUiCopy.viewResultsCta}</Link>
            </Button>
          </div>
        </div>
      ) : null}
      {practiceMode && practiceEligible && (
        <div className="mt-10 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">{assignmentUiCopy.practiceModeTitle}</h2>
              <p className="text-sm text-slate-400">{assignmentUiCopy.practiceModeBody}</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="border-slate-700 bg-slate-800/70 text-slate-100 hover:border-teal-400/60 hover:text-white">
              <Link href={practiceExitHref}>{assignmentUiCopy.practiceDone}</Link>
            </Button>
          </div>
          {lesson.type === LessonType.FLASHCARD ? (
            <FlashcardPlayer
              assignment={serializableAssignment as any}
              mode="practice"
              practiceExitHref={practiceExitHref}
              copy={lessonCopy.flashcard}
            />
          ) : lesson.type === LessonType.MULTI_CHOICE ? (
            <MultiChoicePlayer
              assignment={serializableAssignment as any}
              mode="practice"
              practiceExitHref={practiceExitHref}
              copy={lessonCopy.multiChoice}
            />
          ) : (
          <LessonResponseForm
            assignment={serializableAssignment}
            practiceMode
            autoSaveEnabled={autoSaveEnabled}
            copy={lessonCopy.standard}
          />
          )}
        </div>
      )}
    </>
  );
  
  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      {showConfetti && <Confetti />}

      <h1 className="mb-2 text-3xl font-bold text-slate-100">{lesson.title}</h1>
      <div className="mb-6 text-sm text-slate-300">
        <p className="font-semibold text-slate-200">
          {assignmentUiCopy.deadlineLabel} <LocaleDate date={serializableAssignment.deadline} />
        </p>
        {deadlineProgress !== null && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-end gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right">
              <span>{assignmentUiCopy.timeElapsed}</span>
              <span className="text-slate-100">{deadlineProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-lime-400 to-amber-400"
                style={{ width: `${deadlineProgress}%` }}
              />
            </div>
          </div>
        )}
      {hasExtendedDeadline && serializableAssignment.originalDeadline && (
        <div className="mt-1 space-y-1 text-xs text-slate-400">
          <p>
            {assignmentUiCopy.originalLabel}&nbsp;
            <span className="line-through">
              <LocaleDate date={serializableAssignment.originalDeadline} />
            </span>
          </p>
          <p className="font-semibold text-teal-200">
            {studentExtensionUsed ? deadlineCopy.extended : deadlineCopy.updated}
          </p>
        </div>
      )}
      </div>
      {canRequestExtension && deadlineProgress !== null && deadlineProgress >= 80 && (
        <StudentExtensionRequest
          assignmentId={serializableAssignment.id}
          disabled={studentExtensionUsed}
          locale={locale}
        />
      )}
      {isPastDue && (
        <div className="mb-6 rounded-md border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">{assignmentUiCopy.deadlineMissedTitle}</p>
          <p className="mt-1">{assignmentUiCopy.deadlineMissedBody}</p>
        </div>
      )}

      {showResultsArea && (
        <div className="mb-8 space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-100">{assignmentUiCopy.yourResultsTitle}</h2>
          <div
            className={cn(
              "flex items-center justify-between rounded-2xl p-5",
              getGradeBackground(serializableAssignment.score)
            )}
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/90 drop-shadow">{/* drop shadow for contrast */}
                {assignmentUiCopy.statusLabel}
              </p>
              <Badge variant={serializableAssignment.status === 'GRADED' ? 'default' : 'destructive'}>
                {serializableAssignment.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white/90 drop-shadow">{assignmentUiCopy.scoreLabel}</p>
              <p className="text-3xl font-black text-white drop-shadow">
                {serializableAssignment.score !== null
                  ? `${serializableAssignment.score}/10`
                  : assignmentUiCopy.scoreUnavailable}
              </p>
            </div>
          </div>

          {practiceEligible && (
            <div className="flex flex-wrap gap-3">
              {!practiceMode ? (
                <Button asChild size="sm" className="border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110">
                  <Link href={practiceToggleHref}>{assignmentUiCopy.takeTestAgain}</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white">
                  <Link href={practiceToggleHref}>{assignmentUiCopy.exitPracticeMode}</Link>
                </Button>
              )}
            </div>
          )}
          {serializableAssignment.rating && (
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-100">{assignmentUiCopy.yourRatingLabel}</h3>
              <div className="mt-1">
                <Rating initialRating={serializableAssignment.rating} readOnly={true} starSize={20} />
              </div>
            </div>
          )}
        </div>
      )}

      <LessonInstructionsGate
        instructionsHtml={instructionsHtml}
        skipAcknowledgement={serializableAssignment.status !== AssignmentStatus.PENDING}
        defaultCollapsed={serializableAssignment.status !== AssignmentStatus.PENDING}
        copy={instructionsCopy}
      >
        {content}
      </LessonInstructionsGate>
    </div>
  );
}
