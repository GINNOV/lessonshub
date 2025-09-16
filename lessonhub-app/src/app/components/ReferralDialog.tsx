// file: src/app/components/ReferralDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getOrCreateReferralCode } from '@/actions/userActions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReferralDialog({ open, onOpenChange }: ReferralDialogProps) {
  const [referralLink, setReferralLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (open) {
      getOrCreateReferralCode().then(result => {
        if (result.success && result.code) {
          const baseUrl = window.location.origin;
          setReferralLink(`${baseUrl}/register?ref=${result.code}`);
        }
      });
    }
  }, [open]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refer a Student & Earn</DialogTitle>
          <DialogDescription>
            Share your unique link with other students. When they sign up and subscribe, you&apos;ll share 20% of their monthly payment!
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Input value={referralLink} readOnly />
          <Button 
            onClick={copyToClipboard}
            className={cn(isCopied && "bg-green-600 hover:bg-green-700")}
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}