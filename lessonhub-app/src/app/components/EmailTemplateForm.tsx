// file: src/app/components/EmailTemplateForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmailTemplate } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateEmailTemplate, sendTestEmail } from '@/actions/adminActions';
import PlaceholderGuide from './PlaceholderGuide';

interface EmailTemplateFormProps {
  template: EmailTemplate;
}

export default function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [buttonColor, setButtonColor] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setButtonColor(template.buttonColor || '#007bff');
    }
  }, [template]);

  const handleSendTest = async () => {
    if (!testEmail) {
      setError('Please enter an email address to send a test.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    setError('');
    const result = await sendTestEmail(template.name, testEmail);
    if (result.success) {
      setMessage('Test email sent successfully!');
    } else {
      setError(result.error || 'Failed to send test email.');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');
    
    // This function call now correctly matches the server action's signature.
    const result = await updateEmailTemplate(template.name, {
      subject,
      body,
      buttonColor,
    });
    
    if (result.success) {
      setMessage('Template updated successfully!');
      router.refresh();
    } else {
      setError(result.error || 'Failed to update template.');
    }
    setIsLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6">
        {message && <p className="p-3 bg-green-100 text-green-800 rounded-md">{message}</p>}
        {error && <p className="p-3 bg-red-100 text-red-800 rounded-md">{error}</p>}
        
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body (HTML)</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={15} />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="buttonColor">Button Color</Label>
            <Input id="buttonColor" type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Template'}
        </Button>
      </form>

      <div className="md:col-span-1 space-y-6">
        <PlaceholderGuide />
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">Send Test Email</h3>
          <div className="space-y-2">
            <Input 
              type="email" 
              placeholder="Enter your email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={handleSendTest} disabled={isLoading} className="w-full">
              {isLoading ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}