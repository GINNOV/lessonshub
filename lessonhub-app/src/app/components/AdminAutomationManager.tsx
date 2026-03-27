'use client';

import { useMemo, useState } from 'react';
import { Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TeacherOption = {
  id: string;
  name: string | null;
  email: string;
};

type AutomationTokenRecord = {
  id: string;
  tokenPrefix: string;
  label: string | null;
  ownerId: string;
  createdById: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

type Props = {
  teachers: TeacherOption[];
  initialTokens: AutomationTokenRecord[];
};

const STANDARD_EXAMPLE = `curl -X POST https://your-domain.com/api/automation/lessons \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "Restaurant English",
    "assignmentText": "Answer in complete sentences.",
    "questions": [
      { "question": "How would you ask for the bill?", "expectedAnswer": "Could I have the bill, please?" }
    ],
    "assignment": {
      "studentIds": ["student_cuid_here"],
      "classIds": ["class_cuid_here"],
      "startDate": "2026-03-27T13:00:00.000Z",
      "deadline": "2026-03-29T21:00:00.000Z",
      "notificationOption": "immediate",
      "reassignExisting": false
    }
  }'`

const MULTI_CHOICE_EXAMPLE = `curl -X POST https://your-domain.com/api/automation/lessons/multi-choice \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "Travel vocabulary",
    "questions": [
      {
        "question": "Which phrase asks for directions?",
        "options": [
          { "text": "Where is the station?", "isCorrect": true },
          { "text": "I need a taxi.", "isCorrect": false }
        ]
      }
    ],
    "assignment": {
      "classIds": ["class_cuid_here"],
      "notificationOption": "on_start_date",
      "reassignExisting": true
    }
  }'`

export default function AdminAutomationManager({ teachers, initialTokens }: Props) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [tokens, setTokens] = useState(initialTokens);
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

  const filteredTokens = useMemo(() => {
    if (!selectedTeacherId) return tokens;
    return tokens.filter((token) => token.ownerId === selectedTeacherId);
  }, [selectedTeacherId, tokens]);

  const refreshTokens = async () => {
    setPending(true);
    try {
      const query = selectedTeacherId ? `?teacherId=${encodeURIComponent(selectedTeacherId)}` : '';
      const response = await fetch(`/api/admin/automation-tokens${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load automation tokens.');
      setTokens(data.tokens ?? []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTeacherId) {
      toast.error('Select a teacher first.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/admin/automation-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          label: label.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create token.');

      setLatestToken(data.token);
      toast.success('Automation token created. Copy it now; it will not be shown again.');
      try {
        await navigator.clipboard.writeText(data.token);
        toast.success('Token copied to clipboard.');
      } catch {
        toast.error('Token created, but automatic copy failed. Copy it from the panel below.');
      }
      setLabel('');
      await refreshTokens();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    setRevokingTokenId(tokenId);
    try {
      const response = await fetch(`/api/admin/automation-tokens/${tokenId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to revoke token.');

      setTokens((current) =>
        current.map((token) =>
          token.id === tokenId
            ? { ...token, revokedAt: data.automationToken?.revokedAt ?? new Date().toISOString() }
            : token
        )
      );
      toast.success('Automation token revoked.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRevokingTokenId(null);
    }
  };

  const handleCopyExample = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Example copied to clipboard.');
    } catch {
      toast.error('Unable to copy example.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <h2 className="text-xl font-bold text-slate-100">Grant automation token</h2>
          <p className="mt-2 text-sm text-slate-400">
            Tokens are bound to a teacher account. Codex automations can use them to create lessons without browser auth.
          </p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacherId" className="text-slate-200">Teacher</Label>
              <select
                id="teacherId"
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name || teacher.email} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenLabel" className="text-slate-200">Label</Label>
              <Input
                id="tokenLabel"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Codex automation"
                className="border-slate-800 bg-slate-950 text-slate-100"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={pending || !teachers.length}>
                <Plus className="h-4 w-4" />
                Create token
              </Button>
              <Button variant="outline" onClick={refreshTokens} disabled={pending}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            {latestToken ? (
              <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-200">Newest token</p>
                  <Button variant="ghost" size="sm" onClick={() => handleCopyExample(latestToken)}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <Textarea readOnly value={latestToken} className="min-h-24 border-emerald-500/20 bg-slate-950 font-mono text-xs text-emerald-100" />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100">API examples</h2>
              <p className="mt-2 text-sm text-slate-400">
                Replace the host and token, then let automation send the topic and questions.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Standard lesson</h3>
                <Button variant="ghost" size="sm" onClick={() => handleCopyExample(STANDARD_EXAMPLE)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <Textarea readOnly value={STANDARD_EXAMPLE} className="min-h-56 border-slate-800 bg-slate-950 font-mono text-xs text-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Multi-choice lesson</h3>
                <Button variant="ghost" size="sm" onClick={() => handleCopyExample(MULTI_CHOICE_EXAMPLE)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <Textarea readOnly value={MULTI_CHOICE_EXAMPLE} className="min-h-56 border-slate-800 bg-slate-950 font-mono text-xs text-slate-200" />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Issued tokens</h2>
            <p className="mt-2 text-sm text-slate-400">
              Token values are only visible at creation time. This list shows ownership, activity, and revocation state.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
            {filteredTokens.length} shown
          </span>
        </div>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800/70 bg-slate-950/60">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Token</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Teacher</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Last used</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/50">
              {filteredTokens.map((token) => (
                <tr key={token.id}>
                  <td className="px-4 py-4 text-sm text-slate-200">
                    <div className="font-mono">{token.tokenPrefix}...</div>
                    {token.label ? <div className="mt-1 text-xs text-slate-400">{token.label}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    <div>{token.owner.name || token.owner.email}</div>
                    <div className="text-xs text-slate-500">{token.owner.email}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {new Date(token.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {token.revokedAt ? (
                      <span className="rounded-full border border-rose-500/40 bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-200">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevoke(token.id)}
                      disabled={Boolean(token.revokedAt) || revokingTokenId === token.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
              {!filteredTokens.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No automation tokens found for the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
