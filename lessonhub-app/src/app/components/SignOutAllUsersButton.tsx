'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { signOutAllUsers } from '@/actions/adminActions';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export default function SignOutAllUsersButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      const result = await signOutAllUsers();
      if (result.success) {
        toast.success('All users have been signed out.');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to sign out users.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          Sign Out All Users
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Sign Out All Users
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to sign out all users? This will invalidate all active sessions, including your own. Everyone will be required to log in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSignOutAll} disabled={loading}>
            {loading ? 'Signing out...' : 'Yes, Sign Out Everyone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
