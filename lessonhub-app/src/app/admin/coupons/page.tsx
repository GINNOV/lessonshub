import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import {
  getCouponDashboardData,
  createCouponAction,
  toggleCouponStatusAction,
  deleteCouponAction,
} from "@/actions/couponActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default async function CouponManagementPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const { coupons, totals } = await getCouponDashboardData();

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupon Management</h1>
          <p className="text-slate-400 mt-1">
            Create and monitor coupon codes for prepaid access, bundles, and promotions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60">
            <a href="/admin">← Admin home</a>
          </Button>
          <Button asChild variant="outline" className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60">
            <a href="/dashboard">← Teacher dashboard</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Active coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.active}</p>
            <p className="text-sm text-slate-400">Currently redeemable</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Expiring soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.expiringSoon}</p>
            <p className="text-sm text-slate-400">Within the next 7 days</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
          <CardHeader>
            <CardTitle>Total redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.totalRedemptions}</p>
            <p className="text-sm text-slate-400">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Create a new coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCouponAction} className="grid gap-4 md:grid-cols-2">
            <div className="form-field">
              <label htmlFor="code" className="block text-sm font-medium text-slate-200">
                Coupon code
              </label>
              <Input
                id="code"
                name="code"
                placeholder="e.g., SPRING25"
                required
                className="uppercase border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="form-field">
              <label htmlFor="maxRedemptions" className="block text-sm font-medium text-slate-200">
                Max redemptions
              </label>
              <Input
                id="maxRedemptions"
                name="maxRedemptions"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="form-field md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-200">
                Description
              </label>
              <Input
                id="description"
                name="description"
                placeholder="Optional note (shown to admins only)"
                className="border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="form-field">
              <label htmlFor="expiresAt" className="block text-sm font-medium text-slate-200">
                Expiration date
              </label>
              <Input id="expiresAt" name="expiresAt" type="date" className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="flex items-end justify-end md:col-span-2">
              <Button type="submit">Create coupon</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Existing coupons</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {coupons.length === 0 ? (
            <p className="text-sm text-slate-400">No coupons yet. Create one above to get started.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Details</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Usage</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {coupons.map((coupon) => {
                  const remaining =
                    coupon.maxRedemptions - coupon.redemptionCount > 0
                      ? coupon.maxRedemptions - coupon.redemptionCount
                      : 0;
                  return (
                    <tr key={coupon.id} className="bg-slate-950/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{coupon.code}</div>
                        <div className="text-xs text-slate-400">
                          Created{" "}
                          {formatDistanceToNow(new Date(coupon.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {coupon.description || "—"}
                        {coupon.expiresAt && (
                          <div className="text-xs text-slate-400">
                            Expires{" "}
                            {formatDistanceToNow(new Date(coupon.expiresAt), {
                              addSuffix: true,
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {coupon.redemptionCount}/{coupon.maxRedemptions}
                        <div className="text-xs text-slate-400">{remaining} remaining</div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            coupon.isActive
                              ? "bg-emerald-900/40 text-emerald-100 border border-emerald-400/50"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={toggleCouponStatusAction}>
                            <input type="hidden" name="couponId" value={coupon.id} />
                            <input
                              type="hidden"
                              name="nextStatus"
                              value={String(!coupon.isActive)}
                            />
                            <Button type="submit" variant="outline" size="sm">
                              {coupon.isActive ? "Pause" : "Activate"}
                            </Button>
                          </form>
                          <form action={deleteCouponAction}>
                            <input type="hidden" name="couponId" value={coupon.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
