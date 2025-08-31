// file: src/app/register/page.tsx

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail';

// This new component contains all the logic that depends on client-side search parameters.
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Create the user account
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      // If registration is successful, redirect to a success state
      router.push('/register?success=true');

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Registration Successful!</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Thank you for signing up. A welcome email has been sent to your inbox.
        </p>
        <Button asChild className="mt-6">
          <Link href="/signin">Proceed to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
      </div>
      {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Register'}
        </Button>
      </div>
      <p className="text-center text-sm pt-4">
        Already have an account? <Link href="/signin" className="text-blue-600 hover:underline">Sign In</Link>
      </p>
    </form>
  );
}


// The main page component now wraps the form in a Suspense boundary.
export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-4 p-8 bg-white shadow-md rounded-lg border">
        <Suspense fallback={<div>Loading...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}

