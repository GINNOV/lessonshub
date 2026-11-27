import prisma from "@/lib/prisma";

/**
 * Fetches a single email template by its unique name.
 * @param name The unique name of the template.
 * @returns A promise that resolves to the template object or null if not found.
 */
export async function loadEmailTemplateByName(name: string) {
  try {
    let template = await prisma.emailTemplate.findUnique({ where: { name } });
    if (!template) {
      const { defaultEmailTemplates } = await import('@/lib/email-templates');
      const def = (defaultEmailTemplates as any)[name];
      if (def) {
        template = await prisma.emailTemplate.create({
          data: {
            name,
            subject: def.subject,
            body: def.body,
            buttonColor: def.buttonColor,
            description: def.description ?? null,
            category: def.category ?? null,
          },
        });
      }
    }
    if (template && (template.description === null || template.category === null)) {
      const { defaultEmailTemplates } = await import('@/lib/email-templates');
      const def = (defaultEmailTemplates as any)[name];
      if (def) {
        template = await prisma.emailTemplate.update({
          where: { name },
          data: {
            description: template.description ?? def.description ?? null,
            category: template.category ?? def.category ?? null,
          },
        });
      }
    }
    return template;
  } catch (error) {
    console.error(`Failed to fetch email template "${name}":`, error);
    return null;
  }
}
