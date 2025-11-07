# Gemini-Specific Notes

- Always run Prisma commands through the npm scripts (they wrap `dotenv -e .env.local -- prisma …`). Running bare `npx prisma …` will miss `DATABASE_URL` and Neon TLS settings, causing P1012/P1011 errors.
- Never delete or rename existing folders under `prisma/migrations`; Prisma compares them with the `_prisma_migrations` table and will demand a destructive reset if anything disappears.
- If a historical migration needs to touch a table that might not exist yet (e.g., when Prisma spins up the shadow database), wrap the change in `DO $$ BEGIN … EXCEPTION WHEN undefined_table THEN NULL; END $$;` so the migration becomes a no-op instead of being removed.
- To acknowledge a migration manually, run `npx dotenv -e .env.local -- prisma migrate resolve --applied <name>` rather than editing the DB.
- When editing an already-applied migration file, recompute its SHA (`node -e "const fs=require('fs');const crypto=require('crypto');const file=fs.readFileSync('<path>','utf8');console.log(crypto.createHash('sha256').update(file).digest('hex'));"`) and update the `_prisma_migrations.checksum` row so Prisma knows the change was intentional.
