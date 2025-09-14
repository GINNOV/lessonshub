// file: src/app/components/StudentStatsCard.tsx

interface StudentStatsCardProps {
  totalValue: number;
}

export default function StudentStatsCard({ totalValue }: StudentStatsCardProps) {
  return (
    <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-500">My Progress</h2>
      <div className="mt-2">
        <span className="text-4xl font-bold">
          €{totalValue.toFixed(2)}
        </span>
        <span className="ml-2 text-gray-600">Total Value Earned</span>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Based on graded lessons. Failed lessons deduct value.
      </p>
    </div>
  );
}