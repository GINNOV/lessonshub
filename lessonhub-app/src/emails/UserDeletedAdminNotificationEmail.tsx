// file: src/emails/UserDeletedAdminNotificationEmail.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';

export interface UserDeletedAdminNotificationEmailProps {
  adminName?: string | null;
  deletedUserName?: string | null;
  deletedUserEmail: string;
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  maxWidth: 560,
};

const box: React.CSSProperties = { padding: '0 48px' };

const hr: React.CSSProperties = { borderColor: '#e6ebf1', margin: '20px 0' };

const h1: React.CSSProperties = {
  color: '#d9534f', // A soft red for deletion alerts
  fontSize: '32px',
  fontWeight: 700,
  margin: '30px 0',
  padding: 0,
  lineHeight: '42px',
};

const paragraph: React.CSSProperties = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left',
};

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: 12,
  lineHeight: '16px',
};

const UserDeletedAdminNotificationEmail: React.FC<Readonly<UserDeletedAdminNotificationEmailProps>> = ({
  adminName,
  deletedUserName,
  deletedUserEmail,
}) => {
  const previewText = `User account deleted: ${deletedUserName || deletedUserEmail}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={h1}>User Account Deleted</Heading>
            <Text style={paragraph}>Hi {adminName || 'Admin'},</Text>
            <Text style={paragraph}>
              A user has just deleted their account from LessonHUB.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              <strong>Name:</strong> {deletedUserName || 'Not provided'}
              <br />
              <strong>Email:</strong> {deletedUserEmail}
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              This is an automated notification from{' '}
              <Link
                href={process.env.AUTH_URL || 'https://lessonhub.com'}
                target="_blank"
                style={{ color: '#8898aa', textDecoration: 'underline' }}
              >
                LessonHUB
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default UserDeletedAdminNotificationEmail;