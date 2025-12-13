export const metadata = {
  title: "Vocabolario Invaders | LessonHub",
  description: "Arcade-style vocabulary practice: match Italian to English and train your ear.",
};

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import InvasionGame from "./InvasionGame";

export default async function InvasionGamePage() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }
  return <InvasionGame />;
}
