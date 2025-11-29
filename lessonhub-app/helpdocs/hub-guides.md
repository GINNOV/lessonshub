# Hub Guides

Hub Guides deliver on-demand practice between assignments. Think of them as LessonHub’s curated library.

## Access levels

- **Paying students:** full catalog, dismissible banner, and two-tab layout on `/my-lessons`.
- **Free students:** select “Free access” guides, plus a call-to-action to upgrade via Profile → Billing.
- **Teachers:** build guides from the Guide Creator; each guide becomes available automatically once marked visible.

## Guide cards

- **Preview image:** custom art or the default `my-guides` cover.
- **Badge:** “Hub Guide” with the layered icon.
- **Description:** Markdown-enabled summary; instructions are trimmed to remove “👉🏼 INSTRUCTIONS” prefixes.
- **Price:** pulled from Prisma decimals and rendered with a USD formatter.
- **Difficulty:** same filled indicator as lessons.
- **Updated date:** always present so students know what’s fresh.
- **Free access pill:** appears when a guide is globally unlocked.

## Player experience

- Each guide opens at `/guides/[guideId]`.
- The page mirrors Apple’s calm layout: hero image, update timestamp, preview Markdown, instructions, and the Guide Player.
- Attachments, audio, and `.lrc` lyric imports are supported automatically.

## Tips for teachers

- Upload audio and LRC in Lyric Lesson Editor; LessonHub disables manual edits while the LRC is active, preventing accidental drift.
- Use CSV imports when you need to seed dozens of cards; column order is listed directly in the creator UI.
- Set `guideIsFreeForAll` to true when releasing seasonal or promotional content.
