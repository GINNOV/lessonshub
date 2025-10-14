// file: src/app/components/StudentStatsHeader.tsx
'use client';

import {
  ClipboardList,
  Clock,
  CircleCheckBig,
  FileBadge,
  TrendingUp,
  Info,
  XCircle
} from 'lucide-react';
import InvestDialog from './InvestDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StudentStatsHeaderProps {
  totalValue: number;
  total: number;
  pending: number;
  submitted: number;
  graded: number;
  failed: number;
  pastDue: number;
  settings: {
    progressCardTitle?: string | null;
    progressCardBody?: string | null;
    progressCardLinkText?: string | null;
    progressCardLinkUrl?: string | null;
    assignmentSummaryFooter?: string | null;
  } | null;
}

// A sleek, reusable component for each individual stat in the summary
const StatItem = ({
  icon: Icon,
  value,
  label,
  colorClassName,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  colorClassName: string;
}) => (
  <div className="flex items-center gap-4">
    <Icon className={`h-7 w-7 ${colorClassName}`} />
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function StudentStatsHeader({
  totalValue,
  total,
  pending,
  submitted,
  graded,
  failed,
  pastDue,
  settings,
}: StudentStatsHeaderProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* The "Hero" Card for My Progress */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-lg lg:col-span-1">
        <TrendingUp className="absolute top-4 right-4 h-16 w-16 text-white/60 drop-shadow-md" />
        <div className="flex h-full flex-col justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-300">{settings?.progressCardTitle || 'My Progress'}</h3>
            <p className="mt-2 text-5xl font-bold tracking-tight">
              €{totalValue.toFixed(2)}
            </p>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            {settings?.progressCardBody || 'Total value from all graded lessons.'}
            <div className="mt-2">
                <span>💰</span>
                <InvestDialog
                  linkText={settings?.progressCardLinkText || 'Invest in your future - watch now'}
                  videoUrl={settings?.progressCardLinkUrl || "https://www.youtube.com/embed/kd8zMU3kd0s?si=j0X6hdJqhcXDYn3g&amp;controls=0"}
                />
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4">
          <Dialog>
            <DialogTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-white rounded-full">
                <Info className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>About &quot;My Progress&quot;</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p>Quanto avresti speso con un metodo di insegnamento tradizionale. Che affare!</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* The Professional Assignment Summary Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-600">
            Assignment Summary
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-6">
            <StatItem
              icon={ClipboardList}
              value={total}
              label="Total"
              colorClassName="text-gray-400"
            />
            <StatItem
              icon={Clock}
              value={pending}
              label="Pending"
              colorClassName="text-yellow-500"
            />
            <StatItem
              icon={CircleCheckBig}
              value={submitted}
              label="Submitted"
              colorClassName="text-blue-500"
            />
            <StatItem
              icon={FileBadge}
              value={graded}
              label="Graded"
              colorClassName="text-green-500"
            />
            <StatItem
              icon={Clock}
              value={pastDue}
              label="Past Due"
              colorClassName="text-red-500"
            />
            <StatItem
              icon={XCircle}
              value={failed}
              label="Failed"
              colorClassName="text-red-500"
            />
          </div>
        </div>
        {settings?.assignmentSummaryFooter && (
          <div className="mt-4 text-sm text-gray-500 border-t pt-4">
            {settings.assignmentSummaryFooter}
          </div>
        )}
      </div>
    </div>
  );
}
