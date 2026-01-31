import React from 'react';
import { Users, Sliders } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@/components/ui';
import { BoxerList } from '@/components/boxer';
import type { MatchSuggestion, CompatibleMatchOptions } from '@/types';
import { cn } from '@/lib/utils';

interface CompatibleBoxersListProps {
  matches: MatchSuggestion[];
  boxerId: string;
  isLoading?: boolean;
  options?: CompatibleMatchOptions;
  onOptionsChange?: (options: CompatibleMatchOptions) => void;
  onSearch?: () => void;
  onViewProfile?: (id: string) => void;
  onSendRequest?: (id: string) => void;
  className?: string;
}

/**
 * CompatibleBoxersList displays boxers compatible with a specific boxer.
 * Includes filtering options for weight range, experience, and distance.
 *
 * @example
 * <CompatibleBoxersList
 *   matches={compatibleMatches}
 *   boxerId={currentBoxer.id}
 *   onSendRequest={handleSendRequest}
 * />
 */
export const CompatibleBoxersList: React.FC<CompatibleBoxersListProps> = ({
  matches,
  // boxerId is used by parent to fetch data
  boxerId: _boxerId,
  isLoading = false,
  options = {},
  onOptionsChange,
  onSearch,
  onViewProfile,
  onSendRequest,
  className,
}) => {
  // boxerId can be used for display purposes if needed
  void _boxerId;
  const [showFilters, setShowFilters] = React.useState(false);

  const handleOptionChange = (
    key: keyof CompatibleMatchOptions,
    value: number | undefined
  ) => {
    onOptionsChange?.({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Compatible Boxers
        </h2>
        {onOptionsChange && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Sliders className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && onOptionsChange && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Match Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="weightRange">Weight Range (kg)</Label>
                <Input
                  id="weightRange"
                  type="number"
                  placeholder="5"
                  value={options.weightRangeKg || ''}
                  onChange={(e) =>
                    handleOptionChange(
                      'weightRangeKg',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  inputSize="sm"
                />
                <p className="text-xs text-muted-foreground">
                  +/- kg from your weight
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceRange">Experience Range</Label>
                <Input
                  id="experienceRange"
                  type="number"
                  placeholder="1"
                  min="0"
                  max="4"
                  value={options.experienceRange || ''}
                  onChange={(e) =>
                    handleOptionChange(
                      'experienceRange',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  inputSize="sm"
                />
                <p className="text-xs text-muted-foreground">
                  Levels above/below you
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDistance">Max Distance (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  placeholder="100"
                  value={options.maxDistanceKm || ''}
                  onChange={(e) =>
                    handleOptionChange(
                      'maxDistanceKm',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  inputSize="sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Results Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="10"
                  min="1"
                  max="50"
                  value={options.limit || ''}
                  onChange={(e) =>
                    handleOptionChange(
                      'limit',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  inputSize="sm"
                />
              </div>
            </div>
            {onSearch && (
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={onSearch} disabled={isLoading}>
                  Apply Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {!isLoading && matches.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Found {matches.length} compatible boxer{matches.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Boxer List */}
      <BoxerList
        boxers={matches}
        isLoading={isLoading}
        onViewProfile={onViewProfile}
        onSendRequest={onSendRequest}
        emptyMessage="No compatible boxers found. Try adjusting your filters."
        showCompatibility
      />
    </div>
  );
};

export default CompatibleBoxersList;
