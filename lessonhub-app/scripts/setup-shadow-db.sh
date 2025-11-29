#!/usr/bin/env bash
# Helper to sanity-check Prisma shadow DB setup. With --create, it will create a new shadow DB
# on the same host and print the env var to set.

set -euo pipefail

ENV_FILE=".env.local"
SHADOW_NAME=""
DO_CREATE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --create) DO_CREATE=true; shift ;;
    --shadow-name) SHADOW_NAME="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found. Create it with DATABASE_URL first." >&2
  exit 1
fi

if $DO_CREATE && ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql is required for --create. Install postgres client tools." >&2
  exit 1
fi

python - "$ENV_FILE" "$DO_CREATE" "$SHADOW_NAME" <<'PY'
import os, sys, urllib.parse, random, string, subprocess, json

env_path = sys.argv[1]
do_create = sys.argv[2].lower() == 'true'
shadow_name_arg = sys.argv[3]

with open(env_path) as f:
  lines = f.read().splitlines()

def get_var(name):
  for line in lines:
    if line.strip().startswith(f"{name}="):
      val = line.split("=",1)[1].strip().strip('"').strip("'")
      return val
  return os.environ.get(name)

def parse(url):
  if not url:
    return None
  p = urllib.parse.urlparse(url)
  return {
    "raw": url,
    "host": p.hostname or "",
    "db": (p.path or "").lstrip("/"),
    "user": p.username or "",
    "scheme": p.scheme or "",
  }

db_url = get_var("DATABASE_URL")
shadow_url = get_var("PRISMA_MIGRATE_SHADOW_DATABASE_URL") or get_var("SHADOW_DATABASE_URL")

main = parse(db_url)
shadow = parse(shadow_url)

if not main:
  print("❌ DATABASE_URL not found in .env.local or environment.", file=sys.stderr)
  sys.exit(2)

def suggest_shadow(main_db):
  if shadow_name_arg:
    return shadow_name_arg
  base = main_db or "shadow_db"
  suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
  return f"{base}_shadow_{suffix}"

shadow_db_name = suggest_shadow(main["db"])
shadow_suggestion = None
if main and (not shadow or shadow["db"] == main["db"]):
  parsed = urllib.parse.urlparse(db_url)
  new_path = "/" + shadow_db_name
  shadow_suggestion = parsed._replace(path=new_path).geturl()

print("Prisma datasource summary\n--------------------------")
print(f"Main:    {main['scheme']}://{main['user']}@{main['host']}/{main['db']}")
if shadow:
  print(f"Shadow:  {shadow['scheme']}://{shadow['user']}@{shadow['host']}/{shadow['db']}")
else:
  print("Shadow:  (not set)")

if shadow and shadow["db"] == main["db"]:
  print("\n⚠️  Shadow DB points to the same database as main. Use a separate database.")
elif not shadow:
  print("\n⚠️  Shadow DB not configured. Prisma will reuse the main DB unless you set it.")
else:
  print("\n✅ Shadow DB is distinct from main.")

if not do_create:
  print("\nNext steps:")
  if shadow_suggestion:
    print(f"1) Create a shadow database on your Postgres host:")
    print(f"   psql \"{db_url}\" -c \"CREATE DATABASE {shadow_db_name};\"")
    print(f"2) Add to .env.local:")
    print(f"   PRISMA_MIGRATE_SHADOW_DATABASE_URL=\"{shadow_suggestion}\"")
    print(f"3) Run migrations with dotenv:")
    print(f"   npx dotenv -e .env.local -- prisma migrate dev")
  else:
    print("1) Ensure the shadow DB exists on your Postgres host.")
    print("2) Keep PRISMA_MIGRATE_SHADOW_DATABASE_URL pointing to that DB.")
    print("3) Run: npx dotenv -e .env.local -- prisma migrate dev")
  sys.exit(0)

if shadow and shadow["db"] != main["db"]:
  print("\n✅ Shadow DB already distinct. Nothing to create.", file=sys.stderr)
  sys.exit(0)

target_dbname = shadow_db_name
create_cmd = ["psql", db_url, "-c", f"CREATE DATABASE {target_dbname};"]
exists_cmd = ["psql", db_url, "-tAc", f"SELECT 1 FROM pg_database WHERE datname='{target_dbname}'"]

def run(cmd):
  try:
    out = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
    return 0, out
  except subprocess.CalledProcessError as e:
    return e.returncode, e.output.decode()

code, out = run(exists_cmd)
if code == 0 and out.strip() == "1":
  print(f"\nℹ️  Shadow DB {target_dbname} already exists. Skipping create.")
else:
  code, out = run(create_cmd)
  if code != 0:
    print("❌ Failed to create shadow DB:\n" + out, file=sys.stderr)
    sys.exit(code)
  print(f"\n✅ Created shadow database {target_dbname} on {main['host']}.")

new_shadow_url = shadow_suggestion or shadow_url
print("\nAdd to .env.local (replace existing shadow URL if present):")
print(f"PRISMA_MIGRATE_SHADOW_DATABASE_URL=\"{new_shadow_url}\"")
print("\nThen run:")
print("npx dotenv -e .env.local -- prisma migrate dev")
PY
