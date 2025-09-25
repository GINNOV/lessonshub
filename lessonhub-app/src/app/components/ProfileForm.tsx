// file: src/app/components/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { useSession } from "next-auth/react";
import { User, Role } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { toggleTakingABreak } from '@/actions/userActions';
import { toggleTakingABreakForUser } from '@/actions/adminActions';
import TeacherPreferences from './TeacherPreferences';

interface ProfileFormProps {
  user: User & { teachers?: { teacher: User }[] };
  isAdmin?: boolean;
}

export default function ProfileForm({ user, isAdmin = false }: ProfileFormProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTakingBreak, setIsTakingBreak] = useState(user.isTakingBreak);

  const handleToggleBreak = async (isChecked: boolean) => {
    setIsTakingBreak(isChecked); // Optimistic UI update
    const result = isAdmin
        ? await toggleTakingABreakForUser(user.id)
        : await toggleTakingABreak();

    if (result.success) {
      const message = result.isTakingBreak ? 'User lessons are now paused.' : 'User lessons are now active.';
      toast.success(message);
      if (!isAdmin) {
          await update({ ...session, user: { ...session?.user, isTakingBreak: isChecked } });
      }
      router.refresh();
    } else {
      toast.error(result.error);
      setIsTakingBreak(!isChecked); // Revert on error
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const res = await fetch(isAdmin ? `/api/profile/${user.id}` : `/api/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to update profile');
        
        const updatedUser = await res.json();
        
        if (!isAdmin) {
            await update({ ...session, user: { ...session?.user, name: updatedUser.name } });
        }
        
        toast.success('Profile updated successfully!');
        router.refresh();
    } catch (error) {
        toast.error((error as Error).message);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleProfileUpdate} className="p-6 border rounded-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} disabled />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      {user.role === Role.STUDENT && (
        <div className="p-6 border rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">Account Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="taking-a-break" className="font-medium">
                Taking a Break
              </Label>
              <p className="text-sm text-gray-500">
                Pause all lesson assignments on the dashboard.
              </p>
            </div>
            <Switch
              id="taking-a-break"
              checked={isTakingBreak}
              onCheckedChange={handleToggleBreak}
            />
          </div>
        </div>
      )}

      {user.role === Role.TEACHER && (
        <TeacherPreferences teacher={user} />
      )}
    </div>
  );
}