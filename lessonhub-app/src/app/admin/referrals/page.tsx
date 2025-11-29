import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminReferralSummaryData } from "@/actions/referralActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, PauseCircle, Crown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAdminPrivileges } from "@/lib/authz";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusBadge = (referral: { isPaying: boolean; isTakingBreak: boolean; isSuspended: boolean }) => {
  if (referral.isSuspended) {
    return { label: "Suspended", className: "bg-red-50 text-red-700 border-red-200" };
  }
  if (referral.isTakingBreak) {
    return { label: "On a break", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (referral.isPaying) {
    return { label: "Paying", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  return { label: "Trial / Free", className: "bg-slate-50 text-slate-700 border-slate-200" };
};

function formatLastSeen(date: Date | null) {
  if (!date) return "Not active yet";
  return dateFormatter.format(date);
}

export default async function AdminReferralsPage() {
  const session = await auth();
  if (!session || !hasAdminPrivileges(session.user)) {
    redirect("/");
  }

  const data = await getAdminReferralSummaryData();

  const statCards = [
    {
      label: "Total referrers",
      value: data.stats.referrers,
      helper: "Users with at least one referral",
      icon: Users,
    },
    {
      label: "Total referrals",
      value: data.stats.totalReferrals,
      helper: "All sign-ups via referral codes",
      icon: Crown,
    },
    {
      label: "Paying referrals",
      value: data.stats.payingReferrals,
      helper: "Subscriptions that pay out",
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
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-bold">Referral overview</h1>
        <p className="text-muted-foreground max-w-3xl">
          Eagle-eye view of every referrer, their students, and projected payouts based on current subscription rewards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
              <CardDescription>{helper}</CardDescription>
            </CardHeader>
          </Card>
        ))}
        <Card className="md:col-span-2 lg:col-span-4 bg-emerald-50/60 border-emerald-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <DollarSign className="h-4 w-4" />
              Estimated monthly payout
            </div>
            <CardTitle className="text-4xl font-semibold text-emerald-900">
              {currencyFormatter.format(data.stats.estimatedMonthlyPayout)}
            </CardTitle>
            <CardDescription className="text-emerald-800">
              {data.stats.payingReferrals} paying referral{data.stats.payingReferrals === 1 ? "" : "s"} ·
              {` ${currencyFormatter.format(data.stats.monthlySharePerReferral)} per referral (${data.stats.rewardPercent}% of `}
              {currencyFormatter.format(data.stats.rewardMonthlyAmount)}
              {")"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Referrer summary</h2>
          <Badge variant="outline">Sorted by total referrals</Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paying</TableHead>
                  <TableHead>Paused</TableHead>
                  <TableHead className="text-right">Est. monthly</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referrers.map((referrer) => (
                  <TableRow key={referrer.id}>
                    <TableCell>
                      <div className="font-medium">{referrer.name ?? referrer.email}</div>
                      <div className="text-sm text-muted-foreground">{referrer.email}</div>
                    </TableCell>
                    <TableCell>{referrer.totalReferrals}</TableCell>
                    <TableCell>{referrer.payingReferrals}</TableCell>
                    <TableCell>{referrer.pausedReferrals}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currencyFormatter.format(referrer.estimatedMonthlyReward)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">All referrals</h2>
          <Badge variant="secondary">Live snapshot</Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="hidden lg:table-cell">Last seen</TableHead>
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
                      <TableCell>
                        <div className="font-medium">{referral.referrerName ?? referral.referrerEmail}</div>
                        <div className="text-sm text-muted-foreground">{referral.referrerEmail}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatLastSeen(referral.lastSeen)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
