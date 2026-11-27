# Vercel / project setup notes

These are the conventions and helper scripts this repository uses for a Next.js project with App Router, TypeScript, and Prisma. Use them as a checklist when you set up a new project.

## Environment & auth
- Copy `.env.example` to `.env.local` and fill in the secrets (DB URL, NextAuth secrets/providers, email, blob storage). Never commit secrets.
- Authentication uses NextAuth (credentials/social as configured in `.env.local`); `auth()` guard is used in server components/routes.
- Role handling: `Role.ADMIN`, `Role.TEACHER`, `Role.STUDENT`; admins may also have `hasAdminPortalAccess`.

## Prisma
- Always run Prisma via the npm scripts (they preload `.env.local`):
  - `npm run prisma:generate`
  - `npm run prisma:migrate`
  - `npm run prisma:db:push`
  - `npm run prisma:studio`
- Seeding: `npx dotenv -e .env.local -- prisma db seed` (upserts defaults; does not delete).
- New fields should be added via migrations; never delete existing migration folders.
- Decimal fields must be serialized to numbers before sending to the client.
- **Query logging:** set `DEBUG="prisma:query"` in `.env.local` to log Prisma queries; keep it off in prod unless needed.

## Data model flags to preserve
- `notifyOnStartDate` (per-assignment): don't clear this unless the teacher chooses "no start notification".
- `gradedByTeacher` (per-assignment): set to `true` only when a teacher grades; auto-marked submissions stay "completed" until graded.
- `pastDueWarningSentAt`: ensures past-due warnings are only sent once.
- `originalDeadline`: preserve when extending deadlines.

## Cron / scheduled jobs (Vercel)
- `vercel.json` contains cron entries:
  - `/api/cron/daily` at `0 9 * * *` (UTC)
  - `/api/cron/start` at `0 * * * *` (UTC) for hourly start-date notifications and overdue sweeps.
- On the Hobby plan, Vercel limits cron frequency, so run less often. On Pro, keep the hourly schedule.

## Email templates
- Default templates live in `src/lib/email-templates.ts`; `getEmailTemplateByName` auto-creates DB templates on first use.
- If adding a template, include subject/body/buttonColor and use placeholders `{{key}}`.

## Scripts & commands
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build` (also generates Prisma client)
- Start: `npm start`
- Cron test page: `/admin/cron`

## Admin / dashboards
- Admin landing uses `ADMIN_TILES` (colors pre-styled for dark mode).
- Dark theme throughout admin; if you add pages, wrap content in dark surfaces (see `src/app/admin/layout.tsx`).
- Include "Back to Admin" and, where useful, "Back to Teacher Dashboard" links on admin pages.

## UI conventions
- Tailwind, 2-space indent, TypeScript, React 19.
- Components in `src/components`; shared UI primitives under `src/components/ui`.
- App Router routes under `src/app`, kebab-case folder names.
- Prefer non-blocking toasts for feedback (shadcn `toast` + `<Toaster />`) instead of native `alert`/`confirm` dialogs.

## Common pitfalls (project-specific)
- Don't mix student and teacher flows; keep `StudentLessonList` read-only.
- When editing assignments, preserve `notifyOnStartDate` and `originalDeadline`.
- Use `LocaleDate` and timezone-aware formatting; user timezone is stored on profile.
- Lyric lessons: if DB errors mention missing LRC columns, run migrate + generate.

## Quick AI instructions (for codex/assistants)
- Prefer `rg` for search.
- Avoid destructive git commands; don't revert user changes.
- Use `apply_patch` for small edits; keep comments minimal and useful.
- For Prisma commands, use npm scripts (with `.env.local`).
- Maintain ASCII unless file already uses Unicode.

## Deployment tips
- Ensure `RESEND_API_KEY` (email), `AUTH_URL`, and any OAuth secrets are set in Vercel env.
- After schema changes: `npm run prisma:migrate && npm run prisma:generate`, redeploy.
- Verify cron endpoints are reachable; adjust schedules if needed for plan limits.
