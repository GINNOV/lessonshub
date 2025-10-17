// file: src/app/components/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { changePassword, deleteUserAccount, toggleTakingABreak } from '@/actions/userActions';
import { toggleTakingABreakForUser } from '@/actions/adminActions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Role, Gender } from '@prisma/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { updateTeacherBio } from '@/actions/teacherActions';

interface ProfileFormProps {
  userToEdit?: User | null;
  isAdmin?: boolean;
}

export default function ProfileForm({ userToEdit, isAdmin = false }: ProfileFormProps) {
  const { data: session, update } = useSession();
  const user = userToEdit || session?.user;

  // State from your original component
  const [name, setName] = useState(user?.name ?? '');
  const [image, setImage] = useState(user?.image ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmationText = "Yes, I am sure.";

  // State for the "Taking a Break" feature
  const [isTakingBreak, setIsTakingBreak] = useState(user?.isTakingBreak ?? false);
  const [gender, setGender] = useState<Gender>((user as any)?.gender ?? Gender.BINARY);
  const [weeklySummaryOptOut, setWeeklySummaryOptOut] = useState<boolean>((user as any)?.weeklySummaryOptOut ?? false);

  // Timezone state
  const defaultTz = (() => {
    try { return (user as any)?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return (user as any)?.timeZone || 'UTC'; }
  })();
  const [timeZone, setTimeZone] = useState<string>(defaultTz);
  const tzList: string[] = (() => {
    try {
      // @ts-ignore
      return typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [];
    } catch { return []; }
  })();
  const [teacherBio, setTeacherBio] = useState(user?.teacherBio ?? '');
  const [isSubmittingBio, setIsSubmittingBio] = useState(false);

  // All handlers from your original component are preserved
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };
  
  const handleToggleBreak = async (isChecked: boolean) => {
    setIsTakingBreak(isChecked);
    const result = isAdmin && userToEdit
        ? await toggleTakingABreakForUser(userToEdit.id)
        : await toggleTakingABreak();

    if (result.success) {
      const message = result.isTakingBreak ? 'Lessons are now paused.' : 'Lessons are now active.';
      toast.success(message);
      if (!isAdmin) {
          await update({ ...session, user: { ...session?.user, isTakingBreak: isChecked } });
      }
    } else {
      toast.error(result.error);
      setIsTakingBreak(!isChecked);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Upload failed.");
      const newBlob = await response.json();
      setImage(newBlob.url);
      toast.success("Image uploaded, save changes to apply.");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    
    const apiRoute = isAdmin && userToEdit ? `/api/profile/${userToEdit.id}` : '/api/profile';
    
    const response = await fetch(apiRoute, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image, timeZone, gender, weeklySummaryOptOut }),
    });

    if (response.ok) {
      toast.success('Profile updated successfully!');
      if (!isAdmin) {
        await update({ ...session, user: { ...session?.user, name, image, timeZone, gender, weeklySummaryOptOut } });
      }
    } else {
      const data = await response.json();
      toast.error(data.error || 'Failed to update profile.');
    }
    setIsSubmittingProfile(false);
  };

  const handleTeacherBioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBio(true);

    try {
      const result = await updateTeacherBio(teacherBio);
      if (result.success) {
        toast.success('About me updated successfully!');
        if (!isAdmin && session) {
          await update({
            ...session,
            user: {
              ...session.user,
              teacherBio,
            } as any,
          });
        }
      } else {
        toast.error(result.error || 'Failed to update About me.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    }

    setIsSubmittingBio(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setIsSubmittingPassword(true);

    const result = await changePassword(newPassword);

    if (result.success) {
      await signOut({ callbackUrl: '/signin' });
      toast.info('Password changed successfully. Please sign in again.');
    } else {
      toast.error(result.error || 'Failed to change password.');
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== confirmationText) {
      toast.error('Please type the confirmation text exactly as shown.');
      return;
    }
    setIsDeleting(true);

    const result = await deleteUserAccount();
    if (result.success) {
      await signOut({ callbackUrl: '/' });
      toast.success('Account deleted successfully.');
    } else {
      toast.error(result.error || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const tabOptions = [
    { value: 'profile', label: 'Profile', visible: true },
    { value: 'about', label: 'About me', visible: user?.role === Role.TEACHER },
    { value: 'status', label: 'Status', visible: user?.role === Role.STUDENT },
    { value: 'password', label: 'Password', visible: !isAdmin },
    { value: 'delete', label: 'Delete Account', visible: !isAdmin },
  ] as const;

  const visibleTabs = tabOptions.filter((option) => option.visible);
  const visibleCount = visibleTabs.length;
  const mdCols =
    visibleCount >= 4 ? 'md:grid-cols-4'
    : visibleCount === 3 ? 'md:grid-cols-3'
    : 'md:grid-cols-2';
  const smCols = visibleCount > 1 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className={`grid w-full ${smCols} ${mdCols}`}>
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      <TabsContent value="profile">
        <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold">Update Profile</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    {image && <AvatarImage src={image} alt={name} />}
                    <AvatarFallback className="text-3xl">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <Input 
                    id="picture" 
                    type="file" 
                    onChange={handleImageUpload} 
                    disabled={isSubmittingProfile || isUploading}
                    accept="image/*"
                />
                </div>
                {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
            </div>
            <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="bg-gray-100" />
                <p className="text-xs text-gray-500">Email addresses cannot be changed.</p>
            </div>
            <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  <option value={Gender.MALE}>male</option>
                  <option value={Gender.FEMALE}>female</option>
                  <option value={Gender.BINARY}>binary</option>
                </select>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label htmlFor="weekly-summary" className="font-medium">Weekly summary emails</Label>
                <p className="text-xs text-gray-500">Receive a Sunday recap of your accomplishments.</p>
              </div>
              <Switch id="weekly-summary" checked={!weeklySummaryOptOut} onCheckedChange={(v) => setWeeklySummaryOptOut(!v)} />
            </div>
            <div>
                <Label htmlFor="timeZone">Timezone</Label>
                {tzList.length > 0 ? (
                  <select
                    id="timeZone"
                    className="w-full rounded-md border border-gray-300 p-2 shadow-sm"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    {tzList.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                ) : (
                  <Input id="timeZone" type="text" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
                )}
                <p className="text-xs text-gray-500 mt-1">Used to format deadlines in emails and reminders.</p>
            </div>
            <Button type="submit" disabled={isSubmittingProfile || isUploading}>
                {isSubmittingProfile ? 'Saving...' : 'Save Profile Changes'}
            </Button>
            </form>
        </div>
      </TabsContent>
      {user?.role === Role.TEACHER && (
        <TabsContent value="about">
          <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold">About Me</h2>
            <form onSubmit={handleTeacherBioSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-bio">Share something with your students</Label>
                <Textarea
                  id="teacher-bio"
                  value={teacherBio}
                  onChange={(e) => setTeacherBio(e.target.value)}
                  rows={6}
                  placeholder="Introduce yourself, highlight your teaching style, or share what students can expect from your lessons."
                />
                <p className="text-xs text-gray-500">
                  This message appears on the teachers directory for all logged-in students.
                </p>
              </div>
              <Button type="submit" disabled={isSubmittingBio}>
                {isSubmittingBio ? 'Saving...' : 'Save About Me'}
              </Button>
            </form>
          </div>
        </TabsContent>
      )}

      {user?.role === Role.STUDENT && (
        <TabsContent value="status">
            <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
                <h2 className="text-xl font-semibold mb-4">Account Status</h2>
                <div className="flex items-center justify-between">
                    <div>
                    <Label htmlFor="taking-a-break" className="font-medium">
                        Taking a Break
                    </Label>
                    <p className="text-sm text-gray-500">
                        Pause all lesson assignments on your dashboard.
                    </p>
                    </div>
                    <Switch
                    id="taking-a-break"
                    checked={isTakingBreak}
                    onCheckedChange={handleToggleBreak}
                    />
                </div>
            </div>
        </TabsContent>
      )}

      {!isAdmin && (
        <>
          <TabsContent value="password">
            <div className="mt-4 rounded-lg border bg-white p-6 shadow-md">
                <h2 className="mb-4 text-2xl font-semibold">Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={isSubmittingPassword}>
                    {isSubmittingPassword ? 'Saving...' : 'Change Password'}
                </Button>
                </form>
            </div>
          </TabsContent>
          
          <TabsContent value="delete">
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6 shadow-md">
                <h2 className="text-2xl font-semibold text-red-800 mb-4">Delete Account</h2>
                <p className="text-red-700 mb-4">
                This action is irreversible. All your lessons, assignments, and personal data will be permanently deleted.
                </p>
                <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="deleteConfirmation">To confirm, please type: &quot;{confirmationText}&quot;</Label>
                    <Input 
                    id="deleteConfirmation" 
                    type="text" 
                    value={deleteConfirmation} 
                    onChange={(e) => setDeleteConfirmation(e.target.value)} 
                    required 
                    />
                </div>
                <Button type="submit" variant="destructive" disabled={isDeleting || deleteConfirmation !== confirmationText}>
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                </Button>
                </form>
            </div>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
