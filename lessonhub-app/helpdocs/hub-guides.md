# Hub Guides

Hub Guides are a library of extra practice material that students can open at any time between assignments.

## Access levels

- **Paying students:** full catalog, dismissible banner, and two-tab layout on `/my-lessons`.
- **Free students:** "Free access" guides only, plus a button to upgrade in Profile → Billing.
- **Teachers:** build guides from the Guide Creator; each guide becomes available once it is marked visible.

## Guide cards

- **Preview image:** custom art or the default `my-guides` cover.
- **Badge:** "Hub Guide" with the layered icon.
- **Description:** Markdown-enabled summary; instructions are trimmed to remove "👉🏼 INSTRUCTIONS" prefixes.
- **Price:** pulled from Prisma decimals and rendered with a USD formatter.
- **Difficulty:** same filled indicator as lessons.
- **Updated date:** always shown, so students can see when the guide last changed.
- **Free access pill:** appears when a guide is globally unlocked.

## Player experience

- Each guide opens at `/guides/[guideId]`.
- The page shows, in order: the header image, the update timestamp, the preview Markdown, the instructions, and the Guide Player.
- Attachments, audio, and `.lrc` lyric imports are supported.

## Tips for teachers

- Upload audio and LRC in Lyric Lesson Editor; LessonHub disables manual edits while the LRC is active, so the timings stay as imported.
- Use CSV imports when you need dozens of cards. The creator lists the column order next to the Upload button.
- Set `guideIsFreeForAll` to true when releasing seasonal or promotional content.
