// file: src/lib/email-templates.ts
export const defaultEmailTemplates: Record<string, { subject: string; body: string; buttonColor?: string; description?: string; category?: string }> = {
    welcome: {
        subject: '🌸 Welcome to LessonHUB, {{userName}}!',
        description: 'Sent after a new user signs up to welcome them and explain how to get started.',
        category: 'Onboarding',
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
        description: 'Sent when a lesson is assigned and notification is enabled (immediate or scheduled start date).',
        category: 'Assignments',
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
        description: 'Sent after a teacher grades an assignment and a score is recorded.',
        category: 'Assignments',
        body: `🇺🇸
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Graded!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your submission for the lesson, <strong>{{lessonTitle}}</strong>, has been graded.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Your Score:</strong> {{score}}</p>
{{extraPointsLineEn}}
{{teacherComments}}
{{button}}

🇮🇹
<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Compito Valutato!</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Ciao {{studentName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">La tua consegna per la lezione <strong>{{lessonTitle}}</strong> è stata valutata.</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Il tuo punteggio:</strong> {{score}}</p>
{{extraPointsLineIt}}
{{teacherComments}}
{{button}}`,
        buttonColor: '#5e6ad2',
    },
    failed: {
        subject: '❌ Update on your assignment: "{{lessonTitle}}"',
        description: 'Sent when an assignment is marked failed after missing the deadline.',
        category: 'Assignments',
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
        description: 'Sent manually by a teacher from the submissions page for a pending assignment.',
        category: 'Reminders',
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
        description: 'Sent by the deadline reminder job 24–48 hours before due date (legacy endpoint).',
        category: 'Reminders',
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
        description: 'Sent to a teacher when a student submits an assignment.',
        category: 'Submissions',
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
        description: 'Sent to admins when a new user registers.',
        category: 'Admin',
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
        description: 'Sent to admins when a user deletes their account.',
        category: 'Admin',
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
        description: 'Sent when a user requests a password reset / magic link.',
        category: 'Auth',
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
        description: 'Sent to a teacher when a student submits feedback via the feedback dialog.',
        category: 'Feedback',
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
    description: 'Sent every 10 completed/graded lessons when the latest milestone assignment has not been notified yet.',
    category: 'Milestones',
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
        description: 'Sent to a teacher when students are assigned to their class.',
        category: 'Admin',
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
        description: 'Sent monthly to paying users who have not received a payment reminder in the current month.',
        category: 'Billing',
        body: `<h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Payment Reminder</h1>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{userName}},</p>
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">This is a friendly reminder that your monthly subscription fee is due. Please click the button below to complete your payment and continue your learning journey.</p>
{{button}}
<p style="color: #525f7f; font-size: 16px; line-height: 24px;">Thank you!</p>`,
        buttonColor: '#00BCD4',
    },
  deadline_extended: {
    subject: "Good News! Your deadline has been extended",
    description: 'Sent when a teacher or student extends an assignment deadline.',
    category: 'Assignments',
    body: `
      <p>Hi {{studentName}},</p>
      <p>Good news! Your teacher has extended the deadline for the lesson: <strong>{{lessonTitle}}</strong>.</p>
      <p>Your new deadline is <strong>{{newDeadline}}</strong>.</p>
      {{button}}
      <p>Keep up the great work!</p>
    `,
    buttonColor: '#17a2b8',
  },
  gold_star: {
    subject: '⭐ You earned a Gold Star!',
    description: 'Sent when a teacher awards a gold star badge, optionally with a personal note.',
    category: 'Milestones',
    body: `
        🇺🇸
        <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">You're on a Roll!</h1>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Hi {{studentName}},</p>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Congratulations on doing a fantastic job! Your dedication and hard work are paying off. Keep up the fantastic progress! You are now officially a <b>GOLD STAR member</b>!</p>

        <!-- Trophy in the center -->
        <div style="text-align: center; font-size: 80px; margin: 20px 0;">⭐️</div>
<p>For this you are receving <b>200</b> euros in credit on the platform and 11 points on the leaderboard!</p>

        🇮🇹
        <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700;">Stai andando alla grande!</h1>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Ciao {{studentName}},</p>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">Complimenti per continuare ad essere un campione di esempio per gli altri studenti!</p> 

<p>La tua dedizione e il tuo impegno stanno dando i loro frutti. Continua così! Sei ufficialmente un possessore sano del badge di <b>STELLA D'ORO</b>. Fallo sapere agli altri studenti e falli schiattare di invidia!</p>

<p>Per questo raggiungimento ricevo <b>200</b> euro in crediti e 11 punti sulla leaderboard.</p>
        <p style="color: #525f7f; font-size: 16px; line-height: 24px;">
          Personal note: <em>{{message}}</em>
        </p>
        {{button}}
    `,
    buttonColor: '#f59e0b',
  },
  past_due_warning: {
    subject: '⏳ Action needed: "{{lessonTitle}}" is overdue',
    description: 'Sent after deadline when within the grace period before auto-fail.',
    category: 'Reminders',
    body: `
      <h1 style="color:#b45309;font-size:30px;font-weight:800;margin:24px 0;">Your assignment is overdue</h1>
      <p style="color:#4b5563;font-size:16px;line-height:24px;">Hi {{studentName}},</p>
      <p style="color:#4b5563;font-size:16px;line-height:24px;">Your lesson <strong>{{lessonTitle}}</strong> is past its deadline ({{deadline}}). You still have <strong>{{hoursLeft}} hours</strong> to request an extension before it is automatically failed.</p>
      <p style="color:#4b5563;font-size:16px;line-height:24px;">Auto-fail time: <strong>{{failAt}}</strong> (CEST)</p>
      {{button}}
      <p style="color:#4b5563;font-size:15px;line-height:22px;margin-top:16px;">If you need more time, request an extension now to keep this assignment active.</p>
    `,
    buttonColor: '#f59e0b',
  },
  weekly_summary: {
    subject: '🌟 Your Week on LessonHUB ({{weekRange}})',
    description: 'Sent on Sundays (or forced) to students who have not opted out of weekly summaries.',
    category: 'Summaries',
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
