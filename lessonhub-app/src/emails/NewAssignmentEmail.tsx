// file: src/emails/NewAssignmentEmail.tsx
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
  Link,
} from '@react-email/components';
import * as React from 'react';

export interface NewAssignmentEmailProps {
  studentName?: string | null;
  lessonTitle: string;
  teacherName?: string | null;
  deadline: Date;
  assignmentUrl: string;
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

const NewAssignmentEmail: React.FC<Readonly<NewAssignmentEmailProps>> = ({
  studentName,
  lessonTitle,
  teacherName,
  deadline,
  assignmentUrl,
}) => {
  const previewText = `You have a new assignment: "${lessonTitle}"`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={h1}>New Assignment!</Heading>
            <Text style={paragraph}>Hi {studentName || 'there'},</Text>
            <Text style={paragraph}>
              Your teacher, {teacherName || 'your teacher'}, has assigned you a new lesson: <strong>{lessonTitle}</strong>.
            </Text>
            <Text style={paragraph}>
              Please complete it by: <strong>{new Date(deadline).toLocaleString()}</strong>
            </Text>
            <Button style={button} href={assignmentUrl}>
              Start Lesson
            </Button>
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

export default NewAssignmentEmail;