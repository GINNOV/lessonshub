// file: src/app/signin/page.tsx

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [magicLinkMessage, setMagicLinkMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicLinkSubmit = async () => {
    if (!email) {
      setError('Please enter your email to receive a sign-in link.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMagicLinkMessage('');
    const result = await signIn('resend', { email, redirect: false });
    if (result?.error) {
      setError('Could not send sign-in link. Please try again.');
    } else {
      setMagicLinkMessage('Check your email for a sign-in link!');
    }
    setIsLoading(false);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await signIn('credentials', { redirect: false, email, password });
    if (result?.error) {
      setError('Invalid email or password');
      setIsLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Sign In</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to sign in to your account
            </p>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {magicLinkMessage && <p className="text-green-600 text-sm text-center">{magicLinkMessage}</p>}
          <form onSubmit={handleCredentialsSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleMagicLinkSubmit}
                  className="ml-auto inline-block text-sm underline disabled:opacity-50"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} disabled={isLoading}>
              Sign in with Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/hero_image_1.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}