// file: src/app/components/StudentScorecard.tsx
'use client';

import {
  Clock,
  CircleCheckBig,
  FileBadge,
  FileX,
  ClipboardList,
} from 'lucide-react';

interface StudentScorecardProps {
  total: number;
  pending: number;
  completed: number;
  graded: number;
  failed: number;
}

// A small helper component for each individual stat block
const StatItem = ({
  icon: Icon,
  label,
  value,
  colorClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClassName: string;
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-full p-2 ${colorClassName}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
};

export default function StudentScorecard({
  total,
  pending,
  completed,
  graded,
  failed,
}: StudentScorecardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-medium text-gray-500">
        Assignment Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatItem
          icon={ClipboardList}
          label="Total"
          value={total}
          colorClassName="bg-gray-400"
        />
        <StatItem
          icon={Clock}
          label="Pending"
          value={pending}
          colorClassName="bg-yellow-500"
        />
        <StatItem
          icon={CircleCheckBig}
          label="Submitted"
          value={completed}
          colorClassName="bg-blue-500"
        />
        <StatItem
          icon={FileBadge}
          label="Graded"
          value={graded}
          colorClassName="bg-green-500"
        />
        {failed > 0 && (
          <StatItem
            icon={FileX}
            label="Failed"
            value={failed}
            colorClassName="bg-red-500"
          />
        )}
      </div>
    </div>
  );
}