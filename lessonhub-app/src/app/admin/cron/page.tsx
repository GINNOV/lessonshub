// file: src/app/admin/cron/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CronTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const sendTestEmail = async () => {
    addLog('Attempting to send email via API route...');
    try {
      const response = await fetch('/api/cron/test', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      addLog(`SUCCESS: ${data.message}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      addLog(`ERROR: ${errorMessage}`);
      stopTest();
    }
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

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Cron Job Test</CardTitle>
          <CardDescription>
            This page tests the email sending functionality used by the cron job. Click {"'Start Test'"} to send an email to your admin account every 30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={startTest} disabled={isRunning}>
              {isRunning ? 'Test Running...' : 'Start Test'}
            </Button>
            <Button onClick={stopTest} disabled={!isRunning} variant="destructive">
              Stop Test
            </Button>
          </div>

          <div className="bg-gray-900 text-white font-mono text-sm rounded-md p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400">Test logs will appear here...</p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className={log.startsWith('[') && log.includes('ERROR') ? 'text-red-400' : 'text-green-400'}>
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

