// file: src/app/payment/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PaymentPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Subscription</CardTitle>
          <CardDescription>
            Complete your payment to continue accessing your lessons.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg font-semibold mb-4">
            Amount Due: €10.00
          </p>
          {/* This is where you would integrate the Wise payment button or form */}
          <Button className="w-full">
            Pay with Wise (Integration Pending)
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            You will be redirected to Wise to complete your payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}