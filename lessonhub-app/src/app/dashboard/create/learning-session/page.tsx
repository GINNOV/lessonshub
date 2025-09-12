// file: src/app/dashboard/create/learning-session/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateLearningSessionPage() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Create Learning Session</h1>
      <p className="text-muted-foreground mb-6">This feature is coming soon!</p>
      <Button asChild>
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  );
}