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
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  const { coupons, totals } = await getCouponDashboardData();

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Coupon Management</h1>
        <p className="text-gray-600 mt-1">
          Create and monitor coupon codes for prepaid access, bundles, and promotions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.active}</p>
            <p className="text-sm text-gray-500">Currently redeemable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expiring soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.expiringSoon}</p>
            <p className="text-sm text-gray-500">Within the next 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.totalRedemptions}</p>
            <p className="text-sm text-gray-500">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCouponAction} className="grid gap-4 md:grid-cols-2">
            <div className="form-field">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Coupon code
              </label>
              <Input id="code" name="code" placeholder="e.g., SPRING25" required className="uppercase" />
            </div>
            <div className="form-field">
              <label htmlFor="maxRedemptions" className="block text-sm font-medium text-gray-700">
                Max redemptions
              </label>
              <Input
                id="maxRedemptions"
                name="maxRedemptions"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
            </div>
            <div className="form-field md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <Input
                id="description"
                name="description"
                placeholder="Optional note (shown to admins only)"
              />
            </div>
            <div className="form-field">
              <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
                Expiration date
              </label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div className="flex items-end justify-end md:col-span-2">
              <Button type="submit">Create coupon</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing coupons</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {coupons.length === 0 ? (
            <p className="text-sm text-gray-500">No coupons yet. Create one above to get started.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Details</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Usage</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => {
                  const remaining =
                    coupon.maxRedemptions - coupon.redemptionCount > 0
                      ? coupon.maxRedemptions - coupon.redemptionCount
                      : 0;
                  return (
                    <tr key={coupon.id} className="bg-white">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{coupon.code}</div>
                        <div className="text-xs text-gray-500">
                          Created{" "}
                          {formatDistanceToNow(new Date(coupon.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {coupon.description || "—"}
                        {coupon.expiresAt && (
                          <div className="text-xs text-gray-500">
                            Expires{" "}
                            {formatDistanceToNow(new Date(coupon.expiresAt), {
                              addSuffix: true,
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {coupon.redemptionCount}/{coupon.maxRedemptions}
                        <div className="text-xs text-gray-500">{remaining} remaining</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            coupon.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
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
