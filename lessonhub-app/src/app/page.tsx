// file: src/app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Languages,
  Lock,
  MessageCircle,
} from 'lucide-react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { Lexend, Lora } from 'next/font/google'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' })

type Step = { title: string; description: string; icon: React.ComponentType<{ className?: string }> }
type Benefit = { title: string; description: string }
type Testimonial = { quote: string; name: string; subtitle: string; image: string; alt: string }
type Copy = {
  heroTagline: string
  heroTitle: string
  heroSubtitle: string
  heroSecondaryCta: string
  heroLoginCta: string
  heroBadge: string
  howTagline: string
  howTitle: string
  steps: Step[]
  benefitsTagline: string
  benefitsTitle: string
  benefitsSubtitle: string
  benefits: Benefit[]
  testimonialsTagline: string
  testimonialsTitle: string
  testimonials: Testimonial[]
  finalCtaTitle: string
  finalCtaSubtitle: string
  finalCtaButton: string
  finalCtaBadge: string
}

function getCopy(isItalian: boolean): Copy {
  if (isItalian) {
    return {
      heroTagline: '',
      heroTitle: 'Meno grammatica e molti piu esempi di vita reale.',
      heroSubtitle:
        'La piattaforma flessibile e divertente per imparare le lingue pensata per chi ha una vita piena. Non è mai troppo tardi per iniziare una nuova avventura.',
      heroSecondaryCta: 'Scopri come funziona',
      heroLoginCta: 'Hai già un account? Accedi',
      heroBadge: 'Nessuna carta di credito richiesta',
      howTagline: 'Come funziona',
      howTitle: 'Il tuo percorso verso la fluidità in 3 semplici passi',
      steps: [
        {
          title: '1. Scegli la tua lingua',
          description: 'Seleziona tra decine di lingue e trova quella perfetta per il tuo prossimo viaggio o obiettivo.',
          icon: Languages,
        },
        {
          title: '2. Impara ai tuoi ritmi',
          description:
            'Lezioni brevi che si adattano alla tua giornata, che tu abbia 5 minuti in metro o un’ora sul divano.',
          icon: Clock3,
        },
        {
          title: '3. Parla con sicurezza',
          description: 'Fai pratica con conversazioni reali e acquisisci la sicurezza per parlare con chiunque, ovunque.',
          icon: MessageCircle,
        },
      ],
      benefitsTagline: 'Perché LessonHUB?',
      benefitsTitle: 'Più di una lingua, è una nuova te',
      benefitsSubtitle:
        'Imparare una nuova lingua è una delle esperienze più gratificanti. La nostra piattaforma è pensata per chi ha una vita intensa: efficace, coinvolgente, concreta.',
      benefits: [
        {
          title: 'Allena il cervello',
          description: 'Gli studi mostrano che imparare una lingua migliora memoria, problem solving e funzioni cognitive.',
        },
        {
          title: 'Viaggia con più connessioni',
          description: 'Ordina, chiedi indicazioni e parla con i locali in modo naturale durante i tuoi viaggi.',
        },
        {
          title: 'Connettiti con la famiglia',
          description: "Parla con i tuoi cari nella loro lingua e riscopri le radici di famiglia.",
        },
      ],
      testimonialsTagline: 'Testimonianze',
      testimonialsTitle: 'Le storie di chi ci è riuscito',
      testimonials: [
        {
          quote:
            'Sto finalmente imparando lo spagnolo per il mio viaggio a 55 anni! LessonHUB ha reso tutto semplice e posso esercitarmi in pausa pranzo. Mi sento molto più sicura.',
          name: 'Brenda T.',
          subtitle: '55 anni',
          image: '/home/testimonial1.jpg',
          alt: 'Ritratto di Brenda, una donna sorridente',
        },
        {
          quote:
            'I miei nipoti vivono in Italia e ho sempre voluto parlare con loro nella loro lingua. Le lezioni sono pratiche e puntano alla conversazione reale. È un viaggio meraviglioso.',
          name: 'Robert M.',
          subtitle: '62 anni',
          image: '/home/testimonial2.jpg',
          alt: 'Ritratto di Robert, un uomo sorridente',
        },
      ],
      finalCtaTitle: 'Pronto a iniziare il tuo viaggio?',
      finalCtaSubtitle:
        'Non c’è momento migliore per investire su di te. Inizia oggi la prova gratuita e scopri quanto è semplice e gratificante imparare una nuova lingua.',
      finalCtaButton: 'Inizia la prova gratuita',
      finalCtaBadge: 'Prova gratuita al 100% — senza carta di credito',
    }
  }

  return {
    heroTagline: '',
    heroTitle: 'Way less grammar and lots more real life examples.',
    heroSubtitle:
      'The fun and flexible language learning platform designed for busy adults. It’s never too late to start a new adventure.',
    heroSecondaryCta: 'See How It Works',
    heroLoginCta: 'Already have an account? Sign in',
    heroBadge: 'No Credit Card Required',
    howTagline: 'How It Works',
    howTitle: 'Your Journey to Fluency in 3 Simple Steps',
    steps: [
      {
        title: '1. Choose Your Language',
        description: 'Select from dozens of languages and find the perfect one for your next adventure or personal goal.',
        icon: Languages,
      },
      {
        title: '2. Learn On Your Schedule',
        description: 'Bite-sized lessons fit into your life, whether you have 5 minutes on your commute or an hour to relax.',
        icon: Clock3,
      },
      {
        title: '3. Speak with Confidence',
        description: 'Practice with real conversations and gain the skills to talk to anyone, anywhere.',
        icon: MessageCircle,
      },
    ],
    benefitsTagline: 'Why LessonHUB?',
    benefitsTitle: "More Than a Language, It's a New You",
    benefitsSubtitle:
      'Learning a new language is one of the most rewarding things you can do. Our platform is designed specifically for mature learners to make the experience enjoyable and effective.',
    benefits: [
      {
        title: 'Boost Your Brain Health',
        description: 'Studies show language learning improves memory, problem-solving, and cognitive function.',
      },
      {
        title: 'Enrich Your Travels',
        description: 'Order food, ask for directions, and connect with locals on a deeper level during your next trip.',
      },
      {
        title: 'Connect with Family',
        description: "Speak with relatives in their native tongue and reconnect with your family's heritage.",
      },
    ],
    testimonialsTagline: 'Testimonials',
    testimonialsTitle: 'Hear From Learners Like You',
    testimonials: [
      {
        quote:
          "I'm finally learning Spanish for my trip to Spain at 55! LessonHUB made it so easy to get started and I can practice on my lunch breaks. I feel so much more confident.",
        name: 'Brenda T.',
        subtitle: 'Age 55',
        image: '/home/testimonial1.jpg',
        alt: 'Portrait of Brenda, a smiling woman',
      },
      {
        quote:
          "My grandchildren live in Italy, and I always wanted to speak with them in their own language. The lessons are practical and focus on real conversation. It's been a wonderful journey.",
        name: 'Robert M.',
        subtitle: 'Age 62',
        image: '/home/testimonial2.jpg',
        alt: 'Portrait of Robert, a smiling man',
      },
    ],
    finalCtaTitle: 'Ready to Start Your Journey?',
    finalCtaSubtitle:
      'There\'s no better time than now to invest in yourself. Start your free trial today and see how easy and rewarding learning a new language can be.',
    finalCtaButton: 'Start My Free Trial',
    finalCtaBadge: '100% Free Trial — No Credit Card Needed',
  }
}

type LandingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined> | Record<string, string | string[] | undefined>>
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const session = await auth()
  const headersList = await headers()
  const resolvedSearchParams = await searchParams
  const acceptLanguage = headersList.get('accept-language') || ''
  const langParamRaw = Array.isArray(resolvedSearchParams?.lang)
    ? resolvedSearchParams?.lang[0]
    : resolvedSearchParams?.lang
  const normalizedLang = langParamRaw?.toLowerCase()
  const isItalianParam = normalizedLang?.startsWith('it')
  const isEnglishParam = normalizedLang?.startsWith('en')
  const isItalian =
    isItalianParam ?? (!isEnglishParam && (/\bit\b/i.test(acceptLanguage.split(',')[0] || '') || /\bit[-_]/i.test(acceptLanguage)))
  const copy = getCopy(isItalian)

  if (session?.user) {
    if (session.user.role === Role.TEACHER || session.user.role === Role.ADMIN) {
      redirect('/dashboard')
    } else if (session.user.role === Role.STUDENT) {
      redirect('/my-lessons')
    }
  }

  return (
    <div
      className={`relative left-1/2 w-screen -translate-x-1/2 transform overflow-hidden bg-[#0d1528] text-slate-100 ${lexend.className}`}
    >
      <Hero copy={copy} />
      <HowItWorks copy={copy} />
      <Benefits copy={copy} />
      <Testimonials copy={copy} />
      <CtaBanner copy={copy} />
    </div>
  )
}

function Hero({ copy }: { copy: Copy }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <Image src="/home/hero.jpg" alt="Adventurous learner exploring with a map" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-[#0d1528]/65 to-[#0d1528]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1528]/60 via-transparent to-[#0d1528]/40" />
      </div>
      <div className="relative mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:py-20">
        {copy.heroTagline ? (
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-amber-300/90">{copy.heroTagline}</p>
        ) : null}
        <h1
          className={`${lora.className} text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl`}
        >
          {copy.heroTitle}
        </h1>
        <p className="max-w-2xl text-lg text-[#A0AEC0] sm:text-xl">{copy.heroSubtitle}</p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100 transition hover:text-white"
          >
            {copy.heroSecondaryCta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Link
          href="/signin"
          className="text-sm font-semibold text-amber-100 transition hover:text-white"
        >
          {copy.heroLoginCta}
        </Link>
        <p className="flex items-center gap-2 text-sm font-medium text-[#A0AEC0]">
          <Lock className="h-4 w-4" />
          {copy.heroBadge}
        </p>
      </div>
    </section>
  )
}

function HowItWorks({ copy }: { copy: Copy }) {
  return (
    <section id="how-it-works" className="bg-[#0d1528] py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#D69E2E]">{copy.howTagline}</p>
          <h2 className={`${lora.className} mt-2 text-3xl font-bold text-white sm:text-4xl`}>
            {copy.howTitle}
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {copy.steps.map((step) => (
            <Card key={step.title} className="border-white/10 bg-white/5 shadow-xl backdrop-blur">
              <CardContent className="flex h-full flex-col items-center gap-4 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D69E2E]/20 text-[#D69E2E]">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  <p className="text-base leading-relaxed text-[#A0AEC0]">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function Benefits({ copy }: { copy: Copy }) {
  return (
    <section id="benefits" className="bg-[#1c2638] py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2 lg:gap-20">
        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-amber-300/10 blur-3xl" />
          <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl shadow-2xl shadow-black/40">
            <Image
              src="/home/teacher.jpg"
              alt="Friendly language teacher"
              fill
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 320px, 90vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#D69E2E]">{copy.benefitsTagline}</p>
          <h2 className={`${lora.className} text-3xl font-bold text-white sm:text-4xl`}>
            {copy.benefitsTitle}
          </h2>
          <p className="text-lg text-[#A0AEC0]">{copy.benefitsSubtitle}</p>
          <ul className="mt-4 space-y-4">
            {copy.benefits.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#D69E2E]/20 text-[#D69E2E]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <h4 className="font-bold text-white">{item.title}</h4>
                  <p className="text-[#A0AEC0]">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Testimonials({ copy }: { copy: Copy }) {
  return (
    <section id="testimonials" className="bg-[#0d1528] py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#D69E2E]">{copy.testimonialsTagline}</p>
          <h2 className={`${lora.className} mt-2 text-3xl font-bold text-white sm:text-4xl`}>
            {copy.testimonialsTitle}
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {copy.testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-white/10 bg-white/5 shadow-xl backdrop-blur">
              <CardContent className="flex h-full flex-col gap-6 p-8">
                <p className={`${lora.className} text-xl italic leading-relaxed text-white`}>&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full">
                    <Image src={testimonial.image} alt={testimonial.alt} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-sm text-[#A0AEC0]">{testimonial.subtitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaBanner({ copy }: { copy: Copy }) {
  return (
    <section className="bg-[#D69E2E] py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center text-[#1A202C]">
        <h2 className={`${lora.className} text-3xl font-bold sm:text-4xl`}>{copy.finalCtaTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[#1A202C]/80">{copy.finalCtaSubtitle}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-lg bg-[#1A202C] px-6 text-base font-bold text-white transition-transform hover:scale-[1.02]"
          >
            <Link href="/register">{copy.finalCtaButton}</Link>
          </Button>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#1A202C]">
            <Lock className="h-4 w-4" />
            {copy.finalCtaBadge}
          </p>
        </div>
      </div>
    </section>
  )
}
