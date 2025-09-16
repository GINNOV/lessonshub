// file: src/app/components/UserTable.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { User, Role } from '@prisma/client';
import {
  updateUserRole,
  impersonateUser,
  updateUserPayingStatus,
} from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type SerializableUser = Omit<User, 'defaultLessonPrice'> & {
    defaultLessonPrice: number | null;
};

interface UserTableProps {
  users: SerializableUser[];
  searchTerm: string;
}

export default function UserTable({
  users,
  searchTerm: initialSearchTerm,
}: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const router = useRouter();

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleRoleChange = async (userId: string, role: Role) => {
    const result = await updateUserRole(userId, role);
    if (!result.success) {
      toast.error(result.error || 'An unknown error occurred.');
    } else {
      toast.success('User role updated.');
    }
  };

  const handleImpersonate = async (userId: string) => {
    const result = await impersonateUser(userId);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error || 'An unknown error occurred.');
    }
  };

  const handlePayingStatusChange = async (
    userId: string,
    isPaying: boolean
  ) => {
    const result = await updateUserPayingStatus(userId, isPaying);
    if (!result.success) {
      toast.error(result.error || 'An unknown error occurred.');
    } else {
      toast.success('Paying status updated.');
    }
  };

  return (
    <div>
      <Input
        type="search"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Paying User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {user.role}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`paying-${user.id}`}
                      checked={user.isPaying}
                      onCheckedChange={(checked) =>
                        handlePayingStatusChange(user.id, checked)
                      }
                      disabled={user.role === Role.ADMIN}
                    />
                    <Label htmlFor={`paying-${user.id}`}>
                      {user.isPaying ? 'Yes' : 'No'}
                    </Label>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    {user.role !== Role.ADMIN && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, Role.TEACHER)}
                          disabled={user.role === Role.TEACHER}
                        >
                          Make Teacher
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, Role.STUDENT)}
                          disabled={user.role === Role.STUDENT}
                        >
                          Make Student
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleImpersonate(user.id)}
                        >
                          Impersonate
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/edit/${user.id}`}>Edit</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}