// file: src/app/register/page.tsx

'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
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

type ChallengeState = {
  a: number;
  b: number;
  token: string;
  signature: string;
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams?.get('success');
  const refCode = searchParams?.get('ref');
  const [locale, setLocale] = useState<string>('en');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [honeypotValue, setHoneypotValue] = useState('');
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [isChallengeLoading, setIsChallengeLoading] = useState(true);

  const loadChallenge = useCallback(async () => {
    setIsChallengeLoading(true);
    try {
      const res = await fetch('/api/register/challenge');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load anti-spam check');
      }
      setChallenge(data);
      setChallengeAnswer('');
    } catch (err) {
      console.error('[register] Failed to load challenge', err);
      setError('Unable to load the anti-spam check. Please refresh and try again.');
    } finally {
      setIsChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      setLocale(navigator.language.toLowerCase());
    }
  }, []);

  const heroCopy =
    locale.startsWith('it') || locale.startsWith('es') || locale.startsWith('fr')
      ? 'Viaggia con confidenza. Sentiti semplicemente sicuro di interaggire con il resto del mondo.'
      : 'Travel with confidence. Feel at ease engaging with the world around you.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!challenge || challengeAnswer.trim() === '') {
        throw new Error('Please solve the anti-spam check.');
      }

      const parsedAnswer = Number(challengeAnswer);
      if (!Number.isFinite(parsedAnswer)) {
        throw new Error('Please enter a valid answer to the anti-spam check.');
      }

      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: refCode,
          honeypot: honeypotValue,
          challengeAnswer: parsedAnswer,
          challengeToken: challenge?.token,
          challengeSignature: challenge?.signature,
        }),
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
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-16">
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">You’re in! 🎉</h1>
          <p className="mt-3 text-sm text-slate-600">
            Your account is ready and a welcome email is on the way. Take a breath, then dive into your lessons with confidence.
          </p>
          <div className="mt-6 space-y-3">
            <Button asChild className="w-full">
              <Link href="/signin">Go to sign in</Link>
            </Button>
            <p className="text-xs text-slate-500">
              Need help? Reply to the welcome email and we’ll be there.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 sm:px-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-balance text-muted-foreground">
            {heroCopy}
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
          {/* Simple honeypot field to discourage basic bots */}
          <div className="hidden" aria-hidden="true">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypotValue}
              onChange={(e) => setHoneypotValue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="challengeAnswer">Anti-spam check</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium whitespace-nowrap">
                {challenge ? `${challenge.a} + ${challenge.b} =` : 'Loading...'}
              </span>
              <Input
                id="challengeAnswer"
                type="number"
                min="0"
                inputMode="numeric"
                pattern="\\d*"
                placeholder="Your answer"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                disabled={isLoading || isChallengeLoading || !challenge}
              />
              <Button
                type="button"
                variant="outline"
                className="px-3"
                onClick={() => void loadChallenge()}
                disabled={isChallengeLoading || isLoading}
                aria-label="New question"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2l-2 2m0 0-4.5 4.5a2.121 2.121 0 0 1-3 0L9 10l5 5" />
                  <path d="m21 2-5.5 5.5" />
                  <path d="M6 18 2 22" />
                  <path d="m3 21 1-4 4-4 3 3-4 4Z" />
                </svg>
              </Button>
            </div>
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
