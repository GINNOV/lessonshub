// file: src/lib/email-templates.ts

export const defaultEmailTemplates: Record<string, { subject: string; body: string }> = {
    welcome: {
        subject: 'Welcome to LessonHUB, {{userName}}!',
        body: `
            <h1 style="color: #1d1c1d; font-size: 36px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Welcome to LessonHUB!</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{userName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">We’re thrilled to have you on board. Get ready to create, assign, and manage your lessons with ease.</p>
            {{button}}
        `,
    },
    new_assignment: {
        subject: 'New Assignment: {{lessonTitle}}',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">New Assignment!</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your teacher, {{teacherName}}, has assigned you a new lesson: <strong>{{lessonTitle}}</strong>.</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Please complete it by: <strong>{{deadline}}</strong></p>
            {{button}}
        `,
    },
    graded: {
        subject: 'Your assignment "{{lessonTitle}}" has been graded',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Graded!</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your submission for the lesson, <strong>{{lessonTitle}}</strong>, has been graded.</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;"><strong>Your Score:</strong> {{score}}</p>
            {{teacherComments}}
            {{button}}
        `,
    },
    failed: {
        subject: 'Update on your assignment: "{{lessonTitle}}"',
        body: `
            <h1 style="color: #dc2626; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Failed</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Your submission for the lesson, <strong>{{lessonTitle}}</strong>, is past the due date and has been marked as failed.</p>
            {{button}}
        `,
    },
    manual_reminder: {
        subject: '🚨 Reminder: Your assignment "{{lessonTitle}}"',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Reminder</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">This is a friendly reminder from your teacher, {{teacherName}}, to complete the assignment: <strong>{{lessonTitle}}</strong>.</p>
            {{button}}
        `,
    },
    deadline_reminder: {
        subject: '🔔 Reminder: Assignment "{{lessonTitle}}" is due soon',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">Assignment Reminder</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{studentName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">This is a friendly reminder that your assignment, <strong>{{lessonTitle}}</strong>, is due soon.</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Please submit it by: <strong>{{deadline}}</strong></p>
            {{button}}
        `,
    },
    submission_notification: {
        subject: 'New Submission: {{studentName}} completed "{{lessonTitle}}"',
        body: `
            <h1 style="color: #1d1c1d; font-size: 32px; font-weight: 700; margin: 30px 0; padding: 0; line-height: 42px;">New Submission</h1>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">Hi {{teacherName}},</p>
            <p style="color: #525f7f; font-size: 16px; line-height: 24px; text-align: left;">{{studentName}} has just submitted their response for the lesson: <strong>{{lessonTitle}}</strong>.</p>
            {{button}}
        `,
    },
    new_user_admin: {
        subject: '[LessonHUB] New User Sign-Up: {{newUserName}}',
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
    },
    user_deleted_admin: {
        subject: '[LessonHUB] User Account Deleted: {{deletedUserName}}',
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