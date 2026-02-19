import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchBoxerById, clearSelectedBoxer, updateBoxer } from '@/features/boxer/boxerSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import { BoxerProfile, FightHistoryList, BoxerForm } from '@/components/boxer';
import { SendRequestDialog } from '@/components/requests';
import { Alert, AlertDescription } from '@/components/ui';
import { boxerService } from '@/services/boxerService';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { FightHistory, Club, UpdateBoxerData } from '@/types';

/**
 * Boxer detail page component.
 * Displays a boxer's full profile with the ability to send match requests.
 * Coaches and gym owners can manage fight history for boxers they're linked to.
 * Gym owners can also edit boxer profiles for boxers in their clubs.
 */
const BoxerDetailPage: React.FC = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedBoxer, myBoxer, isLoading, error } = useAppSelector((state) => state.boxer);
  const { user } = useAppSelector((state) => state.auth);
  const requestsState = useAppSelector((state) => state.requests);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [fights, setFights] = useState<FightHistory[]>([]);
  const [fightsLoading, setFightsLoading] = useState(false);
  const [isGymOwner, setIsGymOwner] = useState(false);
  const [checkingGymOwner, setCheckingGymOwner] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchBoxerById(id));
    }
    return () => {
      dispatch(clearSelectedBoxer());
    };
  }, [dispatch, id]);

  // Check if the current user is a gym owner who owns the boxer's club
  useEffect(() => {
    const checkGymOwnerAccess = async () => {
      if (!user || !selectedBoxer || user.role !== 'GYM_OWNER' || !selectedBoxer.clubId) {
        setCheckingGymOwner(false);
        return;
      }

      try {
        const clubs = await gymOwnerService.getMyClubs();
        const ownsClub = clubs.some((club: Club) => club.id === selectedBoxer.clubId);
        setIsGymOwner(ownsClub);
      } catch (error) {
        console.error('Failed to check gym owner access:', error);
        setIsGymOwner(false);
      } finally {
        setCheckingGymOwner(false);
      }
    };

    checkGymOwnerAccess();
  }, [user, selectedBoxer]);

  useEffect(() => {
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

  // Determine if current user can edit this boxer's profile
  // - Profile owners can edit via their profile page (redirect)
  // - Gym owners can edit boxers in their clubs
  const isOwner = myBoxer?.id === selectedBoxer?.id;
  const canEdit = isOwner || isGymOwner;

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

  const handleConnect = () => {
    // State is managed locally in ConnectButton for now.
    // Wire up to backend connection API when ready.
  };

  const handleSubmitRequest = async (data: { targetBoxerId: string; message?: string; proposedDate?: string; proposedVenue?: string }) => {
    const result = await dispatch(createMatchRequest(data));
    if (createMatchRequest.fulfilled.match(result)) {
      setIsRequestDialogOpen(false);
    }
  };

  // Handle profile edit by gym owner
  const handleEditProfile = () => {
    if (isOwner) {
      // If it's the user's own profile, redirect to profile page
      navigate('/profile');
    } else if (isGymOwner) {
      // If gym owner editing someone else's profile, show edit form
      setIsEditing(true);
    }
  };

  // Handle profile update by gym owner
  const handleUpdateProfile = async (data: UpdateBoxerData) => {
    if (!selectedBoxer) return;

    const result = await dispatch(updateBoxer({ id: selectedBoxer.id, data }));
    if (updateBoxer.fulfilled.match(result)) {
      setIsEditing(false);
      // Refetch the boxer to show updated data
      if (id) {
        dispatch(fetchBoxerById(id));
      }
    }
  };

  // Show loading state while checking permissions
  if (isLoading || checkingGymOwner) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Loading boxer profile...</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show edit form when gym owner is editing
  if (isEditing && isGymOwner && selectedBoxer) {
    return (
      <div className="max-w-2xl mx-auto">
        <BoxerForm
          boxer={selectedBoxer}
          mode="edit"
          isLoading={isLoading}
          error={error}
          onSubmit={handleUpdateProfile}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

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
        onEdit={canEdit ? handleEditProfile : undefined}
        onConnect={!isOwner && myBoxer ? handleConnect : undefined}
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
