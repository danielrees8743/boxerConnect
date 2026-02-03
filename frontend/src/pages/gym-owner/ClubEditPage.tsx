import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clubService } from '@/services/clubService';
import type { Club, UpdateClubData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';

// Validation schema
const clubEditSchema = z.object({
  // Basic Info
  name: z.string().min(1, 'Club name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  contactName: z.string().max(100).optional().or(z.literal('')),

  // Profile Content
  description: z.string().max(2000).optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Location
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  postcode: z.string().max(20).optional().or(z.literal('')),
  region: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),

  // Facilities
  specialties: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  ageGroupsServed: z.array(z.string()).optional(),
  capacity: z.coerce.number().min(0).optional().nullable(),

  // Operating Hours
  operatingHours: z
    .object({
      monday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      tuesday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      wednesday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      thursday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      friday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      saturday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
      sunday: z.object({ open: z.string().optional(), close: z.string().optional(), closed: z.boolean().optional() }),
    })
    .optional()
    .nullable(),

  // Media
  photos: z.array(z.string().url()).optional(),

  // Social Media
  facebookUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagramUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Membership Info
  acceptingMembers: z.boolean().default(false),
  pricingTiers: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      price: z.coerce.number().min(0, 'Price must be positive'),
      interval: z.string().min(1, 'Interval is required'),
      description: z.string().optional(),
    })
  ).optional(),

  // Achievements
  foundedYear: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().nullable(),
  achievements: z.array(z.string()).optional(),
  affiliations: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),

  // Head Coach
  headCoachName: z.string().max(100).optional().or(z.literal('')),
  headCoachBio: z.string().max(1000).optional().or(z.literal('')),
  headCoachPhotoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Additional
  languages: z.array(z.string()).optional(),
  parkingInfo: z.string().max(500).optional().or(z.literal('')),
  publicTransportInfo: z.string().max(500).optional().or(z.literal('')),
  accessibility: z.array(z.string()).optional(),

  // Visibility
  isPublished: z.boolean().default(false),
});

type ClubEditFormData = z.infer<typeof clubEditSchema>;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const ClubEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<ClubEditFormData>({
    resolver: zodResolver(clubEditSchema),
  });

  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({
    control,
    name: 'pricingTiers',
  });

  // Load club data
  useEffect(() => {
    const fetchClub = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await clubService.getClub(id);
        setClub(data);

        // Populate form with club data
        reset({
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          contactName: data.contactName || '',
          description: data.description || '',
          website: data.website || '',
          address: data.address || '',
          city: data.city || '',
          postcode: data.postcode || '',
          region: data.region || '',
          country: data.country || '',
          latitude: data.latitude,
          longitude: data.longitude,
          specialties: data.specialties || [],
          amenities: data.amenities || [],
          ageGroupsServed: data.ageGroupsServed || [],
          capacity: data.capacity,
          operatingHours: data.operatingHours || {
            monday: { closed: true },
            tuesday: { closed: true },
            wednesday: { closed: true },
            thursday: { closed: true },
            friday: { closed: true },
            saturday: { closed: true },
            sunday: { closed: true },
          },
          photos: data.photos || [],
          facebookUrl: data.facebookUrl || '',
          instagramUrl: data.instagramUrl || '',
          twitterUrl: data.twitterUrl || '',
          acceptingMembers: data.acceptingMembers || false,
          pricingTiers: data.pricingTiers || [],
          foundedYear: data.foundedYear,
          achievements: data.achievements || [],
          affiliations: data.affiliations || [],
          certifications: data.certifications || [],
          headCoachName: data.headCoachName || '',
          headCoachBio: data.headCoachBio || '',
          headCoachPhotoUrl: data.headCoachPhotoUrl || '',
          languages: data.languages || [],
          parkingInfo: data.parkingInfo || '',
          publicTransportInfo: data.publicTransportInfo || '',
          accessibility: data.accessibility || [],
          isPublished: data.isPublished || false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load club');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [id, reset]);

  const onSubmit = async (data: ClubEditFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: UpdateClubData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        contactName: data.contactName || null,
        description: data.description || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city || null,
        postcode: data.postcode || null,
        region: data.region || null,
        country: data.country || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        specialties: data.specialties || [],
        amenities: data.amenities || [],
        ageGroupsServed: data.ageGroupsServed || [],
        capacity: data.capacity || null,
        operatingHours: data.operatingHours || null,
        photos: data.photos || [],
        facebookUrl: data.facebookUrl || null,
        instagramUrl: data.instagramUrl || null,
        twitterUrl: data.twitterUrl || null,
        acceptingMembers: data.acceptingMembers,
        pricingTiers: data.pricingTiers || [],
        foundedYear: data.foundedYear || null,
        achievements: data.achievements || [],
        affiliations: data.affiliations || [],
        certifications: data.certifications || [],
        headCoachName: data.headCoachName || null,
        headCoachBio: data.headCoachBio || null,
        headCoachPhotoUrl: data.headCoachPhotoUrl || null,
        languages: data.languages || [],
        parkingInfo: data.parkingInfo || null,
        publicTransportInfo: data.publicTransportInfo || null,
        accessibility: data.accessibility || [],
        isPublished: data.isPublished,
      };

      await clubService.updateClub(id, updateData);
      navigate(`/gym-owner/clubs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update club');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !club) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/gym-owner/clubs/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Helper functions for array fields
  const addToArrayField = (field: keyof ClubEditFormData, value: string) => {
    const currentValue = watch(field) as string[] || [];
    if (value && !currentValue.includes(value)) {
      setValue(field, [...currentValue, value] as any);
    }
  };

  const removeFromArrayField = (field: keyof ClubEditFormData, index: number) => {
    const currentValue = watch(field) as string[] || [];
    setValue(field, currentValue.filter((_, i) => i !== index) as any);
  };

  const ArrayFieldInput = ({ field, placeholder }: { field: keyof ClubEditFormData; placeholder: string }) => {
    const [inputValue, setInputValue] = useState('');
    const values = (watch(field) as string[]) || [];

    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addToArrayField(field, inputValue);
                setInputValue('');
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              addToArrayField(field, inputValue);
              setInputValue('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => removeFromArrayField(field, index)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/gym-owner/clubs/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Club Profile</h1>
            <p className="text-muted-foreground mt-1">{club?.name}</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" {...register('contactName')} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input id="foundedYear" type="number" {...register('foundedYear')} />
                {errors.foundedYear && <p className="text-sm text-red-500">{errors.foundedYear.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" {...register('capacity')} placeholder="Max members" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Profile Content */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Tell potential members about your club..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {(watch('description') || '').length}/2000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" {...register('website')} placeholder="https://..." />
              {errors.website && <p className="text-sm text-red-500">{errors.website.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* 3. Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" {...register('postcode')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" {...register('region')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} placeholder="Wales" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" step="any" {...register('latitude')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" type="number" step="any" {...register('longitude')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Facilities & Services */}
        <Card>
          <CardHeader>
            <CardTitle>Facilities & Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Specializations</Label>
              <ArrayFieldInput field="specialties" placeholder="e.g., Olympic Boxing, Youth Training" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Amenities</Label>
              <ArrayFieldInput field="amenities" placeholder="e.g., Changing Rooms, Showers" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Age Groups Served</Label>
              <ArrayFieldInput field="ageGroupsServed" placeholder="e.g., Youth (8-16), Adults" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => {
              const isClosed = watch(`operatingHours.${day}.closed`);
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Checkbox
                      checked={!isClosed}
                      onCheckedChange={(checked) =>
                        setValue(`operatingHours.${day}.closed`, checked !== true)
                      }
                    />
                    <Label className="capitalize">{day}</Label>
                  </div>
                  {!isClosed && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        {...register(`operatingHours.${day}.open`)}
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        {...register(`operatingHours.${day}.close`)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 6. Media */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Photo URLs</Label>
            <ArrayFieldInput field="photos" placeholder="https://example.com/photo.jpg" />
            <p className="text-xs text-muted-foreground">
              First photo will be used as banner, second as profile photo
            </p>
          </CardContent>
        </Card>

        {/* 7. Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebookUrl">Facebook</Label>
              <Input id="facebookUrl" type="url" {...register('facebookUrl')} placeholder="https://facebook.com/..." />
              {errors.facebookUrl && <p className="text-sm text-red-500">{errors.facebookUrl.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram</Label>
              <Input id="instagramUrl" type="url" {...register('instagramUrl')} placeholder="https://instagram.com/..." />
              {errors.instagramUrl && <p className="text-sm text-red-500">{errors.instagramUrl.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitterUrl">Twitter</Label>
              <Input id="twitterUrl" type="url" {...register('twitterUrl')} placeholder="https://twitter.com/..." />
              {errors.twitterUrl && <p className="text-sm text-red-500">{errors.twitterUrl.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* 8. Membership & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Membership & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="acceptingMembers"
                checked={watch('acceptingMembers')}
                onCheckedChange={(checked) => setValue('acceptingMembers', checked === true)}
              />
              <Label htmlFor="acceptingMembers">Currently accepting new members</Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Pricing Tiers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPricing({ name: '', price: 0, interval: 'month', description: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tier
                </Button>
              </div>

              {pricingFields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tier Name</Label>
                            <Input {...register(`pricingTiers.${index}.name`)} placeholder="e.g., Monthly" />
                          </div>

                          <div className="space-y-2">
                            <Label>Price (£)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...register(`pricingTiers.${index}.price`)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Interval</Label>
                            <Input {...register(`pricingTiers.${index}.interval`)} placeholder="month, year, session" />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Description (optional)</Label>
                            <Input {...register(`pricingTiers.${index}.description`)} />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePricing(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 9. Achievements & Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements & Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Achievements</Label>
              <ArrayFieldInput field="achievements" placeholder="e.g., National Champion 2023" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Affiliations</Label>
              <ArrayFieldInput field="affiliations" placeholder="e.g., Welsh Boxing Association" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Certifications</Label>
              <ArrayFieldInput field="certifications" placeholder="e.g., Level 3 Coaching" />
            </div>
          </CardContent>
        </Card>

        {/* 10. Head Coach */}
        <Card>
          <CardHeader>
            <CardTitle>Head Coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headCoachName">Name</Label>
              <Input id="headCoachName" {...register('headCoachName')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headCoachBio">Bio</Label>
              <Textarea id="headCoachBio" {...register('headCoachBio')} rows={4} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headCoachPhotoUrl">Photo URL</Label>
              <Input id="headCoachPhotoUrl" type="url" {...register('headCoachPhotoUrl')} />
            </div>
          </CardContent>
        </Card>

        {/* 11. Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Languages Spoken</Label>
              <ArrayFieldInput field="languages" placeholder="e.g., English, Welsh" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="parkingInfo">Parking Information</Label>
              <Textarea id="parkingInfo" {...register('parkingInfo')} rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicTransportInfo">Public Transport</Label>
              <Textarea id="publicTransportInfo" {...register('publicTransportInfo')} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Accessibility Features</Label>
              <ArrayFieldInput field="accessibility" placeholder="e.g., Wheelchair accessible" />
            </div>
          </CardContent>
        </Card>

        {/* 12. Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPublished"
                checked={watch('isPublished')}
                onCheckedChange={(checked) => setValue('isPublished', checked === true)}
              />
              <div>
                <Label htmlFor="isPublished">Publish profile</Label>
                <p className="text-xs text-muted-foreground">
                  Make this profile visible to the public
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 sticky bottom-0 bg-background p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/gym-owner/clubs/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClubEditPage;
