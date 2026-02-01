import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trophy, Plus, Edit2, Trash2, Loader2, Calendar, MapPin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from '@/components/ui';
import { FightHistoryForm } from './FightHistoryForm';
import { boxerService } from '@/services/boxerService';
import type {
  FightHistory,
  FightResult,
  CreateFightHistoryData,
  UpdateFightHistoryData,
} from '@/types';

/**
 * Get badge variant for fight result
 */
function getResultBadgeVariant(
  result: FightResult
): 'success' | 'destructive' | 'secondary' | 'outline' {
  switch (result) {
    case 'WIN':
      return 'success';
    case 'LOSS':
      return 'destructive';
    case 'DRAW':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Format method for display
 */
function formatMethod(method: string | null): string {
  if (!method) return '';
  return method.replace(/_/g, ' ');
}

export interface FightHistoryListProps {
  /** List of fights to display */
  fights: FightHistory[];
  /** Whether the current user owns these fights */
  isOwner?: boolean;
  /** Callback when a fight is created */
  onFightCreated?: (fight: FightHistory) => void;
  /** Callback when a fight is updated */
  onFightUpdated?: (fight: FightHistory) => void;
  /** Callback when a fight is deleted */
  onFightDeleted?: (fightId: string) => void;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FightHistoryList component displays a list of fight history entries.
 * Features:
 * - Result badges (WIN=green, LOSS=red, DRAW=gray)
 * - Add/Edit/Delete buttons for owners
 * - Confirmation dialog before delete
 * - Loading and empty states
 */
export const FightHistoryList: React.FC<FightHistoryListProps> = ({
  fights,
  isOwner = false,
  onFightCreated,
  onFightUpdated,
  onFightDeleted,
  isLoading = false,
  className,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFight, setEditingFight] = useState<FightHistory | undefined>(undefined);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingFight(undefined);
    setFormMode('create');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fight: FightHistory) => {
    setEditingFight(fight);
    setFormMode('edit');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingFight(undefined);
    setFormError(null);
  };

  const handleSubmit = async (data: CreateFightHistoryData | UpdateFightHistoryData) => {
    setFormLoading(true);
    setFormError(null);

    try {
      if (formMode === 'create') {
        const newFight = await boxerService.createFight(data as CreateFightHistoryData);
        onFightCreated?.(newFight);
      } else if (editingFight) {
        const updatedFight = await boxerService.updateFight(
          editingFight.id,
          data as UpdateFightHistoryData
        );
        onFightUpdated?.(updatedFight);
      }
      handleCloseForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (fightId: string) => {
    setDeletingId(fightId);
    setDeleteError(null);

    try {
      await boxerService.deleteFight(fightId);
      setDeleteDialogOpen(null);
      onFightDeleted?.(fightId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete fight';
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <FightHistoryListSkeleton />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Fight History
          </CardTitle>
          {isOwner && (
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Fight
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deleteError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        {fights.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {isOwner
                ? 'No fights recorded yet. Add your first fight!'
                : 'No fight history available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fights.map((fight) => (
              <div
                key={fight.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Badge variant={getResultBadgeVariant(fight.result)}>
                    {fight.result}
                  </Badge>
                  <div>
                    <p className="font-medium">vs. {fight.opponentName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {fight.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {fight.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(fight.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Method and Round info */}
                  <div className="text-sm text-muted-foreground hidden sm:block">
                    {fight.method && <span>{formatMethod(fight.method)}</span>}
                    {fight.round && (
                      <span className="ml-2">R{fight.round}</span>
                    )}
                  </div>

                  {/* Action buttons for owner */}
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(fight)}
                        disabled={deletingId === fight.id}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Dialog
                        open={deleteDialogOpen === fight.id}
                        onOpenChange={(open) => setDeleteDialogOpen(open ? fight.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === fight.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === fight.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Fight</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this fight against{' '}
                              {fight.opponentName}? This action cannot be undone and
                              will update your record.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(fight.id)}
                              disabled={deletingId === fight.id}
                            >
                              {deletingId === fight.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Fight Form Modal */}
      <FightHistoryForm
        fight={editingFight}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        isLoading={formLoading}
        error={formError}
        mode={formMode}
      />
    </Card>
  );
};

/**
 * Skeleton loading state for FightHistoryList
 */
function FightHistoryListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-12" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default FightHistoryList;
