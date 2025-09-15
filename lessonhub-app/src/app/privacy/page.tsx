// file: src/app/privacy/page.tsx

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto prose prose-lg">
      <h1>Privacy Policy for LessonHUB</h1>
      <p>
        <strong>Last Updated:</strong> September 6, 2025
      </p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to LessonHUB (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and what rights you have in relation to it. This policy applies to all information collected through our website and services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>
        We collect personal information that you voluntarily provide to us when you register an account, as well as information that is collected automatically.
      </p>
      <ul>
        <li>
          <strong>Personal Information You Disclose to Us:</strong> We collect your name, email address, password (in a hashed format), and role (Student, Teacher, or Admin). You may also voluntarily provide a profile image.
        </li>
        <li>
          <strong>Information from Third-Party Services:</strong> If you choose to register or log in using a third-party service like Google, we will collect your name, email address, and profile picture from that service.
        </li>
        <li>
          <strong>Usage Data:</strong> We may automatically collect information about your device and how you interact with our service, such as your IP address and last seen date.
        </li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>
        We use the information we collect for various purposes, including to:
      </p>
      <ul>
        <li>Create and manage your account.</li>
        <li>Provide, operate, and maintain our services.</li>
        <li>Enable communication between Teachers and Students.</li>
        <li>Send you transactional emails, such as new assignment notifications, reminders, and grading updates.</li>
        <li>Respond to your requests and provide customer support.</li>
        <li>Improve our website and services.</li>
      </ul>

      <h2>4. How We Share Your Information</h2>
      <p>
        We do not sell your personal information. We may share your information with third-party vendors and service providers that perform services for us, such as:
      </p>
      <ul>
        <li>Database hosting (e.g., Vercel Postgres, Neon).</li>
        <li>Email delivery services (e.g., Resend).</li>
        <li>Authentication providers (e.g., Google).</li>
      </ul>
      <p>
        We may also disclose your information if we are required to do so by law.
      </p>
      
      <h2>5. Data Security</h2>
      <p>
        We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
      </p>
      
      <h2>6. Your Data Protection Rights</h2>
      <p>
        You have the following data protection rights:
      </p>
      <ul>
        <li><strong>The right to access:</strong> You can request copies of your personal data.</li>
        <li><strong>The right to rectification:</strong> You can request that we correct any information you believe is inaccurate or complete information you believe is incomplete. You can manage your name and profile picture from your profile page.</li>
        <li><strong>The right to erasure:</strong> You can request that we erase your personal data, under certain conditions. You can delete your own account from your profile page.</li>
      </ul>

      <h2>7. Children&apos;s Privacy</h2>
      <p>
        Our services are not intended for use by children under the age of 13, and we do not knowingly collect personal information from children under 13.
      </p>

      <h2>8. Changes to This Privacy Policy</h2>
      <p>
        We may update this privacy policy from time to time. The updated version will be indicated by a revised &quot;Last Updated&quot; date.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have questions or comments about this policy, you may contact us through the information provided on our Contact Us page.
      </p>
    </div>
  );
}