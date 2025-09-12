// file: src/app/components/FlashcardPlayer.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Assignment, Lesson } from '@prisma/client';

type Flashcard = {
  id: number;
  term: string;
  definition: string;
  imageUrl?: string | null;
};

type AssignmentWithLesson = Assignment & { lesson: Lesson };

interface FlashcardPlayerProps {
  assignment: AssignmentWithLesson;
}

// Server action to be called from the component
async function completeAssignment(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to complete assignment.');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}


export default function FlashcardPlayer({ assignment }: FlashcardPlayerProps) {
  const router = useRouter();
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(assignment.status !== 'PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignment.lesson.flashcards && Array.isArray(assignment.lesson.flashcards)) {
      // Shuffle the cards for a better learning experience
      const cards = [...(assignment.lesson.flashcards as Flashcard[])];
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      setShuffledCards(cards);
    }
  }, [assignment.lesson.flashcards]);

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };
  
  const handleFinish = async () => {
    setIsLoading(true);
    setError(null);
    const result = await completeAssignment(assignment.id);
    if (result.success) {
        setIsCompleted(true);
        // Give a moment for the user to see the completion message before redirecting
        setTimeout(() => {
            router.push('/my-lessons');
            router.refresh();
        }, 2000);
    } else {
        setError(result.error || 'An unexpected error occurred.');
    }
    setIsLoading(false);
  };


  if (shuffledCards.length === 0) {
    return <p>This lesson has no flashcards.</p>;
  }

  const currentCard = shuffledCards[currentIndex];
  const isLastCard = currentIndex === shuffledCards.length - 1;

  if (isCompleted && assignment.status === 'PENDING') {
      return (
          <div className="text-center bg-green-50 p-8 rounded-lg">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Lesson Completed!</h2>
              <p className="text-muted-foreground mt-2">You will be redirected to your dashboard shortly.</p>
          </div>
      )
  }

  return (
    <div className="flex flex-col items-center gap-6">
       {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {/* Perspective container for the flip effect */}
      <div className="w-full max-w-lg h-80 [perspective:1000px]">
        <div
          className={cn(
            'relative w-full h-full cursor-pointer [transform-style:preserve-3d] transition-transform duration-500',
            isFlipped && '[transform:rotateY(180deg)]'
          )}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full flex flex-col items-center justify-center p-6 bg-white border rounded-lg shadow-lg [backface-visibility:hidden]">
            {currentCard.imageUrl && <Image src={currentCard.imageUrl} alt={currentCard.term} width={300} height={150} className="rounded-md object-contain mb-4 max-h-40" />}
            <p className="text-2xl font-bold text-center">{currentCard.term}</p>
          </div>
          {/* Back of the card */}
          <div className="absolute w-full h-full flex items-center justify-center p-6 bg-gray-100 border rounded-lg shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xl text-center text-gray-800">{currentCard.definition}</p>
          </div>
        </div>
      </div>

      {/* Progress and Navigation */}
      <div className="w-full max-w-lg flex justify-between items-center">
        <Button onClick={handlePrev} disabled={currentIndex === 0} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <p className="text-sm text-muted-foreground font-semibold">
          Card {currentIndex + 1} of {shuffledCards.length}
        </p>
        {!isLastCard ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={isLoading || isCompleted} className="bg-green-600 hover:bg-green-700">
            {isLoading ? 'Finishing...' : 'Finish Lesson'} <CheckCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
