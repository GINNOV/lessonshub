# Push notifications (tabled)

Context
- Goal: send notifications to mobile when a new lesson is available or grading has been completed.
- Delivery should mirror current email delivery.
- Current platform: Vercel; no push infrastructure in place yet.
- User preference control: new `/profile` tab named “Communications”.
- First notification types: grading completed, new assignment, late submission reminder.

Open decisions
- Delivery channel: Web Push (PWA via VAPID + service worker) vs third-party provider (OneSignal) vs native app push (APNs/FCM).
- Exact trigger mapping to existing email events:
  - New assignment: on assignment creation vs start-date cron vs when lesson becomes visible.
  - Grading completed: when teacher marks graded vs when feedback saved.
  - Late submission reminder: align with existing cron timing.
- Recipients: student only or include parent/guardian accounts if those exist.

Suggested next steps (if revived)
- Add data model for push subscriptions and per-user notification prefs.
- Add service worker + subscribe/unsubscribe UI under `/profile` → “Communications”.
- Mirror existing email triggers (assignment creation/start-date cron/grade/late reminder cron) to push delivery when enabled.
