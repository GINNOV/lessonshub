// file: src/app/components/LocaleDate.tsx
'use client';

import { useState, useEffect } from 'react';

interface LocaleDateProps {
  date: Date | string;
  options?: Intl.DateTimeFormatOptions;
}

export default function LocaleDate({ date, options }: LocaleDateProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // This effect runs only on the client-side, giving it access to the browser's locale.
    const dateObj = new Date(date);
    const userLocale = navigator.language || 'en-US';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };

    setFormattedDate(new Intl.DateTimeFormat(userLocale, options || defaultOptions).format(dateObj));
  }, [date, options]);

  // Render the formatted date, or an empty fragment while waiting for client-side hydration.
  return <>{formattedDate}</>;
}