// file: prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { defaultEmailTemplates as defaultTemplates } from '../src/lib/email-templates';
import { BADGE_DEFINITIONS } from '../src/lib/gamification';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding the database with default email templates...');

  const templateEntries = Object.entries(defaultTemplates);
  
  // Debugging: Log the names of all templates found in the source file
  console.log('Found templates to seed:', templateEntries.map(([name]) => name).join(', '));

  const invalidTemplates = templateEntries.filter(([name, template]) => 
    !name || !template.subject || !template.body
  );

  if (invalidTemplates.length > 0) {
    console.error('❌ Invalid templates found:', invalidTemplates.map(([name]) => name));
    throw new Error('All templates must have name, subject, and body');
  }

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

  await prisma.$transaction(operations);

  for (const [name] of templateEntries) {
    console.log(`✅ Upserted template: ${name}`);
  }

  console.log(`✅ Database has been seeded with ${templateEntries.length} email templates.`);

  console.log('Seeding default badges...');
  for (const badge of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
      },
      create: {
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
      },
    });
    console.log(`🏅 Upserted badge: ${badge.name}`);
  }
  console.log(`✅ Seeded ${BADGE_DEFINITIONS.length} default badges.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
