// file: src/lib/email-templates.ts
import prisma from "@/lib/prisma";
import { getEmailTemplateByName } from "@/actions/adminActions";

export const defaultEmailTemplates: Record<string, { subject: string; body: string, buttonColor?: string }> = {
    welcome: {
        subject: '🌸 Welcome to LessonHUB, {{userName}}!',
        body: `<h1 style="color: #1d1c1d; font-size: 36px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Welcome to LessonHUB!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇺🇸 Hi {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Welcome to LessonHUB! We’re excited to have you as part of our learning community. As a student, you can now:</p>
<ul style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left; padding-left: 20px; margin: 10px 0;">
  <li>📘 Access your lessons anytime, anywhere</li>
  <li>📝 Submit assignments directly online</li>
  <li>⭐ Track your progress and see your grades</li>
  <li>💬 Receive feedback from your teacher in real time</li>
</ul>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Get started by checking your dashboard to view your first assignment and begin learning!</p>
<p style="color: #1d1c1d; font-size: 16px; font-weight: 600; line-height: 24px; text-align: left; margin-top: 15px;">🌍 Learn English with less grammar and more practical life examples!</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇮🇹 Ciao {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Benvenuto su LessonHUB! Siamo felici di averti nella nostra community di studenti. Da oggi potrai:</p>
<ul style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left; padding-left: 20px; margin: 10px 0;">
  <li>📘 Accedere alle tue lezioni in qualsiasi momento e da qualsiasi dispositivo</li>
  <li>📝 Consegnare i compiti direttamente online</li>
  <li>⭐ Monitorare i tuoi progressi e consultare i voti</li>
  <li>💬 Ricevere feedback dal tuo insegnante in tempo reale</li>
</ul>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Inizia subito accedendo alla tua dashboard per vedere il tuo primo compito e cominciare a imparare!</p>
<p style="color: #1d1c1d; font-size: 16px; font-weight: 600; line-height: 24px; text-align: left; margin-top: 15px;">🌍 Impara l’inglese con meno grammatica e più esempi pratici di vita reale!</p>
{{button}}`,
        buttonColor: '#5e6ad2',
    },
    new_assignment: {
        subject: '🏄🏼‍♂️ New Assignment: {{lessonTitle}}',
        body: `<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">New Assignment!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇺🇸 Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your teacher, {{teacherName}}, has assigned you a new lesson: <strong>{{lessonTitle}}</strong>.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Please complete it by: <strong>{{deadline}}</strong></p>
{{button}}
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇮🇹 Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Il tuo insegnante, {{teacherName}}, ti ha assegnato una nuova lezione: <strong>{{lessonTitle}}</strong>.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Ti chiediamo di completarla entro: <strong>{{deadline}}</strong></p>`,
        buttonColor: '#5e6ad2',
    },
    graded: {
        subject: '👩🏼‍🏫 Your assignment has been graded',
        body: `🇺🇸
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Graded!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your submission for the lesson, <strong>{{lessonTitle}}</strong>, has been graded.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Your Score:</strong> {{score}}</p>
{{teacherComments}}
{{button}}

🇮🇹
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Compito Valutato!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">La tua consegna per la lezione <strong>{{lessonTitle}}</strong> è stata valutata.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Il tuo punteggio:</strong> {{score}}</p>
{{teacherComments}}
{{button}}`,
        buttonColor: '#5e6ad2',
    },
    failed: {
        subject: '❌ Update on your assignment: "{{lessonTitle}}"',
        body: `<h1 style="color: #dc2626; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Failed</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇺🇸 Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your submission for the lesson, <strong>{{lessonTitle}}</strong>, is past the due date and has been marked as failed.</p>
<p style="color: #dc2626; font-size: 16px; line-height: 24px; text-align: left; font-weight: 600;">Reason: not done by the deadline. You are not charged for failed lessons, but… you still suck.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇮🇹 Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">La tua consegna per la lezione <strong>{{lessonTitle}}</strong> è oltre la data di scadenza ed è stata contrassegnata come non superata.</p>
<p style="color: #dc2626; font-size: 16px; line-height: 24px; text-align: left; font-weight: 600;">Motivo: non completato entro la scadenza. Non ti verrà addebitato nulla per i compiti non superati, ma… fai comunque schifo.</p>
{{button}}`,
        buttonColor: '#f43f5e',
    },
    manual_reminder: {
        subject: '🚨 Reminder: Your assignment "{{lessonTitle}}"',
        body: `<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Reminder</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇺🇸 Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">This is a friendly reminder from your teacher, {{teacherName}}, to complete the assignment: <strong>{{lessonTitle}}</strong>.</p>
{{button}}
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Promemoria Compito</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇮🇹 Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Questo è un gentile promemoria dal tuo insegnante, {{teacherName}}, per completare il compito: <strong>{{lessonTitle}}</strong>.</p>`,
        buttonColor: '#f59e0b',
    },
    deadline_reminder: {
        subject: '🔔 Reminder: Assignment "{{lessonTitle}}" is due soon',
        body: `🇺🇸
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Reminder</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">This is a friendly reminder that your assignment, <strong>{{lessonTitle}}</strong>, is due soon.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Please submit it by: <strong>{{deadline}}</strong></p>
{{button}}

🇮🇹
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Promemoria: Fai i compiti</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Questo è un gentile promemoria che il tuo compito, <strong>{{lessonTitle}}</strong>, è in scadenza.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Ti chiediamo di consegnarlo entro: <strong>{{deadline}}</strong></p>
{{button}}`,
        buttonColor: '#f59e0b',
    },
    submission_notification: {
        subject: '👀 New Submission: {{studentName}} completed their work',
        body: `<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">New Submission</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇺🇸 Hi {{teacherName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">{{studentName}} has just submitted their response for the lesson: <strong>{{lessonTitle}}</strong>.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">🇮🇹 Ciao {{teacherName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">{{studentName}} ha appena inviato la sua risposta per la lezione: <strong>{{lessonTitle}}</strong>.</p>
{{button}}`,
        buttonColor: '#5e6ad2',
    },
    new_user_admin: {
        subject: '🪪 [LessonHUB] New User Sign-Up: {{newUserName}}',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">New User Sign-Up</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{adminName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">A new user has just signed up for LessonHUB.</p>
            <hr style="border-color: #e6ebf1; margin: 20px 0;" />
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">
              <strong>Name:</strong> {{newUserName}}<br />
              <strong>Email:</strong> {{newUserEmail}}
            </p>
        `,
        buttonColor: '#5e6ad2',
    },
    user_deleted_admin: {
        subject: '🪪 [LessonHUB] User Account Deleted: {{deletedUserName}}',
        body: `
            <h1 style="color: #d9534f; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">User Account Deleted</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{adminName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">A user has just deleted their account from LessonHUB.</p>
            <hr style="border-color: #e6ebf1; margin: 20px 0;" />
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">
              <strong>Name:</strong> {{deletedUserName}}<br />
              <strong>Email:</strong> {{deletedUserEmail}}
            </p>
        `,
        buttonColor: '#5e6ad2',
    },
    forgot_password: {
        subject: '🎫 Reset password for LessonHUB',
        body: `🇺🇸
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Get back in to LessonHUB</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Click the button below to securely sign in to your account. This link will expire shortly. Once you signed in, use the profile link (click on the avatar top right) to change your password. You won't be asked about the previous one to change it.</p>
{{button}}
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">If you did not request this email, you can safely ignore it.</p>

🇮🇹
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Ri-Accedi a LessonHUB</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Ciao {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Clicca sul pulsante qui sotto per accedere in modo sicuro al tuo account. Questo link scadrà a breve. Una volta effettuato l’accesso, usa il link al profilo (clicca sull’avatar in alto a destra) per cambiare la tua password. Non ti verrà chiesta la precedente per modificarla.</p>
{{button}}
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Se non hai richiesto questa email, puoi semplicemente ignorarla.</p>`,
        buttonColor: '#5e6ad2',
    },
    student_feedback: {
        subject: '[LessonHUB] You have new feedback from {{studentName}}',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">New Student Feedback</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{teacherName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px;">A student, <strong>{{studentName}}</strong>, has sent you the following feedback:</p>
            <div style="background-color: #f6f9fc; border: 1px solid #e6ebf1; border-radius: 8px; padding: 20px; margin-top: 20px;">
                <p style="color: #525f7f; font-size: 16px; line-height: 24px; margin: 0;"><em>{{feedbackMessage}}</em></p>
            </div>
        `,
    },
    milestone_celebration: {
    subject: '🎉 Congratulations on completing 10 lessons!',
    body: `
        🇺🇸
        <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">You're on a Roll!</h1>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{studentName}},</p>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Congratulations on completing another 10 lessons! Your dedication and hard work are paying off. Keep up the fantastic progress!</p>

        <!-- Trophy in the center -->
        <div style="text-align: center; font-size: 80px; margin: 20px 0;">🏆</div>

        🇮🇹
        <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Stai andando alla grande!</h1>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Ciao {{studentName}},</p>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Complimenti per aver completato altre 10 lezioni! La tua dedizione e il tuo impegno stanno dando i loro frutti. Continua così!</p>

        {{button}}
    `,
    buttonColor: '#28a745',
    },
    student_assigned_to_teacher: {
        subject: '👥 You have new students!',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">New Student Assignment</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{teacherName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px;">The following student(s) have been assigned to you:</p>
            {{studentList}}
            <p style="color: #525f7f; font-size: 16px; line-height: 24px;">You can now assign them lessons from your dashboard.</p>
            {{button}}
        `,
        buttonColor: '#5e6ad2',
    },
    payment_reminder: {
        subject: '💰 Your LessonHUB Subscription Fee is Due',
        body: `<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Payment Reminder</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">This is a friendly reminder that your monthly subscription fee is due. Please click the button below to complete your payment and continue your learning journey.</p>
{{button}}
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Thank you!</p>`,
        buttonColor: '#00BCD4',
    },
    deadline_extended: {
    subject: "Good News! Your deadline has been extended",
    body: `
      <p>Hi {{studentName}},</p>
      <p>Good news! Your teacher has extended the deadline for the lesson: <strong>{{lessonTitle}}</strong>.</p>
      <p>Your new deadline is <strong>{{newDeadline}}</strong>.</p>
      {{button}}
      <p>Keep up the great work!</p>
    `,
    buttonColor: '#17a2b8',
  },
  weekly_summary: {
    subject: '🌟 Your Week on LessonHUB ({{weekRange}})',
    body: `
      <h1 style="color:#1d1c1d;font-size:32px;font-weight:700;margin:20px 0;">Your Weekly Wins</h1>
      <p style="color:#525f7f;font-size:16px;line-height:24px;">Hi {{studentName}}, here’s a beautiful wrap‑up of your week ({{weekRange}}):</p>
      <div style="background:#f6f9fc;border:1px solid #e6ebf1;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:6px 0;color:#1d1c1d;"><strong>✅ Graded:</strong> {{gradedCount}}</p>
        <p style="margin:6px 0;color:#1d1c1d;"><strong>🚫 Failed:</strong> {{failedCount}}</p>
        <p style="margin:6px 0;color:#1d1c1d;"><strong>💶 Savings this week:</strong> €{{savingsWeek}}</p>
        <p style="margin:6px 0;color:#1d1c1d;"><strong>🏦 Total savings to date:</strong> €{{savingsTotal}}</p>
      </div>
      <h3 style="color:#1d1c1d;font-size:20px;margin:12px 0;">Highlights</h3>
      {{lessonList}}
      <div style="margin:16px 0;padding:16px;border-left:4px solid #5e6ad2;background:#f6f9fc;">
        <p style="color:#1d1c1d;font-size:16px;margin:0 0 6px 0;">{{encouragement}}</p>
        <p style="color:#8898aa;font-size:14px;margin:0;">“{{quoteText}}” — {{quoteAuthor}}</p>
      </div>
      {{button}}
    `,
    buttonColor: '#5e6ad2'
  },
};

export function replacePlaceholders(template: string, data: Record<string, string>): string {
    let result = template;
    for (const key in data) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }
    return result;
}

export function createButton(text: string, url: string, color: string = '#007bff'): string {
    return `
        <a href="${url}" target="_blank" style="background-color: ${color}; border-radius: 5px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: block; width: 100%; padding: 14px 0;">
            ${text}
        </a>
    `;
}

// --- Centralized Email Sending Function ---
interface SendEmailOptions {
    to: string;
    templateName: string;
    data: Record<string, string>;
    subjectPrefix?: string;
    override?: { subject: string; body: string };
}
export async function sendEmail({ to, templateName, data, subjectPrefix = '', override }: SendEmailOptions) {
    try {
        const template = override ? null : await getEmailTemplateByName(templateName);

        if (!template && !override) {
            console.error(`Email template "${templateName}" not found and could not be created.`);
            return;
        }

        const subject = override ? override.subject : template!.subject;
        const body = override ? override.body : template!.body;

        const finalSubject = subjectPrefix + replacePlaceholders(subject, data);
        const finalBody = replacePlaceholders(body, data);

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

        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to,
                subject: finalSubject,
                html: emailHtml,
            }),
        });

    } catch (error) {
        console.error(`Failed to send email "${templateName}" to ${to}:`, error);
    }
}
