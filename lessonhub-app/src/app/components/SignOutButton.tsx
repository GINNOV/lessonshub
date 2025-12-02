// file: src/app/components/SignOutButton.tsx

'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type SignOutButtonProps = {
  label?: string;
};

export default function SignOutButton({ label = 'Sign Out' }: SignOutButtonProps) {
  return (
    <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>
      {label}
    </Button>
  );
}
