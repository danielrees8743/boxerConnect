import React from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyBoxer, updateBoxer, createBoxer } from '@/features/boxer/boxerSlice';
import { BoxerProfile, BoxerForm } from '@/components/boxer';
import { Alert, AlertDescription, Button } from '@/components/ui';
import type { CreateBoxerData, UpdateBoxerData } from '@/types';

/**
 * ProfilePage displays and manages the current user's boxer profile.
 * Shows existing profile or allows creating a new one.
 */
export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myBoxer, isLoading, error } = useAppSelector((state) => state.boxer);
  const { user } = useAppSelector((state) => state.auth);
  const [isEditing, setIsEditing] = React.useState(false);

  // Fetch boxer profile on mount
  React.useEffect(() => {
    dispatch(fetchMyBoxer());
  }, [dispatch]);

  // Handle creating/updating boxer profile
  const handleSubmit = async (data: CreateBoxerData | UpdateBoxerData) => {
    if (myBoxer) {
      const result = await dispatch(updateBoxer({ id: myBoxer.id, data: data as UpdateBoxerData }));
      if (updateBoxer.fulfilled.match(result)) {
        setIsEditing(false);
      }
    } else {
      const result = await dispatch(createBoxer(data as CreateBoxerData));
      if (createBoxer.fulfilled.match(result)) {
        setIsEditing(false);
      }
    }
  };

  // No boxer profile exists - show create form
  if (!isLoading && !myBoxer && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground mb-6">
            Create your boxer profile to start connecting with other boxers.
          </p>
          <Button onClick={() => setIsEditing(true)}>Create Boxer Profile</Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Show create/edit form
  if (isEditing || (!myBoxer && !isLoading)) {
    return (
      <div className="max-w-2xl mx-auto">
        <BoxerForm
          boxer={myBoxer}
          mode={myBoxer ? 'edit' : 'create'}
          isLoading={isLoading}
          error={error}
          onSubmit={handleSubmit}
          onCancel={myBoxer ? () => setIsEditing(false) : undefined}
        />
      </div>
    );
  }

  // Show profile view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <BoxerProfile
        boxer={myBoxer}
        fightHistory={myBoxer?.fightHistory || []}
        availability={myBoxer?.availability || []}
        isOwner={true}
        isLoading={isLoading}
        onEdit={() => setIsEditing(true)}
      />
    </div>
  );
};

export default ProfilePage;
