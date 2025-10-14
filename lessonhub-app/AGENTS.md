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
- Prisma tooling: `npm run prisma:migrate`, `prisma:studio`, `prisma:db:push`, `prisma:generate` (all load `.env.local`).

## Architecture & Workflows
- Student view: `src/app/my-lessons/page.tsx` renders `StudentLessonList`, which shows `StudentLessonCard`s, supports search (title/teacher), status filters (ALL/PENDING/GRADED/FAILED with matching status colors), and groups cards by week using `WeekDivider`; sorted by nearest deadline.
- Teacher view: `src/app/dashboard/assign/[lessonId]/page.tsx` uses `AssignLessonForm` to search/filter students, bulk-select, set start/deadline, choose notification timing, and PATCH `/api/assignments`.
- Component split: `StudentLessonList` is read-only (display + filters). `AssignLessonForm` owns assignment mutations. Do not merge these concerns.
 - Assignment page: Uses `LessonContentView` to render audio material, additional information, supporting image, and attachments consistently.
- Data shaping: Convert Prisma `Decimal` to numbers before sending to client (e.g., lesson `price`, teacher `defaultLessonPrice`). Keep `_count` out of client objects except mapped fields like `completionCount`.

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
