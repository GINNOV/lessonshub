// file: src/app/register/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Read success state from URL to prevent message from disappearing on re-render
  const isSuccess = searchParams.get('success') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Create the user account via your API route.
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!registerResponse.ok) {
        const data = await registerResponse.json();
        throw new Error(data.error || 'Failed to register account.');
      }

      // Step 2: On successful registration, use the official signIn function
      // to trigger the Resend email flow without a page redirect.
      const signInResult = await signIn('resend', {
        email,
        redirect: false,
      });
      console.log("signIn('resend') result:", signInResult);

      if (signInResult?.error) {
        throw new Error(`Account created, but email sign-in failed: ${signInResult.error}`);
      }
      if (!signInResult?.ok) {
        throw new Error("Unexpected sign-in response while sending magic link.");
      }
      
      // On success, navigate to the same page with a success query param.
      // This makes the success message persistent across re-renders.
      router.push('/register?success=true');

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-4 p-8 bg-white shadow-md rounded-lg border">
        <form onSubmit={handleSubmit}>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create an Account</h1>
            <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center mt-4 bg-red-50 p-3 rounded-md">{error}</p>}
          {isSuccess && <p className="text-green-600 text-sm text-center mt-4 bg-green-50 p-3 rounded-md">Account created! Check your email for a sign-in link.</p>}

          <fieldset disabled={isLoading || isSuccess} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSuccess}>
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </fieldset>
        </form>
        <p className="text-center text-sm pt-4">
          Already have an account? <Link href="/signin" className="text-blue-600 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

