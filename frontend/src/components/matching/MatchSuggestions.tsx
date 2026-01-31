import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
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
  getInitials,
} from '@/components/ui';
import type { MatchSuggestion } from '@/types';
import { cn } from '@/lib/utils';

interface MatchSuggestionsProps {
  suggestions: MatchSuggestion[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewAll?: () => void;
  onSendRequest?: (boxerId: string) => void;
  maxItems?: number;
  className?: string;
}

/**
 * MatchSuggestions component displays AI-suggested matches.
 * Typically used as a dashboard widget.
 *
 * @example
 * <MatchSuggestions
 *   suggestions={suggestedMatches}
 *   onRefresh={handleRefresh}
 *   onSendRequest={handleSendRequest}
 * />
 */
export const MatchSuggestions: React.FC<MatchSuggestionsProps> = ({
  suggestions,
  isLoading = false,
  onRefresh,
  onViewAll,
  onSendRequest,
  maxItems = 3,
  className,
}) => {
  const displayedSuggestions = suggestions.slice(0, maxItems);

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-boxing-gold" />
            Suggested Matches
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn('h-4 w-4', isLoading && 'animate-spin')}
                />
              </Button>
            )}
            {onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: maxItems }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : displayedSuggestions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No match suggestions available.
            <br />
            <span className="text-sm">
              Complete your profile to get personalized suggestions.
            </span>
          </p>
        ) : (
          <div className="space-y-3">
            {displayedSuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.boxer.id}
                suggestion={suggestion}
                onSendRequest={onSendRequest}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Individual suggestion item component.
 */
interface SuggestionItemProps {
  suggestion: MatchSuggestion;
  onSendRequest?: (boxerId: string) => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  onSendRequest,
}) => {
  const { boxer, compatibilityScore, matchReasons } = suggestion;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <Link to={`/boxers/${boxer.id}`}>
        <Avatar className="h-12 w-12">
          <AvatarImage src={boxer.profilePhotoUrl || undefined} alt={boxer.name} />
          <AvatarFallback className="bg-boxing-red/10 text-boxing-red">
            {getInitials(boxer.name)}
          </AvatarFallback>
        </Avatar>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/boxers/${boxer.id}`}
          className="font-medium hover:underline truncate block"
        >
          {boxer.name}
        </Link>
        <div className="flex flex-wrap gap-1 mt-1">
          {matchReasons.slice(0, 2).map((reason, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      </div>

      {/* Score & Action */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
            compatibilityScore >= 80
              ? 'bg-green-500'
              : compatibilityScore >= 60
              ? 'bg-yellow-500'
              : 'bg-red-500'
          )}
        >
          {compatibilityScore}%
        </div>
        {onSendRequest && (
          <Button size="sm" onClick={() => onSendRequest(boxer.id)}>
            Request
          </Button>
        )}
      </div>
    </div>
  );
};

export default MatchSuggestions;
