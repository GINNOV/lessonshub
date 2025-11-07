'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

interface ManageInstructionBookletsLinkProps {
  children?: ReactNode;
  className?: string;
}

export default function ManageInstructionBookletsLink({
  children = 'Manage instruction booklets',
  className,
}: ManageInstructionBookletsLinkProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = () => {
    setIsDialogOpen(false);
    router.push('/dashboard/instructions');
  };

  return (
    <>
      <button
        type="button"
        className={cn('font-semibold text-indigo-600 hover:underline', className)}
        onClick={() => setIsDialogOpen(true)}
      >
        {children}
      </button>
      <ConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Leave lesson builder?"
        description="Unsaved changes will be lost if you go to Instruction Booklets right now."
        confirmLabel="Go to booklets"
        cancelLabel="Stay here"
        confirmVariant="destructive"
        onConfirm={handleConfirm}
      />
    </>
  );
}
