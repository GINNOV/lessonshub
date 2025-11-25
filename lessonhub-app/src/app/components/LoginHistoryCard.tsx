import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  const groupedByStudent = entries.reduce<Map<string, { dayKey: string; dayLabel: string; entry: LoginHistoryEntry; timestamp: Date }[]>>((acc, entry) => {
    const studentName = entry.studentName || "Student";
    const timestamp = new Date(entry.timestamp);
    const dayKey = timestamp.toISOString().slice(0, 10);
    const dayLabel = dateFormatter ? dateFormatter.format(timestamp) : timestamp.toDateString();

    const existing = acc.get(studentName) ?? [];
    existing.push({ dayKey, dayLabel, entry, timestamp });
    acc.set(studentName, existing);
    return acc;
  }, new Map());

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <Accordion type="multiple" className="mt-4">
          {Array.from(groupedByStudent.entries()).map(([studentName, studentEntries]) => {
            const groupedByDay = studentEntries.reduce<{ dayKey: string; dayLabel: string; items: typeof studentEntries }[]>((days, item) => {
              const existingDay = days.find((day) => day.dayKey === item.dayKey);
              if (existingDay) {
                existingDay.items.push(item);
                return days;
              }
              return [...days, { dayKey: item.dayKey, dayLabel: item.dayLabel, items: [item] }];
            }, []);

            return (
              <AccordionItem value={studentName} key={studentName}>
                <AccordionTrigger className="text-left text-sm font-semibold text-slate-900">
                  {studentName}
                  <span className="text-xs font-normal text-slate-500"> ({studentEntries.length} login{studentEntries.length === 1 ? "" : "s"})</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {groupedByDay.map((day) => (
                      <div key={`${studentName}-${day.dayKey}`} className="rounded-lg border bg-slate-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{day.dayLabel}</p>
                        <ul className="mt-2 space-y-2">
                          {day.items.map(({ entry, timestamp }) => {
                            const formattedTime = timeFormatter ? timeFormatter.format(timestamp) : timestamp.toLocaleTimeString();
                            return (
                              <li
                                key={entry.id}
                                className="flex flex-col gap-1 rounded-md border bg-white px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-medium text-slate-900">{formattedTime}</p>
                                  <p className="text-xs text-slate-600">Lesson used: {entry.lessonTitle ? entry.lessonTitle : "Not recorded"}</p>
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
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
