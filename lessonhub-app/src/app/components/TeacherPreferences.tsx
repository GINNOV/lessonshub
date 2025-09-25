// file: src/app/components/TeacherPreferences.tsx
'use client';

import { useState } from 'react';
import { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateTeacherPreferences } from '@/actions/teacherActions';

interface TeacherPreferencesProps {
  teacher: User;
}

export default function TeacherPreferences({ teacher }: TeacherPreferencesProps) {
  const [defaultLessonPrice, setDefaultLessonPrice] = useState(
    teacher.defaultLessonPrice?.toString() || '10'
  );
  const [defaultLessonPreview, setDefaultLessonPreview] = useState(
    teacher.defaultLessonPreview || ''
  );
  const [defaultLessonNotes, setDefaultLessonNotes] = useState(
    teacher.defaultLessonNotes || ''
  );
   const [defaultLessonInstructions, setDefaultLessonInstructions] = useState(
    teacher.defaultLessonInstructions || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateTeacherPreferences({
        defaultLessonPrice: parseFloat(defaultLessonPrice),
        defaultLessonPreview,
        defaultLessonNotes,
        defaultLessonInstructions,
      });

      if (result.success) {
        toast.success('Preferences updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update preferences.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    }
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-white">
      <h2 className="text-xl font-semibold mb-4">Teacher Preferences</h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="defaultPrice">Default Lesson Price (€)</Label>
          <Input
            id="defaultPrice"
            type="number"
            step="0.01"
            value={defaultLessonPrice}
            onChange={(e) => setDefaultLessonPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultPreview">Default Lesson Preview</Label>
          <Textarea
            id="defaultPreview"
            value={defaultLessonPreview}
            onChange={(e) => setDefaultLessonPreview(e.target.value)}
            placeholder="e.g., A brief intro to the lesson..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultInstructions">Default Lesson Instructions</Label>
          <Textarea
            id="defaultInstructions"
            value={defaultLessonInstructions}
            onChange={(e) => setDefaultLessonInstructions(e.target.value)}
            placeholder="e.g., Instructions for the student..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultNotes">Default Lesson Notes (for teacher)</Label>
          <Textarea
            id="defaultNotes"
            value={defaultLessonNotes}
            onChange={(e) => setDefaultLessonNotes(e.target.value)}
            placeholder="e.g., Notes for your reference..."
          />
        </div>
      </div>
      <Button type="submit" className="mt-4" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </form>
  );
}