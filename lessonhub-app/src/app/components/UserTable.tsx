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
  setAdminPortalAccess,
} from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User as UserIcon, ShieldCheck, UserCog, Edit, Ban, Trash2, Users, KeySquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type SerializableUser = Omit<User, 'defaultLessonPrice' | 'referralRewardPercent' | 'referralRewardMonthlyAmount'> & {
    defaultLessonPrice: number | null;
    referralRewardPercent: number | null;
    referralRewardMonthlyAmount: number | null;
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
  const [confirmUser, setConfirmUser] = useState<{ id: string; label: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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

  const handleAdminPortalAccess = async (userId: string, nextState: boolean) => {
    const result = await setAdminPortalAccess(userId, nextState);
    if (result.success) {
      toast.success(nextState ? 'Teacher now has admin portal access.' : 'Admin portal access removed.');
    } else {
      toast.error(result.error || 'Unable to update admin access.');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmUser) return;
    setDeletingUserId(confirmUser.id);
    const result = await deleteUserByAdmin(confirmUser.id);
    if (result.success) {
      toast.success('User deleted successfully.');
    } else {
      toast.error(result.error || 'An unknown error occurred.');
    }
    setDeletingUserId(null);
    setConfirmUser(null);
  };

  return (
    <TooltipProvider>
      <div>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
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
                    {user.hasAdminPortalAccess && user.role === Role.TEACHER && (
                      <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                        Admin Portal
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {user.role === Role.STUDENT && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" asChild>
                              <Link href={`/admin/users/edit/${user.id}#assign-teachers`}>
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Assign Teachers</p></TooltipContent>
                        </Tooltip>
                      )}
                      {user.role === Role.TEACHER && (
                        <Tooltip>
                            <TooltipTrigger asChild><Button variant="outline" size="icon" asChild><Link href={`/admin/teachers/${user.id}`}><Users className="h-4 w-4" /></Link></Button></TooltipTrigger>
                            <TooltipContent><p>Assign Students</p></TooltipContent>
                        </Tooltip>
                      )}
                      {user.role === Role.TEACHER && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={user.hasAdminPortalAccess ? "secondary" : "outline"}
                              size="icon"
                              onClick={() => handleAdminPortalAccess(user.id, !user.hasAdminPortalAccess)}
                            >
                              <KeySquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {user.hasAdminPortalAccess ? 'Remove admin portal access' : 'Grant admin portal access'}
                            </p>
                          </TooltipContent>
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
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setConfirmUser({ id: user.id, label: user.name || user.email })}
                                disabled={deletingUserId === user.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
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
      <ConfirmDialog
        open={Boolean(confirmUser)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmUser(null);
          }
        }}
        title="Delete user?"
        description={
          confirmUser
            ? `This will permanently delete ${confirmUser.label} and remove all of their data.`
            : undefined
        }
        confirmLabel="Delete user"
        pendingLabel="Deleting..."
        confirmVariant="destructive"
        isConfirming={Boolean(deletingUserId)}
        onConfirm={handleDeleteUser}
      />
    </TooltipProvider>
  );
}
