import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, Calendar, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertDescription,
  getInitials,
} from '@/components/ui';
import type { BoxerProfile, CreateMatchRequestData } from '@/types';
import { cn } from '@/lib/utils';

// Validation schema
const sendRequestSchema = z.object({
  message: z
    .string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
  proposedDate: z.string().optional(),
  proposedVenue: z
    .string()
    .max(200, 'Venue must be less than 200 characters')
    .optional(),
});

type SendRequestFormData = z.infer<typeof sendRequestSchema>;

interface SendRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetBoxer: BoxerProfile | null;
  onSubmit: (data: CreateMatchRequestData) => void;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * SendRequestDialog component for sending a match request to a boxer.
 * Includes message, proposed date, and venue inputs.
 *
 * @example
 * <SendRequestDialog
 *   open={isDialogOpen}
 *   onOpenChange={setIsDialogOpen}
 *   targetBoxer={selectedBoxer}
 *   onSubmit={handleSendRequest}
 * />
 */
export const SendRequestDialog: React.FC<SendRequestDialogProps> = ({
  open,
  onOpenChange,
  targetBoxer,
  onSubmit,
  isLoading = false,
  error,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendRequestFormData>({
    resolver: zodResolver(sendRequestSchema),
    defaultValues: {
      message: '',
      proposedDate: '',
      proposedVenue: '',
    },
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = (data: SendRequestFormData) => {
    if (!targetBoxer) return;

    onSubmit({
      targetBoxerId: targetBoxer.id,
      message: data.message || undefined,
      proposedDate: data.proposedDate || undefined,
      proposedVenue: data.proposedVenue || undefined,
    });
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Match Request
          </DialogTitle>
          <DialogDescription>
            Send a match request to connect with this boxer.
          </DialogDescription>
        </DialogHeader>

        {targetBoxer && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={targetBoxer.profilePhotoUrl || undefined}
                alt={targetBoxer.name}
              />
              <AvatarFallback className="bg-boxing-red/10 text-boxing-red">
                {getInitials(targetBoxer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{targetBoxer.name}</p>
              <p className="text-sm text-muted-foreground">
                {targetBoxer.wins}W - {targetBoxer.losses}L - {targetBoxer.draws}D
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <textarea
                id="message"
                rows={3}
                placeholder="Introduce yourself and explain why you'd like to match..."
                disabled={isLoading}
                className={cn(
                  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'resize-none'
                )}
                {...register('message')}
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>

            {/* Proposed Date */}
            <div className="space-y-2">
              <Label htmlFor="proposedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Proposed Date (optional)
              </Label>
              <Input
                id="proposedDate"
                type="date"
                min={getMinDate()}
                disabled={isLoading}
                {...register('proposedDate')}
              />
            </div>

            {/* Proposed Venue */}
            <div className="space-y-2">
              <Label htmlFor="proposedVenue" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Proposed Venue (optional)
              </Label>
              <Input
                id="proposedVenue"
                placeholder="e.g., Downtown Boxing Gym"
                disabled={isLoading}
                {...register('proposedVenue')}
              />
              {errors.proposedVenue && (
                <p className="text-sm text-destructive">
                  {errors.proposedVenue.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !targetBoxer}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendRequestDialog;
