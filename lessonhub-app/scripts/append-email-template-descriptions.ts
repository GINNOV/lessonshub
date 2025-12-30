// file: scripts/append-email-template-descriptions.ts
import prisma from '../src/lib/prisma';
import { defaultEmailTemplates } from '../src/lib/email-templates';

async function main() {
  for (const [name, def] of Object.entries(defaultEmailTemplates)) {
    if (!def.description) continue;
    const template = await prisma.emailTemplate.findUnique({ where: { name } });
    if (!template) continue;
    const existing = template.description ?? '';
    const next = existing.includes(def.description)
      ? existing
      : existing
        ? `${existing}\n\n${def.description}`
        : def.description;
    const category = template.category ?? def.category ?? null;
    await prisma.emailTemplate.update({
      where: { name },
      data: { description: next, category },
    });
  }
}

main()
  .catch((error) => {
    console.error('Failed to append email template descriptions:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
