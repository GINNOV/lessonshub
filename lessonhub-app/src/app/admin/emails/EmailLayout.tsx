// file: src/emails/EmailLayout.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';
import * as React from 'react';

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

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: 12,
  lineHeight: '16px',
};

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export const EmailLayout: React.FC<Readonly<EmailLayoutProps>> = ({
  previewText,
  children,
}) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            {children}
            <Hr style={hr} />
            <Text style={footer}>
              <Link
                href="https://quantifythis.com"
                target="_blank"
                style={{ color: '#8898aa', textDecoration: 'underline' }}
              >
                LessonHUB
              </Link>{' '}
              — The modern platform for modern learning.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};