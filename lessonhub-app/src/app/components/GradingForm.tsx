// file: src/app/components/GradingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { gradeAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';
import { CheckSquare, User } from 'lucide-react';

interface GradingFormProps {
  // Assignment with lesson and potential existing per-answer comments
  assignment: Assignment & {
    // Accept a broader lesson shape from Prisma, only `type` and `questions` are read
    lesson?: { type: LessonType; questions?: any } & Record<string, any>;
    answers?: any;
    teacherAnswerComments?: any;
  };
}

const scoreOptions = [
  { label: 'Good', value: '10' },
  { label: 'Bad', value: '-1' },
];

// Fallback expected answers keyed by normalized hint text
const EXPECTED_BY_HINT: Record<string, string> = {
  'carriesoxygenpoorbloodfromthebodybackintotheheartfromabove': 'Ascending Vena Cava',
  'carriesoxygenpoorbloodfromthebodybackintotheheartfrombelow': 'Descending Vena Cava',
  'pumpsbloodthroughtheentirebodyandkeepscirculationgoing': 'Heart',
  'sendsoxygenpoorbloodfromthehearttothelungstopickupoxygen': 'Pulmonary Artery',
  'returnsoxygenrichbloodfromthelungsbacktotheheart': 'Pulmonary Vein',
  'curvesoverthetopoftheheartlikeanarchanddistributesoxygenrichbloodeverywhere': 'Arch of the Aorta',
  'themainarterythatdeliversoxygenrichbloodfromthehearttothewholebody': 'Aorta',
  'exchangesoxygenandcarbondioxideasyoubreathe': 'Lungs',
  'filtersbloodremovestoxinsandhelpsprocessnutrients': 'Liver',
  'storesandconcentratesdigestivebiletohelpbreakdownfats': 'Gall Bladder',
  'thefirstsectionofthesmallintestinewherestomachcontentsmixwithenzymes': 'Duodenum',
  'storesreleasesandsupportsimmuneystemfunctionsfiltersblood': 'Spleen',
  'breaksdownfoodwithacidandenzymesbeforepassingitonward': 'Stomach',
  'filtersbloodremoveswasteandcreatesurinerightside': 'Right Kidney',
  'filtersbloodremoveswasteandcreatesurineleftside': 'Left Kidney',
  'carriesdigestivewasteupwardontherightsideoftheabdomen': 'Ascending Colon',
  'carriesdigestivewastedownwardontheleftsideoftheabdomen': 'Descending Colon',
  'apouchwherethesmallintestinemeststhelargeintestine': 'Cecum',
  'asmalltubeattachedtothececumcanbecomeinflamed': 'Appendix',
  'runsthroughthelowerabdomenabsorbingnutrientsfromdigestedfood': 'Small Intestines',
  'carriesbloodtoandfromthelegsandpelvisontherightside': 'Right Common Iliac Artery and Vein',
  'carriesbloodtoandfromthelegsandpelvisontheleftside': 'Left Common Iliac Artery and Vein',
  'storeswastebeforeitleavesthebody': 'Rectum',
};

export default function GradingForm({ assignment }: GradingFormProps) {
  const router = useRouter();
  const formatContent = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const normalizeWord = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/['’‘‛‵`´]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  const existingScore = typeof assignment.score === 'number' ? assignment.score : null;
  const [scoreValue, setScoreValue] = useState<string | null>(
    existingScore !== null ? existingScore.toString() : null
  );
  const [teacherComments, setTeacherComments] = useState(
    assignment.teacherComments || ''
  );
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [extraPointsError, setExtraPointsError] = useState<string | null>(null);
  const [extraPointsValue, setExtraPointsValue] = useState<string>(() => {
    const extra = typeof assignment.extraPoints === 'number' ? assignment.extraPoints : 0;
    return extra.toString();
  });
  const isStandard = assignment.lesson?.type === 'STANDARD';
  const questions = Array.isArray(assignment.lesson?.questions)
    ? (assignment.lesson?.questions as any[])
    : [];
  const extractStudentAnswer = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const candidateFields = ['answer', 'studentAnswer', 'response', 'value', 'text'];
      for (const key of candidateFields) {
        const candidate = (value as any)[key];
        if (typeof candidate === 'string') return candidate;
      }
    }
    return '';
  };
  const studentAnswers: string[] | null = (() => {
    const raw = assignment.answers as any;
    if (Array.isArray(raw)) {
      return raw.map(extractStudentAnswer);
    }
    if (raw && typeof raw === 'object') {
      return Object.values(raw as Record<string, unknown>).map(extractStudentAnswer);
    }
    return null;
  })();
  // Normalize existing comments: support array or object from DB
  const existingMap: Record<number, string> = (() => {
    const src = assignment.teacherAnswerComments as any;
    if (!src) return {};
    if (Array.isArray(src)) {
      return src.reduce((acc: Record<number, string>, val: string, idx: number) => {
        if (val && val.trim()) acc[idx] = val;
        return acc;
      }, {});
    }
    const obj: Record<string, string> = typeof src === 'object' ? src : {};
    return Object.keys(obj).reduce((acc: Record<number, string>, k: string) => {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) acc[Number(k)] = v;
      return acc;
    }, {});
  })();
  const [answerComments, setAnswerComments] = useState<Record<number, string>>(existingMap);
  const [openEditors, setOpenEditors] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    Object.keys(existingMap).forEach(k => (initial[Number(k)] = true));
    return initial;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreValue === null) {
      setScoreError('Please select a score.');
      toast.error('Please select a score.');
      setIsLoading(false);
      return;
    }
    const numericScore = Number(scoreValue);
    if (!Number.isFinite(numericScore)) {
      setScoreError('Please select a valid score.');
      toast.error('Please select a valid score.');
      setIsLoading(false);
      return;
    }
    const parsedExtra = extraPointsValue === '' ? 0 : Number(extraPointsValue);
    if (!Number.isFinite(parsedExtra) || parsedExtra < 0 || !Number.isInteger(parsedExtra)) {
      setExtraPointsError('Extra points must be a non-negative whole number.');
      toast.error('Extra points must be a non-negative whole number.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Only send non-empty comments
      const cleaned: Record<number, string> = Object.keys(answerComments).reduce((acc, key) => {
        const idx = Number(key);
        const val = (answerComments as any)[key];
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed) acc[idx] = trimmed;
        }
        return acc;
      }, {} as Record<number, string>);

      const result = await gradeAssignment(assignment.id, {
        score: numericScore,
        teacherComments,
        extraPoints: parsedExtra,
        answerComments: isStandard && Object.keys(cleaned).length > 0 ? cleaned : undefined,
      });

      if (result.success) {
        toast.success('Grade submitted successfully!');
        router.push(`/dashboard/submissions/${assignment.lessonId}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to submit grade.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('GRADE_SUBMIT_CLIENT_ERROR', err);
      toast.error('Failed to submit grade.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top: scoring + general notes (full width) */}
      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium text-slate-100">Score</Label>
          {existingScore !== null && (
            <span className="text-sm text-slate-300">
              Current grade: <span className="font-semibold text-slate-100">{existingScore}</span>/10
            </span>
          )}
        </div>
        <RadioGroup
          value={scoreValue ?? ''}
          onValueChange={(value) => {
            if (value) {
              setScoreValue(value);
              setScoreError(null);
            } else {
              setScoreValue(null);
            }
          }}
          className="mt-2 space-y-2 text-slate-100"
        >
          {scoreOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.label} />
              <Label htmlFor={option.label} className="text-slate-100">
                {option.label} ({option.value} points)
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="custom-score" className="text-slate-100">Custom Score (Overrides Above)</Label>
          <select
            id="custom-score"
            value={scoreValue ?? ''}
            onChange={(event) => {
              const { value } = event.target;
              if (value === '') {
                setScoreValue(null);
              } else {
                setScoreValue(value);
                setScoreError(null);
              }
            }}
            className="w-full rounded-md border border-slate-700 bg-slate-900/70 p-2 text-slate-100 shadow-sm"
          >
            <option value="">Select a score</option>
            {Array.from({ length: 11 }, (_, i) => i).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {scoreError && (
            <p className="mt-2 text-sm text-red-400">{scoreError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra-points" className="text-slate-100">Extra Points (Bonus)</Label>
          <Input
            id="extra-points"
            type="number"
            min={0}
            step={1}
            value={extraPointsValue}
            onChange={(event) => {
              setExtraPointsValue(event.target.value);
              setExtraPointsError(null);
            }}
            placeholder="0"
            className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-400"
          />
          {extraPointsError && (
            <p className="mt-2 text-sm text-red-400">{extraPointsError}</p>
          )}
        </div>

        <div>
          <Label htmlFor="comments" className="text-slate-100">Comments (Markdown supported)</Label>
          <Textarea
            id="comments"
            value={teacherComments}
            onChange={(e) => setTeacherComments(e.target.value)}
            placeholder="Provide feedback for the student... You can use markdown for **bold**, *italics*, etc."
            className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Bottom: single column with question + student answer + expected + comment control */}
      {isStandard && questions.length > 0 && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-100">Student&apos;s Response</p>
          {questions.map((q, i) => {
            const questionText = (() => {
              const candidate = (q as any)?.question ?? (q as any)?.prompt ?? q;
              return formatContent(candidate);
            })();
            const expectedRaw =
              typeof (q as any)?.expectedAnswer === 'string'
                ? (q as any).expectedAnswer
                : '';
            const expectedFromMap = EXPECTED_BY_HINT[normalizeWord(questionText)];
            const expectedText =
              expectedRaw && normalizeWord(expectedRaw) !== normalizeWord(questionText)
                ? expectedRaw
                : expectedFromMap || expectedRaw;
            const studentAnswerRaw = studentAnswers?.[i];
            const studentAnswer = formatContent(studentAnswerRaw);
            const answerMatches =
              expectedText && studentAnswer
                ? normalizeWord(studentAnswer) === normalizeWord(expectedText)
                : false;
            const studentBg = expectedText
              ? answerMatches
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-50'
                : 'border-amber-400/70 bg-amber-500/15 text-amber-50'
              : 'border-sky-300/60 bg-sky-500/15 text-sky-50';

            return (
              <div key={i} className="space-y-2 rounded-md border border-slate-800 bg-slate-900 p-3">
                <p className="text-sm font-semibold text-slate-100">
                  Q{i + 1}❓ {questionText}
                </p>
                <div className={`rounded-md border-l-4 px-3 py-2 text-sm ${studentBg} flex items-start gap-2`}>
                  <User className="mt-0.5 h-4 w-4 text-white/80" />
                  <span className="text-slate-100">
                    {studentAnswer || <span className="italic text-slate-400">No answer provided.</span>}
                  </span>
                </div>
                {expectedText && (
                  <div className="rounded-md border-l-4 border-emerald-300/70 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-50 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-200" />
                    <span className="font-semibold text-emerald-50">{expectedText}</span>
                  </div>
                )}
                {!openEditors[i] ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenEditors(prev => ({ ...prev, [i]: true }))}
                    >
                      Add comment for Q{i + 1}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={`answer-comment-${i}`} className="text-slate-100">Comment for Q{i + 1} (optional)</Label>
                    <Textarea
                      id={`answer-comment-${i}`}
                      value={answerComments[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswerComments(prev => {
                          const next = { ...prev } as Record<number, string>;
                          if (val.trim()) next[i] = val; else delete next[i];
                          return next;
                        });
                      }}
                      placeholder="Your feedback on this specific answer..."
                      className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button type="submit" disabled={isLoading || scoreValue === null} className="w-full">
        {isLoading ? 'Submitting...' : 'Submit Grade'}
      </Button>
    </form>
  );
}
