'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, LinkIcon } from "lucide-react";

interface ReferralShareCardProps {
  referralLink: string;
  referralCode: string;
  rewardPercent: number;
}

export default function ReferralShareCard({ referralLink, referralCode, rewardPercent }: ReferralShareCardProps) {
  const [copiedField, setCopiedField] = useState<"link" | "code" | null>(null);
  const formattedPercent = Number.isInteger(rewardPercent)
    ? rewardPercent.toString()
    : rewardPercent.toFixed(1);

  const handleCopy = async (value: string, type: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(type);
      toast.success(type === "link" ? "Referral link copied" : "Referral code copied");
      setTimeout(() => setCopiedField((current) => (current === type ? null : current)), 2000);
    } catch {
      toast.error("Unable to copy. Please copy it manually.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join LessonHUB",
          text: "Learn English with LessonHUB. Use my referral link to sign up!",
          url: referralLink,
        });
      } catch {
        // Swallow abort errors and fall back to copying
      }
    } else {
      handleCopy(referralLink, "link");
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Share your invite</CardTitle>
        <CardDescription>
          Send the link or code below to let friends keep 100% of their lessons while you collect {formattedPercent}% of their monthly payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Referral link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button onClick={() => handleCopy(referralLink, "link")} variant="secondary" className="whitespace-nowrap">
              <Copy className="h-4 w-4 mr-2" />
              {copiedField === "link" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Referral code</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={referralCode} readOnly className="font-mono text-sm sm:max-w-[200px]" />
            <Button onClick={() => handleCopy(referralCode, "code")} variant="outline" className="whitespace-nowrap">
              <Copy className="h-4 w-4 mr-2" />
              {copiedField === "code" ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Earn rewards when referred students subscribe. Tracking updates automatically.
        </p>
        <Button onClick={handleShare} className="w-full sm:w-auto">
          <LinkIcon className="h-4 w-4 mr-2" />
          Share link
        </Button>
      </CardFooter>
    </Card>
  );
}
