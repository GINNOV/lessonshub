// file: src/app/components/LessonPriceEditor.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateLessonPrice } from '@/actions/adminActions';
import { toast } from 'sonner'; 

interface LessonPriceEditorProps {
  lessonId: string;
  initialPrice: number;
}

export default function LessonPriceEditor({
  lessonId,
  initialPrice,
}: LessonPriceEditorProps) {
  const [price, setPrice] = useState(initialPrice.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    const priceValue = parseFloat(price);
    if (isNaN(priceValue)) {
      toast.error('Invalid price format.');
      setIsLoading(false);
      return;
    }

    const result = await updateLessonPrice(lessonId, priceValue);
    if (result.success) {
      toast.success('Price updated successfully!');
    } else {
      toast.error(result.error || 'Failed to update price.');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={handleSave} // Save when the user clicks away
        className="w-24"
        step="0.01"
        placeholder="0.00"
      />
    </div>
  );
}