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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/40 bg-amber-400/15 text-amber-200">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-50">Send a gold star</p>
          <p className="text-xs text-slate-400">
            Rewards the student with €200, 11 points, and a Gold Star badge.
          </p>
          <Badge variant="outline" className="border-emerald-300/50 bg-emerald-400/10 text-emerald-100">
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
          className="min-h-[96px] border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500"
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Make it personal—short notes work best.</span>
          <span className="text-slate-300">{message.length}/500</span>
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Sending…' : `Send to ${studentName}`}
        </Button>
      </div>
    </div>
  );
}
