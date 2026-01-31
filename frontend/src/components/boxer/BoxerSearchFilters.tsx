import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { ExperienceLevel } from '@/types';
import type { BoxerSearchParams } from '@/types';
import { cn } from '@/lib/utils';

interface BoxerSearchFiltersProps {
  filters: BoxerSearchParams;
  onFiltersChange: (filters: BoxerSearchParams) => void;
  onSearch?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  className?: string;
}

const experienceLevels: { value: ExperienceLevel | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: ExperienceLevel.BEGINNER, label: 'Beginner' },
  { value: ExperienceLevel.AMATEUR, label: 'Amateur' },
  { value: ExperienceLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: ExperienceLevel.ADVANCED, label: 'Advanced' },
  { value: ExperienceLevel.PROFESSIONAL, label: 'Professional' },
];

/**
 * BoxerSearchFilters component for filtering boxer search results.
 * Includes weight range, experience level, location, and verified toggle.
 *
 * @example
 * <BoxerSearchFilters
 *   filters={searchParams}
 *   onFiltersChange={setSearchParams}
 *   onSearch={handleSearch}
 * />
 */
export const BoxerSearchFilters: React.FC<BoxerSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  isLoading = false,
  className,
}) => {
  const handleInputChange = (
    field: keyof BoxerSearchParams,
    value: string | number | boolean | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const handleReset = () => {
    onFiltersChange({});
    onReset?.();
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weight Range */}
        <div className="space-y-2">
          <Label>Weight Range (kg)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minWeight || ''}
              onChange={(e) =>
                handleInputChange(
                  'minWeight',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              disabled={isLoading}
              inputSize="sm"
              className="w-full"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxWeight || ''}
              onChange={(e) =>
                handleInputChange(
                  'maxWeight',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              disabled={isLoading}
              inputSize="sm"
              className="w-full"
            />
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <Label>Experience Level</Label>
          <Select
            value={filters.experienceLevel || ''}
            onValueChange={(value) =>
              handleInputChange(
                'experienceLevel',
                value ? (value as ExperienceLevel) : undefined
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              {experienceLevels.map((level) => (
                <SelectItem key={level.value || 'all'} value={level.value || 'all'}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            placeholder="Enter city"
            value={filters.city || ''}
            onChange={(e) =>
              handleInputChange('city', e.target.value || undefined)
            }
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            placeholder="Enter country"
            value={filters.country || ''}
            onChange={(e) =>
              handleInputChange('country', e.target.value || undefined)
            }
            disabled={isLoading}
          />
        </div>

        {/* Verified Only Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="verified-toggle" className="cursor-pointer">
            Verified Only
          </Label>
          <button
            id="verified-toggle"
            type="button"
            role="switch"
            aria-checked={filters.isVerified || false}
            onClick={() =>
              handleInputChange('isVerified', filters.isVerified ? undefined : true)
            }
            disabled={isLoading}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              filters.isVerified ? 'bg-primary' : 'bg-input'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
                filters.isVerified ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {onSearch && (
            <Button
              size="sm"
              onClick={onSearch}
              disabled={isLoading}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BoxerSearchFilters;
