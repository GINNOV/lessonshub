#!/usr/bin/env bash

# Usage: scripts/update_migration_checksum.sh <migration_folder_name> [schema]
# Example: scripts/update_migration_checksum.sh 20251108123955_add_admin_portal_access

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <migration_folder_name> [schema]" >&2
  exit 1
fi

MIGRATION_NAME="$1"
SCHEMA_NAME="${2:-public}"
MIGRATION_PATH="prisma/migrations/${MIGRATION_NAME}/migration.sql"

if [[ ! -f "$MIGRATION_PATH" ]]; then
  echo "Migration file not found: ${MIGRATION_PATH}" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Export it or run via 'dotenv -e .env.local -- $0 ...'" >&2
  exit 1
fi

CHECKSUM="$(shasum -a 256 "$MIGRATION_PATH" | awk '{print $1}')"

echo "Updating checksum for '${MIGRATION_NAME}' to ${CHECKSUM}"

psql "$DATABASE_URL" <<SQL
UPDATE "${SCHEMA_NAME}"."_prisma_migrations"
SET checksum = '${CHECKSUM}'
WHERE migration_name = '${MIGRATION_NAME}';
SQL

echo "Done. Prisma will now treat ${MIGRATION_NAME} as up-to-date."
