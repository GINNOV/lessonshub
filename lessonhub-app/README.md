# LessonHub

LessonHub is a full-stack teaching platform built with Next.js and Prisma. Teachers create, assign, and grade lessons. Students see their assignments and submit responses. Users sign in with a password, with Google OAuth, or with a passwordless email link sent through Resend.

## Features

* **Roles:** TEACHER and STUDENT accounts have different permissions.
* **Sign-in:** Google, email magic links through Resend, or email and password.
* **Lesson management for teachers:**
  * Create lessons with a title, a description, and an optional image.
  * Assign lessons to several students with a deadline for each.
  * View all submissions for a lesson.
* **Assignments for students:**
  * A dashboard lists pending, completed, and graded assignments.
  * Each lesson has a page with its details and a form to submit responses.
* **Grading for teachers:**
  * Review student responses next to the original lesson.
  * Assign scores and write feedback.
* **Email:** New users receive a welcome email when they register.

## Tech stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
* **Authentication:** [Auth.js (NextAuth.js v5)](https://authjs.dev/)
* **Database ORM:** [Prisma](https://www.prisma.io/)
* **Database:** [PostgreSQL](https://www.postgresql.org/), tested on Neon and Vercel Postgres
* **Email:** [Resend](https://resend.com/) for transactional email
* **File uploads:** [@vercel/blob](https://vercel.com/storage/blob) for images

## Getting started

These steps run the project on your machine.

### Prerequisites

* Node.js 18.17 or later
* npm, yarn, or pnpm
* A PostgreSQL database. [Neon](https://neon.tech/) has a free tier.

### 1. Clone the repository

```bash
git clone https://github.com/GINNOV/lessonshub.git
cd lessonshub/lessonhub-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env.local` file in the `lessonhub-app` directory from the example below. You need credentials for Google, Resend, and your database provider.

```bash
# .env.local

# Database connection string from your provider (for example, Neon)
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# Auth.js secret. Generate one with `openssl rand -base64 32`
AUTH_SECRET="your-super-secret-auth-secret"

# Google OAuth credentials from Google Cloud Console
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend API key and a verified "From" address
RESEND_API_KEY="re_yourResendApiKey"
EMAIL_FROM="LessonHub <noreply@your-verified-domain.com>"
```

### 4. Set up the database

Push the Prisma schema to your database. This creates the tables.

```bash
npm run prisma:push
```

### 5. Run the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

* `npm run dev` starts the Next.js development server.
* `npm run build` creates a production build.
* `npm run start` starts the production server.
* `npm run lint` runs ESLint.
* `npm run prisma:generate` generates the Prisma Client from the schema.
* `npm run prisma:push` pushes the Prisma schema to the database.
* `npm run prisma:studio` opens Prisma Studio to view and edit the database.

## Deployment

The project deploys to [Vercel](https://vercel.com/).

1. Push your code to a GitHub repository.
2. Import the repository into Vercel.
3. Add the environment variables from `.env.local` to the Vercel project settings.
4. Vercel builds and deploys the app on each push.

## Project structure

```text
lessonhub-app/
├── prisma/               # Prisma schema and database configuration
├── public/               # Static assets such as images and fonts
└── src/
    ├── app/              # Next.js App Router pages, layouts, and API routes
    │   ├── api/          # API route handlers
    │   ├── components/   # Shared React components (UI elements, forms)
    │   ├── dashboard/    # Teacher pages
    │   └── ...           # Other pages and routes
    ├── auth.ts           # Auth.js (NextAuth) configuration
    ├── emails/           # React Email templates
    └── lib/              # Library code (Prisma client, utility functions)
```

## Update email templates

```bash
npx dotenv -e .env.local -- tsx prisma/seed.ts
```
