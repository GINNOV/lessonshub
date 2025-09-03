// file: src/app/components/UserTable.tsx

'use client';

import { useState } from 'react';
import { User, Role } from '@prisma/client';
import { updateUserRole } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';

interface UserTableProps {
  users: User[];
}

export default function UserTable({ users }: UserTableProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: Role) => {
    setError(null);
    const result = await updateUserRole(userId, role);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <div className="overflow-x-auto">
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                {user.role !== Role.ADMIN && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(user.id, Role.TEACHER)} disabled={user.role === Role.TEACHER}>
                      Make Teacher
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(user.id, Role.STUDENT)} disabled={user.role === Role.STUDENT}>
                      Make Student
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}