import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Avatar root component that contains the image and fallback.
 */
const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

/**
 * Avatar image component that displays the profile photo.
 * Handles loading state and error fallback.
 */
interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = React.useState<'loading' | 'loaded' | 'error'>(
      'loading'
    );

    React.useEffect(() => {
      if (!src) {
        setStatus('error');
        return;
      }
      setStatus('loading');
    }, [src]);

    React.useEffect(() => {
      onLoadingStatusChange?.(status);
    }, [status, onLoadingStatusChange]);

    if (status === 'error' || !src) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('aspect-square h-full w-full object-cover', className)}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

/**
 * Avatar fallback component displayed when image fails to load.
 * Typically shows user initials or an icon.
 */
const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

/**
 * Helper function to generate initials from a name.
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

export { Avatar, AvatarImage, AvatarFallback, getInitials };
