// file: src/app/components/WeekDivider.tsx

export default function WeekDivider({ weekNumber }: { weekNumber: number }) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-gray-50 px-2 text-sm text-gray-400">
          🗓️ Week {weekNumber} ⬇️
        </span>
      </div>
    </div>
  );
}