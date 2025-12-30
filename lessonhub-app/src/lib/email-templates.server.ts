// file: src/lib/email-templates.server.ts
import { replacePlaceholders } from '@/lib/email-templates';

interface SendEmailOptions {
  to: string;
  templateName: string;
  data: Record<string, string>;
  subjectPrefix?: string;
  override?: { subject: string; body: string };
}

export async function sendEmail({
  to,
  templateName,
  data,
  subjectPrefix = '',
  override,
}: SendEmailOptions) {
  let finalSubject = '';
  let finalBody = '';
  let status: 'SENT' | 'FAILED' = 'SENT';
  let errorMessage: string | null = null;

  try {
    const template = override
      ? null
      : await (await import('@/actions/adminActions')).getEmailTemplateByName(templateName);

    if (!template && !override) {
      status = 'FAILED';
      errorMessage = `Email template "${templateName}" not found and could not be created.`;
      console.error(errorMessage);
      return;
    }

    const subject = override ? override.subject : template!.subject;
    const body = override ? override.body : template!.body;

    finalSubject = subjectPrefix + replacePlaceholders(subject, data);
    finalBody = replacePlaceholders(body, data);

    const emailHtml = `
      <html lang="en">
      <head>
        <style>
        body { margin: 0; background-color: #f6f9fc; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif; }
        .container { background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; border: 1px solid #f0f0f0; border-radius: 8px; max-width: 560px; }
        .box { padding: 0 48px; }
        .hr { border-color: #e6ebf1; margin: 20px 0; }
        .footer { color: #8898aa; font-size: 12px; line-height: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="box">
            ${finalBody}
            <hr class="hr" />
            <p class="footer">LessonHUB — The modern platform for modern learning.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject: finalSubject,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      status = 'FAILED';
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `Resend request failed with status ${response.status}.`;
      }
    }
  } catch (error) {
    status = 'FAILED';
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email "${templateName}" to ${to}:`, error);
  } finally {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      await prisma.notificationLog.create({
        data: {
          templateName,
          to,
          subject: finalSubject || '',
          body: finalBody || '',
          status,
          errorMessage,
        },
      });
    } catch (logError) {
      console.error('Failed to log notification email:', logError);
    }
  }
}
