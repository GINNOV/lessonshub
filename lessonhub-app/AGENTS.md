# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages, API routes, layout, styles.
- `src/components`: Reusable UI and feature components; UI primitives in `src/components/ui` (shadcn/radix).
- `src/actions`: Server actions grouped by domain (e.g., `lessonActions.tsx`).
- `src/lib`: Utilities, Prisma client, email templates.
- `prisma`: `schema.prisma`, migrations, and `seed.ts`.
- `public`: Static assets (icons, images, docs screenshots).
- `scripts`: One‑off maintenance scripts.
- `pages/docs`: MDX docs content.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server.
- `npm run build`: Generate Prisma client (using `.env.local`) and build Next.js.
- `npm start`: Run the production build.
- `npm run lint`: Lint with Next/ESLint.
- Prisma tooling: `npm run prisma:migrate`, `npm run prisma:studio`, `npm run prisma:db:push`, `npm run prisma:generate`.
  - These npm scripts wrap `dotenv -e .env.local`, so Prisma commands automatically pick up DB credentials from `.env.local`.
  - Avoid calling bare `npx prisma …` unless you export `DATABASE_URL` manually; use the npm scripts instead to prevent P1012 (`Environment variable not found`) errors.
  - To (re)seed default email templates and badges run `npx dotenv -e .env.local -- prisma db seed` (uses `tsx prisma/seed.ts` under the hood; existing records are upserted, not deleted).

## Architecture & Workflows
- Student view: `src/app/my-lessons/page.tsx` renders `StudentLessonList`, which shows `StudentLessonCard`s, supports search (title/teacher), status filters (ALL/PENDING/GRADED/FAILED with matching status colors), and groups cards by week using `WeekDivider`; sorted by nearest deadline.
- Student lesson cards: teacher avatar links to `/teachers#<teacherId>`; footer shows submitted vs total counts (e.g., `7 of 8`) and includes a copy-to-clipboard share button.
- Teacher view: `src/app/dashboard/assign/[lessonId]/page.tsx` uses `AssignLessonForm` to search/filter students, bulk-select, set start/deadline, choose notification timing, and PATCH `/api/assignments`.
- Component split: `StudentLessonList` is read-only (display + filters). `AssignLessonForm` owns assignment mutations. Do not merge these concerns.
- Assignment page: Uses `LessonContentView` to render audio material, additional information, supporting image, and attachments consistently.
- Lyric lessons: teachers upload audio plus an optional `.lrc` file in `src/app/components/LyricLessonEditor.tsx`. Importing an LRC auto-populates timings, disables manual edits until the toggle is re-enabled, and surfaces links to the reference track and original LRC. Student playback (`LyricLessonPlayer`) consumes the parsed timings and offers downloads.
- Admin view: `/dashboard` shows admin tiles linking to Users, Lessons, Emails, Settings, Cron, and Profile (large buttons with icons) instead of teacher dashboard.
- Cron jobs: `/api/cron/start` runs hourly to send start-date notifications; `/api/cron/daily` (09:00 UTC) handles reminders and weekly summaries.
- When deploying on Vercel Hobby, `/api/cron/start` is limited to one run per day (10:00 UTC) to stay within cron limits—adjust the schedule when moving to Pro if you need hourly coverage.
- Data shaping: Convert Prisma `Decimal` to numbers before sending to client (e.g., lesson `price`, teacher `defaultLessonPrice`). Keep `_count` out of client objects except mapped fields like `completionCount`.
- Teacher directory: `/teachers` lists every teacher (requires auth) using the `User.teacherBio` field for their “About” section; cards expose anchor IDs so student cards can deep-link.

## Coding Style & Naming Conventions
- Language: TypeScript; React 19; Next.js App Router.
- Indentation: 2 spaces; avoid semicolons drift; prefer const/readonly where possible.
- Components: PascalCase files in `src/components` (e.g., `TeacherLessonList.tsx`).
- Routes: Kebab‑case folder names under `src/app` (e.g., `my-lessons/page.tsx`).
- Server actions: camelCase in `src/actions` (e.g., `userActions.tsx`).
- Linting: Follow `eslint-config-next`; run `npm run lint` before pushing.
- Styling: Tailwind CSS; keep class names concise; prefer existing UI primitives in `src/components/ui`.

## Practical Tips
- Handle undefined props gracefully in client components (e.g., `prop ?? []`, lazy `useState` initializers) to avoid first-render errors during data hydration.
- Keep student and teacher flows isolated to prevent accidental UX regressions.
- Timezone: `TimezoneSync` stores browser IANA timezone; users can override in `Profile` (saved to `User.timeZone`). Email deadlines honor the saved timezone.
- Teacher bios: teachers can edit their “About me” content from `/profile` (stored in `User.teacherBio`); changes revalidate `/teachers`.
- Grading: Standard lessons support optional per‑answer comments (stored in `teacherAnswerComments`; gracefully appended to overall comments if column absent).
- Leaderboard: Student leaderboard shows “Savings” (matches My Progress calculation) and uses a compact mobile layout.
- Lyric lessons: if the API returns a 500 mentioning LRC columns, run `npm run prisma:migrate` (no extra flags) followed by `npm run prisma:generate` to add the missing `lrcUrl`/`lrcStorageKey` fields. The API now returns explanatory JSON and the editor displays the message in a toast.

## Testing Guidelines
- No test runner is configured yet. If adding tests, prefer Vitest + React Testing Library.
- Co‑locate unit tests as `*.test.ts(x)` next to source; e2e tests may live under `e2e/`.
- Aim for critical path coverage (auth, lesson creation/assignment, payments).

## Commit & Pull Request Guidelines
- Commits: Imperative mood, concise subject, optional scope (e.g., `lesson: fix deadline mismatch`).
- Group related changes; reference issues (`#123`) in body; include migration notes if Prisma schema changes.
- PRs must include: summary, screenshots for UI changes, steps to verify, affected routes, and any new env vars.
- Before opening a PR: run `npm run lint`, apply necessary Prisma migrations, and update docs under `pages/docs` if behavior changes.

## Security & Config Tips
- Environment: define secrets in `.env.local` (DB URL, NextAuth, email, blob storage). Never commit secrets.
- Data model changes require a migration (`npm run prisma:migrate`) and seed updates (`prisma/seed.ts`) when applicable.

## Quick Links
- Admin: `/dashboard` (tiles), `/admin/users`, `/admin/lessons`, `/admin/emails`, `/admin/settings`, `/admin/cron`.
- Teacher: `/dashboard/assign/[lessonId]`, `/dashboard/submissions/[lessonId]`, `/dashboard/grade/[assignmentId]`.
- Student: `/my-lessons`, `/assignments/[assignmentId]`, `/profile`.

## Common Pitfalls
- Migrations: after schema updates (e.g., `User.timeZone`, `Assignment.teacherAnswerComments`), run `npm run prisma:migrate` then `npm run prisma:generate`.
- Email placeholders: ensure `deadline` is passed when sending `new_assignment`/reminder emails; deadlines are formatted with `User.timeZone` if set.
- Image props: Next 13+ deprecates `layout`/`objectFit`; use `fill` + `object-cover`. Add `priority` for above‑the‑fold LCP images.
- Decimal serialization: convert Prisma `Decimal` to number before sending to client (lesson `price`, teacher `defaultLessonPrice`).
- Role views: Admins see admin tiles at `/dashboard`; teachers see the teacher dashboard; students go to `/my-lessons`.
- When editing assignments, preserve each row's `notifyOnStartDate` value unless the teacher explicitly switches to "notify on start date" or "don't notify". Accidentally clearing it prevents cron emails from being sent.
- Use the admin cron test page to trigger start-date, deadline, payment, and weekly jobs; the date/time inputs feed the `/api/cron/test` route (`simulateTime`, `force`) for quick regression checks.
- Prisma migrations:
  - Never delete or rename existing folders inside `prisma/migrations`. Prisma compares those folders with `_prisma_migrations`; removing them forces a full DB reset.
  - Always run Prisma CLI commands via the npm scripts (they call `dotenv -e .env.local -- prisma …`) so `DATABASE_URL` and Neon TLS options are loaded.
  - If an older migration needs to alter a table that might not exist yet (e.g., shadow DB), wrap the `ALTER TABLE` in a `DO $$ BEGIN … EXCEPTION WHEN undefined_table THEN NULL; END $$;` block instead of removing the migration.
  - When you must acknowledge a migration manually, use `npx dotenv -e .env.local -- prisma migrate resolve --applied <migration_name>` rather than editing the migrations table by hand.
  - If you change a migration that has already run, recompute its SHA (`node -e "…"`) and update `_prisma_migrations.checksum` in the DB so Prisma no longer reports it as “modified after applied”.
