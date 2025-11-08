# Troubleshooting & Tips

LessonHub rarely gets in your way. When it does, here are the fastest resolutions.

## Student share button doesn’t work on iOS

- Safari now uses the native share sheet. If it doesn’t appear, confirm that the site is saved as a trusted domain and that pop-ups are allowed.
- If the share sheet is dismissed, LessonHub automatically falls back to copying the link. Watch for the “Lesson link copied” toast.

## Hub Guides banner keeps returning

- The banner resets when cookies clear. If a student wants it hidden persistently, ask them to keep cookies enabled for LessonHub or use the native app once available.

## Guides or lessons missing images

- Re-upload the assignment or guide artwork using the Upload button. Files save only after clicking **Save** on the form.
- For repeated images, try Image Browser to select from existing assets.

## LRC or lyric sync errors

- Run `npm run prisma:migrate` then `npm run prisma:generate` to ensure the `lrcUrl` and `lrcStorageKey` fields exist.
- The UI now surfaces toast notifications describing any missing columns.

## CSV import fails

- Confirm the header row matches the format listed beside the Upload button.
- Use UTF-8 encoding and avoid trailing commas.
- LessonHub shows “Parsing…” in the UI; wait for it to finish before uploading another file.

## Emails show the wrong time

- Open Profile → Update Profile and set the correct timezone.
- Weekly summary opt-out toggles are available in the same form.

## Leaderboard savings look wrong

- Savings are derived from the latest assignments and payment data. If fields are blank or red unexpectedly, rerun the seed script to refresh badges and templates, then check assignment scoring.

## Need more help?

- Teachers contact LessonHub support directly.
- Students reach their teacher via in-app messaging or email.
- Admins log issues in the internal tracker linked from the Admin dashboard.
