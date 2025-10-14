'use client';

import { useEffect } from 'react';

export default function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const key = 'lh.timezone';
      const prev = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (prev === tz) return;
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeZone: tz }),
      }).then(() => {
        try { window.localStorage.setItem(key, tz); } catch {}
      }).catch(() => {});
    } catch {}
  }, []);
  return null;
}

