/**
 * UI component exports for clean imports.
 * This barrel file exports all shadcn/ui components.
 *
 * @example
 * import { Button, Card, CardHeader, Input } from '@/components/ui';
 */

export { Button, buttonVariants } from './button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card';
export { Input, inputVariants } from './input';
export { Label, labelVariants } from './label';
export { Badge, badgeVariants } from './badge';
export { Avatar, AvatarImage, AvatarFallback, getInitials } from './avatar';
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectLabel,
} from './select';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export { Alert, AlertTitle, AlertDescription } from './alert';
export {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
} from './skeleton';
export { Separator } from './separator';
