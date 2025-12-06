'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Rating from '@/app/components/Rating';
import {
  getTeachersForCurrentStudent,
  submitTeacherRating,
} from '@/actions/studentActions';

interface RateTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TeacherOption = {
  id: string;
  name: string;
  image: string | null;
};

const ratingFields = [
  { key: 'contentQuality', label: 'Quality of content' },
  { key: 'helpfulness', label: 'Helpfulness' },
  { key: 'communication', label: 'Communication' },
  { key: 'valueForMoney', label: 'Value for money' },
] as const;

type RatingKey = (typeof ratingFields)[number]['key'];

const defaultScores: Record<RatingKey, number> = {
  contentQuality: 4,
  helpfulness: 4,
  communication: 4,
  valueForMoney: 4,
};

export default function RateTeacherDialog({ open, onOpenChange }: RateTeacherDialogProps) {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [scores, setScores] = useState<Record<RatingKey, number>>(defaultScores);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setComments('');
      setScores(defaultScores);
      return;
    }

    let isMounted = true;
    setIsLoadingTeachers(true);

    getTeachersForCurrentStudent()
      .then((data) => {
        if (!isMounted) return;
        setTeachers(data || []);
        if (data?.length && !selectedTeacherId) {
          setSelectedTeacherId(data[0].id);
        }
      })
      .catch(() => {
        toast.error('Unable to load teacher list. Please try again.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTeachers(false);
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const averageScore = useMemo(() => {
    const total = ratingFields.reduce((sum, field) => sum + (scores[field.key] || 0), 0);
    return Math.round(total / ratingFields.length);
  }, [scores]);

  const handleScoreChange = (key: RatingKey, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      toast.error('Please select a teacher to rate.');
      return;
    }

    setIsSubmitting(true);
    const result = await submitTeacherRating({
      teacherId: selectedTeacherId,
      ...scores,
      overall: averageScore,
      comments,
    });

    if (result.success) {
      toast.success('Thank you for sharing your thoughts.');
      setComments('');
      setScores(defaultScores);
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Unable to submit your rating right now.');
    }
    setIsSubmitting(false);
  };

  const canSubmit = teachers.length > 0 && !isLoadingTeachers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate your teacher</DialogTitle>
          <DialogDescription>
            Your responses stay anonymous to teachers. Administrators review feedback to ensure every class stays excellent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="form-field">
            <Label htmlFor="teacherSelect">Choose a teacher</Label>
            <select
              id="teacherSelect"
              value={selectedTeacherId}
              disabled={!canSubmit || isSubmitting}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {isLoadingTeachers && <option value="">Loading...</option>}
              {!isLoadingTeachers && teachers.length === 0 && (
                <option value="">No teachers found</option>
              )}
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 rounded-lg border border-dashed p-4">
            {ratingFields.map((field) => (
              <div key={field.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-slate-100">{field.label}</span>
                <Rating
                  initialRating={scores[field.key]}
                  onRatingChange={(value) => handleScoreChange(field.key, value)}
                  starSize={20}
                  disabled={!canSubmit || isSubmitting}
                />
              </div>
            ))}
            <div className="text-right text-xs text-slate-400">
              Overall impression: <span className="font-semibold text-slate-100">{averageScore}/5</span>
            </div>
          </div>

          <div className="form-field">
            <Label htmlFor="teacherComments">Anything else?</Label>
            <Textarea
              id="teacherComments"
              rows={4}
              placeholder="Share highlights or areas to improve. Keep it short and specific."
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : (
              'Submit rating'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
