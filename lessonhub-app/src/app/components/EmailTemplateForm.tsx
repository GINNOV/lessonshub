// file: src/app/components/EmailTemplateForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmailTemplate } from '@prisma/client';
import { updateEmailTemplate, sendTestEmail } from '@/actions/adminActions';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PlaceholderGuide from './PlaceholderGuide';

interface EmailTemplateFormProps {
    template: EmailTemplate;
}

// This function wraps the user's HTML in the standard email layout for preview
const getPreviewHtml = (body: string) => `
  <html lang="en">
    <head>
      <style>
        body { margin: 0; background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif; }
        .container { background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; border: 1px solid #f0f0f0; border-radius: 8px; max-width: 560px; }
        .box { padding: 0 48px; }
        .hr { border-color: #e6ebf1; margin: 20px 0; }
        .footer { color: #8898aa; font-size: 12px; line-height: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="box">
          ${body}
          <hr class="hr" />
          <p class="footer">LessonHUB — The modern platform for modern learning.</p>
        </div>
      </div>
    </body>
  </html>
`;

export default function EmailTemplateForm({ template }: EmailTemplateFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [subject, setSubject] = useState(template.subject);
    const [body, setBody] = useState(template.body);
    const [buttonColor, setButtonColor] = useState(template.buttonColor || '#007bff');
    const [testEmail, setTestEmail] = useState(session?.user?.email || '');
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [message, setMessage] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === '/') {
                event.preventDefault();
                setShowGuide(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        const result = await updateEmailTemplate(template.id, subject, body, buttonColor);
        if (result.success) {
            setMessage('Template updated successfully!');
            router.refresh();
        } else {
            setMessage(result.error || 'An error occurred.');
        }
        setIsLoading(false);
    };
    
    const handleSendTest = async () => {
        setIsTesting(true);
        setMessage('');
        const result = await sendTestEmail(template.name, subject, body, testEmail, buttonColor);
        if (result.success) {
            setMessage(`Test email sent successfully to ${testEmail}!`);
        } else {
            setMessage(result.error || 'Failed to send test email.');
        }
        setIsTesting(false);
    };

    return (
        <>
            {showGuide && <PlaceholderGuide onClose={() => setShowGuide(false)} />}
            <form onSubmit={handleSubmit} className="space-y-6">
                {message && <p className="text-green-600 bg-green-50 p-3 rounded-md">{message}</p>}
                <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input 
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="body">Email Body (HTML)</Label>
                        <p className="text-xs text-gray-500">
                            Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Cmd + /</kbd> for placeholders.
                        </p>
                        <Textarea 
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={isLoading}
                            className="min-h-[400px] font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Live Preview</Label>
                        <div className="border rounded-md h-[450px] overflow-auto bg-gray-100">
                            <iframe
                                srcDoc={getPreviewHtml(body.replace('{{button}}', `<div style="background-color:${buttonColor}; color: #fff; padding: 14px 0; text-align: center; border-radius: 5px; font-weight: bold;">Button Preview</div>`))}
                                className="w-full h-full"
                                title="Email Preview"
                                sandbox="allow-scripts"
                            />
                        </div>
                    </div>
                </div>
                <div className="border-t pt-4 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <Input 
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Enter email for test"
                            className="w-full md:w-auto"
                        />
                        <Button type="button" variant="outline" onClick={handleSendTest} disabled={isTesting || !testEmail}>
                            {isTesting ? 'Sending...' : 'Send Test'}
                        </Button>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="buttonColor">Button Color</Label>
                            <Input
                                id="buttonColor"
                                type="color"
                                value={buttonColor}
                                onChange={(e) => setButtonColor(e.target.value)}
                                className="w-14 h-10 p-1"
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>
            </form>
        </>
    );
}