Prisma Migrations Notes

- Do not delete or rename existing folders in `prisma/migrations/`. Prisma compares these with `_prisma_migrations` and removing them can force a full reset.
- Some migrations have overlapping names (e.g., coupons, assignment drafts). These exist due to historical replays or fixes. Treat them as append-only history.
- If a migration was edited after being applied, recompute and update the checksum using `scripts/update_migration_checksum.sh` rather than deleting the migration.
