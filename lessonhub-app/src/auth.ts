// file: src/auth.ts

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import ResendProvider from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// ---- Required env (v5) ----
if (!process.env.AUTH_SECRET) throw new Error("Missing AUTH_SECRET");
if (!process.env.EMAIL_FROM) throw new Error("Missing EMAIL_FROM");
if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
// AUTH_URL recommended in prod; not fatal in local dev.

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Providers
  providers: [
    // Passwordless email via Resend (no Nodemailer)
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM!, // must be on a verified Resend domain
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

  session: { strategy: "jwt" },

  secret: process.env.AUTH_SECRET,

  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;

        // --- NEW: Update lastSeen on session validation ---
        if (session.user.role === Role.STUDENT) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: { lastSeen: new Date() },
          });
        }
      }
      return session;
    },
  },
});

