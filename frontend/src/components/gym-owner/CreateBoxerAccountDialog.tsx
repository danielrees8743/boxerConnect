import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExperienceLevel, Gender } from '@/types';
import type { CreateBoxerAccountData } from '@/services/gymOwnerService';

// Validation schema for create boxer account form
const createBoxerAccountSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  experienceLevel: z.enum([
    'BEGINNER',
    'AMATEUR',
    'INTERMEDIATE',
    'ADVANCED',
    'PROFESSIONAL',
  ] as const),
  gender: z.enum(['MALE', 'FEMALE'] as const).optional(),
  weightKg: z
    .number()
    .min(40, 'Weight must be at least 40 kg')
    .max(200, 'Weight must be less than 200 kg')
    .optional()
    .or(z.literal(0)),
  heightCm: z
    .number()
    .min(120, 'Height must be at least 120 cm')
    .max(230, 'Height must be less than 230 cm')
    .optional()
    .or(z.literal(0)),
  dateOfBirth: z.string().optional(),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .optional(),
  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .optional(),
});

type CreateBoxerAccountFormData = z.infer<typeof createBoxerAccountSchema>;

interface CreateBoxerAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  onSuccess: () => void;
  onSubmit: (data: CreateBoxerAccountData) => Promise<void>;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: ExperienceLevel.BEGINNER, label: 'Beginner' },
  { value: ExperienceLevel.AMATEUR, label: 'Amateur' },
  { value: ExperienceLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: ExperienceLevel.ADVANCED, label: 'Advanced' },
  { value: ExperienceLevel.PROFESSIONAL, label: 'Professional' },
];

const genderOptions: { value: Gender; label: string }[] = [
  { value: Gender.MALE, label: 'Male' },
  { value: Gender.FEMALE, label: 'Female' },
];

/**
 * CreateBoxerAccountDialog component for gym owners to create boxer accounts.
 * Includes validation with react-hook-form and zod.
 */
export const CreateBoxerAccountDialog: React.FC<
  CreateBoxerAccountDialogProps
> = ({ open, onOpenChange, clubId, onSuccess, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateBoxerAccountFormData>({
    resolver: zodResolver(createBoxerAccountSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      experienceLevel: ExperienceLevel.BEGINNER,
      gender: undefined,
      weightKg: undefined,
      heightCm: undefined,
      dateOfBirth: '',
      city: '',
      country: '',
    },
  });

  const handleFormSubmit = async (data: CreateBoxerAccountFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Clean up the data
      const cleanedData: CreateBoxerAccountData = {
        email: data.email,
        password: data.password,
        name: data.name,
        experienceLevel: data.experienceLevel as ExperienceLevel,
        gender: data.gender as Gender | undefined,
        weightKg: data.weightKg && data.weightKg > 0 ? data.weightKg : undefined,
        heightCm:
          data.heightCm && data.heightCm > 0 ? data.heightCm : undefined,
        dateOfBirth: data.dateOfBirth
          ? new Date(data.dateOfBirth).toISOString()
          : undefined,
        city: data.city || undefined,
        country: data.country || undefined,
      };

      await onSubmit(cleanedData);
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create boxer account'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Boxer to Club</DialogTitle>
          <DialogDescription>
            Create a new boxer account and add them to this club.
            {/* TODO: Implement email notification system to send login credentials to the boxer */}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Account Credentials Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Account Credentials</h3>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="boxer@example.com"
                  disabled={isLoading}
                  variant={errors.email ? 'error' : 'default'}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    disabled={isLoading}
                    variant={errors.password ? 'error' : 'default'}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>At least 8 characters long</li>
                    <li>Contains at least one uppercase letter (A-Z)</li>
                    <li>Contains at least one lowercase letter (a-z)</li>
                    <li>Contains at least one number (0-9)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Basic Profile Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Basic Profile</h3>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter boxer's full name"
                  disabled={isLoading}
                  variant={errors.name ? 'error' : 'default'}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label>
                  Experience Level <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="experienceLevel"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label>Gender</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) =>
                        field.onChange(value || undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Physical Attributes Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="text-sm font-semibold">Physical Attributes</h3>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (kg)</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    disabled={isLoading}
                    variant={errors.weightKg ? 'error' : 'default'}
                    {...register('weightKg', { valueAsNumber: true })}
                  />
                  {errors.weightKg && (
                    <p className="text-sm text-destructive">
                      {errors.weightKg.message}
                    </p>
                  )}
                </div>

                {/* Height */}
                <div className="space-y-2">
                  <Label htmlFor="heightCm">Height (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    placeholder="175"
                    disabled={isLoading}
                    variant={errors.heightCm ? 'error' : 'default'}
                    {...register('heightCm', { valueAsNumber: true })}
                  />
                  {errors.heightCm && (
                    <p className="text-sm text-destructive">
                      {errors.heightCm.message}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    disabled={isLoading}
                    {...register('dateOfBirth')}
                  />
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Location</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Cardiff"
                    disabled={isLoading}
                    {...register('city')}
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Wales"
                    disabled={isLoading}
                    {...register('country')}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Boxer Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBoxerAccountDialog;
