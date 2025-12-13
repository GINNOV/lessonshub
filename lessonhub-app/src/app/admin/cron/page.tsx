// file: src/app/admin/cron/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

type CronTestAction = 'test-email' | 'deadline' | 'start-date' | 'weekly' | 'payment';

const formatDateTimeForInput = (date: Date) => {
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 16);
};

const toIsoString = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export default function CronTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [simulateStartDate, setSimulateStartDate] = useState<string>(formatDateTimeForInput(new Date()));
  const [simulateWeeklyDate, setSimulateWeeklyDate] = useState<string>('');
  const [forceWeekly, setForceWeekly] = useState<boolean>(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const runCronAction = async (action: CronTestAction, payload: Record<string, unknown> = {}) => {
    addLog(`Triggering "${action}" action...`);
    try {
      const response = await fetch('/api/cron/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      addLog(`SUCCESS: ${data.message || 'Action completed.'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      addLog(`ERROR: ${errorMessage}`);
      stopTest();
    }
  };

  const sendTestEmail = async () => {
    await runCronAction('test-email');
  };

  const startTest = () => {
    if (intervalRef.current) return;
    setIsRunning(true);
    addLog('Starting cron test. An email will be sent every 30 seconds.');
    // Send immediately once, then start interval
    sendTestEmail(); 
    intervalRef.current = setInterval(sendTestEmail, 30000);
  };

  const stopTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    addLog('Cron test stopped.');
  };

  const triggerStartDateNotifications = async () => {
    const payload: Record<string, unknown> = {};
    const iso = toIsoString(simulateStartDate);
    if (iso) payload.simulateTime = iso;
    await runCronAction('start-date', payload);
  };

  const triggerWeeklySummaries = async () => {
    const payload: Record<string, unknown> = { force: forceWeekly };
    const iso = toIsoString(simulateWeeklyDate);
    if (iso) payload.simulateTime = iso;
    await runCronAction('weekly', payload);
  };

  const triggerDeadlineReminders = async () => {
    await runCronAction('deadline');
  };

  const triggerPaymentReminders = async () => {
    await runCronAction('payment');
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto text-slate-100 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Cron Job Test</h1>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Admin home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Teacher dashboard
          </Link>
        </div>
      </div>
      <Card className="border-slate-800/70 bg-slate-900/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-slate-100">Cron Job Test</CardTitle>
          <CardDescription className="text-slate-400">
            This page tests the email sending functionality used by the cron job. Click {"'Start Test'"} to send an email to your admin account every 30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 border border-slate-800 rounded-md p-4 bg-slate-950/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Start Date Notifications</h3>
              <div className="space-y-2">
                <Label htmlFor="simulate-start-date">Available On (simulate)</Label>
                <Input
                  id="simulate-start-date"
                  type="datetime-local"
                  value={simulateStartDate}
                  onChange={(event) => setSimulateStartDate(event.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Pick a past time to fire emails immediately or a future time to verify that no notifications are sent.
                </p>
              </div>
              <Button onClick={triggerStartDateNotifications}>Send start-date notifications</Button>
            </div>

            <div className="space-y-4 border border-slate-800 rounded-md p-4 bg-slate-950/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Deadline &amp; Payments</h3>
              <div className="space-y-3">
                <Button onClick={triggerDeadlineReminders} className="w-full">
                  Send deadline reminders
                </Button>
                <Button onClick={triggerPaymentReminders} variant="secondary" className="w-full">
                  Send payment reminders
                </Button>
              </div>
            </div>
          </div>

          <div className="border border-slate-800 rounded-md p-4 space-y-4 bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Weekly Summaries</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="simulate-weekly-date">Reference date (optional)</Label>
                <Input
                  id="simulate-weekly-date"
                  type="datetime-local"
                  value={simulateWeeklyDate}
                  onChange={(event) => setSimulateWeeklyDate(event.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Defaults to now; choose a Sunday to mimic production timing.
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-6 md:pt-0">
                <Checkbox
                  id="force-weekly"
                  checked={forceWeekly}
                  onCheckedChange={(checked) => setForceWeekly(Boolean(checked))}
                />
                <Label htmlFor="force-weekly" className="text-sm text-slate-400">
                  Force run even if not Sunday
                </Label>
              </div>
            </div>
            <Button onClick={triggerWeeklySummaries} className="w-full md:w-auto">
              Send weekly summaries
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Button onClick={startTest} disabled={isRunning}>
              {isRunning ? 'Test Running...' : 'Start Test'}
            </Button>
            <Button onClick={stopTest} disabled={!isRunning} variant="destructive">
              Stop Test
            </Button>
          </div>

          <div className="bg-slate-950 text-slate-50 font-mono text-sm rounded-md p-4 h-64 overflow-y-auto border border-slate-800">
            {logs.length === 0 ? (
              <p className="text-slate-500">Test logs will appear here...</p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className={log.startsWith('[') && log.includes('ERROR') ? 'text-red-400' : 'text-emerald-300'}>
                  {log}
                </p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
