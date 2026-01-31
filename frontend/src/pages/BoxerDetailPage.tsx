import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchBoxerById, clearSelectedBoxer } from '@/features/boxer/boxerSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import { BoxerProfile } from '@/components/boxer';
import { SendRequestDialog } from '@/components/requests';
import { Alert, AlertDescription } from '@/components/ui';

/**
 * Boxer detail page component.
 * Displays a boxer's full profile with the ability to send match requests.
 */
const BoxerDetailPage: React.FC = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedBoxer, myBoxer, isLoading, error } = useAppSelector((state) => state.boxer);
  const requestsState = useAppSelector((state) => state.requests);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (id) {
      dispatch(fetchBoxerById(id));
    }
    return () => {
      dispatch(clearSelectedBoxer());
    };
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
        fightHistory={selectedBoxer?.fightHistory || []}
        availability={selectedBoxer?.availability || []}
        isOwner={isOwner}
        isLoading={isLoading}
        onEdit={isOwner ? () => navigate('/profile') : undefined}
        onSendRequest={!isOwner && myBoxer ? handleSendRequest : undefined}
      />

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
