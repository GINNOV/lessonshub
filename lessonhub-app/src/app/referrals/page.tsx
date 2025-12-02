import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getReferralDashboardData } from "@/actions/referralActions";
import ReferralShareCard from "../components/ReferralShareCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Wallet,
  PauseCircle,
  Crown,
  Download,
  Link as LinkIcon,
  Percent,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";

type ReferralLocale = "en" | "es" | "it";

const referralCopy: Record<
  ReferralLocale,
  {
    kicker: string;
    title: string;
    subtitle: string;
    teacherBadge: string;
    accordionToggle: string;
    accordionTitle: string;
    accordionSubtitle: string;
    essentialsTitle: string;
    essentials: { title: string; body: string }[];
    stepsTitle: string;
    steps: { title: string; body: string }[];
    statCards: { label: string; helper: string }[];
    reward: {
      badge: string;
      projected: string;
      perReferral: string;
      rewardRate: string;
    };
    referrals: {
      heading: string;
      badge: string;
      descriptionWithReferrals: string;
      descriptionEmpty: string;
      exportCta: string;
      emptyTitle: string;
      emptyDescription: string;
      tableHeadings: {
        student: string;
        status: string;
        plan: string;
        lastSeen: string;
        planPaying: string;
        planFree: string;
      };
    };
    leaderboard: {
      heading: string;
      total: string;
      paying: string;
    };
    status: {
      suspended: string;
      onBreak: string;
      active: string;
      exploring: string;
      notActive: string;
    };
    shareCard: {
      title: string;
      description: string;
      linkLabel: string;
      codeLabel: string;
      copy: string;
      copiedLink: string;
      copiedCode: string;
      copyError: string;
      footer: string;
      shareButton: string;
      shareTitle: string;
      shareText: string;
    };
  }
> = {
  en: {
    kicker: "Referral Program",
    title: "Referral dashboard",
    subtitle:
      "Track the students who joined through your invite link and see how your referrals are helping the community grow.",
    teacherBadge: "Teacher view",
    accordionToggle: "Show / hide referral guide",
    accordionTitle: "How Our Referral Program Works",
    accordionSubtitle:
      "Share your love for learning English and Italian, and earn rewards for every new student you bring to our platform. It’s a win-win!",
    essentialsTitle: "The Essentials",
    essentials: [
      {
        title: "It’s simple",
        body: "Share your unique link. When a student subscribes with it, they’re linked to you.",
      },
      {
        title: "Your earn rate",
        body: "You earn {rewardPercent}% of their subscription every active month.",
      },
      {
        title: "Recurring rewards",
        body: "You keep getting paid for every active month the student stays subscribed.",
      },
      {
        title: "Total transparency",
        body: "Track their status in the table and export a CSV whenever you need.",
      },
    ],
    stepsTitle: "Step-by-Step Guide",
    steps: [
      {
        title: "Copy your link",
        body: "Use your unique referral link (e.g., {referralLink}) or your code (e.g., {referralCode}) shown above.",
      },
      {
        title: "Share it",
        body: "The student enters that code at signup — share it with friends, on social, or anywhere you like.",
      },
      {
        title: "Start earning",
        body: "Once they become a paying subscriber, you automatically earn your percentage every active month.",
      },
    ],
    statCards: [
      { label: "Total referrals", helper: "All sign-ups from your code" },
      { label: "Paying students", helper: "Subscribers you're rewarded for" },
      { label: "On a break", helper: "Paused or catching up" },
    ],
    reward: {
      badge: "Reward balance",
      projected: "Projected monthly share from active subscriptions.",
      perReferral: "Per referral",
      rewardRate: "Reward rate",
    },
    referrals: {
      heading: "Your referrals",
      badge: "Live sync",
      descriptionWithReferrals: "Every referral is tracked below with their latest status.",
      descriptionEmpty: "Your referral list will appear here after the first student signs up.",
      exportCta: "Export CSV",
      emptyTitle: "Waiting for your first referral",
      emptyDescription:
        "Share your link above. Once someone signs up, you'll see their status here instantly.",
      tableHeadings: {
        student: "Student",
        status: "Status",
        plan: "Plan",
        lastSeen: "Last seen",
        planPaying: "Paying",
        planFree: "Free / trial",
      },
    },
    leaderboard: {
      heading: "Student referral leaderboard",
      total: "Total",
      paying: "Paying",
    },
    status: {
      suspended: "Suspended",
      onBreak: "On a break",
      active: "Active",
      exploring: "Exploring",
      notActive: "Not active yet",
    },
    shareCard: {
      title: "Share your invite",
      description:
        "Send the link or code below to let friends keep 100% of their lessons while you collect {percent}% of their monthly payment.",
      linkLabel: "Referral link",
      codeLabel: "Referral code",
      copy: "Copy",
      copiedLink: "Referral link copied",
      copiedCode: "Referral code copied",
      copyError: "Unable to copy. Please copy it manually.",
      footer: "Earn rewards when referred students subscribe. Tracking updates automatically.",
      shareButton: "Share link",
      shareTitle: "Join LessonHUB",
      shareText: "Learn English with LessonHUB. Use my referral link to sign up!",
    },
  },
  es: {
    kicker: "Programa de referidos",
    title: "Panel de referidos",
    subtitle:
      "Sigue a los estudiantes que se unieron con tu enlace y ve cómo tus referidos ayudan a crecer a la comunidad.",
    teacherBadge: "Vista profesor",
    accordionToggle: "Mostrar / ocultar guía de referidos",
    accordionTitle: "Cómo funciona nuestro programa de referidos",
    accordionSubtitle:
      "Comparte tu pasión por aprender inglés e italiano y gana recompensas por cada estudiante nuevo que traigas. Es un ganar-ganar.",
    essentialsTitle: "Lo esencial",
    essentials: [
      {
        title: "Es simple",
        body: "Comparte tu enlace único. Cuando un estudiante se suscribe con él, queda vinculado a ti.",
      },
      {
        title: "Tu tasa de ganancia",
        body: "Ganas el {rewardPercent}% mensual de la suscripción de cada referido activo.",
      },
      {
        title: "Recompensas recurrentes",
        body: "Cobras cada mes activo que el estudiante permanece suscrito, no solo la primera vez.",
      },
      {
        title: "Transparencia total",
        body: "Sigue su estado en la tabla y exporta un CSV cuando lo necesites.",
      },
    ],
    stepsTitle: "Guía paso a paso",
    steps: [
      {
        title: "Copia tu enlace",
        body: "Usa tu enlace único (ej. {referralLink}) o tu código (ej. {referralCode}) que ves arriba.",
      },
      {
        title: "Compártelo",
        body: "El estudiante ingresa ese código al registrarse — compártelo con amigos, redes o donde quieras.",
      },
      {
        title: "Empieza a ganar",
        body: "Cuando se convierta en suscriptor de pago, ganas automáticamente tu porcentaje cada mes activo.",
      },
    ],
    statCards: [
      { label: "Referidos totales", helper: "Todos los registros con tu código" },
      { label: "Estudiantes de pago", helper: "Suscriptores por los que ganas" },
      { label: "En pausa", helper: "Pausados o poniéndose al día" },
    ],
    reward: {
      badge: "Saldo de recompensas",
      projected: "Proyección mensual de suscripciones activas.",
      perReferral: "Por referido",
      rewardRate: "Tasa de recompensa",
    },
    referrals: {
      heading: "Tus referidos",
      badge: "Sincronización en vivo",
      descriptionWithReferrals: "Cada referido se muestra abajo con su estado más reciente.",
      descriptionEmpty: "La lista aparecerá aquí después de tu primer referido.",
      exportCta: "Exportar CSV",
      emptyTitle: "Esperando tu primer referido",
      emptyDescription:
        "Comparte tu enlace. Una vez que alguien se registre, verás su estado al instante.",
      tableHeadings: {
        student: "Estudiante",
        status: "Estado",
        plan: "Plan",
        lastSeen: "Ultima actividad",
        planPaying: "De pago",
        planFree: "Gratis / prueba",
      },
    },
    leaderboard: {
      heading: "Tabla de referidos de estudiantes",
      total: "Total",
      paying: "De pago",
    },
    status: {
      suspended: "Suspendido",
      onBreak: "En pausa",
      active: "Activo",
      exploring: "Explorando",
      notActive: "Aun sin actividad",
    },
    shareCard: {
      title: "Comparte tu invitacion",
      description:
        "Envía el enlace o código y deja que tus amigos guarden el 100% de sus clases mientras tú recibes el {percent}% del pago mensual.",
      linkLabel: "Enlace de referido",
      codeLabel: "Código de referido",
      copy: "Copiar",
      copiedLink: "Enlace copiado",
      copiedCode: "Código copiado",
      copyError: "No se pudo copiar. Hazlo manualmente.",
      footer: "Ganas recompensas cuando los referidos se suscriben. El seguimiento se actualiza solo.",
      shareButton: "Compartir enlace",
      shareTitle: "Únete a LessonHUB",
      shareText: "Aprende inglés con LessonHUB. Usa mi enlace de referido para registrarte.",
    },
  },
  it: {
    kicker: "Programma referral",
    title: "Dashboard referral",
    subtitle:
      "Monitora gli studenti che si sono iscritti con il tuo invito e scopri come i referral fanno crescere la community.",
    teacherBadge: "Vista insegnante",
    accordionToggle: "Mostra / nascondi guida referral",
    accordionTitle: "Come funziona il nostro programma referral",
    accordionSubtitle:
      "Condividi la tua passione per l'inglese e l'italiano e ricevi premi per ogni nuovo studente che porti. Vince chi invita e chi arriva.",
    essentialsTitle: "I punti chiave",
    essentials: [
      {
        title: "E' semplice",
        body: "Condividi il tuo link unico. Quando uno studente si abbona con quello, viene associato a te.",
      },
      {
        title: "La tua percentuale",
        body: "Guadagni il {rewardPercent}% dell'abbonamento per ogni mese attivo.",
      },
      {
        title: "Ricompense ricorrenti",
        body: "Continui a guadagnare per ogni mese in cui lo studente rimane abbonato.",
      },
      {
        title: "Massima trasparenza",
        body: "Segui lo stato nella tabella ed esporta un CSV quando ti serve.",
      },
    ],
    stepsTitle: "Guida passo passo",
    steps: [
      {
        title: "Copia il link",
        body: "Usa il tuo link unico (es. {referralLink}) o il tuo codice (es. {referralCode}) che vedi sopra.",
      },
      {
        title: "Condividilo",
        body: "Lo studente inserisce il codice in fase di registrazione — condividilo con amici, sui social o dove preferisci.",
      },
      {
        title: "Inizia a guadagnare",
        body: "Quando diventa abbonato pagante, ricevi automaticamente la tua percentuale ogni mese attivo.",
      },
    ],
    statCards: [
      { label: "Referral totali", helper: "Tutte le iscrizioni con il tuo codice" },
      { label: "Studenti paganti", helper: "Abbonati per cui ricevi la quota" },
      { label: "In pausa", helper: "Pausa o recupero" },
    ],
    reward: {
      badge: "Saldo ricompense",
      projected: "Stima mensile dagli abbonamenti attivi.",
      perReferral: "Per referral",
      rewardRate: "Percentuale ricompensa",
    },
    referrals: {
      heading: "I tuoi referral",
      badge: "Aggiornamento live",
      descriptionWithReferrals: "Ogni referral e' tracciato qui sotto con lo stato piu' recente.",
      descriptionEmpty: "La lista comparira' qui dopo il primo studente invitato.",
      exportCta: "Esporta CSV",
      emptyTitle: "In attesa del tuo primo referral",
      emptyDescription:
        "Condividi il link sopra. Quando qualcuno si iscrive, vedrai subito il suo stato.",
      tableHeadings: {
        student: "Studente",
        status: "Stato",
        plan: "Piano",
        lastSeen: "Ultimo accesso",
        planPaying: "Pagante",
        planFree: "Gratis / prova",
      },
    },
    leaderboard: {
      heading: "Classifica referral studenti",
      total: "Totale",
      paying: "Paganti",
    },
    status: {
      suspended: "Sospeso",
      onBreak: "In pausa",
      active: "Attivo",
      exploring: "In prova",
      notActive: "Non ancora attivo",
    },
    shareCard: {
      title: "Condividi il tuo invito",
      description:
        "Invia il link o il codice qui sotto: i tuoi amici tengono il 100% delle lezioni e tu ricevi il {percent}% dell'abbonamento mensile.",
      linkLabel: "Link referral",
      codeLabel: "Codice referral",
      copy: "Copia",
      copiedLink: "Link referral copiato",
      copiedCode: "Codice referral copiato",
      copyError: "Impossibile copiare. Per favore copia manualmente.",
      footer: "Guadagni quando gli studenti invitati si abbonano. Il tracking si aggiorna da solo.",
      shareButton: "Condividi link",
      shareTitle: "Unisciti a LessonHUB",
      shareText: "Impara inglese con LessonHUB. Usa il mio link referral per registrarti!",
    },
  },
};

export default async function ReferralDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  const data = await getReferralDashboardData();
  const headerList = await headers();
  const originHeader = headerList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const detectedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ["en", "it", "es"] as const,
    fallback: "en",
  }) as ReferralLocale;
  const copy = referralCopy[locale];
  const sanitizedOrigin = originHeader.endsWith("/")
    ? originHeader.slice(0, -1)
    : originHeader || "";
  const referralLink = `${sanitizedOrigin}/register?ref=${data.viewer.referralCode}`;

  const replaceTokens = (text: string) =>
    text
      .replace("{referralLink}", referralLink)
      .replace("{referralCode}", data.viewer.referralCode)
      .replace("{rewardPercent}", data.reward.percent.toString());

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

  const currencyFormatter = new Intl.NumberFormat(
    locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    },
  );

  const formatLastSeen = (date: Date | null) => {
    if (!date) return copy.status.notActive;
    return dateFormatter.format(date);
  };

  const statusBadge = (referral: {
    isPaying: boolean;
    isTakingBreak: boolean;
    isSuspended: boolean;
  }) => {
    if (referral.isSuspended) {
      return { label: copy.status.suspended, className: "bg-red-50 text-red-700 border-red-200" };
    }
    if (referral.isTakingBreak) {
      return { label: copy.status.onBreak, className: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (referral.isPaying) {
      return { label: copy.status.active, className: "bg-green-50 text-green-700 border-green-200" };
    }
    return { label: copy.status.exploring, className: "bg-slate-50 text-slate-700 border-slate-200" };
  };

  const statCards = [
    {
      ...copy.statCards[0],
      value: data.stats.totalReferrals,
      icon: Users,
    },
    {
      ...copy.statCards[1],
      value: data.stats.payingReferrals,
      icon: Wallet,
    },
    {
      ...copy.statCards[2],
      value: data.stats.pausedReferrals,
      icon: PauseCircle,
    },
  ];

  const essentialIcons = [LinkIcon, Percent, RefreshCw, BarChart3];
  const essentials = copy.essentials.map(({ title, body }, index) => ({
    title,
    body: replaceTokens(body),
    Icon: essentialIcons[index] ?? LinkIcon,
  }));

  const steps = copy.steps.map(({ title, body }) => ({
    title,
    body: replaceTokens(body),
  }));

  const shareCardCopy = {
    ...copy.shareCard,
    description: copy.shareCard.description.replace("{percent}", data.reward.percent.toString()),
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{copy.kicker}</p>
          <h1 className="text-3xl font-bold mt-2">{copy.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {copy.subtitle}
          </p>
        </div>
        {data.viewer.role !== Role.STUDENT && (
          <Badge variant="secondary" className="w-fit">
            {copy.teacherBadge}
          </Badge>
        )}
      </div>

      <Accordion type="single" collapsible defaultValue="how-it-works" className="rounded-xl border bg-muted/40">
        <AccordionItem value="how-it-works" className="border-none">
          <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline justify-between text-sm text-muted-foreground">
            <span className="font-medium">
              {copy.accordionToggle}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 sm:px-6 pb-6">
            <div className="rounded-3xl border border-[#efece2] bg-[#f8f8f5] p-6 sm:p-10 space-y-12">
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-black text-[#111418]">
                  {copy.accordionTitle}
                </h3>
                <p className="text-base text-[#617589] max-w-3xl mx-auto">
                  {copy.accordionSubtitle}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="px-1 text-lg font-semibold text-[#111418]">
                  {copy.essentialsTitle}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {essentials.map(({ title, body, Icon }) => (
                    <div
                      key={title}
                      className="flex h-full flex-col gap-4 rounded-2xl border border-[#e5e2d9] bg-white p-5 shadow-[0_4px_16px_rgba(17,20,24,0.04)]"
                    >
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-base font-semibold text-[#111418]">{title}</h5>
                        <p className="text-sm leading-relaxed text-[#617589]">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <h4 className="px-1 text-lg font-semibold text-[#111418]">
                  {copy.stepsTitle}
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {steps.map(({ title, body }, index) => (
                    <div
                      key={title}
                      className="flex h-full flex-col items-center gap-4 rounded-2xl border border-[#e5e2d9] bg-white p-6 text-center shadow-[0_4px_16px_rgba(17,20,24,0.04)]"
                    >
                      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 text-lg font-semibold">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-base font-semibold text-[#111418]">{title}</h5>
                        <p className="text-sm leading-relaxed text-[#617589]">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-1" id="share-card">
          <ReferralShareCard
            referralLink={referralLink}
            referralCode={data.viewer.referralCode}
            rewardPercent={data.reward.percent}
            copy={shareCardCopy}
          />
        </div>
        {statCards.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <CardTitle className="text-4xl font-semibold">{value}</CardTitle>
              <CardDescription>{helper}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Wallet className="h-4 w-4" />
              {copy.reward.badge}
            </div>
            <CardTitle className="text-4xl font-semibold text-amber-900">
              {currencyFormatter.format(data.reward.estimatedMonthlyReward)}
            </CardTitle>
            <CardDescription>{copy.reward.projected}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-amber-900">
            <div className="flex items-center justify-between">
              <span>{copy.reward.perReferral}</span>
              <span className="font-semibold">
                {currencyFormatter.format(data.reward.monthlySharePerReferral)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{copy.reward.rewardRate}</span>
              <span className="font-semibold">
                {data.reward.percent}% of {currencyFormatter.format(data.reward.monthlyAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{copy.referrals.heading}</h2>
              <Badge variant="outline">{copy.referrals.badge}</Badge>
            </div>
            <p className="text-muted-foreground">
              {data.stats.totalReferrals > 0
                ? copy.referrals.descriptionWithReferrals
                : copy.referrals.descriptionEmpty}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/referrals/export" prefetch={false} className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              {copy.referrals.exportCta}
            </Link>
          </Button>
        </div>
        {data.referrals.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{copy.referrals.emptyTitle}</CardTitle>
              <CardDescription>{copy.referrals.emptyDescription}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px]">{copy.referrals.tableHeadings.student}</TableHead>
                    <TableHead>{copy.referrals.tableHeadings.status}</TableHead>
                    <TableHead>{copy.referrals.tableHeadings.plan}</TableHead>
                    <TableHead className="hidden md:table-cell">{copy.referrals.tableHeadings.lastSeen}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.referrals.map((referral) => {
                    const badge = statusBadge(referral);
                    return (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="font-medium">{referral.name ?? referral.email}</div>
                          <div className="text-sm text-muted-foreground">{referral.email}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {referral.isPaying
                            ? copy.referrals.tableHeadings.planPaying
                            : copy.referrals.tableHeadings.planFree}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatLastSeen(referral.lastSeen)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {data.leaderboard.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-semibold">{copy.leaderboard.heading}</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{copy.referrals.tableHeadings.student}</TableHead>
                    <TableHead>{copy.leaderboard.total}</TableHead>
                    <TableHead>{copy.leaderboard.paying}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leaderboard.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.name ?? entry.email}</div>
                        <div className="text-sm text-muted-foreground">{entry.email}</div>
                      </TableCell>
                      <TableCell>{entry.totalReferrals}</TableCell>
                      <TableCell>{entry.payingReferrals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

    </div>
  );
}
