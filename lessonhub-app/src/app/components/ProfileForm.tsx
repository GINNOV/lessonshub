// file: src/app/components/ProfileForm.tsx

'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, deleteUserAccount } from '@/actions/userActions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfileForm() {
  const { data: session, update } = useSession();

  // Profile state
  const [name, setName] = useState(session?.user?.name ?? '');
  const [image, setImage] = useState(session?.user?.image ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const confirmationText = "Yes, I am sure.";

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Upload failed.");
      const newBlob = await response.json();
      setImage(newBlob.url);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image }),
    });

    if (response.ok) {
      setSuccessMessage('Profile updated successfully!');
      await update({ name, image }); // Update session
    } else {
      const data = await response.json();
      setErrorMessage(data.error || 'Failed to update profile.');
    }
    setIsSubmittingProfile(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setIsSubmittingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    const result = await changePassword(newPassword);

    if (result.success) {
      setPasswordSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'Failed to change password.');
    }
    setIsSubmittingPassword(false);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== confirmationText) {
      setDeleteError('Please type the confirmation text exactly as shown.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');

    const result = await deleteUserAccount();
    if (result.success) {
      await signOut({ callbackUrl: '/' });
    } else {
      setDeleteError(result.error || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-2xl font-semibold mb-4">Update Profile</h2>
        {successMessage && <p className="text-green-600 mb-4">{successMessage}</p>}
        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
        
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
            <Input id="email" type="email" value={session?.user?.email || ''} disabled className="bg-gray-100" />
            <p className="text-xs text-gray-500">Email addresses cannot be changed.</p>
          </div>
          <Button type="submit" disabled={isSubmittingProfile || isUploading}>
            {isSubmittingProfile ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </form>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-2xl font-semibold mb-4">Change Password</h2>
        {passwordSuccess && <p className="text-green-600 mb-4">{passwordSuccess}</p>}
        {passwordError && <p className="text-red-500 mb-4">{passwordError}</p>}
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
      
      <div className="mt-8 bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
        <h2 className="text-2xl font-semibold text-red-800 mb-4">Delete Account</h2>
        <p className="text-red-700 mb-4">
          This action is irreversible. All your lessons, assignments, and personal data will be permanently deleted.
        </p>
        {deleteError && <p className="text-red-500 mb-4">{deleteError}</p>}
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
    </>
  );
}