import { PrismaClient } from '@prisma/client';
import { defaultEmailTemplates as defaultTemplates } from '../src/lib/email-templates';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding the database with default email templates...');

  // Validate templates before processing
  const templateEntries = Object.entries(defaultTemplates);
  const invalidTemplates = templateEntries.filter(([name, template]) => 
    !name || !template.subject || !template.body
  );

  if (invalidTemplates.length > 0) {
    console.error('❌ Invalid templates found:', invalidTemplates.map(([name]) => name));
    throw new Error('All templates must have name, subject, and body');
  }

  // Prepare batch operations for better performance
  const operations = templateEntries.map(([name, template]) =>
    prisma.emailTemplate.upsert({
      where: { name: name },
      update: {},
      create: {
        name: name,
        subject: template.subject,
        body: template.body,
        buttonColor: template.buttonColor || null,
      },
    })
  );

  // Execute all operations in a transaction
  await prisma.$transaction(operations);

  // Log each processed template
  for (const [name] of templateEntries) {
    console.log(`✅ Upserted template: ${name}`);
  }

  console.log(`✅ Database has been seeded with ${templateEntries.length} email templates.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });