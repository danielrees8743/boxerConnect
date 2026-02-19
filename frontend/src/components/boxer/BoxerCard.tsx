import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  getInitials,
} from '@/components/ui';
import { ConnectButton } from './ConnectButton';
import type { BoxerProfile, ExperienceLevel, Gender } from '@/types';
import { cn } from '@/lib/utils';

interface BoxerCardProps {
  boxer: BoxerProfile;
  compatibilityScore?: number;
  onViewProfile?: (id: string) => void;
  onSendRequest?: (id: string) => void;
  onConnect?: (id: string) => void;
  showActions?: boolean;
  className?: string;
}

/**
 * Experience level badge color mapping.
 */
const experienceBadgeVariant: Record<ExperienceLevel, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  BEGINNER: 'secondary',
  AMATEUR: 'outline',
  INTERMEDIATE: 'default',
  ADVANCED: 'warning',
  PROFESSIONAL: 'success',
};

/**
 * Format experience level for display.
 */
function formatExperienceLevel(level: ExperienceLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/**
 * Format gender for display.
 */
function formatGender(gender: Gender): string {
  return gender === 'MALE' ? 'Male' : 'Female';
}

/**
 * BoxerCard component displays a summary of a boxer profile.
 * Shows photo, name, weight, record, location, and optional compatibility score.
 *
 * @example
 * <BoxerCard
 *   boxer={boxerProfile}
 *   compatibilityScore={85}
 *   onConnect={(id) => handleConnect(id)}
 * />
 */
export const BoxerCard: React.FC<BoxerCardProps> = ({
  boxer,
  compatibilityScore,
  onViewProfile,
  onSendRequest,
  onConnect,
  showActions = true,
  className,
}) => {
  const totalFights = boxer.wins + boxer.losses + boxer.draws;
  const locationDisplay = [boxer.city, boxer.country].filter(Boolean).join(', ');

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-l-boxing-red-600',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 ring-2 ring-boxing-red-100 dark:ring-boxing-red-900/30">
            <AvatarImage src={boxer.profilePhotoUrl || undefined} alt={boxer.name} />
            <AvatarFallback className="bg-boxing-red-600 text-white text-lg font-bold">
              {getInitials(boxer.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate">{boxer.name}</h3>
              {boxer.isVerified && (
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
              )}
            </div>

            {/* Weight, Gender, and Experience */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {boxer.weightKg && (
                <span className="text-sm text-muted-foreground">
                  {boxer.weightKg} kg
                </span>
              )}
              {boxer.gender && (
                <span className="text-sm text-muted-foreground">
                  {formatGender(boxer.gender)}
                </span>
              )}
              <Badge variant={experienceBadgeVariant[boxer.experienceLevel]}>
                {formatExperienceLevel(boxer.experienceLevel)}
              </Badge>
            </div>

            {/* Record */}
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Trophy className="h-4 w-4 text-boxing-gold-500" />
              <span className="font-bold text-victory">{boxer.wins}W</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-bold text-defeat">{boxer.losses}L</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-bold text-draw">{boxer.draws}D</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({totalFights} {totalFights === 1 ? 'fight' : 'fights'})
              </span>
            </div>

            {/* Location */}
            {locationDisplay && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{locationDisplay}</span>
              </div>
            )}
          </div>

          {/* Compatibility Score */}
          {compatibilityScore !== undefined && (
            <div className="text-center shrink-0">
              <div
                className={cn(
                  'h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md',
                  compatibilityScore >= 80
                    ? 'bg-victory'
                    : compatibilityScore >= 60
                    ? 'bg-boxing-gold-500'
                    : 'bg-defeat'
                )}
              >
                {compatibilityScore}%
              </div>
              <span className="text-xs text-muted-foreground mt-1 block font-medium">Match</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-4 flex gap-2">
            {onViewProfile ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewProfile(boxer.id)}
              >
                View Profile
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/boxers/${boxer.id}`}>View Profile</Link>
              </Button>
            )}
            {onConnect && (
              <ConnectButton onConnect={() => onConnect(boxer.id)} size="sm" />
            )}
            {!onConnect && onSendRequest && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onSendRequest(boxer.id)}
              >
                Send Request
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BoxerCard;
