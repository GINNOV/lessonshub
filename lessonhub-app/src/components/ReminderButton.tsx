// file: src/app/components/ReminderButton.tsx

'use client';

import { useState } from 'react';
import { sendManualReminder } from '@/actions/lessonActions';
import { Button } from '@/components/ui/button';

interface ReminderButtonProps {
  assignmentId: string;
}

export default function ReminderButton({ assignmentId }: ReminderButtonProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus('sending');
    setError(null);
    const result = await sendManualReminder(assignmentId);
    if (result.success) {
      setStatus('sent');
      // The button will reset after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={status === 'sending' || status === 'sent'}
    >
      {status === 'idle' && 'Send Reminder'}
      {status === 'sending' && 'Sending...'}
      {status === 'sent' && 'Sent!'}
      {status === 'error' && 'Retry'}
    </Button>
  );
}