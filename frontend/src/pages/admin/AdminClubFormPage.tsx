import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  createClub,
  updateClub,
  fetchClubById,
  clearSelectedClub,
  fetchUsers,
} from '@/features/admin/adminSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2 } from 'lucide-react';

const clubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  contactName: z.string().max(100).optional().or(z.literal('')),
  postcode: z.string().max(20).optional().or(z.literal('')),
  region: z.string().max(100).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  ownerId: z.string().optional().or(z.literal('')),
  isVerified: z.boolean().default(false),
  // Enhanced Profile Fields
  description: z.string().max(2000).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  facebookUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagramUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  foundedYear: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
  capacity: z.coerce.number().min(0).optional().nullable(),
  acceptingMembers: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

type ClubFormData = z.infer<typeof clubSchema>;

export const AdminClubFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedClub, users } = useAppSelector((state) => state.admin);

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
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      contactName: '',
      postcode: '',
      region: '',
      ownerId: '',
      isVerified: false,
      description: '',
      address: '',
      city: '',
      country: '',
      website: '',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      acceptingMembers: false,
      isPublished: false,
    },
  });

  const watchedOwnerId = watch('ownerId');
  const watchedIsVerified = watch('isVerified');
  const watchedAcceptingMembers = watch('acceptingMembers');
  const watchedIsPublished = watch('isPublished');

  // Load gym owners for the owner selector
  useEffect(() => {
    dispatch(fetchUsers({ role: 'GYM_OWNER', limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchClubById(id));
    }

    return () => {
      dispatch(clearSelectedClub());
    };
  }, [dispatch, id, isEditing]);

  useEffect(() => {
    if (isEditing && selectedClub) {
      reset({
        name: selectedClub.name,
        email: selectedClub.email || '',
        phone: selectedClub.phone || '',
        contactName: selectedClub.contactName || '',
        postcode: selectedClub.postcode || '',
        region: selectedClub.region || '',
        latitude: selectedClub.latitude,
        longitude: selectedClub.longitude,
        ownerId: selectedClub.ownerId || '',
        isVerified: selectedClub.isVerified,
        description: selectedClub.description || '',
        address: selectedClub.address || '',
        city: selectedClub.city || '',
        country: selectedClub.country || '',
        website: selectedClub.website || '',
        facebookUrl: selectedClub.facebookUrl || '',
        instagramUrl: selectedClub.instagramUrl || '',
        twitterUrl: selectedClub.twitterUrl || '',
        foundedYear: selectedClub.foundedYear,
        capacity: selectedClub.capacity,
        acceptingMembers: selectedClub.acceptingMembers || false,
        isPublished: selectedClub.isPublished || false,
      });
    }
  }, [isEditing, selectedClub, reset]);

  const onSubmit = async (data: ClubFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const clubData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        contactName: data.contactName || undefined,
        postcode: data.postcode || undefined,
        region: data.region || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        ownerId: data.ownerId || undefined,
        isVerified: data.isVerified,
        description: data.description || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        website: data.website || undefined,
        facebookUrl: data.facebookUrl || undefined,
        instagramUrl: data.instagramUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        foundedYear: data.foundedYear || undefined,
        capacity: data.capacity || undefined,
        acceptingMembers: data.acceptingMembers,
        isPublished: data.isPublished,
      };

      if (isEditing && id) {
        await dispatch(
          updateClub({
            id,
            data: {
              ...clubData,
              email: data.email || null,
              phone: data.phone || null,
              contactName: data.contactName || null,
              postcode: data.postcode || null,
              region: data.region || null,
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              ownerId: data.ownerId || null,
              description: data.description || null,
              address: data.address || null,
              city: data.city || null,
              country: data.country || null,
              website: data.website || null,
              facebookUrl: data.facebookUrl || null,
              instagramUrl: data.instagramUrl || null,
              twitterUrl: data.twitterUrl || null,
              foundedYear: data.foundedYear || null,
              capacity: data.capacity || null,
            },
          })
        ).unwrap();
      } else {
        await dispatch(createClub(clubData)).unwrap();
      }
      navigate('/admin/clubs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter for gym owners and admins
  const ownerOptions = users.data.filter(
    (u) => u.role === 'GYM_OWNER' || u.role === 'ADMIN'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/clubs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Club' : 'Create Club'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update club details' : 'Create a new boxing club'}
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Club Information</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="name">Club Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter club name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="club@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+44 123 456 7890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                {...register('contactName')}
                placeholder="Main contact person"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input id="foundedYear" type="number" {...register('foundedYear')} />
                {errors.foundedYear && (
                  <p className="text-sm text-red-500">{errors.foundedYear.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" {...register('capacity')} placeholder="Max members" />
              </div>
            </div>
            </div>

            {/* Section 2: Profile Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Content</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Tell potential members about your club..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" {...register('website')} placeholder="https://..." />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website.message}</p>
                )}
              </div>
            </div>

            {/* Section 3: Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  {...register('postcode')}
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  {...register('region')}
                  placeholder="Wales"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="Wales"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  {...register('latitude')}
                  placeholder="51.5074"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  {...register('longitude')}
                  placeholder="-0.1278"
                />
              </div>
            </div>
            </div>

            {/* Section 4: Social Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Media</h3>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="facebookUrl">Facebook</Label>
                <Input id="facebookUrl" type="url" {...register('facebookUrl')} placeholder="https://facebook.com/..." />
                {errors.facebookUrl && (
                  <p className="text-sm text-red-500">{errors.facebookUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram</Label>
                <Input id="instagramUrl" type="url" {...register('instagramUrl')} placeholder="https://instagram.com/..." />
                {errors.instagramUrl && (
                  <p className="text-sm text-red-500">{errors.instagramUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitterUrl">Twitter</Label>
                <Input id="twitterUrl" type="url" {...register('twitterUrl')} placeholder="https://twitter.com/..." />
                {errors.twitterUrl && (
                  <p className="text-sm text-red-500">{errors.twitterUrl.message}</p>
                )}
              </div>
            </div>

            {/* Section 5: Administrative */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Administrative</h3>
              <Separator />

              <div className="space-y-2">
              <Label htmlFor="ownerId">Owner</Label>
              <Select
                value={watchedOwnerId || ''}
                onValueChange={(value) => setValue('ownerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No owner</SelectItem>
                  {ownerOptions.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVerified"
                checked={watchedIsVerified}
                onCheckedChange={(checked: boolean | 'indeterminate') => setValue('isVerified', checked === true)}
              />
              <Label htmlFor="isVerified">Verified club</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptingMembers"
                checked={watchedAcceptingMembers}
                onCheckedChange={(checked: boolean | 'indeterminate') => setValue('acceptingMembers', checked === true)}
              />
              <Label htmlFor="acceptingMembers">Currently accepting new members</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublished"
                checked={watchedIsPublished}
                onCheckedChange={(checked: boolean | 'indeterminate') => setValue('isPublished', checked === true)}
              />
              <Label htmlFor="isPublished">Published (visible to public)</Label>
            </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Update Club' : 'Create Club'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/clubs')}
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
