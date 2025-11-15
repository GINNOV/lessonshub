import Link from "next/link";

type LoginHistoryEntry = {
  id: string;
  timestamp: string;
  lessonId: string | null;
  lessonTitle: string | null;
  studentName?: string | null;
};

interface LoginHistoryCardProps {
  entries: LoginHistoryEntry[];
  title?: string;
  emptyMessage?: string;
  getLessonHref?: (lessonId: string) => string | null;
}

const dateFormatter =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

const timeFormatter =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

export default function LoginHistoryCard({
  entries,
  title = "Recent logins",
  emptyMessage = "No login activity yet.",
  getLessonHref,
}: LoginHistoryCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map(entry => {
            const timestamp = new Date(entry.timestamp);
            const formattedDate = dateFormatter ? dateFormatter.format(timestamp) : timestamp.toDateString();
            const formattedTime = timeFormatter ? timeFormatter.format(timestamp) : timestamp.toLocaleTimeString();
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {formattedDate} · {formattedTime}
                  </p>
                  {entry.studentName && (
                    <p className="text-xs text-slate-600">Student: {entry.studentName}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Lesson used: {entry.lessonTitle ? entry.lessonTitle : "Not recorded"}
                  </p>
                </div>
                {entry.lessonId && getLessonHref && getLessonHref(entry.lessonId) && (
                  <Link
                    href={getLessonHref(entry.lessonId)!}
                    className="text-xs font-semibold text-indigo-600 underline"
                  >
                    View lesson
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
