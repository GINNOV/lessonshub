// file: src/emails/WelcomeEmail.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

export interface WelcomeEmailProps {
  userName?: string | null;
  userEmail?: string;        // optional; include if you want to show it
  signInUrl: string;         // required (you pass this from the route)
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
  color: '#1d1c1d',
  fontSize: '36px',
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

const button: React.CSSProperties = {
  backgroundColor: '#007bff',
  borderRadius: 5,
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  width: '100%',
  padding: '14px 0',
};

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: 12,
  lineHeight: '16px',
};

const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  userName,
  userEmail,
  signInUrl,
}) => {
  const previewText = `Welcome to LessonHub, ${userName || ''}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={h1}>Welcome to LessonHub!</Heading>
            <Text style={paragraph}>Hi {userName || 'there'},</Text>
            {userEmail ? (
              <Text style={paragraph}>
                We’ve set up your account for <strong>{userEmail}</strong>.
              </Text>
            ) : null}
            <Text style={paragraph}>
              We’re thrilled to have you on board. Get ready to create, assign,
              and manage your lessons with ease.
            </Text>
            <Button style={button} href={signInUrl}>
              Sign In to Your Account
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              LessonHub — The modern platform for modern learning.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;