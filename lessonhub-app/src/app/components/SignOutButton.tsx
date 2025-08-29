// file: src/app/components/SignOutButton.tsx

'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  return (
    <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>
      Sign Out
    </Button>
  );
}