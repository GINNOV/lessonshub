'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getClassesForTeacher, sendClassNotes } from '@/actions/classActions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface TeacherClassNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ClassOption = {
  id: string;
  name: string;
  isActive: boolean;
  studentCount: number;
};

export default function TeacherClassNotesDialog({
  open,
  onOpenChange,
}: TeacherClassNotesDialogProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setMessage('');
      setSelectedClassId('all');
      return;
    }

    let isMounted = true;
    setIsLoadingClasses(true);

    getClassesForTeacher()
      .then((rawClasses: any[]) => {
        if (!isMounted) return;
        const mapped = (rawClasses || []).map((cls) => ({
          id: cls.id,
          name: cls.name,
          isActive: cls.isActive,
          studentCount: Array.isArray(cls.students)
            ? cls.students.filter(
                (link: any) =>
                  link?.student &&
                  !link.student.isSuspended &&
                  !link.student.isTakingBreak
              ).length
            : 0,
        }));
        setClasses(mapped);
      })
      .catch(() => {
        toast.error('Unable to load classes. Please try again.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingClasses(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error('Please enter the notes you want to send.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendClassNotes(
        selectedClassId === 'all' ? null : selectedClassId,
        trimmedMessage
      );

      if (result.success) {
        toast.success('Notes sent to your students.');
        setMessage('');
        setSelectedClassId('all');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to send notes.');
      }
    } catch (error) {
      toast.error('Failed to send notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeClasses = classes.filter((cls) => cls.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send notes to students</DialogTitle>
          <DialogDescription>
            Share reminders or study notes with a specific class or all of your students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Choose class
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={isLoadingClasses}
            >
              <option value="all">All students</option>
              {isLoadingClasses && (
                <option value="" disabled>
                  Loading classes...
                </option>
              )}
              {!isLoadingClasses && activeClasses.length === 0 && (
                <option value="" disabled>
                  No active classes available
                </option>
              )}
              {!isLoadingClasses &&
                activeClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {cls.studentCount ? ` (${cls.studentCount})` : ''}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Message
            <Textarea
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share upcoming deadlines, study tips, or important reminders..."
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingClasses}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Send notes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
