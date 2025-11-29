// file: src/app/components/GradingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment, LessonType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { gradeAssignment } from '@/actions/lessonActions';
import { toast } from 'sonner';

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
  { label: 'Almost Right', value: '2' },
  { label: 'Bad', value: '-1' },
];

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
  const existingScore = typeof assignment.score === 'number' ? assignment.score : null;
  const [scoreValue, setScoreValue] = useState<string | null>(
    existingScore !== null ? existingScore.toString() : null
  );
  const [teacherComments, setTeacherComments] = useState(
    assignment.teacherComments || ''
  );
  const [scoreError, setScoreError] = useState<string | null>(null);
  const isStandard = assignment.lesson?.type === 'STANDARD';
  const questions = Array.isArray(assignment.lesson?.questions)
    ? (assignment.lesson?.questions as any[])
    : [];
  const studentAnswers: string[] | null = Array.isArray(assignment.answers) ? (assignment.answers as string[]) : null;
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
      <div className="grid gap-6">
        <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium text-gray-900">Score</Label>
            {existingScore !== null && (
              <span className="text-sm text-gray-600">
                Current grade: <span className="font-semibold">{existingScore}</span>/10
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
            className="mt-2 space-y-2"
          >
            {scoreOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.label} />
                <Label htmlFor={option.label}>
                  {option.label} ({option.value} points)
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="custom-score">Custom Score (Overrides Above)</Label>
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
              className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
            >
              <option value="">Select a score</option>
              {Array.from({ length: 11 }, (_, i) => i).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {scoreError && (
              <p className="mt-2 text-sm text-red-600">{scoreError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="comments">Comments (Markdown supported)</Label>
            <Textarea
              id="comments"
              value={teacherComments}
              onChange={(e) => setTeacherComments(e.target.value)}
              placeholder="Provide feedback for the student... You can use markdown for **bold**, *italics*, etc."
            />
          </div>
        </div>

        {isStandard && questions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Student&apos;s Response</p>
              {questions.map((q, i) => {
                const questionText = (() => {
                  const candidate = (q as any)?.question ?? (q as any)?.prompt ?? q;
                  return formatContent(candidate);
                })();
                const expectedText = formatContent((q as any)?.expectedAnswer ?? (q as any)?.expected ?? '');
                const studentAnswer = formatContent(studentAnswers?.[i]);
                return (
                  <div key={i} className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">
                      Q{i + 1}❓ {questionText}
                    </p>
                    <div className="rounded-md border-l-4 border-blue-300 bg-white px-3 py-2 text-sm text-gray-800">
                      {studentAnswer || <span className="italic text-gray-500">No answer provided.</span>}
                    </div>
                    {expectedText && (
                      <div className="rounded-md border-l-4 border-green-300 bg-white px-3 py-2 text-xs text-gray-700">
                        Expected: <span className="font-semibold">{expectedText}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Per-answer comments</p>
              {questions.map((q, i) => {
                const questionText = (() => {
                  const candidate = (q as any)?.question ?? (q as any)?.prompt ?? q;
                  return formatContent(candidate);
                })();
                const studentAnswer = formatContent(studentAnswers?.[i]);
                return (
                  <div key={i} className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">
                      Q{i + 1}: {questionText}
                    </p>
                    {studentAnswer && (
                      <div className="rounded-md border-l-4 border-blue-300 bg-white px-3 py-2 text-sm text-gray-800">
                        {studentAnswer}
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
                        <Label htmlFor={`answer-comment-${i}`}>Comment for Q{i + 1} (optional)</Label>
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
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button type="submit" disabled={isLoading || scoreValue === null} className="w-full">
          {isLoading ? 'Submitting...' : 'Submit Grade'}
        </Button>
      </div>
    </form>
  );
}
