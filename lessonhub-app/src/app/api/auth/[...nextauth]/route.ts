// file: src/app/api/auth/[...nextauth]/route.ts

export const runtime = 'nodejs'; // ✅ force Node runtime (needed for Resend SDK)

import { GET, POST } from "@/auth";

export { GET, POST };