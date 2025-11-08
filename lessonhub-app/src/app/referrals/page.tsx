import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getReferralDashboardData } from "@/actions/referralActions";
import ReferralShareCard from "../components/ReferralShareCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Wallet, PauseCircle, Crown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatLastSeen(date: Date | null) {
  if (!date) return "Not active yet";
  return dateFormatter.format(date);
}

function statusBadge(referral: {
  isPaying: boolean;
  isTakingBreak: boolean;
  isSuspended: boolean;
}) {
  if (referral.isSuspended) {
    return { label: "Suspended", className: "bg-red-50 text-red-700 border-red-200" };
  }
  if (referral.isTakingBreak) {
    return { label: "On a break", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (referral.isPaying) {
    return { label: "Active", className: "bg-green-50 text-green-700 border-green-200" };
  }
  return { label: "Exploring", className: "bg-slate-50 text-slate-700 border-slate-200" };
}

export default async function ReferralDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  const data = await getReferralDashboardData();
  const headerList = await headers();
  const originHeader = headerList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const sanitizedOrigin = originHeader.endsWith("/")
    ? originHeader.slice(0, -1)
    : originHeader || "";
  const referralLink = `${sanitizedOrigin}/register?ref=${data.viewer.referralCode}`;

  const statCards = [
    {
      label: "Total referrals",
      value: data.stats.totalReferrals,
      helper: "All sign-ups from your code",
      icon: Users,
    },
    {
      label: "Paying students",
      value: data.stats.payingReferrals,
      helper: "Subscribers you're rewarded for",
      icon: Wallet,
    },
    {
      label: "On a break",
      value: data.stats.pausedReferrals,
      helper: "Paused or catching up",
      icon: PauseCircle,
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Referral Program</p>
          <h1 className="text-3xl font-bold mt-2">Referral dashboard</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Track the students who joined through your invite link and see how your referrals are helping the community grow.
          </p>
        </div>
        {data.viewer.role !== Role.STUDENT && (
          <Badge variant="secondary" className="w-fit">
            Teacher view
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-1">
          <ReferralShareCard
            referralLink={referralLink}
            referralCode={data.viewer.referralCode}
            rewardPercent={data.reward.percent}
          />
        </div>
        {statCards.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <CardTitle className="text-4xl font-semibold">{value}</CardTitle>
              <CardDescription>{helper}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Wallet className="h-4 w-4" />
              Reward balance
            </div>
            <CardTitle className="text-4xl font-semibold text-amber-900">
              {currencyFormatter.format(data.reward.estimatedMonthlyReward)}
            </CardTitle>
            <CardDescription>Projected monthly share from active subscriptions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-amber-900">
            <div className="flex items-center justify-between">
              <span>Per referral</span>
              <span className="font-semibold">
                {currencyFormatter.format(data.reward.monthlySharePerReferral)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reward rate</span>
              <span className="font-semibold">
                {data.reward.percent}% of {currencyFormatter.format(data.reward.monthlyAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">Your referrals</h2>
              <Badge variant="outline">Live sync</Badge>
            </div>
            <p className="text-muted-foreground">
              {data.stats.totalReferrals > 0
                ? "Every referral is tracked below with their latest status."
                : "Your referral list will appear here after the first student signs up."}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/api/referrals/export" prefetch={false} className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Link>
          </Button>
        </div>
        {data.referrals.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Waiting for your first referral</CardTitle>
              <CardDescription>
                Share your link above. Once someone signs up, you&apos;ll see their status here instantly.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px]">Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="hidden md:table-cell">Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.referrals.map((referral) => {
                    const badge = statusBadge(referral);
                    return (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="font-medium">{referral.name ?? referral.email}</div>
                          <div className="text-sm text-muted-foreground">{referral.email}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              badge.className
                            )}
                          >
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell>{referral.isPaying ? "Paying" : "Free / trial"}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatLastSeen(referral.lastSeen)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {data.leaderboard.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-2xl font-semibold">Student referral leaderboard</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paying</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leaderboard.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.name ?? entry.email}</div>
                        <div className="text-sm text-muted-foreground">{entry.email}</div>
                      </TableCell>
                      <TableCell>{entry.totalReferrals}</TableCell>
                      <TableCell>{entry.payingReferrals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
