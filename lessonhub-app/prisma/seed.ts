// file: prisma/seed.ts
delete process.env.PRISMA_CLIENT_ENGINE_TYPE;
delete process.env.PRISMA_CLIENT_ENGINE_LIBRARY_PATH;
delete process.env.PRISMA_ACCELERATE_URL;
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';

const { PrismaClient } = await import('@prisma/client');
const { Pool } = await import('pg');
const { PrismaPg } = await import('@prisma/adapter-pg');
const { defaultEmailTemplates: defaultTemplates } = await import('../src/lib/email-templates');
const { BADGE_DEFINITIONS } = await import('../src/lib/gamification');

console.log('PRISMA_CLIENT_ENGINE_TYPE before client init:', process.env.PRISMA_CLIENT_ENGINE_TYPE);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding the database with default email templates...');

  const templateEntries = Object.entries(defaultTemplates);
  const existingTemplates = await prisma.emailTemplate.findMany({ select: { name: true } });
  const existingNames = new Set(existingTemplates.map((t) => t.name));
  
  // Debugging: Log the names of all templates found in the source file
  console.log('Found templates to seed:', templateEntries.map(([name]) => name).join(', '));

  const invalidTemplates = templateEntries.filter(([name, template]) => 
    !name || !template.subject || !template.body
  );

  if (invalidTemplates.length > 0) {
    console.error('❌ Invalid templates found:', invalidTemplates.map(([name]) => name));
    throw new Error('All templates must have name, subject, and body');
  }

  for (const [name, template] of templateEntries) {
    await prisma.emailTemplate.upsert({
      where: { name },
      update: {},
      create: {
        name,
        subject: template.subject,
        body: template.body,
        buttonColor: template.buttonColor || null,
      },
    });
  }

  const newlyAdded = templateEntries
    .map(([name]) => name)
    .filter((name) => !existingNames.has(name));

  if (newlyAdded.length > 0) {
    console.log(`✅ Added new templates: ${newlyAdded.join(', ')}`);
  } else {
    console.log('ℹ️ No new templates were added (all were already present).');
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
