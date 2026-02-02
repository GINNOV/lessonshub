// file: src/app/extras/ExtrasDashboard.tsx
'use client';

import { useMemo, useState } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import {
  BookOpen,
  CalendarClock,
  Gift,
  Mail,
  MessageCircle,
  MessagesSquare,
  Settings,
  Sparkles,
  Star,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { navCopy, NavLocale } from '@/lib/navCopy';
import { cn } from '@/lib/utils';
import FeedbackDialog from '@/app/components/FeedbackDialog';
import TeacherClassNotesDialog from '@/app/components/TeacherClassNotesDialog';
import RateTeacherDialog from '@/app/components/RateTeacherDialog';
import WhatsNewDialog, { requestWhatsNewDialog } from '@/app/components/WhatsNewDialog';
import type { WhatsNewPayload, WhatsNewLocale } from '@/lib/whatsNew';

type ExtrasUser = {
  role: Role;
  hasAdminPortalAccess?: boolean | null;
  name?: string | null;
};

type ExtrasDashboardProps = {
  user: ExtrasUser;
  locale: NavLocale;
  whatsNewNotes: Partial<Record<WhatsNewLocale, WhatsNewPayload | null>>;
  whatsNewLocale: WhatsNewLocale;
};

type ExtrasTile = {
  key: string;
  label: string;
  icon: ElementType;
  colorClass: string;
  iconClass: string;
  href?: string;
  onClick?: () => void;
  visible?: boolean;
};

const baseTileClass =
  'block w-full rounded-xl border p-8 text-center shadow-sm transition-shadow hover:shadow-lg';

export default function ExtrasDashboard({
  user,
  locale,
  whatsNewNotes,
  whatsNewLocale,
}: ExtrasDashboardProps) {
  const copy = navCopy[locale];
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isClassNotesDialogOpen, setIsClassNotesDialogOpen] = useState(false);
  const [isRateTeacherDialogOpen, setIsRateTeacherDialogOpen] = useState(false);

  const hasAdminAccess = user.role === Role.ADMIN || Boolean(user.hasAdminPortalAccess);

  const tiles = useMemo<ExtrasTile[]>(() => {
    const list: ExtrasTile[] = [];

    if (user.role === Role.ADMIN) {
      list.push(
        {
          key: 'admin-users',
          label: copy.userManagement,
          icon: Users,
          href: '/admin/users',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-teal-400/60 hover:shadow-[0_10px_30px_rgba(45,212,191,0.18)]',
          iconClass: 'text-teal-300',
        },
        {
          key: 'admin-lessons',
          label: copy.lessonManagement,
          icon: BookOpen,
          href: '/admin/lessons',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-violet-400/60 hover:shadow-[0_10px_30px_rgba(167,139,250,0.18)]',
          iconClass: 'text-violet-300',
        },
        {
          key: 'admin-emails',
          label: copy.emailEditor,
          icon: Mail,
          href: '/admin/emails',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-emerald-400/60 hover:shadow-[0_10px_30px_rgba(52,211,153,0.18)]',
          iconClass: 'text-emerald-300',
        },
        {
          key: 'admin-settings',
          label: copy.dashboardSettings,
          icon: Settings,
          href: '/admin/settings',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-amber-400/60 hover:shadow-[0_10px_30px_rgba(251,191,36,0.18)]',
          iconClass: 'text-amber-300',
        },
        {
          key: 'admin-cron',
          label: copy.cronTestPage,
          icon: CalendarClock,
          href: '/admin/cron',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-rose-400/60 hover:shadow-[0_10px_30px_rgba(251,113,133,0.18)]',
          iconClass: 'text-rose-300',
        },
        {
          key: 'admin-referrals',
          label: copy.referralDashboard,
          icon: Gift,
          href: '/admin/referrals',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-emerald-400/60 hover:shadow-[0_10px_30px_rgba(52,211,153,0.18)]',
          iconClass: 'text-emerald-300',
        }
      );
    }

    if (hasAdminAccess && user.role !== Role.ADMIN) {
      list.push({
        key: 'admin-dashboard',
        label: copy.adminDashboard,
        icon: Settings,
        href: '/admin',
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-sky-400/60 hover:shadow-[0_10px_30px_rgba(56,189,248,0.18)]',
        iconClass: 'text-sky-300',
      });
    }

    if (user.role === Role.TEACHER) {
      list.push(
        {
          key: 'manage-classes',
          label: copy.manageClasses,
          icon: Users,
          href: '/dashboard/classes',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-teal-400/60 hover:shadow-[0_10px_30px_rgba(45,212,191,0.18)]',
          iconClass: 'text-teal-300',
        },
        {
          key: 'teacher-settings',
          label: copy.settings,
          icon: Settings,
          href: '/dashboard/settings',
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-amber-400/60 hover:shadow-[0_10px_30px_rgba(251,191,36,0.18)]',
          iconClass: 'text-amber-300',
        },
        {
          key: 'send-notes',
          label: copy.sendNotes,
          icon: MessageCircle,
          onClick: () => setIsClassNotesDialogOpen(true),
          colorClass:
            'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-indigo-400/60 hover:shadow-[0_10px_30px_rgba(99,102,241,0.18)]',
          iconClass: 'text-indigo-300',
        }
      );
    }

    list.push(
      {
        key: 'marketplace',
        label: copy.marketplace,
        icon: Store,
        href: '/marketplace',
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-amber-400/60 hover:shadow-[0_10px_30px_rgba(251,191,36,0.18)]',
        iconClass: 'text-amber-300',
      },
      {
        key: 'my-finance',
        label: copy.myFinance,
        icon: Wallet,
        href: '/myfinance',
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-emerald-400/60 hover:shadow-[0_10px_30px_rgba(52,211,153,0.18)]',
        iconClass: 'text-emerald-300',
      },
      {
        key: 'referrals',
        label: copy.referralDashboard,
        icon: Gift,
        href: '/referrals',
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-cyan-400/60 hover:shadow-[0_10px_30px_rgba(34,211,238,0.18)]',
        iconClass: 'text-cyan-300',
      }
    );

    if (user.role !== Role.TEACHER) {
      list.push({
        key: 'send-feedback',
        label: copy.sendFeedback,
        icon: MessagesSquare,
        onClick: () => setIsFeedbackDialogOpen(true),
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-fuchsia-400/60 hover:shadow-[0_10px_30px_rgba(232,121,249,0.18)]',
        iconClass: 'text-fuchsia-300',
      });
    }

    if (user.role === Role.STUDENT) {
      list.push({
        key: 'rate-teacher',
        label: copy.rateTeacher,
        icon: Star,
        onClick: () => setIsRateTeacherDialogOpen(true),
        colorClass:
          'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-yellow-400/60 hover:shadow-[0_10px_30px_rgba(250,204,21,0.18)]',
        iconClass: 'text-yellow-300',
      });
    }

    list.push({
      key: 'whats-new',
      label: copy.whatsNew,
      icon: Sparkles,
      onClick: () => requestWhatsNewDialog(whatsNewLocale),
      colorClass:
        'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-sky-400/60 hover:shadow-[0_10px_30px_rgba(56,189,248,0.18)]',
      iconClass: 'text-sky-300',
    });

    return list;
  }, [copy, hasAdminAccess, user.role, whatsNewLocale]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{copy.extrasTitle}</h1>
        <p className="mt-1 text-sm text-slate-400">{copy.extrasSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const content = (
            <div className="flex flex-col items-center gap-3">
              <tile.icon className={cn('h-10 w-10', tile.iconClass)} />
              <span className="text-lg font-semibold">{tile.label}</span>
            </div>
          );

          if (tile.href) {
            return (
              <Link
                key={tile.key}
                href={tile.href}
                className={cn(baseTileClass, tile.colorClass)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              className={cn(baseTileClass, tile.colorClass)}
            >
              {content}
            </button>
          );
        })}
      </div>

      <WhatsNewDialog notes={whatsNewNotes} defaultLocale={whatsNewLocale} />
      <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
      {user.role === Role.STUDENT && (
        <RateTeacherDialog
          open={isRateTeacherDialogOpen}
          onOpenChange={setIsRateTeacherDialogOpen}
          copy={
            locale === 'it'
              ? {
                  title: 'Valuta il tuo insegnante',
                  description:
                    "Le tue risposte restano anonime agli insegnanti. Gli amministratori revisionano i feedback per mantenere alta la qualità delle lezioni.",
                  chooseTeacher: 'Scegli un insegnante',
                  loadingTeachers: 'Caricamento...',
                  noTeachers: 'Nessun insegnante trovato',
                  overallLabel: 'Impressione generale:',
                  commentsLabel: 'Qualcos’altro?',
                  commentsPlaceholder:
                    'Condividi punti di forza o aspetti da migliorare. Sii breve e specifico.',
                  cancel: 'Annulla',
                  submit: 'Invia valutazione',
                  submitting: 'Invio...',
                  ratingFields: {
                    contentQuality: 'Qualità dei contenuti',
                    helpfulness: 'Disponibilità',
                    communication: 'Comunicazione',
                    valueForMoney: 'Rapporto qualità/prezzo',
                  },
                  toastLoadError: 'Impossibile caricare la lista insegnanti. Riprova.',
                  toastSelectTeacher: 'Seleziona un insegnante da valutare.',
                  toastSubmitSuccess: 'Grazie per il tuo feedback.',
                  toastSubmitError: 'Impossibile inviare la valutazione al momento.',
                }
              : undefined
          }
        />
      )}
      {user.role === Role.TEACHER && (
        <TeacherClassNotesDialog
          open={isClassNotesDialogOpen}
          onOpenChange={setIsClassNotesDialogOpen}
        />
      )}
    </div>
  );
}
