'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getClassesForTeacher, sendClassNotes } from '@/actions/classActions';
import { toast } from 'sonner';
import { Bold, Italic, Link, List, ListOrdered, Loader2, Underline } from 'lucide-react';

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
  const [messageHtml, setMessageHtml] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMessageHtml('');
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
    if (!plainTextMessage) {
      toast.error('Please enter the notes you want to send.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendClassNotes(
        selectedClassId === 'all' ? null : selectedClassId,
        messageHtml.trim()
      );

      if (result.success) {
        toast.success('Notes sent to your students.');
        setMessageHtml('');
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
  const plainTextMessage = useMemo(
    () => messageHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    [messageHtml]
  );
  const isEmptyMessage = plainTextMessage.length === 0;

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== messageHtml) {
      editorRef.current.innerHTML = messageHtml;
    }
  }, [messageHtml]);

  const applyCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setMessageHtml(editorRef.current.innerHTML);
  };

  const handleAddLink = () => {
    const url = window.prompt('Enter a link URL');
    if (!url) return;
    applyCommand('createLink', url);
  };

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
          <label className="block text-sm font-medium text-slate-100">
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

          <label className="block text-sm font-medium text-slate-100">
            Message
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => applyCommand('bold')}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyCommand('italic')}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyCommand('underline')}>
                  <Underline className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyCommand('insertUnorderedList')}>
                  <List className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => applyCommand('insertOrderedList')}>
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleAddLink}>
                  <Link className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                {isEmptyMessage && (
                  <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                    Share upcoming deadlines, study tips, or important reminders...
                  </div>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setMessageHtml(editorRef.current?.innerHTML ?? '')}
                  className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Message"
                />
              </div>
            </div>
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
