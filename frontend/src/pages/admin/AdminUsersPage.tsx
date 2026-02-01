import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchUsers, updateUserStatus, deleteUser } from '@/features/admin/adminSlice';
import {
  DataTable,
  Column,
  SearchInput,
  StatusBadge,
  RoleBadge,
  ConfirmDialog,
} from '@/components/admin';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import type { User, UserRole } from '@/types';

const roleOptions: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'BOXER', label: 'Boxers' },
  { value: 'COACH', label: 'Coaches' },
  { value: 'GYM_OWNER', label: 'Gym Owners' },
  { value: 'ADMIN', label: 'Admins' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export const AdminUsersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users } = useAppSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>(
    (searchParams.get('role') as UserRole) || 'all'
  );
  const [statusFilter, setStatusFilter] = useState(searchParams.get('isActive') || 'all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    user: User | null;
    action: 'activate' | 'deactivate';
  }>({
    open: false,
    user: null,
    action: 'activate',
  });

  const page = parseInt(searchParams.get('page') || '1', 10);

  const loadUsers = useCallback(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      limit: 20,
    };
    if (roleFilter !== 'all') params.role = roleFilter;
    if (statusFilter !== 'all') params.isActive = statusFilter === 'true';
    dispatch(fetchUsers(params));
  }, [dispatch, page, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handlePageChange = (newPage: number) => {
    searchParams.set('page', String(newPage));
    setSearchParams(searchParams);
  };

  const handleRoleChange = (value: string) => {
    setRoleFilter(value as UserRole | 'all');
    searchParams.set('role', value === 'all' ? '' : value);
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    if (value === 'all') {
      searchParams.delete('isActive');
    } else {
      searchParams.set('isActive', value);
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleToggleStatus = (user: User) => {
    setStatusDialog({
      open: true,
      user,
      action: user.isActive ? 'deactivate' : 'activate',
    });
  };

  const confirmToggleStatus = async () => {
    if (!statusDialog.user) return;
    await dispatch(
      updateUserStatus({
        id: statusDialog.user.id,
        isActive: !statusDialog.user.isActive,
      })
    );
    setStatusDialog({ open: false, user: null, action: 'activate' });
  };

  const handleDelete = (user: User) => {
    setDeleteDialog({ open: true, user });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.user) return;
    await dispatch(deleteUser(deleteDialog.user.id));
    setDeleteDialog({ open: false, user: null });
  };

  const columns: Column<User>[] = [
    {
      header: 'Name',
      cell: (user) => (
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (user) => <RoleBadge role={user.role} />,
    },
    {
      header: 'Status',
      cell: (user) => <StatusBadge status={user.isActive} type="user" />,
    },
    {
      header: 'Email Verified',
      cell: (user) => (
        <StatusBadge status={user.emailVerified} type="verification" />
      ),
    },
    {
      header: 'Created',
      cell: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(user)}
            title={user.isActive ? 'Deactivate' : 'Activate'}
          >
            {user.isActive ? (
              <PowerOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Power className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/users/${user.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(user)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter data by search term (client-side for now)
  const filteredData = search
    ? users.data.filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
      )
    : users.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts</p>
        </div>
        <Button asChild>
          <Link to="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Link>
        </Button>
      </div>

      {users.error && (
        <Alert variant="destructive">
          <AlertDescription>{users.error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="md:w-80"
        />
        <Select value={roleFilter} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        pagination={users.pagination}
        onPageChange={handlePageChange}
        isLoading={users.loading}
        emptyMessage="No users found"
        keyExtractor={(user) => user.id}
      />

      {/* Status Toggle Dialog */}
      <ConfirmDialog
        open={statusDialog.open}
        onOpenChange={(open) =>
          setStatusDialog({ open, user: null, action: 'activate' })
        }
        title={
          statusDialog.action === 'activate'
            ? 'Activate User'
            : 'Deactivate User'
        }
        description={
          statusDialog.action === 'activate'
            ? `Are you sure you want to activate "${statusDialog.user?.name}"? They will be able to log in and access the platform.`
            : `Are you sure you want to deactivate "${statusDialog.user?.name}"? They will not be able to log in until reactivated.`
        }
        confirmLabel={statusDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={statusDialog.action === 'deactivate' ? 'destructive' : 'default'}
        onConfirm={confirmToggleStatus}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: null })}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteDialog.user?.name}"? This action will deactivate the user and cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
