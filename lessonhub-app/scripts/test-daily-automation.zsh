#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AUTOMATION_ENV_FILE="${AUTOMATION_ENV_FILE:-${ROOT_DIR}/.env.automation}"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTOMATION_TOKEN="${AUTOMATION_TOKEN:-}"
TEACHER_EMAIL="${TEACHER_EMAIL:-}"
LESSON_KIND="${LESSON_KIND:-standard}"
TARGET_DATE="${TARGET_DATE:-$(date +%F)}"
DEFAULT_CLASS_ID="${DEFAULT_CLASS_ID:-}"
DEFAULT_CLASS_NAME="${DEFAULT_CLASS_NAME:-Fall 2025}"

if [[ -z "$AUTOMATION_TOKEN" && -f "$AUTOMATION_ENV_FILE" ]]; then
  AUTOMATION_TOKEN="$(
    awk -F= '/^AUTOMATION_TOKEN=/{value=$0} END{print value}' "$AUTOMATION_ENV_FILE" | sed 's/^AUTOMATION_TOKEN=//'
  )"
fi

if [[ -z "$DEFAULT_CLASS_ID" && -f "$AUTOMATION_ENV_FILE" ]]; then
  DEFAULT_CLASS_ID="$(
    awk -F= '/^DEFAULT_CLASS_ID=/{value=$0} END{print value}' "$AUTOMATION_ENV_FILE" | sed 's/^DEFAULT_CLASS_ID=//'
  )"
fi

if [[ -f "$AUTOMATION_ENV_FILE" ]]; then
  FILE_CLASS_NAME="$(
    awk -F= '/^DEFAULT_CLASS_NAME=/{value=$0} END{print value}' "$AUTOMATION_ENV_FILE" | sed 's/^DEFAULT_CLASS_NAME=//'
  )"
  if [[ -n "$FILE_CLASS_NAME" ]]; then
    DEFAULT_CLASS_NAME="$FILE_CLASS_NAME"
  fi
fi

if [[ -z "$AUTOMATION_TOKEN" ]]; then
  echo "Set AUTOMATION_TOKEN or add it to ${AUTOMATION_ENV_FILE}." >&2
  exit 1
fi

if [[ -z "$TEACHER_EMAIL" ]]; then
  echo "Set TEACHER_EMAIL before running this script." >&2
  exit 1
fi

if [[ "$LESSON_KIND" != "standard" && "$LESSON_KIND" != "multi-choice" ]]; then
  echo "LESSON_KIND must be 'standard' or 'multi-choice'." >&2
  exit 1
fi

TOPIC_POOL=(
  "viaggi e spostamenti"
  "ristorante e ordinazioni"
  "routine quotidiana"
  "colloquio di lavoro"
  "dare indicazioni"
  "shopping e negozi"
  "check-in in hotel"
  "telefonate quotidiane"
  "piccole conversazioni"
  "salute e appuntamenti"
  "meteo e stagioni"
  "raccontare il passato"
)

TITLE_PREFIXES=(
  "Parole in Movimento"
  "Italiano in Scena"
  "Passi di Lingua"
  "Dialoghi del Giorno"
  "Frasi che Servono"
  "Allenamento di Voce"
  "Un Tema, Mille Frasi"
  "La Lezione di Oggi"
)

PREVIEW_TEMPLATES=(
  "Un'attivita breve e guidata per lavorare su %s con sicurezza."
  "Una lezione semplice per usare %s in frasi chiare e naturali."
  "Esercizio quotidiano dedicato a %s, con domande pratiche e risposte complete."
  "Una pratica veloce per migliorare il tuo uso di %s in contesti reali."
)

export TARGET_DATE
DAY_INDEX="$(
  node --input-type=module <<'EOF'
const targetDate = process.env.TARGET_DATE
const start = new Date(`${targetDate}T00:00:00Z`)
const startOfYear = new Date(Date.UTC(start.getUTCFullYear(), 0, 1))
const diffDays = Math.floor((start.getTime() - startOfYear.getTime()) / 86400000)
console.log(diffDays)
EOF
)"

TOPIC_INDEX=$(( DAY_INDEX % ${#TOPIC_POOL[@]} + 1 ))
TOPIC="${TOPIC_POOL[$TOPIC_INDEX]}"
TITLE_PREFIX_INDEX=$(( DAY_INDEX % ${#TITLE_PREFIXES[@]} + 1 ))
PREVIEW_INDEX=$(( DAY_INDEX % ${#PREVIEW_TEMPLATES[@]} + 1 ))
TITLE_PREFIX="${TITLE_PREFIXES[$TITLE_PREFIX_INDEX]}"
PREVIEW_TEMPLATE="${PREVIEW_TEMPLATES[$PREVIEW_INDEX]}"
ITALIAN_DATE="$(
  LC_ALL=it_IT.UTF-8 date -j -f "%Y-%m-%d" "$TARGET_DATE" "+%-d %B %Y" 2>/dev/null \
    || TARGET_DATE="$TARGET_DATE" node --input-type=module <<'EOF'
const dt = new Date(`${process.env.TARGET_DATE}T00:00:00Z`)
console.log(
  new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
)
EOF
)"
TITLE="${TITLE_PREFIX} — ${ITALIAN_DATE}"
PREVIEW="$(printf "$PREVIEW_TEMPLATE" "$TOPIC")"
INSTRUCTIONS="Leggi le domande e rispondi in modo chiaro e completo. Usa frasi semplici ma corrette."

LOOKUP_URL="${BASE_URL}/api/automation/context?title=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$TITLE")"
if [[ -n "$DEFAULT_CLASS_ID" ]]; then
  LOOKUP_URL="${LOOKUP_URL}&classId=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$DEFAULT_CLASS_ID")"
else
  LOOKUP_URL="${LOOKUP_URL}&className=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$DEFAULT_CLASS_NAME")"
fi

LOOKUP_FILE="$(mktemp)"
LOOKUP_STATUS="$(
  curl -sS -o "$LOOKUP_FILE" -w '%{http_code}' \
    -H "Authorization: Bearer ${AUTOMATION_TOKEN}" \
    "$LOOKUP_URL"
)"

if [[ "$LOOKUP_STATUS" -lt 200 || "$LOOKUP_STATUS" -ge 300 ]]; then
  echo "Failed to resolve automation context (HTTP ${LOOKUP_STATUS})." >&2
  cat "$LOOKUP_FILE" >&2
  echo >&2
  rm -f "$LOOKUP_FILE"
  exit 1
fi

LOOKUP_JSON="$(cat "$LOOKUP_FILE")"
rm -f "$LOOKUP_FILE"

export LOOKUP_JSON
EXISTING_LESSON_ID="$(
  node --input-type=module <<'EOF'
const payload = JSON.parse(process.env.LOOKUP_JSON)
if (payload.existingLessonId) console.log(payload.existingLessonId)
EOF
)"
CLASS_ID="$(
  node --input-type=module <<'EOF'
const payload = JSON.parse(process.env.LOOKUP_JSON)
if (payload.resolvedClassId) console.log(payload.resolvedClassId)
EOF
)"

if [[ -n "$EXISTING_LESSON_ID" ]]; then
  echo "Lesson already exists for ${TARGET_DATE}: ${EXISTING_LESSON_ID}"
  echo "No API call made."
  exit 0
fi

if [[ -z "$CLASS_ID" ]]; then
  echo "Unable to resolve a class id from the remote automation context." >&2
  exit 1
fi

ENDPOINT="/api/automation/lessons"
if [[ "$LESSON_KIND" == "multi-choice" ]]; then
  ENDPOINT="/api/automation/lessons/multi-choice"
fi

export TITLE TOPIC TARGET_DATE LESSON_KIND PREVIEW INSTRUCTIONS CLASS_ID
PAYLOAD="$(
  node --input-type=module <<'EOF'
const title = process.env.TITLE
const topic = process.env.TOPIC
const targetDate = process.env.TARGET_DATE
const lessonKind = process.env.LESSON_KIND
const lessonPreview = process.env.PREVIEW
const instructions = process.env.INSTRUCTIONS
const classId = process.env.CLASS_ID

const base = {
  title,
  topic,
  lesson_preview: lessonPreview,
  price: 20,
  difficulty: 3,
  isFreeForAll: false,
  assignment: {
    classIds: [classId],
    notificationOption: 'on_start_date',
    reassignExisting: false,
  },
}

if (lessonKind === 'multi-choice') {
  const payload = {
    ...base,
    questions: [
      {
        question: `Which phrase best matches the topic "${topic}"?`,
        options: [
          { text: `Core phrase for ${topic}`, isCorrect: true },
          { text: 'Unrelated phrase A', isCorrect: false },
          { text: 'Unrelated phrase B', isCorrect: false },
        ],
      },
      {
        question: `Which day is this lesson generated for?`,
        options: [
          { text: targetDate, isCorrect: true },
          { text: 'Yesterday', isCorrect: false },
          { text: 'Tomorrow', isCorrect: false },
        ],
      },
    ],
  }
  console.log(JSON.stringify(payload))
} else {
  const payload = {
    ...base,
    assignmentText: instructions,
    questions: [
      {
        question: `Scrivi una frase completa sul tema "${topic}".`,
        expectedAnswer: `Esempio di risposta sul tema ${topic}`,
      },
      {
        question: `Descrivi una situazione reale in cui useresti espressioni legate a "${topic}".`,
        expectedAnswer: `Risposta personale coerente con il tema ${topic}`,
      },
      {
        question: `Qual e l'argomento centrale della lezione di oggi?`,
        expectedAnswer: topic,
      },
    ],
  }
  console.log(JSON.stringify(payload))
}
EOF
)"

echo "Creating ${LESSON_KIND} lesson for ${TARGET_DATE}"
echo "Teacher: ${TEACHER_EMAIL}"
echo "Topic: ${TOPIC}"
echo "Title: ${TITLE}"
echo "Preview: ${PREVIEW}"
echo "Class ID: ${CLASS_ID}"

RESPONSE_FILE="$(mktemp)"
HTTP_STATUS="$(
  curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
    -X POST "${BASE_URL}${ENDPOINT}" \
    -H "Authorization: Bearer ${AUTOMATION_TOKEN}" \
    -H 'Content-Type: application/json' \
    --data "$PAYLOAD"
)"

echo "HTTP ${HTTP_STATUS}"
cat "$RESPONSE_FILE"
echo

if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  rm -f "$RESPONSE_FILE"
  exit 1
fi

rm -f "$RESPONSE_FILE"
