import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    assignment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/actions/adminActions', () => ({
  getEmailTemplateByName: vi.fn(),
}));

vi.mock('@/lib/email-templates', () => ({
  createButton: vi.fn((text: string, url: string) => url),
  defaultEmailTemplates: {},
}));

vi.mock('@/lib/email-templates.server', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getEmailTemplateByName } from '@/actions/adminActions';
import { createButton } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email-templates.server';
import { sendStartDateNotifications } from '@/actions/cronActions';

describe('sendStartDateNotifications', () => {
  const originalAuthUrl = process.env.AUTH_URL;

  beforeEach(() => {
    process.env.AUTH_URL = 'https://quantifythis.com';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.AUTH_URL = originalAuthUrl;
  });

  it('links new assignment emails to the assignment detail page', async () => {
    const assignments = [
      {
        id: 'assignment-123',
        student: { email: 'student@example.com', name: 'Student', timeZone: null },
        lesson: { title: 'Lesson Title', teacher: { name: 'Teacher' } },
        deadline: new Date('2026-01-20T10:00:00Z'),
      },
    ];

    vi.mocked(prisma.assignment.findMany).mockResolvedValue(assignments as never);
    vi.mocked(getEmailTemplateByName).mockResolvedValue({ buttonColor: '#000000' } as never);

    await sendStartDateNotifications(new Date('2026-01-20T09:00:00Z'), 60);

    expect(createButton).toHaveBeenCalledWith(
      'Start Lesson',
      'https://quantifythis.com/assignments/assignment-123',
      '#000000',
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(payload.data.button).toBe('https://quantifythis.com/assignments/assignment-123');
  });
});
