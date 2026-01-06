// file: src/app/register/page.tsx

'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, useSession } from 'next-auth/react';
import { resolveLocale, UiLanguagePreference } from '@/lib/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Gift, CalendarRange, BookOpenText } from 'lucide-react';

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

export type RegisterLocale = 'en' | 'it';

const registerCopy: Record<RegisterLocale, Record<string, string>> = {
  en: {
    title: 'Create Account',
    hero: 'Travel with confidence. Feel at ease engaging with the world around you.',
    successTitle: "You're in! 🎉",
    successBody:
      'Your account is ready and a welcome email is on the way. Take a breath, then dive into your lessons with confidence.',
    successCta: 'Go to sign in',
    successHelp: 'Need help? Reply to the welcome email and we’ll be there.',
    nameLabel: 'Name',
    namePlaceholder: 'Your Name',
    emailLabel: 'Email',
    emailPlaceholder: 'm@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Choose a password',
    antiSpam: 'Anti-spam check',
    antiSpamLoading: 'Loading...',
    submit: 'Sign Up',
    submitting: 'Creating Account...',
    orContinue: 'Or continue with',
    google: 'Sign up with Google',
    welcomeTitle: 'Welcome to LessonHUB',
    welcomeBody: 'Already have an account? Sign in to continue your learning journey.',
    welcomeCta: 'Sign In',
    refresh: 'New question',
    errorChallenge: 'Please solve the anti-spam check.',
    errorChallengeInvalid: 'Please enter a valid answer to the anti-spam check.',
    errorChallengeLoad: 'Unable to load the anti-spam check. Please refresh and try again.',
    errorRegister: 'Failed to register',
    errorSubmit: 'Failed to load anti-spam check',
    giftTitle: 'A Gift From {name}!',
    giftSubtitle: "They’ve gifted you one month of unlimited lessons on LessonHUB for free.",
    giftFeature1Title: 'Teacher Assigned Soon',
    giftFeature1Body: 'We’re matching you with a personal teacher. You can start with our free guides now.',
    giftFeature2Title: 'Daily Custom Lessons',
    giftFeature2Body: 'Lessons are created daily and adapt to your current skill level.',
    giftFeature3Title: 'Practical Knowledge First',
    giftFeature3Body: 'We focus on real-world application over strict grammar rules.',
    giftNote1: 'You will receive an email as soon as a class is assigned.',
    giftNote2: 'No credit card required. After your free month, continue for just €10/month — the best value online.',
    giftCta: 'Start Learning',
    giftClose: 'Close',
  },
  it: {
    title: 'Crea account',
    hero: 'Viaggia con sicurezza e interagisci con il mondo in tranquillità.',
    successTitle: 'Benvenuto! 🎉',
    successBody:
      'Il tuo account è pronto e una email di benvenuto sta arrivando. Respira e inizia subito le tue lezioni.',
    successCta: 'Vai al login',
    successHelp: 'Hai bisogno di aiuto? Rispondi alla mail di benvenuto e ti assisteremo.',
    nameLabel: 'Nome',
    namePlaceholder: 'Il tuo nome',
    emailLabel: 'Email',
    emailPlaceholder: 'tuo@email.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Scegli una password',
    antiSpam: 'Controllo anti-spam',
    antiSpamLoading: 'Caricamento...',
    submit: 'Registrati',
    submitting: 'Creazione account...',
    orContinue: 'Oppure continua con',
    google: 'Registrati con Google',
    welcomeTitle: 'Benvenuto su LessonHUB',
    welcomeBody: 'Hai già un account? Accedi per continuare il tuo percorso.',
    welcomeCta: 'Accedi',
    refresh: 'Nuova domanda',
    errorChallenge: 'Risolvi il controllo anti-spam.',
    errorChallengeInvalid: 'Inserisci una risposta valida al controllo anti-spam.',
    errorChallengeLoad: 'Impossibile caricare il controllo anti-spam. Riprova.',
    errorRegister: 'Registrazione non riuscita',
    errorSubmit: 'Impossibile caricare il controllo anti-spam',
    giftTitle: 'Un regalo da {name}!',
    giftSubtitle: 'Ti hanno regalato un mese di lezioni illimitate su LessonHUB gratuitamente.',
    giftFeature1Title: 'Insegnante in arrivo',
    giftFeature1Body: 'Ti abbiniamo a un insegnante personale. Puoi iniziare subito con le guide gratuite.',
    giftFeature2Title: 'Lezioni su misura',
    giftFeature2Body: 'Le lezioni vengono create ogni giorno e si adattano al tuo livello.',
    giftFeature3Title: 'Conoscenza pratica',
    giftFeature3Body: 'Puntiamo sull’applicazione reale più che sulla grammatica rigida.',
    giftNote1: 'Riceverai una email appena ti assegnano una classe.',
    giftNote2: 'Nessuna carta richiesta. Dopo il mese gratis puoi continuare a soli €10/mese.',
    giftCta: 'Inizia a imparare',
    giftClose: 'Chiudi',
  },
};

type RegisterFormProps = {
  copy: Record<string, string>;
  locale: RegisterLocale;
};

function RegisterForm({ copy, locale }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams?.get('success');
  const refCode = searchParams?.get('ref');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [honeypotValue, setHoneypotValue] = useState('');
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [isChallengeLoading, setIsChallengeLoading] = useState(true);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const loadChallenge = useCallback(async () => {
    setIsChallengeLoading(true);
    try {
      const res = await fetch('/api/register/challenge');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || copy.errorSubmit);
      }
      setChallenge(data);
      setChallengeAnswer('');
    } catch (err) {
      console.error('[register] Failed to load challenge', err);
      setError(copy.errorChallengeLoad);
    } finally {
      setIsChallengeLoading(false);
    }
  }, [copy]);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  const heroCopy = copy.hero;

  useEffect(() => {
    const loadReferrer = async () => {
      if (!refCode) return;
      try {
        const res = await fetch(`/api/referrals/lookup?code=${encodeURIComponent(refCode)}`);
        if (!res.ok) return;
        const data = await res.json();
        setReferrerName(data.name || data.email || null);
      } catch (err) {
        console.warn("[register] failed to load referrer info", err);
      }
    };
    void loadReferrer();
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!challenge || challengeAnswer.trim() === '') {
        throw new Error(copy.errorChallenge);
      }

      const parsedAnswer = Number(challengeAnswer);
      if (!Number.isFinite(parsedAnswer)) {
        throw new Error(copy.errorChallengeInvalid);
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
        throw new Error(data.error || copy.errorRegister);
      }

      const successUrl = refCode
        ? `/register?success=true&ref=${encodeURIComponent(refCode)}`
        : '/register?success=true';
      router.push(successUrl);

    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    const showReferralDialog = Boolean(searchParams?.get('ref'));
    const features = [
      {
        icon: <Gift className="h-5 w-5" />,
        title: copy.giftFeature1Title || "Teacher Assigned Soon",
        body: copy.giftFeature1Body || "We're matching you with a personal teacher. You can start with our free guides now.",
      },
      {
        icon: <CalendarRange className="h-5 w-5" />,
        title: copy.giftFeature2Title || "Daily Custom Lessons",
        body: copy.giftFeature2Body || "Lessons are created daily and adapt to your current skill level.",
      },
      {
        icon: <BookOpenText className="h-5 w-5" />,
        title: copy.giftFeature3Title || "Practical Knowledge First",
        body: copy.giftFeature3Body || "We focus on real-world application over strict grammar rules.",
      },
    ];

    const giftTitleTemplate = copy.giftTitle || copy.successTitle || "A Gift From Your Friend!";
    const giftTitle = giftTitleTemplate.replace('{name}', referrerName || (copy.successTitle || "Your friend"));

    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center sm:py-16">
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">{copy.successTitle}</h1>
          <p className="mt-3 text-sm text-slate-600">
            {copy.successBody}
          </p>
          <div className="mt-6 space-y-3">
            <Button asChild className="w-full">
              <Link href="/signin">{copy.successCta}</Link>
            </Button>
            <p className="text-xs text-slate-500">
              {copy.successHelp}
            </p>
          </div>
        </div>

        <Dialog open={showReferralDialog}>
          <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-3 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 text-white shadow-lg">
                <Gift className="h-12 w-12" />
              </div>
              <DialogTitle className="mt-4 text-2xl font-black">{giftTitle}</DialogTitle>
              <DialogDescription className="mt-2 text-base text-gray-600">
                {copy.giftSubtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                      {feature.icon}
                    </div>
                    <p className="font-semibold text-gray-900">{feature.title}</p>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{feature.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
                <p>{copy.giftNote1}</p>
                <p>{copy.giftNote2}</p>
              </div>
              <div className="mt-6">
                <Button asChild className="w-full h-12 text-base font-semibold">
                  <Link href="/signin">{copy.giftCta}</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 sm:px-6">
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-balance text-muted-foreground">
            {heroCopy}
          </p>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{copy.nameLabel}</Label>
            <Input
                id="name"
                type="text"
                placeholder={copy.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{copy.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              placeholder={copy.emailPlaceholder}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{copy.passwordLabel}</Label>
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
            <Label htmlFor="challengeAnswer">{copy.antiSpam}</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium whitespace-nowrap">
                {challenge ? `${challenge.a} + ${challenge.b} =` : copy.antiSpamLoading}
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
                aria-label={copy.refresh}
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
            {isLoading ? copy.submitting : copy.submit}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{copy.orContinue}</span>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/dashboard' })} disabled={isLoading}>
            <GoogleIcon className="mr-2 h-4 w-4" />
            {copy.google}
          </Button>
        </form>
      </div>
  );
}


export default function RegisterPage() {
  const { data: session } = useSession();
  const [locale, setLocale] = useState<RegisterLocale>('en');

  useEffect(() => {
    const preference = ((session?.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
    const detectedLocales =
      typeof navigator !== 'undefined'
        ? (navigator.languages?.length ? navigator.languages : [navigator.language]).filter(Boolean)
        : [];
    const resolved = resolveLocale({
      preference,
      detectedLocales,
      supportedLocales: ['en', 'it'] as const,
      fallback: 'en',
    }) as RegisterLocale;
    setLocale(resolved);
  }, [session?.user]);

  const copy = registerCopy[locale];

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="flex items-center justify-center py-12">
        <Suspense fallback={<div>Loading...</div>}>
          <RegisterForm copy={copy} locale={locale} />
        </Suspense>
      </div>
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-10 text-center">
        <Image
          src="/auth/hero_signin.png"
          alt="Image"
          width="400"
          height="400"
          className="object-contain"
        />
        <h2 className="mt-6 text-3xl font-bold">{copy.welcomeTitle}</h2>
        <p className="mt-2 text-muted-foreground">{copy.welcomeBody}</p>
        <Button asChild className="mt-6">
            <Link href="/signin">{copy.welcomeCta}</Link>
        </Button>
      </div>
    </div>
  );
}
