// file: src/app/register/page.tsx

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';

// SVG component for the Google icon
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.85 1.62-4.64 0-8.54-3.82-8.54-8.42s3.9-8.42 8.54-8.42c2.48 0 4.3.94 5.6 2.18l2.6-2.6C19.84 3.74 16.48 2 12.48 2 5.88 2 1 7.18 1 13.72s4.88 11.72 11.48 11.72c3.47 0 6.04-1.18 8.04-3.18 2.1-2.1 2.7-5.12 2.7-7.72v-.04c0-.66-.07-1.32-.2-1.98h-10.6z" />
    </svg>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams?.get('success');

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
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(data.error || 'Failed to register');
      }

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
          A welcome email has been sent to your inbox.
        </p>
        <Button asChild className="mt-6">
          <Link href="/signin">Proceed to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-balance text-muted-foreground">
            Enter your details below to get started
          </p>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
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
            <Label htmlFor="password">Password</Label>
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} disabled={isLoading}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button>
        </form>
      </div>
  );
}


export default function RegisterPage() {
  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-10 text-center">
        <Image
          src="/hero_signin.png"
          alt="Image"
          width="400"
          height="400"
          className="object-contain"
        />
        <h2 className="mt-6 text-3xl font-bold">Welcome to LessonHUB</h2>
        <p className="mt-2 text-muted-foreground">Already have an account? Sign in to continue your learning journey.</p>
        <Button asChild className="mt-6">
            <Link href="/signin">Sign In</Link>
        </Button>
      </div>
    </div>
  );
}