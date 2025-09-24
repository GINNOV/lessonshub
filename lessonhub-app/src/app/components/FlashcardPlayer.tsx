// file: src/app/components/FlashcardPlayer.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Assignment, Lesson, Flashcard as PrismaFlashcard } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { marked } from 'marked';
import { submitFlashcardAssignment } from '@/actions/lessonActions';
import Rating from '@/app/components/Rating';
import { useRouter } from 'next/navigation';

type SerializableLesson = Omit<Lesson, 'price'> & {
  price: number;
};

type AssignmentWithFlashcards = Assignment & {
  lesson: SerializableLesson & {
    flashcards: PrismaFlashcard[];
  };
};

interface FlashcardPlayerProps {
  assignment: AssignmentWithFlashcards;
}

export default function FlashcardPlayer({ assignment }: FlashcardPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answers, setAnswers] = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [showResults, setShowResults] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flashcards = useMemo(() => {
    return [...assignment.lesson.flashcards].sort(() => Math.random() - 0.5);
  }, [assignment.lesson.flashcards]);

  const instructionsHtml = useMemo(() => {
    const rawText = assignment.lesson.assignment_text || '';
    const cleanedText = rawText.replace(/👉🏼 INSTRUCTIONS:/i, '').trim();
    return cleanedText ? marked.parse(cleanedText) : '';
  }, [assignment.lesson.assignment_text]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnswers(prev => ({ ...prev, [flashcards[currentIndex].id]: isCorrect ? 'correct' : 'incorrect' }));
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setAnswers({});
    setShowResults(false);
    setIsStarted(true);
    setRating(undefined);
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await submitFlashcardAssignment(assignment.id, answers, rating);
    if (result.success) {
      toast.success("Your results have been submitted!");
      router.push('/my-lessons');
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit your results.");
      setIsSubmitting(false);
    }
  };

  const correctCount = Object.values(answers).filter(a => a === 'correct').length;
  const incorrectCount = Object.values(answers).filter(a => a === 'incorrect').length;

  if (!isStarted) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-gray-50 p-4">
            <h2 className="text-xl font-semibold">👉🏼 INSTRUCTIONS</h2>
            {instructionsHtml && (
              <div className="prose max-w-none mt-4" dangerouslySetInnerHTML={{ __html: instructionsHtml as string }} />
            )}
        </div>
        <Button onClick={() => setIsStarted(true)} className="w-full">Start</Button>
      </div>
    );
  }

  if (showResults) {
    return (
        <div className="text-center p-8 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Results</h2>
            <p className="text-green-600 font-semibold">Correct: {correctCount}</p>
            <p className="text-red-600 font-semibold">Incorrect: {incorrectCount}</p>
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Rate this lesson</h3>
                <div className="flex justify-center">
                  <Rating onRatingChange={setRating} />
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <Button onClick={handleRestart} variant="outline">
                  <RotateCw className="mr-2 h-4 w-4" /> Restart
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Submit & Finish'}
              </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="relative h-96 w-full cursor-pointer [perspective:1000px]" onClick={handleFlip}>
            <div className={`relative h-full w-full rounded-lg transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute h-full w-full rounded-lg border p-4 flex flex-col bg-white [backface-visibility:hidden]">
                    {flashcards[currentIndex].termImageUrl ? (
                      <>
                        <div className="relative flex-grow w-full">
                          <Image 
                            src={flashcards[currentIndex].termImageUrl!} 
                            alt={flashcards[currentIndex].term} 
                            fill 
                            className="object-contain rounded-md" 
                          />
                        </div>
                        <p className="text-xl font-semibold text-center mt-2 flex-shrink-0">{flashcards[currentIndex].term}</p>
                      </>
                    ) : (
                      <div className="flex h-full w-full justify-center items-center">
                          <p className="text-xl font-semibold text-center">{flashcards[currentIndex].term}</p>
                      </div>
                    )}
                </div>
                <div className="absolute h-full w-full rounded-lg border p-4 flex flex-col bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {flashcards[currentIndex].definitionImageUrl ? (
                    <>
                      <div className="relative flex-grow w-full">
                        <Image 
                          src={flashcards[currentIndex].definitionImageUrl!} 
                          alt={flashcards[currentIndex].definition} 
                          fill 
                          className="object-contain rounded-md"
                        />
                      </div>
                      <p className="text-center mt-2 flex-shrink-0">{flashcards[currentIndex].definition}</p>
                    </>
                  ) : (
                     <div className="flex h-full w-full justify-center items-center">
                        <p className="text-center">{flashcards[currentIndex].definition}</p>
                    </div>
                  )}
                </div>
            </div>
        </div>
        <div className="flex justify-between items-center">
            <Button onClick={handlePrev} disabled={currentIndex === 0}><ArrowLeft className="mr-2 h-4 w-4"/> Previous</Button>
            <span>{currentIndex + 1} / {flashcards.length}</span>
            <Button onClick={handleNext} disabled={!isFlipped}><ArrowRight className="mr-2 h-4 w-4"/> Next</Button>
        </div>
         {isFlipped && (
            <div className="flex justify-center gap-4 pt-4 border-t">
                <Button onClick={() => handleAnswer(false)} variant="destructive">I was wrong</Button>
                <Button onClick={() => handleAnswer(true)} className="bg-green-600 hover:bg-green-700">I was right</Button>
            </div>
        )}
    </div>
  );
}