'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfileForm() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(session?.user?.name ?? '');
  const [image, setImage] = useState(session?.user?.image ?? null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setError(null);
    
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
      if (!response.ok) throw new Error("Upload failed.");
      const newBlob = await response.json();
      setImage(newBlob.url);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // This updates the session on the client-side with the new data
      await update({ name, image });
      setSuccessMessage('Profile updated successfully!');
      router.refresh();

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {successMessage && <p className="text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}
      
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
            ref={inputFileRef} 
            onChange={handleImageUpload} 
            disabled={isLoading || isUploading}
          />
        </div>
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input 
          id="name" 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          value={session.user.email ?? ''} 
          disabled 
          className="bg-gray-100"
        />
        <p className="text-xs text-gray-500">Email addresses cannot be changed.</p>
      </div>

      <Button type="submit" disabled={isLoading || isUploading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}