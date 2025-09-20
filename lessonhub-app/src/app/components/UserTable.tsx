// file: src/app/components/UserTable.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { User, Role } from '@prisma/client';
import {
  updateUserRole,
  impersonateUser,
  updateUserPayingStatus,
  toggleUserSuspension,
  deleteUserByAdmin,
} from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User as UserIcon, ShieldCheck, UserCog, Edit, Ban, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    if (result.success) {
      toast.success('User role updated.');
    } else {
      toast.error(result.error || 'An unknown error occurred.');
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
    if (result.success) {
      toast.success('Paying status updated.');
    } else {
      toast.error(result.error || 'An unknown error occurred.');
    }
  };

  const handleToggleSuspension = async (userId: string) => {
    const result = await toggleUserSuspension(userId);
    if (result.success) {
      toast.success('User suspension status updated.');
    } else {
      toast.error(result.error || 'An unknown error occurred.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the user: ${userName}? This action cannot be undone.`)) {
        const result = await deleteUserByAdmin(userId);
        if (result.success) {
            toast.success('User deleted successfully.');
        } else {
            toast.error(result.error || 'An unknown error occurred.');
        }
    }
  };

  return (
    <TooltipProvider>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={cn(user.isSuspended && 'bg-red-50 opacity-60')}>
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
                        {user.isPaying ? 'Paying' : 'Not Paying'}
                      </Label>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                       {user.role === Role.TEACHER && (
                        <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" asChild><Link href={`/admin/teachers/${user.id}`}><Users className="h-4 w-4" /></Link></Button></TooltipTrigger>
                            <TooltipContent><p>Assign Students</p></TooltipContent>
                        </Tooltip>
                      )}
                      {user.role !== Role.ADMIN && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleRoleChange(user.id, Role.TEACHER)} disabled={user.role === Role.TEACHER}><ShieldCheck className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent><p>Make Teacher</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleRoleChange(user.id, Role.STUDENT)} disabled={user.role === Role.STUDENT}><UserIcon className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent><p>Make Student</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleImpersonate(user.id)}><UserCog className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent><p>Impersonate</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => handleToggleSuspension(user.id)}><Ban className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent><p>{user.isSuspended ? 'Unsuspend' : 'Suspend'} User</p></TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild><Button variant="outline" size="icon" asChild><Link href={`/admin/users/edit/${user.id}`}><Edit className="h-4 w-4" /></Link></Button></TooltipTrigger>
                        <TooltipContent><p>Edit User</p></TooltipContent>
                      </Tooltip>
                      {user.role !== Role.ADMIN && (
                        <Tooltip>
                            <TooltipTrigger asChild><Button variant="destructive" size="icon" onClick={() => handleDeleteUser(user.id, user.name || user.email)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent><p>Delete User</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

