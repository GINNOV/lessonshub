// file: prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { defaultEmailTemplates as defaultTemplates } from '../src/lib/email-templates';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding the database with default email templates...');

  // Make sure your for-loop looks exactly like this:
  for (const [name, template] of Object.entries(defaultTemplates)) {
    await prisma.emailTemplate.upsert({
      where: { name: name },
      update: {},
      create: {
        name: name,
        subject: template.subject,
        body: template.body,
        buttonColor: template.buttonColor || null,
      },
    });
  }

  console.log('✅ Database has been seeded with email templates.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });