import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { ExperienceLevel, Gender } from '@/types';
import type { BoxerProfile, CreateBoxerData, UpdateBoxerData } from '@/types';
import { cn } from '@/lib/utils';

// Validation schema for boxer form
const boxerFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  gender: z.enum(['MALE', 'FEMALE'] as const).nullable().optional(),
  weightKg: z
    .number()
    .min(40, 'Weight must be at least 40 kg')
    .max(200, 'Weight must be less than 200 kg')
    .nullable()
    .optional(),
  heightCm: z
    .number()
    .min(120, 'Height must be at least 120 cm')
    .max(230, 'Height must be less than 230 cm')
    .nullable()
    .optional(),
  dateOfBirth: z.string().nullable().optional(),
  city: z.string().max(100, 'City must be less than 100 characters').nullable().optional(),
  country: z.string().max(100, 'Country must be less than 100 characters').nullable().optional(),
  experienceLevel: z.enum(['BEGINNER', 'AMATEUR', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'] as const),
  wins: z.number().min(0, 'Wins cannot be negative').optional(),
  losses: z.number().min(0, 'Losses cannot be negative').optional(),
  draws: z.number().min(0, 'Draws cannot be negative').optional(),
  gymAffiliation: z.string().max(200, 'Gym affiliation must be less than 200 characters').nullable().optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').nullable().optional(),
});

type BoxerFormData = z.infer<typeof boxerFormSchema>;

interface BoxerFormProps {
  boxer?: BoxerProfile | null;
  isLoading?: boolean;
  error?: string | null;
  onSubmit: (data: CreateBoxerData | UpdateBoxerData) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  className?: string;
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
 * BoxerForm component for creating or editing boxer profiles.
 * Includes validation with react-hook-form and zod.
 *
 * @example
 * <BoxerForm
 *   boxer={existingBoxer}
 *   mode="edit"
 *   onSubmit={handleUpdate}
 *   onCancel={() => setEditMode(false)}
 * />
 */
export const BoxerForm: React.FC<BoxerFormProps> = ({
  boxer,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
  mode = 'create',
  className,
}) => {
  // Track current photo URL (updated when photo is uploaded/removed)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    boxer?.profilePhotoUrl || null
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<BoxerFormData>({
    resolver: zodResolver(boxerFormSchema),
    defaultValues: {
      name: boxer?.name || '',
      gender: boxer?.gender || null,
      weightKg: boxer?.weightKg || null,
      heightCm: boxer?.heightCm || null,
      dateOfBirth: boxer?.dateOfBirth ? boxer.dateOfBirth.split('T')[0] : null,
      city: boxer?.city || null,
      country: boxer?.country || null,
      experienceLevel: boxer?.experienceLevel || 'BEGINNER',
      wins: boxer?.wins || 0,
      losses: boxer?.losses || 0,
      draws: boxer?.draws || 0,
      gymAffiliation: boxer?.gymAffiliation || null,
      bio: boxer?.bio || null,
    },
  });

  const handleFormSubmit = (data: BoxerFormData) => {
    // Clean up null/empty values and map experience level
    const experienceLevelMap: Record<string, ExperienceLevel> = {
      BEGINNER: ExperienceLevel.BEGINNER,
      AMATEUR: ExperienceLevel.AMATEUR,
      INTERMEDIATE: ExperienceLevel.INTERMEDIATE,
      ADVANCED: ExperienceLevel.ADVANCED,
      PROFESSIONAL: ExperienceLevel.PROFESSIONAL,
    };

    const genderMap: Record<string, Gender> = {
      MALE: Gender.MALE,
      FEMALE: Gender.FEMALE,
    };

    // Convert date string to ISO datetime format for backend
    const dateOfBirth = data.dateOfBirth
      ? new Date(data.dateOfBirth).toISOString()
      : undefined;

    const cleanedData: CreateBoxerData | UpdateBoxerData = {
      name: data.name,
      gender: data.gender ? genderMap[data.gender] : undefined,
      weightKg: data.weightKg || undefined,
      heightCm: data.heightCm || undefined,
      dateOfBirth,
      city: data.city || undefined,
      country: data.country || undefined,
      experienceLevel: experienceLevelMap[data.experienceLevel],
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      gymAffiliation: data.gymAffiliation || undefined,
      bio: data.bio || undefined,
    };
    onSubmit(cleanedData);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create Boxer Profile' : 'Edit Boxer Profile'}</CardTitle>
        <CardDescription>
          {mode === 'create'
            ? 'Fill in your boxing profile details to start connecting with other boxers.'
            : 'Update your boxer profile information.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <PhotoUpload
              currentPhotoUrl={currentPhotoUrl}
              name={watch('name') || boxer?.name}
              onPhotoChange={setCurrentPhotoUrl}
              disabled={isLoading}
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              disabled={isLoading}
              variant={errors.name ? 'error' : 'default'}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
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
                  onValueChange={(value) => field.onChange(value || null)}
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

          {/* Physical Attributes */}
          <div className="grid gap-4 sm:grid-cols-3">
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
                <p className="text-sm text-destructive">{errors.weightKg.message}</p>
              )}
            </div>
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
                <p className="text-sm text-destructive">{errors.heightCm.message}</p>
              )}
            </div>
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

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>Experience Level *</Label>
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

          {/* Record */}
          <div className="space-y-2">
            <Label>Fight Record</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wins" className="text-sm text-muted-foreground">
                  Wins
                </Label>
                <Input
                  id="wins"
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  {...register('wins', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="losses" className="text-sm text-muted-foreground">
                  Losses
                </Label>
                <Input
                  id="losses"
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  {...register('losses', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="draws" className="text-sm text-muted-foreground">
                  Draws
                </Label>
                <Input
                  id="draws"
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  {...register('draws', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Los Angeles"
                disabled={isLoading}
                {...register('city')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="United States"
                disabled={isLoading}
                {...register('country')}
              />
            </div>
          </div>

          {/* Gym Affiliation */}
          <div className="space-y-2">
            <Label htmlFor="gymAffiliation">Gym Affiliation</Label>
            <Input
              id="gymAffiliation"
              placeholder="Enter your gym name"
              disabled={isLoading}
              {...register('gymAffiliation')}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Tell us about yourself and your boxing journey..."
              disabled={isLoading}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none'
              )}
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || (!isDirty && mode === 'edit')}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : mode === 'create' ? (
              'Create Profile'
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BoxerForm;
