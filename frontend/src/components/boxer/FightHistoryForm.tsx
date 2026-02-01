import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { FightResult, FightMethod } from '@/types';
import type { FightHistory, CreateFightHistoryData, UpdateFightHistoryData } from '@/types';
import { cn } from '@/lib/utils';

// Validation schema for fight history form
const fightHistoryFormSchema = z.object({
  opponentName: z
    .string()
    .min(2, 'Opponent name must be at least 2 characters')
    .max(100, 'Opponent name must be less than 100 characters'),
  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'Fight date cannot be in the future' }
    ),
  venue: z.string().max(200, 'Venue must be less than 200 characters').optional(),
  result: z.nativeEnum(FightResult),
  method: z.nativeEnum(FightMethod).optional().nullable(),
  round: z
    .number()
    .int('Round must be a whole number')
    .min(1, 'Round must be at least 1')
    .max(12, 'Round must be 12 or less')
    .optional()
    .nullable(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

type FightHistoryFormData = z.infer<typeof fightHistoryFormSchema>;

interface FightHistoryFormProps {
  /** Existing fight to edit, or undefined for create mode */
  fight?: FightHistory;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (data: CreateFightHistoryData | UpdateFightHistoryData) => Promise<void>;
  /** Whether the form is loading/submitting */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Mode: create or edit */
  mode?: 'create' | 'edit';
}

const fightResultOptions: { value: FightResult; label: string }[] = [
  { value: FightResult.WIN, label: 'Win' },
  { value: FightResult.LOSS, label: 'Loss' },
  { value: FightResult.DRAW, label: 'Draw' },
  { value: FightResult.NO_CONTEST, label: 'No Contest' },
];

const fightMethodOptions: { value: FightMethod; label: string }[] = [
  { value: FightMethod.DECISION, label: 'Decision' },
  { value: FightMethod.UNANIMOUS_DECISION, label: 'Unanimous Decision' },
  { value: FightMethod.SPLIT_DECISION, label: 'Split Decision' },
  { value: FightMethod.MAJORITY_DECISION, label: 'Majority Decision' },
  { value: FightMethod.KO, label: 'KO (Knockout)' },
  { value: FightMethod.TKO, label: 'TKO (Technical Knockout)' },
  { value: FightMethod.RTD, label: 'RTD (Retired/Corner Stoppage)' },
  { value: FightMethod.DQ, label: 'DQ (Disqualification)' },
  { value: FightMethod.NO_CONTEST, label: 'No Contest' },
];

/**
 * FightHistoryForm component for creating or editing fight history entries.
 * Displayed as a modal dialog with form validation.
 */
export const FightHistoryForm: React.FC<FightHistoryFormProps> = ({
  fight,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error,
  mode = 'create',
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FightHistoryFormData>({
    resolver: zodResolver(fightHistoryFormSchema),
    defaultValues: {
      opponentName: fight?.opponentName || '',
      date: fight?.date ? fight.date.split('T')[0] : '',
      venue: fight?.venue || '',
      result: fight?.result || FightResult.WIN,
      method: fight?.method || null,
      round: fight?.round || null,
      notes: fight?.notes || '',
    },
  });

  // Reset form when fight prop changes (switching between fights or opening new)
  useEffect(() => {
    reset({
      opponentName: fight?.opponentName || '',
      date: fight?.date ? fight.date.split('T')[0] : '',
      venue: fight?.venue || '',
      result: fight?.result || FightResult.WIN,
      method: fight?.method || null,
      round: fight?.round || null,
      notes: fight?.notes || '',
    });
  }, [fight, reset]);

  const handleFormSubmit = async (data: FightHistoryFormData) => {
    const submitData: CreateFightHistoryData | UpdateFightHistoryData = {
      opponentName: data.opponentName,
      date: data.date,
      venue: data.venue || undefined,
      result: data.result,
      method: data.method || undefined,
      round: data.round || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(submitData);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Fight' : 'Edit Fight'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new fight to your history. This will update your record automatically.'
              : 'Update this fight entry. Your record will be recalculated if the result changes.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Opponent Name */}
          <div className="space-y-2">
            <Label htmlFor="opponentName">Opponent Name *</Label>
            <Input
              id="opponentName"
              placeholder="Enter opponent's name"
              disabled={isLoading}
              variant={errors.opponentName ? 'error' : 'default'}
              {...register('opponentName')}
            />
            {errors.opponentName && (
              <p className="text-sm text-destructive">{errors.opponentName.message}</p>
            )}
          </div>

          {/* Date and Venue */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                disabled={isLoading}
                variant={errors.date ? 'error' : 'default'}
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="Fight location"
                disabled={isLoading}
                {...register('venue')}
              />
            </div>
          </div>

          {/* Result */}
          <div className="space-y-2">
            <Label>Result *</Label>
            <Controller
              name="result"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    {fightResultOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.result && (
              <p className="text-sm text-destructive">{errors.result.message}</p>
            )}
          </div>

          {/* Method and Round */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Method</Label>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => field.onChange(value || null)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {fightMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="round">Round</Label>
              <Input
                id="round"
                type="number"
                min={1}
                max={12}
                placeholder="1-12"
                disabled={isLoading}
                {...register('round', {
                  setValueAs: (v) => (v === '' ? null : Number(v)),
                })}
              />
              {errors.round && (
                <p className="text-sm text-destructive">{errors.round.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Additional details about the fight..."
              disabled={isLoading}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none'
              )}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Adding...' : 'Saving...'}
                </>
              ) : mode === 'create' ? (
                'Add Fight'
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FightHistoryForm;
