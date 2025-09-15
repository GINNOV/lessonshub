// file: src/app/components/TeacherPreferences.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateTeacherPreferences } from '@/actions/teacherActions';
import { toast } from 'sonner';

type Preferences = {
  defaultLessonPrice?: number | null;
  defaultLessonPreview?: string | null;
  defaultLessonNotes?: string | null;
  defaultLessonInstructions?: string | null;
};

interface TeacherPreferencesProps {
  initialPreferences: Preferences | null;
}

export default function TeacherPreferences({ initialPreferences }: TeacherPreferencesProps) {
  const [price, setPrice] = useState(initialPreferences?.defaultLessonPrice?.toString() || '0');
  const [preview, setPreview] = useState(initialPreferences?.defaultLessonPreview || '');
  const [notes, setNotes] = useState(initialPreferences?.defaultLessonNotes || '');
  const [instructions, setInstructions] = useState(initialPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const priceValue = parseFloat(price);
    if (isNaN(priceValue)) {
      toast.error('Invalid price format.');
      setIsLoading(false);
      return;
    }

    const result = await updateTeacherPreferences({
      defaultLessonPrice: priceValue,
      defaultLessonPreview: preview,
      defaultLessonNotes: notes,
      defaultLessonInstructions: instructions,
    });

    if (result.success) {
      toast.success('Preferences saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save preferences.');
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Lesson Defaults</h2>
      <form onSubmit={handleSubmit} className="p-6 bg-white shadow-md rounded-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultPrice">Default Lesson Price (€)</Label>
          <Input 
            id="defaultPrice" 
            type="number" 
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPreview">Default Preview Text</Label>
          <Textarea 
            id="defaultPreview" 
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultInstructions">Default Instructions</Label>
          <Textarea 
            id="defaultInstructions" 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultNotes">Default Notes for Student</Label>
          <Textarea 
            id="defaultNotes" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </form>
    </div>
  );
}