// file: src/app/privacy/page.tsx

import type { Metadata } from 'next'
import PrivacyPreferencesPanel from '@/app/components/PrivacyPreferencesPanel'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'LessonHUB privacy policy describing how we collect and use personal information.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto prose prose-lg prose-slate prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last Updated:</strong> January 11, 2026
      </p>

      <h2>1. Who We Are</h2>
      <p>
        LessonHUB is operated by QuantifyThis ("we," "us," or "our"). This
        Privacy Policy explains how we collect, use, and protect personal data
        when you use our website, apps, and services.
      </p>
      <p>
        If you have questions about this policy or your data rights, contact us
        at <a href="mailto:contact@quantifythis.com">contact@quantifythis.com</a>.
      </p>

      <h2>2. Personal Data We Collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email address, password (hashed),
          role, profile image, timezone, language preference, and optional bio
          fields.
        </li>
        <li>
          <strong>Learning data:</strong> lesson assignments, submissions,
          scores, comments, progress, and related activity.
        </li>
        <li>
          <strong>Usage data:</strong> device identifiers, IP address, browser
          type, and login events.
        </li>
        <li>
          <strong>Billing data:</strong> payment status, coupons redeemed, and
          related metadata.
        </li>
      </ul>

      <h2>3. Legal Bases for Processing (GDPR)</h2>
      <ul>
        <li>
          <strong>Contract:</strong> to provide your account, lessons, and core
          services.
        </li>
        <li>
          <strong>Consent:</strong> for optional analytics/marketing cookies and
          communications where required.
        </li>
        <li>
          <strong>Legitimate interests:</strong> to improve the platform,
          prevent abuse, and secure our services.
        </li>
        <li>
          <strong>Legal obligations:</strong> to meet financial, tax, or
          regulatory requirements.
        </li>
      </ul>

      <h2>4. How We Use Personal Data</h2>
      <ul>
        <li>Create and manage accounts and lesson delivery.</li>
        <li>Send service emails (assignments, reminders, grading updates).</li>
        <li>Provide support and respond to inquiries.</li>
        <li>Improve the user experience and platform performance.</li>
        <li>Detect, prevent, and address fraud or abuse.</li>
      </ul>

      <h2>5. Cookies and Tracking</h2>
      <p>
        We use essential cookies to keep LessonHUB secure and functional.
        Optional analytics and marketing cookies are used only with your
        consent. You can update your cookie preferences at any time below.
      </p>
      <div id="cookie-preferences" className="not-prose">
        <PrivacyPreferencesPanel />
      </div>

      <h2>6. Sharing and Processors</h2>
      <p>
        We do not sell your personal data. We may share it with trusted service
        providers that help us operate LessonHUB, such as hosting, email, and
        analytics vendors. These providers process data under strict
        confidentiality and security obligations.
      </p>

      <h2>7. International Transfers</h2>
      <p>
        If you access LessonHUB from outside the United States, your data may be
        transferred and processed in countries with different data protection
        laws. We use contractual safeguards where required.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        We retain personal data for as long as your account is active and as
        needed to provide services, comply with legal obligations, resolve
        disputes, and enforce agreements. When data is no longer needed, we
        delete or anonymize it.
      </p>

      <h2>9. Your GDPR Rights</h2>
      <p>
        If you are located in the EEA, UK, or Switzerland, you may have the
        right to access, correct, delete, restrict, or object to processing of
        your personal data, and to request data portability. You may withdraw
        consent at any time.
      </p>
      <p>
        You can delete your account from the profile page. You can also request
        a copy of your data from the same page. Contact us if you need further
        assistance.
      </p>

      <h2>10. Security</h2>
      <p>
        We use administrative, technical, and physical safeguards to protect
        data. No system is completely secure, so we cannot guarantee absolute
        security.
      </p>

      <h2>11. Children&apos;s Privacy</h2>
      <p>
        LessonHUB is not intended for children under 13. We do not knowingly
        collect personal data from children under 13.
      </p>

      <h2>12. Updates to This Policy</h2>
      <p>
        We may update this policy from time to time. The latest version will be
        posted on this page with the revised date.
      </p>
    </div>
  );
}
