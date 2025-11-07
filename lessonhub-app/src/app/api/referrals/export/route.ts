import { NextResponse } from "next/server";
import { getReferralDashboardData } from "@/actions/referralActions";

function csvEscape(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const data = await getReferralDashboardData();
    const headers = [
      "student_name",
      "student_email",
      "plan",
      "status",
      "last_seen_iso",
      "is_paying",
      "is_taking_break",
      "is_suspended",
    ];

    const rows = data.referrals.map((referral) => {
      const status = referral.isSuspended
        ? "SUSPENDED"
        : referral.isTakingBreak
          ? "ON_BREAK"
          : referral.isPaying
            ? "ACTIVE"
            : "EXPLORING";

      return [
        csvEscape(referral.name ?? ""),
        csvEscape(referral.email),
        csvEscape(referral.isPaying ? "Paying" : "Free / trial"),
        csvEscape(status),
        csvEscape(referral.lastSeen ? referral.lastSeen.toISOString() : ""),
        csvEscape(referral.isPaying),
        csvEscape(referral.isTakingBreak),
        csvEscape(referral.isSuspended),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="referrals.csv"',
      },
    });
  } catch (error) {
    console.error("Failed to export referrals:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
