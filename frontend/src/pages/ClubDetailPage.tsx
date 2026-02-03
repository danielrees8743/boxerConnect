import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Clock,
  DollarSign,
  Star,
  Award,
  Users,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Accessibility,
  Car,
  Bus,
} from 'lucide-react';
import { clubService } from '@/services/clubService';
import type { Club } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

/**
 * ClubDetailPage - Full public-facing club profile
 */
export const ClubDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClub = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await clubService.getClub(id);
        setClub(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load club');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClub();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-60 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/clubs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clubs
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Club not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const bannerPhoto = club.photos?.[0];
  const profilePhoto = club.photos?.[1];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/clubs')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Clubs
      </Button>

      {/* Banner Photo */}
      {bannerPhoto && (
        <div className="w-full h-64 overflow-hidden rounded-lg">
          <img
            src={bannerPhoto}
            alt={`${club.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header with Profile Photo */}
      <div className="flex items-start gap-6">
        {profilePhoto ? (
          <img
            src={profilePhoto}
            alt={club.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{club.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {club.region && <Badge variant="secondary">{club.region}</Badge>}
            {club.isVerified && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {club.acceptingMembers && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Accepting Members
              </Badge>
            )}
          </div>
          {club.foundedYear && (
            <p className="text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Founded {club.foundedYear}
            </p>
          )}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* About Section */}
          {club.description && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {club.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Specializations */}
          {club.specialties && club.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specializations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {club.specialties.map((specialty, idx) => (
                    <Badge key={idx} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facilities & Amenities */}
          {club.amenities && club.amenities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Facilities & Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {club.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo Gallery */}
          {club.photos && club.photos.length > 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {club.photos.slice(2).map((photo, idx) => (
                    <div
                      key={idx}
                      className="aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={photo}
                        alt={`${club.name} photo ${idx + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Head Coach */}
          {club.headCoachName && (
            <Card>
              <CardHeader>
                <CardTitle>Head Coach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  {club.headCoachPhotoUrl ? (
                    <img
                      src={club.headCoachPhotoUrl}
                      alt={club.headCoachName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{club.headCoachName}</h3>
                    {club.headCoachBio && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {club.headCoachBio}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {club.achievements && club.achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {club.achievements.map((achievement, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                      <span className="text-sm">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Affiliations */}
          {club.affiliations && club.affiliations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Affiliations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {club.affiliations.map((affiliation, idx) => (
                    <Badge key={idx} variant="secondary">
                      {affiliation}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {club.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <a
                    href={`mailto:${club.email}`}
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {club.email}
                  </a>
                </div>
              )}
              {club.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <a
                    href={`tel:${club.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {club.phone}
                  </a>
                </div>
              )}
              {(club.address || club.city || club.postcode) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {club.address && <div>{club.address}</div>}
                    <div>
                      {club.city && <span>{club.city}</span>}
                      {club.postcode && <span>, {club.postcode}</span>}
                    </div>
                    {club.country && <div>{club.country}</div>}
                  </div>
                </div>
              )}
              {club.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {club.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operating Hours */}
          {club.operatingHours && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Operating Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(club.operatingHours).map(([day, schedule]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{day}</span>
                      <span className="text-muted-foreground">
                        {schedule.closed || !schedule.open || !schedule.close
                          ? 'Closed'
                          : `${schedule.open} - ${schedule.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Tiers */}
          {club.pricingTiers && club.pricingTiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {club.pricingTiers?.map((tier, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium">{tier.name}</span>
                      <span className="text-lg font-bold">
                        £{tier.price}
                        <span className="text-sm text-muted-foreground">
                          /{tier.interval}
                        </span>
                      </span>
                    </div>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground">
                        {tier.description}
                      </p>
                    )}
                    {club.pricingTiers && idx < club.pricingTiers.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Social Media */}
          {(club.facebookUrl || club.instagramUrl || club.twitterUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Follow Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {club.facebookUrl && (
                  <a
                    href={club.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </a>
                )}
                {club.instagramUrl && (
                  <a
                    href={club.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                )}
                {club.twitterUrl && (
                  <a
                    href={club.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transportation & Accessibility */}
          {(club.parkingInfo ||
            club.publicTransportInfo ||
            (club.accessibility && club.accessibility.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Getting Here</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {club.parkingInfo && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Parking</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {club.parkingInfo}
                    </p>
                  </div>
                )}
                {club.publicTransportInfo && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Bus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Public Transport</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {club.publicTransportInfo}
                    </p>
                  </div>
                )}
                {club.accessibility && club.accessibility.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Accessibility className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Accessibility</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      {club.accessibility.map((feature, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          • {feature}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CTA Button */}
          {club.acceptingMembers && club.email && (
            <Button className="w-full" asChild>
              <a href={`mailto:${club.email}?subject=Membership Inquiry`}>
                Contact About Membership
              </a>
            </Button>
          )}

          {/* Additional Info */}
          {(club.capacity || club.ageGroupsServed) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {club.capacity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{club.capacity} members</span>
                  </div>
                )}
                {club.ageGroupsServed && club.ageGroupsServed.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Age Groups:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {club.ageGroupsServed.map((age, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {age}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {club.languages && club.languages.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Languages:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {club.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubDetailPage;
