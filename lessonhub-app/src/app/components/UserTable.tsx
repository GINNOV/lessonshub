// file: src/app/components/UserTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { User, Role } from '@prisma/client';
import { updateUserRole, impersonateUser } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserTableProps {
  users: User[];
  searchTerm: string;
}

export default function UserTable({ users, searchTerm: initialSearchTerm }: UserTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleRoleChange = async (userId: string, role: Role) => {
    setError(null);
    const result = await updateUserRole(userId, role);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
    }
  };
  
  const handleImpersonate = async (userId: string) => {
    setError(null);
    const result = await impersonateUser(userId);
    if (!result.success) {
      setError(result.error || 'An unknown error occurred.');
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
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
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
                      <Button variant="destructive" size="sm" onClick={() => handleImpersonate(user.id)}>
                        Impersonate
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}