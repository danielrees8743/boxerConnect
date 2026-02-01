import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchBoxerById, clearSelectedBoxer } from '@/features/boxer/boxerSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import { BoxerProfile, FightHistoryList } from '@/components/boxer';
import { SendRequestDialog } from '@/components/requests';
import { Alert, AlertDescription } from '@/components/ui';
import { boxerService } from '@/services/boxerService';
import type { FightHistory } from '@/types';

/**
 * Boxer detail page component.
 * Displays a boxer's full profile with the ability to send match requests.
 * Coaches and gym owners can manage fight history for boxers they're linked to.
 */
const BoxerDetailPage: React.FC = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedBoxer, myBoxer, isLoading, error } = useAppSelector((state) => state.boxer);
  const { user } = useAppSelector((state) => state.auth);
  const requestsState = useAppSelector((state) => state.requests);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
  const [fights, setFights] = React.useState<FightHistory[]>([]);
  const [fightsLoading, setFightsLoading] = React.useState(false);

  React.useEffect(() => {
    if (id) {
      dispatch(fetchBoxerById(id));
    }
    return () => {
      dispatch(clearSelectedBoxer());
    };
  }, [dispatch, id]);

  React.useEffect(() => {
    let isCancelled = false;

    const fetchFights = async () => {
      if (!selectedBoxer?.id) return;
      setFights([]);
      setFightsLoading(true);
      try {
        const result = await boxerService.getBoxerFights(selectedBoxer.id);
        if (!isCancelled) {
          setFights(result.fights);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch fight history:', err);
        }
      } finally {
        if (!isCancelled) {
          setFightsLoading(false);
        }
      }
    };
    fetchFights();

    return () => {
      isCancelled = true;
    };
  }, [selectedBoxer?.id]);

  // Determine if current user can manage this boxer's fights
  // - Admins can manage any boxer's fights
  // - Coaches can manage linked boxers' fights (backend enforces specific permission check)
  // - Gym owners can manage fights for boxers in their club (backend enforces club membership)
  // Note: The backend will return 403 if the user doesn't actually have permission
  const canManageFights = React.useMemo(() => {
    if (!user || !selectedBoxer) return false;
    // Don't show management for own profile - they should use profile page
    if (myBoxer?.id === selectedBoxer.id) return false;
    // Admins can manage any boxer's fights
    if (user.role === 'ADMIN') return true;
    // Coaches and gym owners may be able to manage fights (backend enforces authorization)
    if (user.role === 'COACH' || user.role === 'GYM_OWNER') return true;
    return false;
  }, [user, selectedBoxer, myBoxer]);

  // Handle fight created - add to list and refetch boxer to update record
  const handleFightCreated = useCallback((fight: FightHistory) => {
    setFights((prev) => [fight, ...prev]);
    // Refetch boxer profile to get updated wins/losses/draws
    if (id) {
      dispatch(fetchBoxerById(id));
    }
  }, [dispatch, id]);

  // Handle fight updated - update in list and refetch boxer if result might have changed
  const handleFightUpdated = useCallback((updatedFight: FightHistory) => {
    setFights((prev) =>
      prev.map((f) => (f.id === updatedFight.id ? updatedFight : f))
    );
    // Refetch boxer profile to get updated wins/losses/draws
    if (id) {
      dispatch(fetchBoxerById(id));
    }
  }, [dispatch, id]);

  // Handle fight deleted - remove from list and refetch boxer to update record
  const handleFightDeleted = useCallback((fightId: string) => {
    setFights((prev) => prev.filter((f) => f.id !== fightId));
    // Refetch boxer profile to get updated wins/losses/draws
    if (id) {
      dispatch(fetchBoxerById(id));
    }
  }, [dispatch, id]);

  const handleSendRequest = () => {
    setIsRequestDialogOpen(true);
  };

  const handleSubmitRequest = async (data: { targetBoxerId: string; message?: string; proposedDate?: string; proposedVenue?: string }) => {
    const result = await dispatch(createMatchRequest(data));
    if (createMatchRequest.fulfilled.match(result)) {
      setIsRequestDialogOpen(false);
    }
  };

  const isOwner = myBoxer?.id === selectedBoxer?.id;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <BoxerProfile
        boxer={selectedBoxer}
        fightHistory={fights}
        availability={selectedBoxer?.availability || []}
        isOwner={isOwner}
        isLoading={isLoading}
        onEdit={isOwner ? () => navigate('/profile') : undefined}
        onSendRequest={!isOwner && myBoxer ? handleSendRequest : undefined}
      />

      {/* Fight History Section with management for coaches/gym owners */}
      {selectedBoxer && (
        <FightHistoryList
          fights={fights}
          canManageFights={canManageFights}
          boxerId={selectedBoxer.id}
          onFightCreated={canManageFights ? handleFightCreated : undefined}
          onFightUpdated={canManageFights ? handleFightUpdated : undefined}
          onFightDeleted={canManageFights ? handleFightDeleted : undefined}
          isLoading={fightsLoading}
        />
      )}

      <SendRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        targetBoxer={selectedBoxer}
        onSubmit={handleSubmitRequest}
        isLoading={requestsState.isLoading}
        error={requestsState.error}
      />
    </div>
  );
};

export { BoxerDetailPage };
