'use client';

import { useState, useTransition } from 'react';
import { sendGoldStar } from '@/actions/teacherActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

interface GoldStarFormProps {
  studentId: string;
  studentName: string;
}

export default function GoldStarForm({ studentId, studentName }: GoldStarFormProps) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await sendGoldStar(studentId, message);
      if (result.success) {
        toast.success(`Gold star sent to ${studentName}!`);
        setMessage('');
      } else {
        toast.error(result.error || 'Unable to send gold star right now.');
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Send a gold star</p>
          <p className="text-xs text-slate-500">
            Rewards the student with €200, 11 points, and a Gold Star badge.
          </p>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Instant email notification
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add an encouraging note (optional)"
          maxLength={500}
          className="min-h-[96px]"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Make it personal—short notes work best.</span>
          <span>{message.length}/500</span>
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Sending…' : `Send to ${studentName}`}
        </Button>
      </div>
    </div>
  );
}
