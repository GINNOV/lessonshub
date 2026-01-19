# Teacher Tools

Teachers work from `/dashboard` and related routes. The workflow is direct, predictable, and fast.

## Assign lessons

- Open `/dashboard/assign/[lessonId]`.
- Use the student search and filters to choose recipients.
- Bulk-select, set start and deadline dates, and choose notification timing.
- Submit to create assignments. LessonHub patches `/api/assignments` in one action.
- **Schedule map:** each calendar cell shows three numbers.
  - **Top (calendar day):** the day of the month.
  - **Green (start day):** the most common start day for assignments due on that date.
  - **Red (due day):** the due day for assignments on that date.

## Grade submissions

- Visit `/dashboard/grade/[assignmentId]`.
- Review answers, add per-question comments, and assign scores.
- LessonHub writes results to Prisma and updates student dashboards instantly.
- Points awarded feed Leaderboard and Gamification without extra steps.

## Manage lessons

- Lesson list shows counts and status indicators.
- Difficulty selector uses the same filled bars as the student view, keeping expectations aligned.
- Copy links via the share button or regenerate a public share ID when needed.

## Content creation quick tips

- **Instruction Booklets:** reusable text blocks for assignment instructions. Replace or append with a single click.
- **SoundCloud feed loader:** pulls the latest teacher tracks; select and insert without manual URLs.
- **CSV imports:** each creator lists required columns. Upload via the icon button and watch LessonHub parse the file automatically.
- **Lyric lessons:** upload audio and `.lrc` files; LessonHub informs students when timed lyrics are active.

## Hub Guide management

- Set `guideIsVisible` to hide drafts.
- Mark guides as `guideIsFreeForAll` when gifting content to all students.
- Guide updates appear with a timestamp so students know what changed.
