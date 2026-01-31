import * as React from 'react';

import { cn } from '@/lib/utils';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

/**
 * Separator component for visually dividing content.
 * Supports both horizontal and vertical orientations.
 *
 * @example
 * // Horizontal separator (default)
 * <Separator />
 *
 * // Vertical separator
 * <div className="flex h-5 items-center space-x-4">
 *   <span>Item 1</span>
 *   <Separator orientation="vertical" />
 *   <span>Item 2</span>
 * </div>
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator };
