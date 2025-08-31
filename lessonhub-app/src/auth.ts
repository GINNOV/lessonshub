// file: src/auth.ts
// remove the underscore to enable the route for testing
// test using: curl -X POST http://localhost:3000/api/debug/resend \
// -H "Content-Type: application/json" \
// -d '{"to": "example@example.com", "subject": "Resend smoke test"}'
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

  // ---- Logging ----
  debug: process.env.NODE_ENV === "development",

  logger: {
    error(error: Error) {
      console.error("[auth:error]", error);
    },
    warn(code: string) {
      console.warn("[auth:warn]", code);
    },
    debug(code: string, metadata?: unknown) {
      console.log("[auth:debug]", code, metadata);
    },
  },

  events: {
    async signIn(message) {
      console.log("[auth:event] signIn", {
        userId: message?.user?.id,
        account: message?.account?.provider,
      });
    },
  },
  // ---- End Logging ----

  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as any).id) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && (token as any)?.id) {
        (session.user as any).id = (token as any).id as string;
        (session.user as any).role = (token as any).role as Role;
      }
      return session;
    },
  },
});
