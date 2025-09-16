// file: src/app/components/LessonPriceEditor.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { updateLessonPrice } from '@/actions/adminActions';

interface LessonPriceEditorProps {
  lessonId: string;
  initialPrice: number;
}

export default function LessonPriceEditor({ lessonId, initialPrice }: LessonPriceEditorProps) {
  const [price, setPrice] = useState<number>(initialPrice);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState<boolean>(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    setPrice(Number.isNaN(next) ? 0 : next);
    setDirty(true);
  };

  const onSave = () => {
    startTransition(async () => {
      try {
        // Persist price (in cents or euros depending on your backend).
        await updateLessonPrice(lessonId, price);
        setDirty(false);
        toast.success('Price updated');
      } catch (err: unknown) {
        console.error(err);
        toast.error('Failed to update price');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.01"
        min="0"
        value={Number.isFinite(price) ? price : 0}
        onChange={onChange}
        disabled={isPending}
        className="w-24"
        aria-label="Lesson price in euros"
      />
      <Button onClick={onSave} disabled={isPending || !dirty} size="sm">
        {isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}