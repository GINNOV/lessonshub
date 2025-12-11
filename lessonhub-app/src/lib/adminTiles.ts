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
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type AdminTile = {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

export const ADMIN_TILES: AdminTile[] = [
  { href: '/admin/users', label: 'User Management', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { href: '/admin/lessons', label: 'Lesson Management', icon: BookOpen, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
  { href: '/admin/emails', label: 'Email Editor', icon: Mail, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { href: '/admin/settings', label: 'Dashboard Settings', icon: Settings, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  { href: '/admin/cron', label: 'Cron Test Page', icon: Timer, color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800' },
  { href: '/admin/coupons', label: 'Coupon Management', icon: Ticket, color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800' },
  { href: '/admin/feedback', label: 'Feedback & Analytics', icon: BarChart3, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800' },
  { href: '/admin/referrals', label: 'Referral Dashboard', icon: Gift, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { href: '/profile', label: 'Profile', icon: UserCircle2, color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800' },
];
