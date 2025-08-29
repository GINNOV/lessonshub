// file: src/app/dashboard/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button"; // Import the new button
// ... other imports

export default async function DashboardPage() {
  // ...
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        {/* ... */}
        <Button asChild>
          <Link href="/dashboard/create">Create New Lesson</Link>
        </Button>
      </div>
      {/* ... */}
    </div>
  );
}