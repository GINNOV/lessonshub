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

type ReferralShareCardCopy = {
  title: string;
  description: string;
  linkLabel: string;
  codeLabel: string;
  copy: string;
  copiedLink: string;
  copiedCode: string;
  copyError: string;
  footer: string;
  shareButton: string;
  shareTitle: string;
  shareText: string;
};

export default function ReferralShareCard({
  referralLink,
  referralCode,
  rewardPercent,
  copy,
}: ReferralShareCardProps & { copy: ReferralShareCardCopy }) {
  const [copiedField, setCopiedField] = useState<"link" | "code" | null>(null);
  const formattedPercent = Number.isInteger(rewardPercent)
    ? rewardPercent.toString()
    : rewardPercent.toFixed(1);

  const handleCopy = async (value: string, type: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(type);
      toast.success(type === "link" ? copy.copiedLink : copy.copiedCode);
      setTimeout(() => setCopiedField((current) => (current === type ? null : current)), 2000);
    } catch {
      toast.error(copy.copyError);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: copy.shareTitle,
          text: copy.shareText,
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
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>
          {copy.description.replace("{percent}", formattedPercent)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{copy.linkLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button onClick={() => handleCopy(referralLink, "link")} variant="secondary" className="whitespace-nowrap">
              <Copy className="h-4 w-4 mr-2" />
              {copiedField === "link" ? copy.copiedLink : copy.copy}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">{copy.codeLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={referralCode} readOnly className="font-mono text-sm sm:max-w-[200px]" />
            <Button onClick={() => handleCopy(referralCode, "code")} variant="outline" className="whitespace-nowrap">
              <Copy className="h-4 w-4 mr-2" />
              {copiedField === "code" ? copy.copiedCode : copy.copy}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{copy.footer}</p>
        <Button onClick={handleShare} className="w-full sm:w-auto">
          <LinkIcon className="h-4 w-4 mr-2" />
          {copy.shareButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
