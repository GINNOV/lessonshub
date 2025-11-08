import {
  Users,
  BookOpen,
  Mail,
  Settings,
  Timer,
  UserCircle2,
  BarChart3,
  Ticket,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type AdminTile = {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

export const ADMIN_TILES: AdminTile[] = [
  { href: '/admin/users', label: 'User Management', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { href: '/admin/lessons', label: 'Lesson Management', icon: BookOpen, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { href: '/admin/emails', label: 'Email Editor', icon: Mail, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { href: '/admin/settings', label: 'Dashboard Settings', icon: Settings, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { href: '/admin/cron', label: 'Cron Test Page', icon: Timer, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { href: '/admin/coupons', label: 'Coupon Management', icon: Ticket, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { href: '/admin/feedback', label: 'Feedback & Analytics', icon: BarChart3, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { href: '/profile', label: 'Profile', icon: UserCircle2, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];
