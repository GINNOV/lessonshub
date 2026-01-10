// file: src/app/components/CustomEmailForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendCustomEmailToAssignedStudents } from '@/actions/lessonActions';
import { useRouter } from 'next/navigation';

interface CustomEmailFormProps {
    lessonId: string;
}

export default function CustomEmailForm({ lessonId }: CustomEmailFormProps) {
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [hasOverflow, setHasOverflow] = useState(false);

    const updateScrollProgress = () => {
        const el = textareaRef.current;
        if (!el) return;
        const maxScroll = el.scrollHeight - el.clientHeight;
        setHasOverflow(maxScroll > 0);
        setScrollProgress(maxScroll > 0 ? el.scrollTop / maxScroll : 0);
    };

    useEffect(() => {
        updateScrollProgress();
    }, [body]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        const result = await sendCustomEmailToAssignedStudents(lessonId, subject, body);
        if (result.success) {
            setMessage('Email sent successfully!');
            setSubject('');
            setBody('');
        } else {
            setError(result.error || 'An unknown error occurred.');
        }
        setIsLoading(false);
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {message && <p className="text-green-600 bg-green-50 p-3 rounded-md">{message}</p>}
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input 
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isLoading}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="body">Email Body (HTML is supported)</Label>
                <div className="relative">
                    <Textarea 
                        id="body"
                        ref={textareaRef}
                        value={body}
                        onChange={(e) => {
                            setBody(e.target.value);
                            requestAnimationFrame(updateScrollProgress);
                        }}
                        onScroll={updateScrollProgress}
                        disabled={isLoading}
                        className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-8"
                        required
                    />
                    {hasOverflow && (
                        <div className="pointer-events-none absolute right-3 top-3 bottom-3 w-1 rounded-full bg-slate-200">
                            <div
                                className="absolute bottom-0 left-0 right-0 rounded-full bg-emerald-400 transition-[height] duration-150"
                                style={{ height: `${Math.max(scrollProgress * 100, 8)}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Email'}
                </Button>
            </div>
        </form>
    );
}
