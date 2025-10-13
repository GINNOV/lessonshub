# **LessonHub**

LessonHub is a modern, full-stack educational platform built with Next.js and Prisma. It enables teachers to create, assign, and grade lessons, while students can view their assignments and submit responses. The platform supports multiple authentication methods, including password-based credentials, Google OAuth, and passwordless sign-in via Resend.

## **Features**

* **User Roles:** Clear distinction between TEACHER and STUDENT roles with different permissions.  
* **Multi-Provider Authentication:** Secure sign-in using Google, email (magic links via Resend), or traditional email and password.  
* **Lesson Management (Teachers):**  
  * Create lessons with titles, descriptions, and optional images.  
  * Assign lessons to multiple students with specific deadlines.  
  * View all submissions for a given lesson.  
* **Assignment Workflow (Students):**  
  * Dashboard to view all pending, completed, and graded assignments.  
  * Dedicated page to view lesson details and submit responses.  
* **Grading System (Teachers):**  
  * Review student responses side-by-side with the original lesson.  
  * Assign scores and provide written feedback.  
* **Email Notifications:** New users receive a beautifully styled welcome email upon registration.

## **Tech Stack**

* **Framework:** [Next.js](https://nextjs.org/) (App Router)  
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components  
* **Authentication:** [Auth.js (NextAuth.js v5)](https://authjs.dev/)  
* **Database ORM:** [Prisma](https://www.prisma.io/)  
* **Database:** [PostgreSQL](https://www.postgresql.org/) (designed for Neon/Vercel Postgres)  
* **Email Service:** [Resend](https://resend.com/) for transactional emails  
* **File Uploads:** [@vercel/blob](https://vercel.com/storage/blob) for image uploads

## **Getting Started**

Follow these instructions to get the project up and running on your local machine.

### **Prerequisites**

* Node.js (v18.17 or later)  
* npm, yarn, or pnpm  
* A PostgreSQL database (You can set one up for free on [Neon](https://neon.tech/))

### **1\. Clone the Repository**

git clone \[https://github.com/GINNOV/lessonshub.git\](https://github.com/GINNOV/lessonshub.git)  
cd lessonshub/lessonhub-app

### **2\. Install Dependencies**

npm install

### **3\. Set Up Environment Variables**

Create a .env.local file in the lessonhub-app directory by copying the example below. You will need to get credentials for Google, Resend, and your database provider.

\# .env.local

\# Database connection string from your provider (e.g., Neon)  
DATABASE\_URL="postgresql://user:password@host:port/dbname?sslmode=require"

\# Auth.js secret \- Generate one with \`openssl rand \-base64 32\`  
AUTH\_SECRET="your-super-secret-auth-secret"

\# Google OAuth credentials from Google Cloud Console  
GOOGLE\_CLIENT\_ID="your-google-client-id"  
GOOGLE\_CLIENT\_SECRET="your-google-client-secret"

\# Resend API Key and verified "From" address  
RESEND\_API\_KEY="re\_yourResendApiKey"  
EMAIL\_FROM="LessonHub \<noreply@your-verified-domain.com\>"

### **4\. Set Up the Database**

Push the Prisma schema to your database. This will create all the necessary tables.

npm run prisma:push

### **5\. Run the Development Server**

npm run dev

The application should now be running at [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).

## **Available Scripts**

* npm run dev: Starts the Next.js development server.  
* npm run build: Creates a production build of the application.  
* npm run start: Starts the production server.  
* npm run lint: Lints the codebase using ESLint.  
* npm run prisma:generate: Generates the Prisma Client based on your schema.  
* npm run prisma:push: Pushes the current Prisma schema state to the database.  
* npm run prisma:studio: Opens the Prisma Studio GUI to view and edit your database.

## **Deployment**

This project is optimized for deployment on [Vercel](https://vercel.com/).

1. Push your code to a GitHub repository.  
2. Import the repository into Vercel.  
3. Add the same environment variables from your .env.local file to your Vercel project's settings.  
4. Vercel will automatically build and deploy your application.

## **Project Structure**

lessonhub-app/  
├── prisma/               \# Prisma schema and database configuration  
├── public/               \# Static assets like images and fonts  
└── src/  
    ├── app/              \# Next.js App Router: pages, layouts, and API routes  
    │   ├── api/          \# API route handlers  
    │   ├── components/   \# Shared React components (UI elements, forms)  
    │   ├── dashboard/    \# Teacher-specific pages  
    │   └── ...           \# Other pages and routes  
    ├── auth.ts           \# Auth.js (NextAuth) configuration  
    ├── emails/           \# React Email templates  
    └── lib/              \# Library code (Prisma client, utility functions)  
    
# Update email templates
npx dotenv -e .env.local -- tsx prisma/seed.ts
