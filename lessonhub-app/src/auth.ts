// file: src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Basic env guards (fail fast in dev)
if (!process.env.EMAIL_FROM) {
  throw new Error("Missing EMAIL_FROM (e.g. no-reply@yourdomain.com)");
}
if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

// Small helper to build safe email HTML
function verificationHtml(url: string) {
  const escaped = url.replace(/"/g, "&quot;");
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
      <h2>Sign in to LessonHub</h2>
      <p>Click the button below to sign in:</p>
      <p>
        <a href="${escaped}" 
           style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:8px;border:1px solid #e5e7eb">
          Sign in
        </a>
      </p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
    </div>
  `;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM!,    // must be a Resend-verified domain
            to: email,
            subject: "Sign in to LessonHub",
            html: verificationHtml(url),
            text: `Sign in to LessonHub:\n\n${url}\n\nIf you didn’t request this, ignore this email.`,
          });
          if (error) {
            console.error("Resend error:", error);
            throw new Error("Resend failed to send verification email");
          }
          if (!data?.id) {
            throw new Error("Resend did not return a message id");
          }
        } catch (err: any) {
          console.error("Failed to send verification email:", err?.message || err);
          throw new Error("Failed to send verification email.");
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== "string" || !credentials.password) {
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.hashedPassword) return null;

        const ok = await bcrypt.compare(credentials.password as string, user.hashedPassword);
        return ok ? user : null;
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  // For Auth.js v5 prefer AUTH_SECRET (env). If on v4 keep NEXTAUTH_SECRET.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = (user as any).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token?.id) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
});