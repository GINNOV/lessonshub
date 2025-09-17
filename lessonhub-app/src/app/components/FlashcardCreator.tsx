// file: src/app/components/FlashcardCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lesson, Flashcard as PrismaFlashcard } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

type SerializableLesson = Omit<Lesson, 'price'>;

type LessonWithFlashcards = SerializableLesson & {
  flashcards: PrismaFlashcard[];
};

type TeacherPreferences = {
    defaultLessonPreview?: string | null;
    defaultLessonInstructions?: string | null;
};

interface FlashcardCreatorProps {
  lesson?: LessonWithFlashcards | null;
  teacherPreferences?: TeacherPreferences | null;
}

type FlashcardState = {
    term: string;
    definition: string;
    termImageUrl: string | null;
    definitionImageUrl: string | null;
};

export default function FlashcardCreator({ lesson, teacherPreferences }: FlashcardCreatorProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardState[]>([{ term: '', definition: '', termImageUrl: null, definitionImageUrl: null }]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const isEditMode = !!lesson;

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || '👉🏼 INSTRUCTIONS:\n');
      setAttachmentUrl(lesson.attachment_url || '');
      if (lesson.flashcards && lesson.flashcards.length > 0) {
        // Correctly map the new fields
        setFlashcards(lesson.flashcards.map(fc => ({ 
            term: fc.term, 
            definition: fc.definition, 
            termImageUrl: fc.termImageUrl, 
            definitionImageUrl: fc.definitionImageUrl 
        })));
      }
    }
     try {
      const savedUrls = localStorage.getItem('recentAttachmentUrls');
      if (savedUrls) {
        setRecentUrls(JSON.parse(savedUrls));
      }
    } catch (e) {
      console.error("Failed to parse recent URLs from localStorage", e);
    }
  }, [lesson]);

  const handleFlashcardChange = (index: number, field: 'term' | 'definition', value: string) => {
    const newFlashcards = [...flashcards];
    newFlashcards[index][field] = value;
    setFlashcards(newFlashcards);
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number, field: 'termImageUrl' | 'definitionImageUrl') => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const newBlob = await response.json();
      if (newBlob?.url) {
        const newFlashcards = [...flashcards];
        newFlashcards[index][field] = newBlob.url;
        setFlashcards(newFlashcards);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const addFlashcard = () => {
    setFlashcards([...flashcards, { term: '', definition: '', termImageUrl: null, definitionImageUrl: null }]);
  };

  const removeFlashcard = (index: number) => {
    const newFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(newFlashcards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const validFlashcards = flashcards.filter(fc => fc.term.trim() && fc.definition.trim());

    if (!title.trim()) {
      toast.error('Lesson title cannot be empty.');
      setIsLoading(false);
      return;
    }
    if (validFlashcards.length === 0) {
      toast.error('You must include at least one valid flashcard.');
      setIsLoading(false);
      return;
    }

    const url = isEditMode ? `/api/lessons/flashcard/${lesson.id}` : '/api/lessons/flashcard';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, lesson_preview: lessonPreview, assignment_text: assignmentText, attachment_url: attachmentUrl, flashcards: validFlashcards }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson');
      }

      toast.success(`Lesson successfully ${isEditMode ? 'updated' : 'created'}!`);
      router.push('/dashboard');
      router.refresh();

    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Common English Idioms" />
      </div>

       <div className="space-y-2">
        <Label htmlFor="lessonPreview">Lesson Preview</Label>
        <Textarea id="lessonPreview" placeholder="A brief preview of the lesson for students." value={lessonPreview} onChange={(e) => setLessonPreview(e.target.value)} />
      </div>

       <div className="space-y-2">
        <Label htmlFor="assignmentText">Instructions</Label>
        <Textarea id="assignmentText" placeholder="Describe the main task for the student." value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} />
      </div>
      
       <div className="space-y-2">
        <Label htmlFor="attachmentUrl">Reading Material (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input type="url" id="attachmentUrl" placeholder="https://example.com" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {flashcards.map((fc, index) => (
          <div key={index} className="p-4 border rounded-md space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Flashcard {index + 1}</h3>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeFlashcard(index)} disabled={flashcards.length <= 1}>Delete Card</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Term Side */}
                <div className="space-y-2">
                    <Label>Term (Front)</Label>
                    <Input placeholder="e.g., Break a leg" value={fc.term} onChange={(e) => handleFlashcardChange(index, 'term', e.target.value)} />
                    <Label htmlFor={`term-image-${index}`} className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"><Upload size={16} /> Upload Image</Label>
                    <Input id={`term-image-${index}`} type="file" className="hidden" onChange={(e) => handleImageUpload(e, index, 'termImageUrl')} />
                    {fc.termImageUrl && <Image src={fc.termImageUrl} alt="Term image" width={100} height={100} className="rounded-md mt-2" />}
                </div>
                {/* Definition Side */}
                <div className="space-y-2">
                    <Label>Definition (Back)</Label>
                    <Input placeholder="e.g., Good luck!" value={fc.definition} onChange={(e) => handleFlashcardChange(index, 'definition', e.target.value)} />
                    <Label htmlFor={`def-image-${index}`} className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"><Upload size={16} /> Upload Image</Label>
                    <Input id={`def-image-${index}`} type="file" className="hidden" onChange={(e) => handleImageUpload(e, index, 'definitionImageUrl')} />
                    {fc.definitionImageUrl && <Image src={fc.definitionImageUrl} alt="Definition image" width={100} height={100} className="rounded-md mt-2" />}
                </div>
              </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button type="button" onClick={addFlashcard}>Add Flashcard</Button>
        <Button type="submit" disabled={isLoading || uploadingIndex !== null}>{isLoading ? 'Saving...' : 'Save Lesson'}</Button>
      </div>
    </form>
  );
}