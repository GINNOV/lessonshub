# Troubleshooting & tips

Fixes for the most common issues.

## Student share button doesn't work on iOS

- Safari uses the native share sheet. If it doesn't appear, confirm that the site is saved as a trusted domain and that pop-ups are allowed.
- If the share sheet is dismissed, LessonHub copies the link instead. Watch for the "Lesson link copied" toast.

## Hub Guides banner keeps returning

- The banner resets when cookies clear. If a student wants it to stay hidden, ask them to keep cookies enabled for LessonHub or use the native app once available.

## Guides or lessons missing images

- Re-upload the assignment or guide artwork using the Upload button. Files save only after clicking **Save** on the form.
- For repeated images, try Image Browser to select from existing assets.

## LRC or lyric sync errors

- Run `npm run prisma:migrate` then `npm run prisma:generate` to ensure the `lrcUrl` and `lrcStorageKey` fields exist.
- The UI shows a toast that names any missing columns.

## CSV import fails

- Confirm the header row matches the format listed beside the Upload button.
- Use UTF-8 encoding and avoid trailing commas.
- LessonHub shows "Parsing..." while it reads the file. Wait for it to finish before you upload another file.

## Emails show the wrong time

- Open Profile → Update Profile and set the correct timezone.
- Weekly summary opt-out toggles are available in the same form.

## Leaderboard savings look wrong

- Savings are derived from the latest assignments and payment data. If fields are blank or red when they should not be, rerun the seed script to refresh badges and templates, then check assignment scoring.

## Need more help?

- Teachers contact LessonHub support.
- Students reach their teacher via in-app messaging or email.
- Admins log issues in the internal tracker linked from the Admin dashboard.
