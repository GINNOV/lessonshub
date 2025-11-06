import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentLeaderboardProfile } from "@/actions/studentActions";

const currencyFormatter =
  typeof Intl !== "undefined"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })
    : null;

function formatDuration(milliseconds: number) {
  if (!milliseconds || milliseconds <= 0) return "—";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export default async function StudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const profile = await getStudentLeaderboardProfile(studentId);

  if (!profile) {
    notFound();
  }

  const { stats } = profile;

  const statBlocks = [
    { label: "Tests taken", value: stats.testsTaken.toString() },
    { label: "Lessons completed", value: stats.completedCount.toString() },
    {
      label: "Completion rate",
      value: stats.testsTaken > 0 ? `${Math.round(stats.completionRate * 100)}%` : "—",
    },
    {
      label: "Avg. completion time",
      value: formatDuration(stats.averageCompletionTime),
    },
    {
      label: "Savings",
      value:
        typeof stats.savings === "number"
          ? currencyFormatter?.format(stats.savings) ?? `€${stats.savings.toFixed(2)}`
          : "—",
    },
    { label: "Total points", value: stats.totalPoints.toLocaleString() },
  ];

  const bioContent =
    profile.studentBio?.trim().length > 0
      ? profile.studentBio
      : profile.isSelf
        ? "Tell your classmates about your goals or interests by adding a short bio."
        : "This student hasn't shared a bio yet.";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-2xl font-semibold text-indigo-800">
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.image}
                alt={profile.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              getInitials(profile.name)
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-500">Classmate spotlight</p>
          </div>
          {profile.isSelf && (
            <div className="sm:ml-auto">
              <Link
                href="/profile"
                className="inline-flex items-center rounded-md border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              >
                Edit your profile
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Bio</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{bioContent}</p>
          {!profile.studentBio && profile.isSelf && (
            <p className="mt-2 text-xs text-slate-500">
              You can add or change this from{" "}
              <Link href="/profile" className="text-indigo-600 underline">
                your profile settings
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Progress snapshot</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {statBlocks.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-4">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</dt>
                <dd className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent badges</h3>
          {profile.recentBadges.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No badges yet—complete lessons to start unlocking them.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.recentBadges.map((badge) => (
                <div
                  key={badge.slug}
                  className="flex flex-col items-center rounded-lg border px-4 py-3 text-center shadow-sm"
                  title={badge.name}
                >
                  <span className="text-3xl">{badge.icon ?? "🎖️"}</span>
                  <span className="mt-2 text-xs font-medium text-slate-600">{badge.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
