// file: src/app/components/MultiChoiceCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson, MultiChoiceQuestion as PrismaQuestion, MultiChoiceOption as PrismaOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type SerializableLesson = Omit<Lesson, 'price'>;

type LessonWithQuestions = SerializableLesson & {
  multiChoiceQuestions: (PrismaQuestion & {
    options: PrismaOption[];
  })[];
};

type TeacherPreferences = {
    defaultLessonPreview?: string | null;
    defaultLessonInstructions?: string | null;
};

interface MultiChoiceCreatorProps {
  lesson?: LessonWithQuestions | null;
  teacherPreferences?: TeacherPreferences | null;
}

type OptionState = {
    text: string;
    isCorrect: boolean;
};

type QuestionState = {
    question: string;
    options: OptionState[];
};

export default function MultiChoiceCreator({ lesson, teacherPreferences }: MultiChoiceCreatorProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [lessonPreview, setLessonPreview] = useState(teacherPreferences?.defaultLessonPreview || '');
  const [assignmentText, setAssignmentText] = useState(teacherPreferences?.defaultLessonInstructions || '👉🏼 INSTRUCTIONS:\n');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [questions, setQuestions] = useState<QuestionState[]>([{ question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!lesson;

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setLessonPreview(lesson.lesson_preview || '');
      setAssignmentText(lesson.assignment_text || '');
      setAttachmentUrl(lesson.attachment_url || '');
      if (lesson.multiChoiceQuestions && lesson.multiChoiceQuestions.length > 0) {
        setQuestions(lesson.multiChoiceQuestions.map(q => ({
          question: q.question,
          options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
        })));
      }
    }
  }, [lesson]);

  const handleQuestionChange = (qIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].question = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = value;
    setQuestions(newQuestions);
  };

  const handleCorrectChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    // Set all other options for this question to false
    newQuestions[qIndex].options.forEach((opt, idx) => {
        opt.isCorrect = idx === oIndex;
    });
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    // Ensure at least one option is marked as correct
    if (!newQuestions[qIndex].options.some(opt => opt.isCorrect)) {
        newQuestions[qIndex].options[0].isCorrect = true;
    }
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  };

  const removeQuestion = (qIndex: number) => {
    const newQuestions = questions.filter((_, i) => i !== qIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Add validation logic here...
    
    const url = isEditMode ? `/api/lessons/multi-choice/${lesson.id}` : '/api/lessons/multi-choice';
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, lesson_preview: lessonPreview, assignment_text: assignmentText, attachment_url: attachmentUrl, questions }),
        });
        if (!response.ok) throw new Error('Failed to save lesson');
        toast.success('Lesson saved successfully!');
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
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., English Prepositions Quiz" />
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
        <Input type="url" id="attachmentUrl" placeholder="https://example.com" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
      </div>
      
      {questions.map((q, qIndex) => (
        <div key={qIndex} className="p-4 border rounded-md space-y-4">
          <div className="flex justify-between items-center">
            <Label>Question {qIndex + 1}</Label>
            <Button type="button" variant="destructive" size="sm" onClick={() => removeQuestion(qIndex)}>Remove Question</Button>
          </div>
          <Textarea value={q.question} onChange={(e) => handleQuestionChange(qIndex, e.target.value)} placeholder={`Enter question ${qIndex + 1}`} />
          {q.options.map((opt, oIndex) => (
            <div key={oIndex} className="flex items-center gap-2">
              <Checkbox checked={opt.isCorrect} onCheckedChange={() => handleCorrectChange(qIndex, oIndex)} />
              <Input value={opt.text} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
              <Button type="button" variant="outline" size="sm" onClick={() => removeOption(qIndex, oIndex)} disabled={q.options.length <= 2}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => addOption(qIndex)}>Add Option</Button>
        </div>
      ))}
      <div className="flex justify-between">
        <Button type="button" onClick={addQuestion}>Add Question</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Lesson'}</Button>
      </div>
    </form>
  );
}