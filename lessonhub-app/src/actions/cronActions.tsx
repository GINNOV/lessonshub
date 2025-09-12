// file: src/actions/cronActions.ts
'use server';

import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { sendEmail, createButton } from '@/lib/email-templates';

/**
 * Sends a test email to the currently logged-in admin to verify cron functionality.
 */
export async function sendCronTestEmail() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== Role.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const recipient = session.user.email;
    const adminName = session.user.name || 'Admin';
    const currentTime = new Date().toLocaleString();

    console.log(`[CRON TEST] Attempting to send test email to ${recipient} at ${currentTime}`);

    await sendEmail({
      to: recipient,
      templateName: 'custom', // Use a generic template name
      data: {}, // No dynamic data needed for the body
      override: {
        subject: `[LessonHUB Cron Test] - ${currentTime}`,
        body: `
          <h1 style="color: #1d1c1d; font-size: 28px; font-weight: 700;">Cron Job Test</h1>
          <p>Hi ${adminName},</p>
          <p>This is an automated test email to verify that the cron job scheduling and email sending functionality are working correctly.</p>
          <p>Email generated at: <strong>${currentTime}</strong>.</p>
          <p>If you received this, the email action was triggered successfully.</p>
        `,
      },
    });

    console.log(`[CRON TEST] Successfully sent test email to ${recipient}`);
    return { success: true, message: `Email sent to ${recipient} at ${currentTime}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error("[CRON TEST] Failed to send test email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

