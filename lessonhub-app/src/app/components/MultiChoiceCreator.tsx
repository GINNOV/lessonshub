// file: src/app/components/MultiChoiceCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption as PrismaOption } from '@prisma/client';

// Define a more specific type for the lesson prop
type LessonWithQuestions = Lesson & {
  multiChoiceQuestions: (PrismaQuestion & {
    options: PrismaOption[];
  })[];
};

interface Option {
  id: string | number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string | number;
  question: string;
  options: Option[];
}

interface MultiChoiceCreatorProps {
  lesson?: LessonWithQuestions | null;
}

export default function MultiChoiceCreator({ lesson }: MultiChoiceCreatorProps) {
  const router = useRouter();
  const isEditMode = !!lesson;

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [nextQuestionId, setNextQuestionId] = useState(1);
  const [nextOptionId, setNextOptionId] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      if (lesson.multiChoiceQuestions && Array.isArray(lesson.multiChoiceQuestions)) {
        let tempOptionId = 1;
        const existingQuestions = lesson.multiChoiceQuestions.map((q, qIndex) => ({
          ...q,
          id: qIndex + 1,
          options: q.options.map(opt => ({...opt, id: tempOptionId++})),
        }));

        setQuestions(existingQuestions);
        const maxQuestionId = existingQuestions.length;
        setNextQuestionId(maxQuestionId + 1);
        setNextOptionId(tempOptionId);
      }
    } else {
        setQuestions([{ id: 1, question: '', options: [{ id: 1, text: '', isCorrect: false }, { id: 2, text: '', isCorrect: false }] }]);
        setNextQuestionId(2);
        setNextOptionId(3);
    }
  }, [lesson]);

  const addQuestion = () => {
    setQuestions([...questions, { id: nextQuestionId, question: '', options: [{ id: nextOptionId, text: '', isCorrect: false }, { id: nextOptionId + 1, text: '', isCorrect: false }] }]);
    setNextQuestionId(nextQuestionId + 1);
    setNextOptionId(nextOptionId + 2);
  };

  const handleQuestionChange = (id: number | string, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, question: value } : q));
  };

  const addOption = (questionId: number | string) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, options: [...q.options, { id: nextOptionId, text: '', isCorrect: false }] } : q));
    setNextOptionId(nextOptionId + 1);
  };
  
  const handleOptionChange = (questionId: number | string, optionId: number | string, value: string) => {
      setQuestions(questions.map(q => q.id === questionId ? {
          ...q,
          options: q.options.map(o => o.id === optionId ? { ...o, text: value } : o)
      } : q));
  };

  const setCorrectOption = (questionId: number | string, correctOptionId: number | string) => {
      setQuestions(questions.map(q => q.id === questionId ? {
          ...q,
          options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptionId }))
      } : q));
  };

  const deleteQuestion = (id: number | string) => {
      setQuestions(questions.filter(q => q.id !== id));
  };

  const deleteOption = (questionId: number | string, optionId: number | string) => {
      setQuestions(questions.map(q => q.id === questionId ? {
          ...q,
          options: q.options.filter(o => o.id !== optionId),
      } : q));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const validQuestions = questions
      .filter(q => 
          q.question.trim() && 
          q.options.some(o => o.isCorrect) && 
          q.options.length >= 2 && 
          q.options.every(o => o.text.trim())
      )
      .map(q => ({
        question: q.question,
        options: q.options.map(({ id, ...rest }) => rest),
      }));
    
    if (!title.trim()) {
        setError("Lesson title is required.");
        setIsLoading(false);
        return;
    }
    if (validQuestions.length === 0) {
        setError("You must create at least one valid question with at least two options and a selected correct answer.");
        setIsLoading(false);
        return;
    }

    try {
        const url = isEditMode && lesson ? `/api/lessons/multi-choice/${lesson.id}` : '/api/lessons/multi-choice';
        const method = isEditMode ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, questions: validQuestions }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} multi-choice lesson.`);
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
        <Input id="title" placeholder="e.g., Biology Quiz - Cell Division" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => {
          const correctOptionId = q.options.find(o => o.isCorrect)?.id;
          return (
            <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <Label htmlFor={`question-${q.id}`} className="text-lg font-semibold">Question {index + 1}</Label>
                <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
              <Input id={`question-${q.id}`} value={q.question} onChange={(e) => handleQuestionChange(q.id, e.target.value)} placeholder="Enter your question here" />
              
              <RadioGroup value={correctOptionId?.toString()} onValueChange={(val) => setCorrectOption(q.id, parseInt(val))} className="mt-4 space-y-2">
                <Label className="text-md font-semibold">Options</Label>
                {q.options.map(o => (
                  <div key={o.id} className="flex items-center gap-2">
                    <RadioGroupItem value={o.id.toString()} id={`q${q.id}-o${o.id}`} />
                    <Input value={o.text} onChange={(e) => handleOptionChange(q.id, o.id, e.target.value)} placeholder="Enter an option" />
                    <Button variant="ghost" size="icon" onClick={() => deleteOption(q.id, o.id)}>
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button type="button" variant="link" onClick={() => addOption(q.id)} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={addQuestion}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Question
        </Button>
        <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>
    </form>
  );
}