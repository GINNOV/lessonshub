# Troubleshooting & Tips

LessonHub is designed to be smooth, but sometimes things happen. Here is how to fix common issues.

## Common Issues

### Share Button Doesn't Work (iOS)
- **Issue:** Tapping share does nothing.
- **Fix:** Safari uses the native share sheet. Ensure pop-ups are allowed. If you dismissed the sheet, look for a "Link Copied" toast message—we automatically copy the link for you as a backup.

### Hub Guides Banner Won't Go Away
- **Issue:** You dismissed the banner, but it came back.
- **Fix:** This setting is saved in your browser cookies. If you clear your cookies, the banner resets.

### Missing Images in Guides/Lessons
- **Issue:** You uploaded an image, but it's not showing.
- **Fix:** Images only save when you click the **Save** button on the form. Try re-uploading. If you are reusing an image, use the **Image Browser** to select it from the library.

### Lyrics Not Syncing
- **Issue:** The lyrics aren't matching the music.
- **Fix:** This is usually a teacher-side setting. Teachers should check that the `.lrc` file columns are correct. The system now alerts teachers if columns are missing.

### CSV Import Fails
- **Issue:** You get an error when uploading a CSV.
- **Fix:**
    1. Check the header row (first line) matches exactly what the system expects.
    2. Ensure the file is **UTF-8** encoded.
    3. Remove any trailing commas.
    4. Wait for the "Parsing..." message to disappear before clicking submit.

### Emails Have the Wrong Time
- **Issue:** "Why did I get a reminder at 3 AM?"
- **Fix:** Go to **Profile → Update Profile** and set your **Timezone**.

### Leaderboard "Savings" Look Wrong
- **Issue:** The numbers don't add up.
- **Fix:** Savings are calculated from your graded assignments. If you see blank or red numbers unexpectedly, it might be due to a recent system reset (e.g., New Year).
