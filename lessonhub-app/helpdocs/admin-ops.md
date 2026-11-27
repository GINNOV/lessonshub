# Admin & operations

Administrators see a tile-based dashboard at `/dashboard`. Each tile opens one management area.

## Core areas

- **Users:** invite, suspend, or edit students and teachers. Pausing a user sets the same flag students toggle in Profile → Status.
- **Lessons:** review the lesson catalog, run migrations, or seed default templates.
- **Emails:** review transactional emails and marketing sends.
- **Settings:** configure global notices, value calculations, and feature flags.
- **Cron:** trigger start-date or reminder jobs by hand, or simulate specific timestamps for testing.
- **Profile:** the same view students see, with admin privileges for toggling break status or payment states.

## Cron schedule reminders

- `/api/cron/start` runs hourly (or daily at 10:00 UTC on Vercel Hobby) to deliver start-date notifications.
- `/api/cron/daily` handles reminders and weekly summaries at 09:00 UTC.
- The Cron Test page calls `/api/cron/test` with `simulateTime` and `force` options, so you can test the jobs without waiting for the schedule.

## Prisma rules

- Always run `npm run prisma:migrate` followed by `npm run prisma:generate` when schema changes land.
- Never remove folders inside `prisma/migrations`. Prisma compares them with `_prisma_migrations`.
- Seed data with `npx dotenv -e .env.local -- prisma db seed` to restore default email templates or badges.

## Security notes

- Environment secrets stay inside `.env.local`. Never commit them.
- Lesson price and teacher default price fields are Prisma `Decimal`s. The codebase converts them to numbers before it sends data to the client.
- The leaderboard shows positive savings in green and negative savings in red.

## Support playbook

- When students report Hub Guide access issues, confirm payment state in Profile or re-run the seed script if template data is missing.
- For lyric lesson errors mentioning LRC columns, remind teachers to run the latest Prisma migrate and generate commands.
- Ask students to keep their timezone up to date. Deadlines and email reminders use it.
