// file: src/app/types/next-auth.d.ts
import { User as PrismaUser, Role } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: Role;
      isSuspended: boolean; // Add isSuspended here
      impersonating?: boolean;
      originalUserId?: string;
    } & DefaultSession["user"];
  }

  interface User extends PrismaUser {
    role: Role;
    isSuspended: boolean; // And also here
  }
}