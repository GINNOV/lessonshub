# Email Template System Integration Guide

This document describes how to integrate the full email template system (editor + preview + sending) into another project using the same stack as this app (Next.js App Router + Prisma + Resend).

## What to bring over (files + responsibilities)

### Core template system
- `src/lib/email-templates.ts`
  - Default templates, placeholder replacement, HTML wrapper, `sendEmail` pipeline.
- `src/lib/placeholder-data.ts`
  - Placeholder catalog for the editor UI and guide.

### Admin UI
- `src/app/admin/emails/page.tsx`
  - Template list view.
- `src/app/admin/emails/edit/[templateName]/page.tsx`
  - Edit page that loads a single template.
- `src/app/components/EmailTemplateForm.tsx`
  - Editor UI, placeholders, preview iframe, send test email.
- `src/app/components/PlaceholderGuide.tsx`
  - Placeholder guide modal (Cmd/Ctrl + `/`).

### Server actions
- `src/actions/adminActions.ts`
  - `getAllEmailTemplates`
  - `getEmailTemplateByName`
  - `updateEmailTemplate`
  - `sendTestEmail`

### Database + seed
- `prisma/schema.prisma`
  - `EmailTemplate` model.
- `prisma/seed.ts`
  - Upserts default templates from `defaultEmailTemplates`.

### Optional nav link
- `src/app/components/Navbar.tsx`
  - Add Email Editor link in the admin section if desired.

## Data model

Add the `EmailTemplate` model to Prisma:

```
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  subject     String
  body        String
  buttonColor String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Default template population

- `defaultEmailTemplates` in `src/lib/email-templates.ts` is the source of truth.
- `prisma/seed.ts` upserts templates so they exist in DB.
- `getAllEmailTemplates` and `getEmailTemplateByName` auto-create missing templates from defaults.

## Editor + preview behavior

Implemented in `EmailTemplateForm`:
- Loads subject/body/buttonColor into local state.
- Inserts placeholders at cursor from `placeholder-data`.
- Builds live preview by replacing placeholders with dummy values.
- Wraps the body in the same HTML wrapper used by `sendEmail`.
- Preview renders in an `iframe` via `srcDoc`.
- Can send a test email with `sendTestEmail`.

## Placeholder system

- Placeholders are defined in `src/lib/placeholder-data.ts`.
- Replacement is done by `replacePlaceholders()` in `src/lib/email-templates.ts`.
- Placeholders are used in both preview and actual sends.
- Syntax is `{{variable}}`.

## Sending pipeline

`sendEmail()` in `src/lib/email-templates.ts`:
- Loads template from DB (`getEmailTemplateByName`).
- Replaces placeholders in subject/body.
- Wraps body in full HTML email layout.
- Sends via Resend API.

`sendTestEmail()` uses `sendEmail()` with test data.

## Wiring into feature flows

Replace custom email HTML sends with:

```
await sendEmail({
  to,
  templateName,
  data: {
    studentName,
    teacherName,
    lessonTitle,
    deadline,
    button: createButton('View Assignment', url, templateButtonColor),
  },
});
```

Notes:
- `data` keys must match placeholders in the template body/subject.
- You can override subject/body via `sendEmail({ ..., override: { subject, body } })` if needed.

## Environment variables

Ensure `.env.local` includes:
- `RESEND_API_KEY`
- `EMAIL_FROM`

## Integration steps (minimal, in order)

1) Add `EmailTemplate` model to `prisma/schema.prisma` and run migrations.
2) Copy `src/lib/email-templates.ts` and `src/lib/placeholder-data.ts`.
3) Copy `EmailTemplateForm` + `PlaceholderGuide` components.
4) Add admin routes under `src/app/admin/emails` and `.../edit/[templateName]`.
5) Add `adminActions` for template CRUD + test send.
6) Add template upsert logic in `prisma/seed.ts`.
7) Replace direct email HTML sends with `sendEmail()` + template name + data.
8) (Optional) Add nav link for the Email Editor.

## Reference paths in this repo

- `src/lib/email-templates.ts`
- `src/lib/placeholder-data.ts`
- `src/actions/adminActions.ts`
- `src/app/admin/emails/page.tsx`
- `src/app/admin/emails/edit/[templateName]/page.tsx`
- `src/app/components/EmailTemplateForm.tsx`
- `src/app/components/PlaceholderGuide.tsx`
- `prisma/schema.prisma`
- `prisma/seed.ts`
