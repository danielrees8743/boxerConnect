import React from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Button, CardSkeleton } from '@/components/ui';
import { BoxerCard } from './BoxerCard';
import type { BoxerProfile, PaginationInfo, MatchSuggestion } from '@/types';
import { cn } from '@/lib/utils';

interface BoxerListProps {
  boxers: BoxerProfile[] | MatchSuggestion[];
  pagination?: PaginationInfo | null;
  onPageChange?: (page: number) => void;
  onViewProfile?: (id: string) => void;
  onSendRequest?: (id: string) => void;
  onConnect?: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  showCompatibility?: boolean;
  className?: string;
}

/**
 * Type guard to check if item is a MatchSuggestion.
 */
function isMatchSuggestion(
  item: BoxerProfile | MatchSuggestion
): item is MatchSuggestion {
  return 'compatibilityScore' in item;
}

/**
 * BoxerList component displays a list of boxer cards with pagination.
 *
 * @example
 * <BoxerList
 *   boxers={boxerProfiles}
 *   pagination={paginationInfo}
 *   onPageChange={handlePageChange}
 *   onConnect={handleConnect}
 * />
 */
export const BoxerList: React.FC<BoxerListProps> = ({
  boxers,
  pagination,
  onPageChange,
  onViewProfile,
  onSendRequest,
  onConnect,
  isLoading = false,
  emptyMessage = 'No boxers found.',
  showCompatibility = false,
  className,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (boxers.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Boxer Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {boxers.map((item) => {
          const boxer = isMatchSuggestion(item) ? item.boxer : item;
          const compatibilityScore = isMatchSuggestion(item)
            ? item.compatibilityScore
            : undefined;

          return (
            <BoxerCard
              key={boxer.id}
              boxer={boxer}
              compatibilityScore={
                showCompatibility || isMatchSuggestion(item)
                  ? compatibilityScore
                  : undefined
              }
              onViewProfile={onViewProfile}
              onSendRequest={onSendRequest}
              onConnect={onConnect}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} boxers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
                (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8"
                      onClick={() => onPageChange?.(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                }
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxerList;
