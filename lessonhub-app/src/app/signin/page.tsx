// file: src/app/signin/page.tsx

'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// SVG component for the Google icon
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.85 1.62-4.64 0-8.54-3.82-8.54-8.42s3.9-8.42 8.54-8.42c2.48 0 4.3.94 5.6 2.18l2.6-2.6C19.84 3.74 16.48 2 12.48 2 5.88 2 1 7.18 1 13.72s4.88 11.72 11.48 11.72c3.47 0 6.04-1.18 8.04-3.18 2.1-2.1 2.7-5.12 2.7-7.72v-.04c0-.66-.07-1.32-.2-1.98h-10.6z" />
    </svg>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const errorParam = searchParams?.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [magicLinkMessage, setMagicLinkMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (errorParam) {
      switch (errorParam) {
        case 'CredentialsSignin':
          setError('Invalid email or password.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
    }
  }, [errorParam]);

  const handleMagicLinkSubmit = async () => {
    if (!email) {
      setError('Please enter your email to receive a sign-in link.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    // This will redirect the user to a page that says "Check your email"
    await signIn('resend', { email, redirect: true, callbackUrl });
    
    // The page will navigate away, so we don't need to set loading to false here
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    await signIn('credentials', { redirect: true, email, password, callbackUrl });
    setIsLoading(false);
  };

  return (
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
        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={() => signIn('google', { callbackUrl })} 
          disabled={isLoading}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
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
  );
}

export default function SignInPage() {
  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/hero_signin.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}