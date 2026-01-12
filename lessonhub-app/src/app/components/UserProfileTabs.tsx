// file: src/app/components/UserProfileTabs.tsx
import { User, Assignment, Lesson } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LocaleDate from "@/app/components/LocaleDate";
import { Button } from "@/components/ui/button";
import LoginHistoryCard from "@/app/components/LoginHistoryCard";
import { ClipboardList, User as UserIcon } from "lucide-react";

type AssignmentWithLesson = Assignment & { lesson: Lesson };
type LoginHistoryEntry = {
  id: string;
  timestamp: string;
  lessonId: string | null;
  lessonTitle: string | null;
};

type UserWithAssignments = User & { assignments: AssignmentWithLesson[] };

interface UserProfileTabsProps {
  user: UserWithAssignments;
  loginHistory: LoginHistoryEntry[];
}

export default function UserProfileTabs({ user, loginHistory }: UserProfileTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="mb-4 grid h-auto w-full gap-2 rounded-2xl bg-gray-50 p-1 shadow-inner [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <TabsTrigger
          value="overview"
          className="rounded-xl border border-gray-200/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-gray-500 shadow-sm transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200/60 data-[state=active]:border-indigo-200 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-indigo-100"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
            Overview
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="assignments"
          className="rounded-xl border border-gray-200/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-gray-500 shadow-sm transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200/60 data-[state=active]:border-indigo-200 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-indigo-100"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Assignments ({user.assignments.length})
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Name</span>
                <span>{user.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Email</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Role</span>
                <span>{user.role}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Paying Customer</span>
                <span>{user.isPaying ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Account Status</span>
                <span>{user.isSuspended ? 'Suspended' : 'Active'}</span>
              </div>
            </CardContent>
          </Card>
          <LoginHistoryCard
            entries={loginHistory}
            title="Recent activity"
            emptyMessage="No activity yet."
            getLessonHref={(lessonId) => `/dashboard/assign/${lessonId}`}
          />
        </div>
      </TabsContent>
      <TabsContent value="assignments">
        <Card>
          <CardHeader>
            <CardTitle>Lesson Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {user.assignments.length > 0 ? (
                    user.assignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                            <div>
                                <p className="font-semibold">{assignment.lesson.title}</p>
                                <p className="text-sm text-gray-500">
                                    Assigned on <LocaleDate date={assignment.assignedAt} />
                                </p>
                                <p className="text-sm text-gray-500">
                                    Due by <LocaleDate date={assignment.deadline} />
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  assignment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                  assignment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                  assignment.status === 'GRADED' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {assignment.status}
                                </span>
                                {assignment.status === 'GRADED' && (
                                  <p className="text-sm font-bold mt-1">Score: {assignment.score}/10</p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500">This user has no assigned lessons.</p>
                )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
