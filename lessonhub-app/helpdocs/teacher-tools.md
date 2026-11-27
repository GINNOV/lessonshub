# Teacher tools

Teachers work from `/dashboard` and related routes.

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
- LessonHub saves the results and updates student dashboards right away.
- The points awarded go to the Leaderboard and Gamification modules.

## Manage lessons

- Lesson list shows counts and status indicators.
- The difficulty selector uses the same filled bars that students see.
- Copy links via the share button or regenerate a public share ID when needed.

## Content creation quick tips

- **Instruction Booklets:** reusable text blocks for assignment instructions. Replace or append with a single click.
- **SoundCloud feed loader:** pulls the latest teacher tracks; select and insert without manual URLs.
- **CSV imports:** each creator lists required columns. Upload the file with the icon button and LessonHub parses it.
- **Lyric lessons:** upload audio and `.lrc` files; LessonHub informs students when timed lyrics are active.

## Hub Guide management

- Set `guideIsVisible` to hide drafts.
- Mark guides as `guideIsFreeForAll` when gifting content to all students.
- Guide updates appear with a timestamp so students know what changed.
