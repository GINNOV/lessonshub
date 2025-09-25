// file: src/app/components/UserProfileTabs.tsx
import { User, Assignment, Lesson } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LocaleDate from "@/app/components/LocaleDate";
import { Button } from "@/components/ui/button";

type AssignmentWithLesson = Assignment & { lesson: Lesson };
type UserWithAssignments = User & { assignments: AssignmentWithLesson[] };

interface UserProfileTabsProps {
  user: UserWithAssignments;
}

export default function UserProfileTabs({ user }: UserProfileTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="assignments">Assignments ({user.assignments.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
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