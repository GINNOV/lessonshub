// file: src/app/components/FeedbackDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sendFeedbackToTeachers } from '@/actions/studentActions';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    const result = await sendFeedbackToTeachers(feedback);

    if (result.success) {
      toast.success('Your feedback has been sent. Thank you!');
      setFeedback('');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to send feedback.');
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback to Your Teacher</DialogTitle>
          <DialogDescription>
            Have a question, suggestion, or comment? Let your teachers know.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Type your message here..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={6}
        />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}