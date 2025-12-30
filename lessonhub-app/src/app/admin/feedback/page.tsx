import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow, startOfWeek } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type TrendPoint = {
  createdAt: Date;
  score: number;
};

function TrendSparkline({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <span className="text-xs text-slate-400">No trend yet</span>;
  }

  const ordered = [...points].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const sliced = ordered.slice(-8);
  const scores = sliced.map((point) => point.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const svgPoints = sliced
    .map((point, index) => {
      const x =
        sliced.length === 1 ? 0 : (index / (sliced.length - 1)) * 100;
      const y = 100 - ((point.score - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const latest = sliced[sliced.length - 1]?.score ?? 0;

  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <svg viewBox="0 0 100 40" className="h-9 w-20">
        <polyline
          fill="none"
          stroke="url(#trendGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          points={svgPoints}
        />
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-semibold text-slate-100">{latest.toFixed(1)}/5</span>
    </div>
  );
}

const scoreFromRating = (rating: {
  contentQuality: number;
  helpfulness: number;
  communication: number;
  valueForMoney: number;
  overall: number | null;
}) => {
  if (rating.overall && rating.overall > 0) {
    return rating.overall;
  }
  const values = [
    rating.contentQuality,
    rating.helpfulness,
    rating.communication,
    rating.valueForMoney,
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export default async function FeedbackAnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const ratings = await prisma.teacherRating.findMany({
    include: {
      teacher: {
        select: { id: true, name: true, email: true, image: true },
      },
      student: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const teacherStats = ratings.reduce<Record<
    string,
    {
      teacher: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
      };
      total: number;
      averages: {
        contentQuality: number;
        helpfulness: number;
        communication: number;
        valueForMoney: number;
        overall: number;
      };
      trend: TrendPoint[];
    }
  >>((acc, rating) => {
    if (!rating.teacher) {
      return acc;
    }
    if (!acc[rating.teacher.id]) {
      acc[rating.teacher.id] = {
        teacher: rating.teacher,
        total: 0,
      averages: {
        contentQuality: 0,
        helpfulness: 0,
        communication: 0,
        valueForMoney: 0,
        overall: 0,
      },
      trend: [],
    };
  }
  const bucket = acc[rating.teacher.id];
  bucket.total += 1;
  bucket.averages.contentQuality += rating.contentQuality;
  bucket.averages.helpfulness += rating.helpfulness;
  bucket.averages.communication += rating.communication;
  bucket.averages.valueForMoney += rating.valueForMoney;
  bucket.averages.overall += scoreFromRating(rating);
  bucket.trend.push({
    createdAt: rating.createdAt,
    score: scoreFromRating(rating),
  });
  return acc;
}, {});

  const teacherIds = Object.keys(teacherStats);

  const referralCounts = teacherIds.length
    ? await prisma.user.groupBy({
        by: ["referrerId"],
        where: {
          referrerId: { in: teacherIds },
        },
        _count: {
          referrerId: true,
        },
      })
    : [];

  const referralCountMap = referralCounts.reduce<Record<string, number>>((map, row) => {
    if (row.referrerId) {
      map[row.referrerId] = row._count.referrerId;
    }
    return map;
  }, {});

  const teacherAnalytics = Object.values(teacherStats).map((entry) => ({
    ...entry,
    averages: {
      contentQuality: Number((entry.averages.contentQuality / entry.total).toFixed(1)),
      helpfulness: Number((entry.averages.helpfulness / entry.total).toFixed(1)),
      communication: Number((entry.averages.communication / entry.total).toFixed(1)),
      valueForMoney: Number((entry.averages.valueForMoney / entry.total).toFixed(1)),
      overall: Number((entry.averages.overall / entry.total).toFixed(1)),
    },
    referralCount: referralCountMap[entry.teacher.id] ?? 0,
  }));

  const totalRatings = ratings.length;
  const globalAverage =
    teacherAnalytics.length > 0
      ? (
          teacherAnalytics.reduce(
            (sum, teacher) => sum + teacher.averages.overall * teacher.total,
            0
          ) / totalRatings
        ).toFixed(1)
      : "0.0";

  const topTeachers = teacherAnalytics
    .sort((a, b) => b.averages.overall - a.averages.overall)
    .slice(0, 5);

  const latestComments = ratings
    .filter((rating) => Boolean(rating.comments))
    .slice(0, 10)
    .map((rating) => ({
      id: rating.id,
      teacherName: rating.teacher?.name ?? "Teacher",
      teacherEmail: rating.teacher?.email ?? "Unknown",
      studentName: rating.student?.name ?? "Student",
      studentEmail: rating.student?.email ?? "No email on file",
      comment: rating.comments!,
      score: scoreFromRating(rating),
      createdAt: rating.createdAt,
    }));

  const weeklyBuckets = ratings.reduce<Record<
    string,
    { weekStart: Date; total: number; sum: number }
  >>((acc, rating) => {
    const weekStart = startOfWeek(rating.createdAt, { weekStartsOn: 1 });
    const key = weekStart.toISOString();
    if (!acc[key]) {
      acc[key] = { weekStart, total: 0, sum: 0 };
    }
    acc[key].total += 1;
    acc[key].sum += scoreFromRating(rating);
    return acc;
  }, {});

  const weeklyTrend = Object.values(weeklyBuckets)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((bucket) => ({
      date: bucket.weekStart,
      value: Number((bucket.sum / bucket.total).toFixed(2)),
    }))
    .slice(-8);

  const notificationLogs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const TrendChart = () => {
    if (weeklyTrend.length === 0) {
      return <p className="text-sm text-slate-400">No trend data yet.</p>;
    }
    const values = weeklyTrend.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = weeklyTrend
      .map((point, index) => {
        const x =
          weeklyTrend.length === 1 ? 0 : (index / (weeklyTrend.length - 1)) * 100;
        const normalizedY = ((point.value - min) / range) * 36;
        const y = 38 - normalizedY;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    return (
      <div className="space-y-3">
        <svg viewBox="0 0 100 40" className="h-32 w-full">
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            points={points}
          />
          {weeklyTrend.map((point, index) => {
            const x =
              weeklyTrend.length === 1 ? 0 : (index / (weeklyTrend.length - 1)) * 100;
            const normalizedY = ((point.value - min) / range) * 36;
            const y = 38 - normalizedY;
            return (
              <circle
                key={point.date.toISOString()}
                cx={x}
                cy={y}
                r="2.5"
                fill="#22d3ee"
                stroke="#0f172a"
                strokeWidth="0.3"
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-slate-400">
          {weeklyTrend.map((point) => (
            <span key={point.date.toISOString()}>
              {point.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 text-slate-100">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Feedback &amp; Analytics</h1>
          <p className="text-slate-300 mt-1">
          Review anonymous student sentiments and track how each teacher is performing.
        </p>
      </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">&larr; Back to Admin</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">&larr; Teacher dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Total responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalRatings}</p>
            <p className="text-sm text-slate-400">Since ratings launched</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Global average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{globalAverage}/5</p>
            <p className="text-sm text-slate-400">Overall satisfaction</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Teachers rated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{teacherAnalytics.length}</p>
            <p className="text-sm text-slate-400">Active in the past 90 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Trend (last 8 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Top-rated teachers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topTeachers.length === 0 && (
              <p className="text-sm text-slate-400">No ratings yet.</p>
            )}
            {topTeachers.map(({ teacher, averages, total, trend, referralCount }) => (
              <div
                key={teacher.id}
                className="rounded-lg border border-slate-800/70 bg-slate-900/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={teacher.image ?? undefined} alt={teacher.name ?? ''} />
                      <AvatarFallback>
                        {teacher.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-50">{teacher.name ?? 'Teacher'}</p>
                      <p className="text-xs text-slate-400">{teacher.email ?? 'No email on file'}</p>
                      <p className="text-xs text-slate-500">
                        Referrals: <span className="font-semibold text-slate-100">{referralCount}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg text-slate-50">{averages.overall}/5</p>
                    <p className="text-xs text-slate-400">{total} responses</p>
                  </div>
                </div>
                <TrendSparkline points={trend} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Latest comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
            {latestComments.length === 0 && (
              <p className="text-sm text-slate-400">No written comments yet.</p>
            )}
            {latestComments.map((feedback) => (
              <div key={feedback.id} className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {feedback.teacherName} · <span className="font-medium">{feedback.studentName}</span>
                  </span>
                  <span>
                    {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-1">
                  Student email: {feedback.studentEmail}
                </p>
                <p className="mt-2 text-sm text-slate-100">{feedback.comment}</p>
                <p className="mt-1 text-xs text-slate-400">Score: {feedback.score}/5</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Notification log (latest 25)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No notifications logged yet.</p>
          ) : (
            notificationLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    {log.templateName} · {log.to}
                  </span>
                  <span>
                    {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">{log.subject || 'No subject'}</p>
                  <span
                    className={`text-xs font-semibold ${
                      log.status === 'SENT' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                {log.errorMessage && (
                  <p className="mt-1 text-xs text-rose-300">Error: {log.errorMessage}</p>
                )}
                <details className="mt-2 text-xs text-slate-400">
                  <summary className="cursor-pointer">View message</summary>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-800/70 bg-slate-900/70 p-2">
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-200">{log.body}</pre>
                  </div>
                </details>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Teacher breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {teacherAnalytics.length === 0 ? (
            <p className="text-sm text-slate-400">No ratings to display yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Teacher</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Responses</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Content</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Helpful</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Communication</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Value</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Overall</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-300">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {teacherAnalytics.map(({ teacher, averages, total, referralCount }) => (
                  <tr key={teacher.id} className="bg-slate-950/40">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-50">{teacher.name ?? 'Teacher'}</p>
                        <p className="text-xs text-slate-400">{teacher.email ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{total}</td>
                    <td className="px-4 py-3 text-slate-200">{averages.contentQuality}</td>
                    <td className="px-4 py-3 text-slate-200">{averages.helpfulness}</td>
                    <td className="px-4 py-3 text-slate-200">{averages.communication}</td>
                    <td className="px-4 py-3 text-slate-200">{averages.valueForMoney}</td>
                    <td className="px-4 py-3 font-semibold text-slate-50">{averages.overall}</td>
                    <td className="px-4 py-3 text-slate-200">{referralCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
