import React from 'react';
import { format } from 'date-fns';
import {
  MapPin,
  Trophy,
  CheckCircle2,
  Calendar,
  Dumbbell,
  Edit2,
  User,
  Scale,
  Ruler,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Skeleton,
  getInitials,
} from '@/components/ui';
import type { BoxerProfile as BoxerProfileType, FightHistory, Availability, FightResult, Gender } from '@/types';
import { cn } from '@/lib/utils';

interface BoxerProfileProps {
  boxer: BoxerProfileType | null;
  fightHistory?: FightHistory[];
  availability?: Availability[];
  isOwner?: boolean;
  isLoading?: boolean;
  onEdit?: () => void;
  onSendRequest?: () => void;
  className?: string;
}

/**
 * Format experience level for display.
 */
function formatExperienceLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/**
 * Format gender for display.
 */
function formatGender(gender: Gender): string {
  return gender === 'MALE' ? 'Male' : 'Female';
}

/**
 * Calculate age from date of birth.
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get badge variant for fight result.
 */
function getResultBadgeVariant(result: FightResult): 'success' | 'destructive' | 'secondary' | 'outline' {
  switch (result) {
    case 'WIN':
      return 'success';
    case 'LOSS':
      return 'destructive';
    case 'DRAW':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * BoxerProfile component displays a full boxer profile with fight history.
 * Shows all boxer details, stats, and availability.
 *
 * @example
 * <BoxerProfile
 *   boxer={boxerData}
 *   fightHistory={fights}
 *   isOwner={true}
 *   onEdit={() => setEditMode(true)}
 * />
 */
export const BoxerProfile: React.FC<BoxerProfileProps> = ({
  boxer,
  fightHistory = [],
  availability = [],
  isOwner = false,
  isLoading = false,
  onEdit,
  onSendRequest,
  className,
}) => {
  if (isLoading) {
    return <BoxerProfileSkeleton />;
  }

  if (!boxer) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <p className="text-muted-foreground">Boxer profile not found.</p>
      </Card>
    );
  }

  const totalFights = boxer.wins + boxer.losses + boxer.draws;
  const winPercentage = totalFights > 0 ? Math.round((boxer.wins / totalFights) * 100) : 0;
  const locationDisplay = [boxer.city, boxer.country].filter(Boolean).join(', ');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <Avatar className="h-32 w-32">
                <AvatarImage src={boxer.profilePhotoUrl || undefined} alt={boxer.name} />
                <AvatarFallback className="bg-boxing-red/10 text-boxing-red text-3xl">
                  {getInitials(boxer.name)}
                </AvatarFallback>
              </Avatar>
              {boxer.isVerified && (
                <Badge variant="success" className="mt-2">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{boxer.name}</h1>
                  {locationDisplay && (
                    <div className="flex items-center gap-1 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{locationDisplay}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isOwner && onEdit && (
                    <Button variant="outline" onClick={onEdit}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                  {!isOwner && onSendRequest && (
                    <Button onClick={onSendRequest}>Send Match Request</Button>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Scale className="h-4 w-4" />
                    <span className="text-xs">Weight</span>
                  </div>
                  <p className="font-semibold">
                    {boxer.weightKg ? `${boxer.weightKg} kg` : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Ruler className="h-4 w-4" />
                    <span className="text-xs">Height</span>
                  </div>
                  <p className="font-semibold">
                    {boxer.heightCm ? `${boxer.heightCm} cm` : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-xs">Age</span>
                  </div>
                  <p className="font-semibold">
                    {boxer.dateOfBirth ? calculateAge(boxer.dateOfBirth) : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-xs">Gender</span>
                  </div>
                  <p className="font-semibold">
                    {boxer.gender ? formatGender(boxer.gender) : '-'}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Dumbbell className="h-4 w-4" />
                    <span className="text-xs">Experience</span>
                  </div>
                  <p className="font-semibold">
                    {formatExperienceLevel(boxer.experienceLevel)}
                  </p>
                </div>
              </div>

              {/* Record */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-boxing-gold" />
                  <span className="font-semibold">Record:</span>
                </div>
                <div className="flex items-center gap-3 text-lg">
                  <span className="font-bold text-green-600">{boxer.wins}W</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-bold text-red-600">{boxer.losses}L</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-bold text-muted-foreground">{boxer.draws}D</span>
                </div>
                {totalFights > 0 && (
                  <Badge variant="secondary">{winPercentage}% Win Rate</Badge>
                )}
              </div>

              {/* Gym Affiliation */}
              {boxer.gymAffiliation && (
                <div className="flex items-center gap-2 text-sm">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Gym:</span>
                  <span className="font-medium">{boxer.gymAffiliation}</span>
                </div>
              )}

              {/* Bio */}
              {boxer.bio && (
                <div className="pt-2">
                  <p className="text-muted-foreground text-sm">{boxer.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fight History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Fight History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fightHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No fight history recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {fightHistory.map((fight) => (
                <div
                  key={fight.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={getResultBadgeVariant(fight.result)}>
                      {fight.result}
                    </Badge>
                    <div>
                      <p className="font-medium">vs. {fight.opponentName}</p>
                      {fight.venue && (
                        <p className="text-sm text-muted-foreground">{fight.venue}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {fight.method && <span>{fight.method}</span>}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(fight.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No availability set.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {availability
                .filter((a) => a.isAvailable)
                .slice(0, 6)
                .map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200"
                  >
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {format(new Date(slot.date), 'EEE, MMM d')}
                      </p>
                      <p className="text-muted-foreground">
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Skeleton loading state for BoxerProfile.
 */
function BoxerProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="h-32 w-32 rounded-full shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default BoxerProfile;
