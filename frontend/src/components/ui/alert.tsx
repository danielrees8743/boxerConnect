import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-500',
        warning:
          'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-500',
        info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Alert component for displaying important messages or notifications.
 * Supports multiple variants for different alert types.
 *
 * @example
 * <Alert>
 *   <AlertTitle>Heads up!</AlertTitle>
 *   <AlertDescription>You can add components to your app using the cli.</AlertDescription>
 * </Alert>
 *
 * <Alert variant="destructive">
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>Something went wrong.</AlertDescription>
 * </Alert>
 */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => {
  // Auto-add icon based on variant
  const IconComponent = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
  }[variant ?? 'default'];

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <IconComponent className="h-4 w-4" />
      {children}
    </div>
  );
});
Alert.displayName = 'Alert';

/**
 * Alert title component.
 */
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

/**
 * Alert description component.
 */
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
