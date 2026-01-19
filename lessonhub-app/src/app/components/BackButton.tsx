'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
      &larr; {label}
    </Button>
  );
}
