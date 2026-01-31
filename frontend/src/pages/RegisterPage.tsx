import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { registerUser, clearError } from '@/features/auth/authSlice';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

// Validation schema for registration form
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string(),
    role: z.enum(['BOXER', 'COACH', 'GYM_OWNER'] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Registration page component for new user signup.
 */
export const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'BOXER',
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on unmount
  React.useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    const result = await dispatch(
      registerUser({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        role: registerData.role as UserRole,
      })
    );
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  const roleOptions = [
    { value: 'BOXER', label: 'Boxer', description: 'I am a boxer looking for matches' },
    { value: 'COACH', label: 'Coach', description: 'I train boxers and manage their careers' },
    { value: 'GYM_OWNER', label: 'Gym Owner', description: 'I own/manage a boxing gym' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <div className="mx-auto w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join BoxerConnect and start connecting
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.name && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="John Doe"
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.email && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="boxer@example.com"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.password && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="Create a strong password"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="Confirm your password"
              disabled={isLoading}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">I am a...</label>
            <div className="grid gap-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start rounded-md border p-3 transition-colors hover:bg-muted/50',
                    'has-[:checked]:border-primary has-[:checked]:bg-primary/5'
                  )}
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="mt-1"
                    disabled={isLoading}
                    {...register('role')}
                  />
                  <div className="ml-3">
                    <span className="font-medium">{option.label}</span>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
