'use client';

import { useMemo, useState, useTransition } from 'react';
import { Bot, Play, Plus, Save, Trash2 } from 'lucide-react';
import { AutomationJobRunStatus } from '@prisma/client';
import { toast } from 'sonner';

import {
  deleteDailyLessonAutomationJob,
  runDailyLessonAutomationNow,
  upsertDailyLessonAutomationJob,
} from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TeacherOption = {
  id: string;
  name: string | null;
  email: string;
};

type ClassOption = {
  id: string;
  name: string;
  teacherId: string;
  isActive: boolean;
};

type RunRecord = {
  id: string;
  runDate: string;
  status: AutomationJobRunStatus;
  message: string | null;
  lessonId: string | null;
  createdAt: string;
};

type JobRecord = {
  id: string;
  name: string;
  isEnabled: boolean;
  teacherId: string;
  classId: string;
  customPrompt: string | null;
  difficulty: number;
  price: number;
  themePoolText: string;
  lastRunAt: string | null;
  lastStatus: AutomationJobRunStatus | null;
  lastMessage: string | null;
  lastLessonId: string | null;
  teacher: TeacherOption;
  class: {
    id: string;
    name: string;
    teacherId: string;
    isActive: boolean;
  };
  runs: RunRecord[];
};

type Props = {
  teachers: TeacherOption[];
  classes: ClassOption[];
  jobs: JobRecord[];
};

type EditableJob = {
  id?: string;
  name: string;
  isEnabled: boolean;
  teacherId: string;
  classId: string;
  customPrompt: string;
  difficulty: number;
  price: number;
  themePoolText: string;
};

function createEmptyJob(teachers: TeacherOption[], classes: ClassOption[]): EditableJob {
  const teacherId = teachers[0]?.id ?? '';
  const classId = classes.find((item) => item.teacherId === teacherId)?.id ?? '';
  return {
    name: '',
    isEnabled: true,
    teacherId,
    classId,
    customPrompt: '',
    difficulty: 3,
    price: 20,
    themePoolText: '',
  };
}

export default function DailyLessonAutomationManager({ teachers, classes, jobs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [runDate, setRunDate] = useState('');
  const [localJobs, setLocalJobs] = useState(jobs);
  const [draft, setDraft] = useState<EditableJob>(() => createEmptyJob(teachers, classes));

  const availableClasses = useMemo(
    () => classes.filter((item) => item.teacherId === draft.teacherId && item.isActive),
    [classes, draft.teacherId]
  );

  const setTeacher = (teacherId: string) => {
    const nextClassId = classes.find((item) => item.teacherId === teacherId && item.isActive)?.id ?? '';
    setDraft((current) => ({
      ...current,
      teacherId,
      classId: current.teacherId === teacherId ? current.classId : nextClassId,
    }));
  };

  const resetDraft = () => setDraft(createEmptyJob(teachers, classes));

  const handleEdit = (job: JobRecord) => {
    setDraft({
      id: job.id,
      name: job.name,
      isEnabled: job.isEnabled,
      teacherId: job.teacherId,
      classId: job.classId,
      customPrompt: job.customPrompt ?? '',
      difficulty: job.difficulty,
      price: job.price,
      themePoolText: job.themePoolText,
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertDailyLessonAutomationJob(draft);
      if (!result.success) {
        toast.error(result.error || 'Unable to save automation job.');
        return;
      }
      toast.success(draft.id ? 'Automation job updated.' : 'Automation job created.');
      window.location.reload();
    });
  };

  const handleDelete = (jobId: string) => {
    startTransition(async () => {
      const result = await deleteDailyLessonAutomationJob(jobId);
      if (!result.success) {
        toast.error(result.error || 'Unable to delete automation job.');
        return;
      }
      toast.success('Automation job deleted.');
      if (draft.id === jobId) resetDraft();
      setLocalJobs((current) => current.filter((job) => job.id !== jobId));
      window.location.reload();
    });
  };

  const handleRunNow = () => {
    startTransition(async () => {
      const result = await runDailyLessonAutomationNow(runDate ? new Date(runDate).toISOString() : undefined);
      if (!result.success) {
        toast.error(result.error || 'Unable to run automations.');
        return;
      }
      const summary = result.results?.map((item) => `${item.jobName}: ${item.status}`).join(', ') ?? 'Completed.';
      toast.success(summary);
      window.location.reload();
    });
  };

  return (
    <section className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Automation Jobs</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Control recurring AI lesson generators from inside LessonHub. This first job type creates one Gemini-powered standard lesson per day and assigns it to a class.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="run-date" className="text-slate-200">Run date override</Label>
            <Input
              id="run-date"
              type="date"
              value={runDate}
              onChange={(event) => setRunDate(event.target.value)}
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <Button onClick={handleRunNow} disabled={isPending}>
            <Play className="h-4 w-4" />
            Run now
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-100">
              {draft.id ? 'Edit daily lesson job' : 'New daily lesson job'}
            </h3>
            <Button variant="outline" size="sm" onClick={resetDraft}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Name</Label>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Lezione quotidiana Fall 2025"
                className="border-slate-800 bg-slate-950 text-slate-100"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-200">Teacher</Label>
                <select
                  value={draft.teacherId}
                  onChange={(event) => setTeacher(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || teacher.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Class</Label>
                <select
                  value={draft.classId}
                  onChange={(event) => setDraft((current) => ({ ...current, classId: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                >
                  {availableClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-slate-200">Difficulty</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.difficulty}
                  onChange={(event) => setDraft((current) => ({ ...current, difficulty: Number(event.target.value) || 3 }))}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={draft.price}
                  onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value) || 20 }))}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Enabled</Label>
                <select
                  value={draft.isEnabled ? 'enabled' : 'disabled'}
                  onChange={(event) => setDraft((current) => ({ ...current, isEnabled: event.target.value === 'enabled' }))}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Theme pool</Label>
              <Textarea
                value={draft.themePoolText}
                onChange={(event) => setDraft((current) => ({ ...current, themePoolText: event.target.value }))}
                placeholder={'viaggi e spostamenti\nristorante e ordinazioni\nroutine quotidiana'}
                className="min-h-28 border-slate-800 bg-slate-950 text-slate-100"
              />
              <p className="text-xs text-slate-500">One topic per line. Leave blank to use the default theme rotation.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Custom prompt</Label>
              <Textarea
                value={draft.customPrompt}
                onChange={(event) => setDraft((current) => ({ ...current, customPrompt: event.target.value }))}
                placeholder="Preferisci dialoghi pratici e vocabolario utile per adolescenti."
                className="min-h-28 border-slate-800 bg-slate-950 text-slate-100"
              />
            </div>
            <Button onClick={handleSave} disabled={isPending || !draft.teacherId || !draft.classId}>
              <Save className="h-4 w-4" />
              {draft.id ? 'Save job' : 'Create job'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {localJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
              No daily lesson automation jobs configured yet.
            </div>
          ) : (
            localJobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-fuchsia-300" />
                      <h3 className="text-lg font-semibold text-slate-100">{job.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${job.isEnabled ? 'bg-emerald-950/50 text-emerald-200 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                        {job.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {job.teacher.name || job.teacher.email} → {job.class.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Difficulty {job.difficulty} · Price {job.price}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(job)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(job.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last run</p>
                    <p className="mt-2 text-sm text-slate-200">
                      {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {job.lastStatus ?? 'No status'}
                    </p>
                    {job.lastMessage ? <p className="mt-2 text-xs text-slate-500">{job.lastMessage}</p> : null}
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent runs</p>
                    <div className="mt-2 space-y-2 text-xs text-slate-300">
                      {job.runs.map((run) => (
                        <div key={run.id} className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
                          <div className="flex items-center justify-between gap-3">
                            <span>{new Date(run.runDate).toLocaleDateString()}</span>
                            <span>{run.status}</span>
                          </div>
                          {run.message ? <p className="mt-1 text-slate-500">{run.message}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
