# Admin & Operations

Administrators see a tile-based dashboard at `/dashboard`. Each tile links to a dedicated management area.

## Core areas

- **Users:** invite, suspend, or edit students and teachers. Pausing a user sets the same flag students toggle in Profile → Status.
- **Lessons:** review catalog health, run migrations, or seed default templates.
- **Emails:** monitor transactional emails and marketing sends.
- **Settings:** configure global notices, value calculations, and feature flags.
- **Cron:** trigger start-date or reminder jobs manually, or simulate specific timestamps for testing.
- **Profile:** the same view students see, with admin privileges for toggling break status or payment states.

## Cron schedule reminders

- `/api/cron/start` runs hourly (or daily at 10:00 UTC on Vercel Hobby) to deliver start-date notifications.
- `/api/cron/daily` handles reminders and weekly summaries at 09:00 UTC.
- The Cron Test page calls `/api/cron/test` with `simulateTime` and `force` options for safe regression checks.

## Prisma discipline

- Always run `npm run prisma:migrate` followed by `npm run prisma:generate` when schema changes land.
- Never remove folders inside `prisma/migrations`; Prisma compares them with `_prisma_migrations`.
- Seed data with `npx dotenv -e .env.local -- prisma db seed` to restore default email templates or badges.

## Security notes

- Environment secrets stay inside `.env.local`. Never commit them.
- Lesson price and teacher default price fields are Prisma `Decimal`s. Convert them to numbers before sending data to the client (already handled in the codebase).
- Leaderboard displays savings with explicit red/green cues to avoid miscommunication.

## Support playbook

- When students report Hub Guide access issues, confirm payment state in Profile or re-run the seed script if template data is missing.
- For lyric lesson errors mentioning LRC columns, remind teachers to run the latest Prisma migrate and generate commands.
- Encourage students to keep their timezone up to date—deadlines and email reminders depend on it.
