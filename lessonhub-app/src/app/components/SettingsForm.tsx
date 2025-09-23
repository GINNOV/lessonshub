// file: src/app/components/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateDashboardSettings } from '@/actions/adminActions';
import { toast } from 'sonner';

type Settings = {
  progressCardTitle?: string | null;
  progressCardBody?: string | null;
  progressCardLinkText?: string | null;
  progressCardLinkUrl?: string | null;
  assignmentSummaryFooter?: string | null;
};

interface SettingsFormProps {
  initialSettings: Settings | null;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [progressCardTitle, setProgressCardTitle] = useState(initialSettings?.progressCardTitle || '');
  const [progressCardBody, setProgressCardBody] = useState(initialSettings?.progressCardBody || '');
  const [progressCardLinkText, setProgressCardLinkText] = useState(initialSettings?.progressCardLinkText || '');
  const [progressCardLinkUrl, setProgressCardLinkUrl] = useState(initialSettings?.progressCardLinkUrl || '');
  const [assignmentSummaryFooter, setAssignmentSummaryFooter] = useState(initialSettings?.assignmentSummaryFooter || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await updateDashboardSettings({
      progressCardTitle,
      progressCardBody,
      progressCardLinkText,
      progressCardLinkUrl,
      assignmentSummaryFooter,
    });

    if (result.success) {
      toast.success('Settings saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save settings.');
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="progressCardTitle">Progress Card Title</Label>
        <Input 
          id="progressCardTitle" 
          type="text" 
          value={progressCardTitle}
          onChange={(e) => setProgressCardTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="progressCardBody">Progress Card Body</Label>
        <Textarea 
          id="progressCardBody" 
          value={progressCardBody}
          onChange={(e) => setProgressCardBody(e.target.value)}
        />
      </div>
       <div className="space-y-2">
        <Label htmlFor="progressCardLinkText">Progress Card Link Text</Label>
        <Input 
          id="progressCardLinkText" 
          type="text" 
          value={progressCardLinkText}
          onChange={(e) => setProgressCardLinkText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="progressCardLinkUrl">Progress Card Link URL</Label>
        <Input 
          id="progressCardLinkUrl" 
          type="text" 
          value={progressCardLinkUrl}
          onChange={(e) => setProgressCardLinkUrl(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignmentSummaryFooter">Assignment Summary Footer</Label>
        <Textarea 
          id="assignmentSummaryFooter" 
          value={assignmentSummaryFooter}
          onChange={(e) => setAssignmentSummaryFooter(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}