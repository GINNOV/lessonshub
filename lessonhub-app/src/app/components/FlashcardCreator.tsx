// file: src/app/components/FlashcardCreator.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Lesson, Flashcard as PrismaFlashcard } from '@prisma/client';

// Define a more specific type for the lesson prop, including the flashcards relation
type LessonWithFlashcards = Lesson & {
  flashcards: PrismaFlashcard[];
};

type Flashcard = {
  id: string | number; // Allow for temporary numeric IDs on the client
  term: string;
  definition: string;
  imageUrl?: string | null;
};

interface FlashcardCreatorProps {
  lesson?: LessonWithFlashcards | null;
}

export default function FlashcardCreator({ lesson }: FlashcardCreatorProps) {
  const router = useRouter();
  const isEditMode = !!lesson;

  const [title, setTitle] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      // The type is now correct, so we can directly access .flashcards
      if (lesson.flashcards && Array.isArray(lesson.flashcards)) {
        // Map Prisma's string IDs to temporary numeric IDs for client-side state
        const existingFlashcards = lesson.flashcards.map((card, index) => ({
          ...card,
          id: index + 1, // Use index for a stable temporary key
        }));
        setFlashcards(existingFlashcards);
        setNextId(existingFlashcards.length + 1);
      }
    } else {
        // Default state for a new lesson
        setFlashcards([
            { id: 1, term: '', definition: '' },
            { id: 2, term: '', definition: '' },
        ]);
        setNextId(3);
    }
  }, [lesson]);

  const handleAddCard = () => {
    setFlashcards([...flashcards, { id: nextId, term: '', definition: '' }]);
    setNextId(nextId + 1);
  };

  const handleCardChange = (id: number | string, field: 'term' | 'definition', value: string) => {
    setFlashcards(flashcards.map(card => card.id === id ? { ...card, [field]: value } : card));
  };

  const handleImageUpload = async (id: number | string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(id as number);
    setError(null);
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Image upload failed.");
      const newBlob = await response.json();
      
      setFlashcards(flashcards.map(card => card.id === id ? { ...card, imageUrl: newBlob.url } : card));
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsUploading(null);
    }
  };
  
  const handleDeleteCard = (id: number | string) => {
    setFlashcards(flashcards.filter(card => card.id !== id));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Omit the temporary client-side 'id' before sending to the API
    const validFlashcards = flashcards
      .filter(fc => fc.term.trim() && fc.definition.trim())
      .map(({ id, ...rest }) => rest);

    if (!title.trim()) {
        setError('Lesson title is required.');
        setIsLoading(false);
        return;
    }
    if (validFlashcards.length < 1) {
        setError('You must create at least one valid flashcard (with a term and definition).');
        setIsLoading(false);
        return;
    }

    try {
        const url = isEditMode && lesson ? `/api/lessons/flashcard/${lesson.id}` : '/api/lessons/flashcard';
        const method = isEditMode ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, flashcards: validFlashcards }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} flashcard lesson.`);
        }
        
        router.push('/dashboard');
        router.refresh();

    } catch (err) {
        setError((err as Error).message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xl font-bold">Lesson Title</Label>
        <Input 
            id="title" 
            placeholder="e.g., Spanish Vocabulary - Chapter 1" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
        />
      </div>

      <div className="space-y-6">
        {flashcards.map((card, index) => (
          <div key={card.id} className="p-4 border rounded-lg bg-gray-50 flex gap-4 items-start">
            <span className="text-lg font-bold text-gray-400 mt-2">{index + 1}</span>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`term-${card.id}`}>Term</Label>
                <Textarea id={`term-${card.id}`} value={card.term} onChange={(e) => handleCardChange(card.id, 'term', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`definition-${card.id}`}>Definition</Label>
                <Textarea id={`definition-${card.id}`} value={card.definition} onChange={(e) => handleCardChange(card.id, 'definition', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <label htmlFor={`image-${card.id}`} className="cursor-pointer">
                    <Button asChild variant="outline" size="icon">
                        <div>
                            <ImageIcon className="h-4 w-4" />
                            <input id={`image-${card.id}`} type="file" className="sr-only" onChange={(e) => handleImageUpload(card.id, e)} disabled={isUploading === card.id} />
                        </div>
                    </Button>
                </label>
                {card.imageUrl && <Image src={card.imageUrl} alt="preview" width={40} height={40} className="rounded-sm object-cover" />}
                {isUploading === card.id && <p className="text-xs">...</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteCard(card.id)}>
              <Trash2 className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={handleAddCard}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Card
        </Button>
        <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>
    </form>
  );
}