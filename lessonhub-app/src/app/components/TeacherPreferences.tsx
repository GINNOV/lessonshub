// file: src/app/components/TeacherPreferences.tsx
'use client';

import { useMemo, useState } from 'react';
import { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateTeacherPreferences } from '@/actions/teacherActions';
import ManageInstructionBookletsLink from '@/app/components/ManageInstructionBookletsLink';

type SerializableUser = Omit<User, 'defaultLessonPrice'> & {
  defaultLessonPrice: number | null;
};

interface TeacherPreferencesProps {
  teacher: SerializableUser;
  instructionBooklets?: Array<{ id: string; title: string; body: string }>;
}

export default function TeacherPreferences({ teacher, instructionBooklets = [] }: TeacherPreferencesProps) {
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
  const [selectedBookletId, setSelectedBookletId] = useState('');

  const hasBooklets = instructionBooklets.length > 0;

  const selectedBooklet = useMemo(
    () => instructionBooklets.find((booklet) => booklet.id === selectedBookletId),
    [instructionBooklets, selectedBookletId]
  );

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
    <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-card">
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
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Label htmlFor="defaultInstructions">Default Lesson Instructions</Label>
            {hasBooklets && (
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <select
                  value={selectedBookletId}
                  onChange={(e) => setSelectedBookletId(e.target.value)}
                  className="rounded-md border border-input bg-background p-2 text-sm shadow-sm"
                >
                  <option value="">Insert from booklet…</option>
                  {instructionBooklets.map((booklet) => (
                    <option key={booklet.id} value={booklet.id}>
                      {booklet.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedBooklet}
                    onClick={() => {
                      if (selectedBooklet) {
                        setDefaultLessonInstructions(selectedBooklet.body);
                      }
                    }}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedBooklet}
                    onClick={() => {
                      if (selectedBooklet) {
                        setDefaultLessonInstructions((prev) => `${prev.trim()}\n\n${selectedBooklet.body}`.trim());
                      }
                    }}
                  >
                    Append
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Textarea
            id="defaultInstructions"
            value={defaultLessonInstructions}
            onChange={(e) => setDefaultLessonInstructions(e.target.value)}
            placeholder="e.g., Instructions for the student..."
          />
          {hasBooklets && (
            <p className="text-xs text-muted-foreground">
              Need to edit or add more templates? <ManageInstructionBookletsLink />
            </p>
          )}
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
