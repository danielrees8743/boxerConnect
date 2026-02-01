import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  createUser,
  updateUser,
  fetchUserById,
  clearSelectedUser,
} from '@/features/admin/adminSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { UserRole } from '@/types';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  role: z.enum(['BOXER', 'COACH', 'GYM_OWNER', 'ADMIN']),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  role: z.enum(['BOXER', 'COACH', 'GYM_OWNER', 'ADMIN']),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'BOXER', label: 'Boxer' },
  { value: 'COACH', label: 'Coach' },
  { value: 'GYM_OWNER', label: 'Gym Owner' },
  { value: 'ADMIN', label: 'Admin' },
];

export const AdminUserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedUser } = useAppSelector((state) => state.admin);

  const isEditing = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm | UpdateUserForm>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'BOXER',
      ...(isEditing ? {} : { password: '' }),
    },
  });

  const watchedRole = watch('role');

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchUserById(id));
    }

    return () => {
      dispatch(clearSelectedUser());
    };
  }, [dispatch, id, isEditing]);

  useEffect(() => {
    if (isEditing && selectedUser) {
      reset({
        email: selectedUser.email,
        name: selectedUser.name,
        role: selectedUser.role,
      });
    }
  }, [isEditing, selectedUser, reset]);

  const onSubmit = async (data: CreateUserForm | UpdateUserForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && id) {
        const updateData: { name?: string; email?: string; role?: UserRole } = {
          name: data.name,
          role: data.role,
        };
        if (data.email && data.email !== selectedUser?.email) {
          updateData.email = data.email;
        }
        await dispatch(updateUser({ id, data: updateData })).unwrap();
      } else {
        const createData = data as CreateUserForm;
        await dispatch(
          createUser({
            email: createData.email,
            password: createData.password,
            name: createData.name,
            role: createData.role,
          })
        ).unwrap();
      }
      navigate('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit User' : 'Create User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? 'Update user account details'
              : 'Create a new user account'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter user's name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password' as keyof CreateUserForm)}
                  placeholder="Enter password"
                />
                {(errors as Record<string, { message?: string }>).password && (
                  <p className="text-sm text-red-500">
                    {(errors as Record<string, { message?: string }>).password?.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={watchedRole}
                onValueChange={(value) => setValue('role', value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Update User' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
