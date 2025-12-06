'use client';

import { useState } from 'react';
import { updateAiSettings } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AiFeaturesCardProps {
  initialGeminiApiKey: string | null;
}

export default function AiFeaturesCard({ initialGeminiApiKey }: AiFeaturesCardProps) {
  const [geminiApiKey, setGeminiApiKey] = useState(initialGeminiApiKey ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateAiSettings({ geminiApiKey });
    if (result.success) {
      toast.success('Gemini API key saved.');
    } else {
      toast.error(result.error || 'Could not save Gemini API key.');
    }
    setIsSaving(false);
  };

  const handleClear = async () => {
    setIsSaving(true);
    const result = await updateAiSettings({ geminiApiKey: null });
    if (result.success) {
      setGeminiApiKey('');
      toast.success('Gemini API key cleared.');
    } else {
      toast.error(result.error || 'Could not clear Gemini API key.');
    }
    setIsSaving(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">AI features</h2>
          <p className="text-sm text-slate-500">Set the Gemini API key used for speech practice and future AI tools.</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="geminiApiKey">Gemini API key</Label>
          <Input
            id="geminiApiKey"
            type="password"
            placeholder="Enter Gemini API key"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
          />
          <p className="text-xs text-slate-500">Stored securely in the database. Leave blank and click Save to remove.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save key'}
          </Button>
          <Button type="button" variant="outline" disabled={isSaving || !geminiApiKey} onClick={handleClear}>
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
}
