// file: src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import ResendProvider from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { sendEmail, createButton } from "@/lib/email-templates";

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
          impersonatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              isPaying: true,
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
          isSuspended: (impersonatedUser as any).isSuspended,
          isTakingBreak: (impersonatedUser as any).isTakingBreak, // Pass through impersonated user's status
          impersonating: true,
          originalUserId: dbUser.id,
        };
      } else {
        session.user.id = dbUser.id;
        session.user.name = dbUser.name;
        session.user.email = dbUser.email;
        session.user.image = dbUser.image;
        session.user.role = dbUser.role;
        session.user.isSuspended = dbUser.isSuspended;
        session.user.isTakingBreak = dbUser.isTakingBreak; // Assign to the direct user
      }
      return session;
    },
  },
});