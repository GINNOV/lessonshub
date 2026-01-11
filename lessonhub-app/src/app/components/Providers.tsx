// file: app/components/Providers.tsx

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import PrivacyConsentBanner from './PrivacyConsentBanner';

interface Props {
  children: ReactNode;
}

export default function Providers({ children }: Props) {
  // Refetch session every 5 minutes to reduce unnecessary database queries
  return (
    <SessionProvider refetchInterval={5 * 60}>
      {children}
      <PrivacyConsentBanner />
      <Toaster position="top-right" richColors closeButton />
    </SessionProvider>
  );
}
