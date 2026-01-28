import {
  Users,
  BookOpen,
  Mail,
  Settings,
  Timer,
  UserCircle2,
  BarChart3,
  Ticket,
  Gift,
  Award,
  LayoutPanelTop,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type AdminTile = {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
  iconClass: string;
  primary?: boolean;
};

export const ADMIN_TILES: AdminTile[] = [
  { href: '/admin/users', label: 'User Management', icon: Users, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-teal-400/60 hover:shadow-[0_10px_30px_rgba(45,212,191,0.18)]', iconClass: 'text-teal-300' },
  { href: '/admin/lessons', label: 'Lesson Management', icon: BookOpen, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-violet-400/60 hover:shadow-[0_10px_30px_rgba(167,139,250,0.18)]', iconClass: 'text-violet-300' },
  { href: '/admin/emails', label: 'Email Editor', icon: Mail, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-emerald-400/60 hover:shadow-[0_10px_30px_rgba(52,211,153,0.18)]', iconClass: 'text-emerald-300' },
  { href: '/admin/settings', label: 'Dashboard Settings', icon: Settings, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-amber-400/60 hover:shadow-[0_10px_30px_rgba(251,191,36,0.18)]', iconClass: 'text-amber-300' },
  { href: '/admin/cron', label: 'Cron Test Page', icon: Timer, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-rose-400/60 hover:shadow-[0_10px_30px_rgba(251,113,133,0.18)]', iconClass: 'text-rose-300' },
  { href: '/admin/coupons', label: 'Coupon Management', icon: Ticket, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-cyan-400/60 hover:shadow-[0_10px_30px_rgba(34,211,238,0.18)]', iconClass: 'text-cyan-300' },
  { href: '/admin/feedback', label: 'Feedback & Analytics', icon: BarChart3, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-indigo-400/60 hover:shadow-[0_10px_30px_rgba(99,102,241,0.18)]', iconClass: 'text-indigo-300' },
  { href: '/admin/banners', label: 'Student Banner', icon: LayoutPanelTop, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-sky-400/60 hover:shadow-[0_10px_30px_rgba(56,189,248,0.18)]', iconClass: 'text-sky-300' },
  { href: '/admin/awards', label: 'Awards & Badges', icon: Award, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-amber-400/70 hover:shadow-[0_10px_30px_rgba(251,191,36,0.18)]', iconClass: 'text-amber-300' },
  { href: '/admin/referrals', label: 'Referral Dashboard', icon: Gift, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-emerald-400/60 hover:shadow-[0_10px_30px_rgba(52,211,153,0.18)]', iconClass: 'text-emerald-300' },
  { href: '/profile', label: 'Profile', icon: UserCircle2, color: 'bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 text-slate-100 hover:border-slate-400/60 hover:shadow-[0_10px_30px_rgba(148,163,184,0.18)]', iconClass: 'text-slate-300', primary: true },
];
