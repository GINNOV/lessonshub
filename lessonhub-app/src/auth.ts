// file: src/auth.ts
import NextAuth from "next-auth";
import type { LoggerInstance } from "@auth/core/types";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import ResendProvider from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { createButton } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email-templates.server";

if (!process.env.AUTH_SECRET) throw new Error("Missing AUTH_SECRET");
if (!process.env.EMAIL_FROM) throw new Error("Missing EMAIL_FROM");
if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM!,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const user = await prisma.user.findUnique({ where: { email } });
        const userName = user?.name || 'there';

        await sendEmail({
          to: email,
          templateName: 'forgot_password',
          data: {
            userName: userName,
            button: createButton('Sign In & Set New Password', url),
          },
        });
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
        
        if (!user || !user.hashedPassword || user.isSuspended) {
            return null;
        }

        const ok = await bcrypt.compare(credentials.password as string, user.hashedPassword);
        return ok ? user : null;
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/auth/verify-request",
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isTakingBreak = user.isTakingBreak;
        (token as any).uiLanguage = (user as any).uiLanguage ?? 'device';
        (token as any).hasAdminPortalAccess = (user as any).hasAdminPortalAccess ?? false;
        (token as any).lessonAutoSaveOptOut = (user as any).lessonAutoSaveOptOut ?? false;
      }
      return token;
    },
    async session({ session, token }) {
       const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isPaying: true,
          isSuspended: true,
          isTakingBreak: true, // Include isTakingBreak
          lessonAutoSaveOptOut: true,
          hasAdminPortalAccess: true,
          uiLanguage: true,
          impersonatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              isPaying: true,
              isSuspended: true,
              isTakingBreak: true,
              lessonAutoSaveOptOut: true,
              hasAdminPortalAccess: true,
              uiLanguage: true,
            },
          },
        },
      });

      if (!dbUser) {
        return session;
      }

      if (dbUser.impersonatedBy) {
        const impersonatedUser = dbUser.impersonatedBy;
        session.user = {
          ...session.user,
          id: impersonatedUser.id,
          name: impersonatedUser.name,
          email: impersonatedUser.email,
          image: impersonatedUser.image,
          role: impersonatedUser.role,
          isPaying: (impersonatedUser as any).isPaying,
          isSuspended: (impersonatedUser as any).isSuspended,
          isTakingBreak: (impersonatedUser as any).isTakingBreak, // Pass through impersonated user's status
          lessonAutoSaveOptOut: (impersonatedUser as any).lessonAutoSaveOptOut ?? false,
          hasAdminPortalAccess: (impersonatedUser as any).hasAdminPortalAccess ?? false,
          uiLanguage: (impersonatedUser as any).uiLanguage ?? 'device',
          impersonating: true,
          originalUserId: dbUser.id,
        };
      } else {
        session.user.id = dbUser.id;
        session.user.name = dbUser.name;
        session.user.email = dbUser.email;
        session.user.image = dbUser.image;
        session.user.role = dbUser.role;
        session.user.isPaying = dbUser.isPaying;
        session.user.isSuspended = dbUser.isSuspended;
        session.user.isTakingBreak = dbUser.isTakingBreak; // Assign to the direct user
        (session.user as any).lessonAutoSaveOptOut = (dbUser as any).lessonAutoSaveOptOut ?? false;
        (session.user as any).hasAdminPortalAccess = dbUser.hasAdminPortalAccess;
        (session.user as any).uiLanguage = (dbUser as any).uiLanguage ?? 'device';
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.id) return;
      try {
        await prisma.loginEvent.create({
          data: {
            userId: user.id,
            ipAddress: null,
            userAgent: account?.provider ?? null,
          },
        });
      } catch (error) {
        console.error("LOGIN_EVENT_CREATE_ERROR", error);
      }
    },
  },
  logger: {
    error(error) {
      console.error("AUTH_ERROR", error);
    },
    warn(code) {
      // Suppressed to keep browser console clean
      void code;
    },
    debug(message, metadata) {
      // Suppressed to keep browser console clean
      void message;
      void metadata;
    },
    info() {
      // Suppressed to keep browser console clean
    },
  } satisfies Partial<LoggerInstance>,
});
