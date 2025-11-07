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
  referralRewardPercent?: number | null;
  referralRewardMonthlyAmount?: number | null;
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
  const [referralRewardPercent, setReferralRewardPercent] = useState(
    initialSettings?.referralRewardPercent !== undefined && initialSettings?.referralRewardPercent !== null
      ? initialSettings.referralRewardPercent.toString()
      : '35'
  );
  const [referralRewardMonthlyAmount, setReferralRewardMonthlyAmount] = useState(
    initialSettings?.referralRewardMonthlyAmount !== undefined && initialSettings?.referralRewardMonthlyAmount !== null
      ? initialSettings.referralRewardMonthlyAmount.toString()
      : '100'
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const percentValue = Number(referralRewardPercent);
    const monthlyAmountValue = Number(referralRewardMonthlyAmount);

    const result = await updateDashboardSettings({
      progressCardTitle,
      progressCardBody,
      progressCardLinkText,
      progressCardLinkUrl,
      assignmentSummaryFooter,
      referralRewardPercent: Number.isFinite(percentValue) ? percentValue : undefined,
      referralRewardMonthlyAmount: Number.isFinite(monthlyAmountValue) ? monthlyAmountValue : undefined,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="referralRewardPercent">Referral Reward (%)</Label>
          <Input
            id="referralRewardPercent"
            type="number"
            min="0"
            step="0.1"
            value={referralRewardPercent}
            onChange={(e) => setReferralRewardPercent(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referralRewardMonthlyAmount">Monthly Subscription Amount</Label>
          <Input
            id="referralRewardMonthlyAmount"
            type="number"
            min="0"
            step="0.01"
            value={referralRewardMonthlyAmount}
            onChange={(e) => setReferralRewardMonthlyAmount(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
