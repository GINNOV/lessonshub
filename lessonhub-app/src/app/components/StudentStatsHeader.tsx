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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudentStatsHeaderProps {
  totalValue: number;
  total: number;
  pending: number;
  submitted: number;
  graded: number;
  failed: number;
  settings: {
    progressCardTitle?: string | null;
    progressCardBody?: string | null;
    progressCardLinkText?: string | null;
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
  settings,
}: StudentStatsHeaderProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* The "Hero" Card for My Progress */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-lg lg:col-span-1">
        <TrendingUp className="absolute top-4 right-4 h-16 w-16 text-white/10" />
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
                <InvestDialog linkText={settings?.progressCardLinkText || 'Invest in your future - watch now'} />
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Info className="h-5 w-5 text-gray-400 hover:text-white" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Quanto avresti speso con un metodo di insegnamento tradizionale. Che affare!</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>

      {/* The Professional Assignment Summary Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-600">
            Assignment Summary
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-5">
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