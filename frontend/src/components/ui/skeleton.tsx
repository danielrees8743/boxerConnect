import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Skeleton component for loading placeholders.
 * Use to indicate content is loading with a pulsing animation.
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-4 w-[250px]" />
 *
 * // Avatar skeleton
 * <Skeleton className="h-12 w-12 rounded-full" />
 *
 * // Card skeleton
 * <div className="space-y-2">
 *   <Skeleton className="h-4 w-[250px]" />
 *   <Skeleton className="h-4 w-[200px]" />
 * </div>
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton for a card layout.
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/**
 * Pre-built skeleton for a table row.
 */
function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

/**
 * Pre-built skeleton for a list item.
 */
function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-4 py-4', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[60%]" />
        <Skeleton className="h-3 w-[40%]" />
      </div>
    </div>
  );
}

export { Skeleton, CardSkeleton, TableRowSkeleton, ListItemSkeleton };
