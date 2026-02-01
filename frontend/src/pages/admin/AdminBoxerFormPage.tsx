import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  createBoxer,
  updateBoxer,
  fetchBoxerById,
  clearSelectedBoxer,
  fetchUsers,
} from '@/features/admin/adminSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ExperienceLevel, Gender } from '@/types';

const boxerSchema = z.object({
  userId: z.string().min(1, 'User ID is required').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  weightKg: z.coerce.number().positive().max(300).optional().nullable(),
  heightCm: z.coerce.number().int().positive().max(250).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  experienceLevel: z.enum([
    'BEGINNER',
    'AMATEUR',
    'INTERMEDIATE',
    'ADVANCED',
    'PROFESSIONAL',
  ]),
  wins: z.coerce.number().int().min(0).default(0),
  losses: z.coerce.number().int().min(0).default(0),
  draws: z.coerce.number().int().min(0).default(0),
  gymAffiliation: z.string().max(200).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  isVerified: z.boolean().default(false),
});

type BoxerFormData = z.infer<typeof boxerSchema>;

const experienceOptions: { value: ExperienceLevel; label: string }[] = [
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

export const AdminBoxerFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedBoxer, users } = useAppSelector((state) => state.admin);

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
  } = useForm<BoxerFormData>({
    resolver: zodResolver(boxerSchema),
    defaultValues: {
      name: '',
      experienceLevel: ExperienceLevel.BEGINNER,
      wins: 0,
      losses: 0,
      draws: 0,
      isVerified: false,
    },
  });

  const watchedExperience = watch('experienceLevel');
  const watchedGender = watch('gender');
  const watchedIsVerified = watch('isVerified');

  // Load users for the user selector (when creating)
  useEffect(() => {
    if (!isEditing) {
      dispatch(fetchUsers({ role: 'BOXER', limit: 100 }));
    }
  }, [dispatch, isEditing]);

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchBoxerById(id));
    }

    return () => {
      dispatch(clearSelectedBoxer());
    };
  }, [dispatch, id, isEditing]);

  useEffect(() => {
    if (isEditing && selectedBoxer) {
      reset({
        name: selectedBoxer.name,
        gender: selectedBoxer.gender,
        weightKg: selectedBoxer.weightKg,
        heightCm: selectedBoxer.heightCm,
        dateOfBirth: selectedBoxer.dateOfBirth
          ? selectedBoxer.dateOfBirth.split('T')[0]
          : null,
        city: selectedBoxer.city,
        country: selectedBoxer.country,
        experienceLevel: selectedBoxer.experienceLevel,
        wins: selectedBoxer.wins,
        losses: selectedBoxer.losses,
        draws: selectedBoxer.draws,
        gymAffiliation: selectedBoxer.gymAffiliation,
        bio: selectedBoxer.bio,
        isVerified: selectedBoxer.isVerified,
      });
    }
  }, [isEditing, selectedBoxer, reset]);

  const onSubmit = async (data: BoxerFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && id) {
        await dispatch(
          updateBoxer({
            id,
            data: {
              name: data.name,
              gender: data.gender as Gender | null | undefined,
              weightKg: data.weightKg,
              heightCm: data.heightCm,
              dateOfBirth: data.dateOfBirth,
              city: data.city,
              country: data.country,
              experienceLevel: data.experienceLevel as ExperienceLevel,
              wins: data.wins,
              losses: data.losses,
              draws: data.draws,
              gymAffiliation: data.gymAffiliation,
              bio: data.bio,
              isVerified: data.isVerified,
            },
          })
        ).unwrap();
      } else {
        if (!data.userId) {
          setError('Please select a user');
          return;
        }
        await dispatch(
          createBoxer({
            userId: data.userId,
            name: data.name,
            gender: (data.gender as Gender) || undefined,
            weightKg: data.weightKg || undefined,
            heightCm: data.heightCm || undefined,
            dateOfBirth: data.dateOfBirth || undefined,
            city: data.city || undefined,
            country: data.country || undefined,
            experienceLevel: data.experienceLevel as ExperienceLevel,
            wins: data.wins,
            losses: data.losses,
            draws: data.draws,
            gymAffiliation: data.gymAffiliation || undefined,
            bio: data.bio || undefined,
            isVerified: data.isVerified,
          })
        ).unwrap();
      }
      navigate('/admin/boxers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/boxers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Boxer' : 'Create Boxer'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update boxer profile' : 'Create a new boxer profile'}
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            {isEditing && selectedBoxer?.profilePhotoUrl && (
              <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border">
                <img
                  src={selectedBoxer.profilePhotoUrl}
                  alt={selectedBoxer.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <CardTitle>Boxer Information</CardTitle>
              {isEditing && selectedBoxer && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBoxer.name} &bull; {selectedBoxer.wins}-{selectedBoxer.losses}-{selectedBoxer.draws}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* User Selection (for create only) */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="userId">User Account</Label>
                <Select
                  onValueChange={(value) => setValue('userId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.data
                      .filter((u) => u.role === 'BOXER')
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.userId && (
                  <p className="text-sm text-red-500">{errors.userId.message}</p>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="Boxer name" />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={watchedGender || ''}
                  onValueChange={(value) =>
                    setValue('gender', value as Gender)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Physical Info */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  {...register('weightKg')}
                  placeholder="Weight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  {...register('heightCm')}
                  placeholder="Height"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} placeholder="City" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="Country"
                />
              </div>
            </div>

            {/* Experience */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <Select
                  value={watchedExperience}
                  onValueChange={(value) =>
                    setValue('experienceLevel', value as ExperienceLevel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gymAffiliation">Gym Affiliation</Label>
                <Input
                  id="gymAffiliation"
                  {...register('gymAffiliation')}
                  placeholder="Gym name"
                />
              </div>
            </div>

            {/* Record */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wins">Wins</Label>
                <Input
                  id="wins"
                  type="number"
                  {...register('wins')}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="losses">Losses</Label>
                <Input
                  id="losses"
                  type="number"
                  {...register('losses')}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="draws">Draws</Label>
                <Input
                  id="draws"
                  type="number"
                  {...register('draws')}
                  min={0}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Boxer bio"
                rows={4}
              />
            </div>

            {/* Verification */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVerified"
                checked={watchedIsVerified}
                onCheckedChange={(checked: boolean | 'indeterminate') => setValue('isVerified', checked === true)}
              />
              <Label htmlFor="isVerified">Verified boxer</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Update Boxer' : 'Create Boxer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/boxers')}
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
