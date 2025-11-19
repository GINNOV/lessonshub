## LessonHub iOS Notes

### API parity / data needs
- `/api/profile` now returns Control Center data (progress card strings, login history, break status, password updates). If we add new fields on the web dashboard (e.g. badges, referral stats), expose them here so the app stays visually aligned.
- Assignment payload currently derives `lessonHeroImageURL` locally by mapping `lesson.type` to `/my-lessons/*` images. If the web adds new lesson types or migrates to CMS-provided art, mirror that mapping in the model.
- Markdown-rich fields (assignment text, lesson preview) use a lossy sanitizer. Consider shipping a tiny Markdown-to-plain converter or adopt AttributedString(markdown:) to keep bold/italic styling.

### UI polish ideas
- Student cards still lack the share link tap target, teacher avatars, and progress bars identical to StudentLessonCard.tsx. Revisit once we introduce native share sheets + avatars.
- Progress card CTA currently renders as a simple `Link`; match the web's InvestDialog behavior with a native modal/WebView for deeper parity.
- Add `LessonType` enum locally so we can surface different actions (Flashcard practice, quiz replays) on the native card footer.

### Tech debt / cleanup
- Profile state is duplicated between `DashboardViewModel` and `ProfileViewModel`. Consider centralizing profile info in `AuthenticationManager` or a shared store to avoid multiple fetches.
- Difficulty color logic lives inside the model. Moving this to a small helper struct would keep SwiftUI-free models cleaner.
- We parse NextAuth cookies implicitly; if we ever need authenticated requests beyond `/api/profile` and `/api/auth`, build a tiny APIClient that injects tokens/cookies and centralizes error handling.

