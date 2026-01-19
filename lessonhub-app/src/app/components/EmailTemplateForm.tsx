// file: src/app/components/EmailTemplateForm.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EmailTemplate } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog } from '@/components/ui/dialog';
import { updateEmailTemplate, sendTestEmail } from '@/actions/adminActions';
import PlaceholderGuide from './PlaceholderGuide';
import { toast } from 'sonner';
import { createButton, defaultEmailTemplates, replacePlaceholders } from '@/lib/email-templates';
import { getAllPlaceholders } from '@/lib/placeholder-data';
import { Code, FileText } from 'lucide-react';

interface EmailTemplateFormProps {
  template: EmailTemplate;
}

export default function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [buttonColor, setButtonColor] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHelperOpen, setIsHelperOpen] = useState(false);

  const placeholderCategories = useMemo(() => getAllPlaceholders(), []);
  const availableTemplates = useMemo(() => Object.entries(defaultEmailTemplates), []);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setDescription(template.description ?? '');
      setCategory(template.category ?? '');
      setBody(template.body);
      setButtonColor(template.buttonColor || '#5e6ad2');
    }
  }, [template]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setIsHelperOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTemplateSelect = (templateBody: string) => {
    setBody(templateBody);
    toast.info('Template applied to body.');
  };

  const handlePlaceholderInsert = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue =
      currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    setBody(newValue);
    setTimeout(() => {
      const newCursorPosition = start + placeholder.length;
      textarea.selectionStart = newCursorPosition;
      textarea.selectionEnd = newCursorPosition;
      textarea.focus();
    }, 0);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to send a test.');
      return;
    }
    setIsLoading(true);
    const result = await sendTestEmail(template.name, testEmail);
    if (result.success) {
      toast.success('Test email sent successfully!');
    } else {
      toast.error(result.error || 'Failed to send test email.');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateEmailTemplate(template.name, {
      subject,
      body,
      buttonColor,
      description,
      category,
    });
    if (result.success) {
      toast.success('Template updated successfully!');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update template.');
    }
    setIsLoading(false);
  };

  const previewHtml = useMemo(() => {
    // A comprehensive set of dummy data to make any template preview correctly
    const dummyData = {
      studentName: '[Student Name]',
      teacherName: '[Teacher Name]',
      lessonTitle: '[Sample Lesson Title]',
      deadline: new Date().toLocaleString(),
      score: '10',
      extraPointsLineEn:
        '<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Bonus points:</strong> 2</p>',
      extraPointsLineIt:
        '<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Punti bonus:</strong> 2</p>',
      price: '5.00',
      teacherComments: `<p style="color: #525f7f; font-size: 16px; line-height: 24px;"><strong>Teacher's Feedback:</strong><br/><em>&quot;This is a sample comment to preview the formatting.&quot;</em></p>`,
      button: createButton('Sample Action Button', '#', buttonColor),
      userName: '[User Name]',
      newUserName: '[New User Name]',
      newUserEmail: 'new.user@example.com',
      adminName: '[Admin Name]',
      deletedUserName: '[Deleted User]',
      deletedUserEmail: 'deleted.user@example.com',
    };

    const finalBody = replacePlaceholders(body, dummyData);
    
    // ✅ FIX: The full, correct HTML wrapper for the email is now restored here.
    return `
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
              ${finalBody}
              <hr class="hr" />
              <p class="footer">LessonHUB — The modern platform for modern learning.</p>
          </div>
          </div>
      </body>
      </html>
    `;
  }, [body, buttonColor]);

  return (
    <Dialog open={isHelperOpen} onOpenChange={setIsHelperOpen}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body (HTML)</Label>
              <div className="flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-900/70 p-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Template
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Apply a Template</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableTemplates.map(([name, templateData]) => (
                      <DropdownMenuItem key={name} onSelect={() => handleTemplateSelect(templateData.body)}>
                        {name.replace(/_/g, ' ')}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Code className="mr-2 h-4 w-4" />
                      Placeholder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-[50vh] overflow-y-auto">
                    <DropdownMenuLabel>Insert a Placeholder</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {placeholderCategories.map((category) => (
                      <DropdownMenuGroup key={category.title}>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">{category.title}</DropdownMenuLabel>
                        {category.items.map(({ variable }) => (
                          <DropdownMenuItem key={variable} onSelect={() => handlePlaceholderInsert(variable)}>
                            {variable}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <Textarea
              id="body"
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={15}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Press{' '}
              <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono">Cmd</kbd>{' '}
              +{' '}
              <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono">?</kbd>{' '}
              to view placeholder guide.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonColor">Button Color</Label>
            <Input id="buttonColor" type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} disabled={isLoading} />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </form>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/70 p-4">
            <h3 className="mb-2 font-semibold text-slate-100">Live Preview</h3>
            <div className="h-[400px] w-full rounded-md border border-slate-800 bg-slate-950 shadow-inner">
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full"
                title="Email Preview"
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/70 p-4">
            <h3 className="mb-2 font-semibold text-slate-100">Send Test Email</h3>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleSendTest} disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <PlaceholderGuide />
    </Dialog>
  );
}
