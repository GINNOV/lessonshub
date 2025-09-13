'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lesson } from '@prisma/client';

interface Answer {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  answers: Answer[];
  correctAnswerId: number | null;
}

interface MultiChoiceCreatorProps {
  lesson?: Lesson | null;
}

export default function MultiChoiceCreator({ lesson }: MultiChoiceCreatorProps) {
  const router = useRouter();
  const isEditMode = !!lesson;

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [nextQuestionId, setNextQuestionId] = useState(1);
  const [nextAnswerId, setNextAnswerId] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      if (lesson.questions && Array.isArray(lesson.questions)) {
        // Proper type conversion from JsonArray to Question[]
        const existingQuestions = lesson.questions as unknown as Question[];
        setQuestions(existingQuestions);

        // Ensure new IDs don't conflict with existing ones
        const maxQuestionId = existingQuestions.reduce((max, q) => Math.max(max, q.id), 0);
        const maxAnswerId = existingQuestions.flatMap(q => q.answers).reduce((max, a) => Math.max(max, a.id), 0);
        
        setNextQuestionId(maxQuestionId + 1);
        setNextAnswerId(maxAnswerId + 1);
      }
    } else {
        // Default state for a new lesson
        setQuestions([{ id: 1, text: '', answers: [{ id: 1, text: '' }, { id: 2, text: '' }], correctAnswerId: null }]);
        setNextQuestionId(2);
        setNextAnswerId(3);
    }
  }, [lesson]);


  const addQuestion = () => {
    setQuestions([...questions, { id: nextQuestionId, text: '', answers: [{ id: nextAnswerId, text: '' }, { id: nextAnswerId + 1, text: '' }], correctAnswerId: null }]);
    setNextQuestionId(nextQuestionId + 1);
    setNextAnswerId(nextAnswerId + 2);
  };

  const handleQuestionChange = (id: number, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text: value } : q));
  };

  const addAnswer = (questionId: number) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, answers: [...q.answers, { id: nextAnswerId, text: '' }] } : q));
    setNextAnswerId(nextAnswerId + 1);
  };
  
  const handleAnswerChange = (questionId: number, answerId: number, value: string) => {
      setQuestions(questions.map(q => q.id === questionId ? {
          ...q,
          answers: q.answers.map(a => a.id === answerId ? { ...a, text: value } : a)
      } : q));
  };

  const setCorrectAnswer = (questionId: number, answerId: number) => {
      setQuestions(questions.map(q => q.id === questionId ? { ...q, correctAnswerId: answerId } : q));
  };

  const deleteQuestion = (id: number) => {
      setQuestions(questions.filter(q => q.id !== id));
  };

  const deleteAnswer = (questionId: number, answerId: number) => {
      setQuestions(questions.map(q => q.id === questionId ? {
          ...q,
          answers: q.answers.filter(a => a.id !== answerId),
          correctAnswerId: q.correctAnswerId === answerId ? null : q.correctAnswerId // Reset correct answer if it's deleted
      } : q));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const validQuestions = questions.filter(q => 
        q.text.trim() && 
        q.correctAnswerId !== null && 
        q.answers.length >= 2 && 
        q.answers.every(a => a.text.trim())
    );
    
    if (!title.trim()) {
        setError("Lesson title is required.");
        setIsLoading(false);
        return;
    }
    if (validQuestions.length === 0) {
        setError("You must create at least one valid question with at least two answers and a selected correct answer.");
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
        {questions.map((q, index) => (
          <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <Label htmlFor={`question-${q.id}`} className="text-lg font-semibold">Question {index + 1}</Label>
              <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                <Trash2 className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
            <Input id={`question-${q.id}`} value={q.text} onChange={(e) => handleQuestionChange(q.id, e.target.value)} placeholder="Enter your question here" />
            
            <RadioGroup value={q.correctAnswerId?.toString()} onValueChange={(val) => setCorrectAnswer(q.id, parseInt(val))} className="mt-4 space-y-2">
              <Label className="text-md font-semibold">Answers</Label>
              {q.answers.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <RadioGroupItem value={a.id.toString()} id={`q${q.id}-a${a.id}`} />
                  <Input value={a.text} onChange={(e) => handleAnswerChange(q.id, a.id, e.target.value)} placeholder="Enter an answer option" />
                  <Button variant="ghost" size="icon" onClick={() => deleteAnswer(q.id, a.id)}>
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
            </RadioGroup>
            <Button type="button" variant="link" onClick={() => addAnswer(q.id)} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Answer
            </Button>
          </div>
        ))}
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