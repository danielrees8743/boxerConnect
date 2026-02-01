import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyBoxer, updateBoxer, createBoxer } from '@/features/boxer/boxerSlice';
import { BoxerProfile, BoxerForm, VideoUpload, VideoList, FightHistoryList } from '@/components/boxer';
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Video } from 'lucide-react';
import { boxerService } from '@/services/boxerService';
import type { CreateBoxerData, UpdateBoxerData, BoxerVideo, FightHistory } from '@/types';

/**
 * ProfilePage displays and manages the current user's boxer profile.
 * Shows existing profile or allows creating a new one.
 */
export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myBoxer, isLoading, error } = useAppSelector((state) => state.boxer);
  const { user } = useAppSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [videos, setVideos] = useState<BoxerVideo[]>([]);
  const [videoCount, setVideoCount] = useState(0);
  const [maxVideos, setMaxVideos] = useState(5);
  const [videosLoading, setVideosLoading] = useState(false);
  const [fights, setFights] = useState<FightHistory[]>([]);
  const [fightsLoading, setFightsLoading] = useState(false);

  // Fetch boxer profile on mount
  useEffect(() => {
    dispatch(fetchMyBoxer());
  }, [dispatch]);

  // Fetch videos when boxer profile is loaded
  useEffect(() => {
    const fetchVideos = async () => {
      if (!myBoxer) return;
      setVideosLoading(true);
      try {
        const result = await boxerService.getMyVideos();
        setVideos(result.videos);
        setVideoCount(result.count);
        setMaxVideos(result.maxVideos);
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setVideosLoading(false);
      }
    };
    fetchVideos();
  }, [myBoxer]);

  // Fetch fight history when boxer profile is loaded
  useEffect(() => {
    const fetchFights = async () => {
      if (!myBoxer) return;
      setFightsLoading(true);
      try {
        const result = await boxerService.getMyFights();
        setFights(result.fights);
      } catch (err) {
        console.error('Failed to fetch fight history:', err);
      } finally {
        setFightsLoading(false);
      }
    };
    fetchFights();
  }, [myBoxer]);

  // Handle video upload
  const handleVideoUploaded = useCallback((video: BoxerVideo) => {
    setVideos((prev) => [video, ...prev]);
    setVideoCount((prev) => prev + 1);
  }, []);

  // Handle video deletion
  const handleVideoDeleted = useCallback((videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setVideoCount((prev) => prev - 1);
  }, []);

  // Handle fight created - add to list and refetch boxer to update record
  const handleFightCreated = useCallback((fight: FightHistory) => {
    setFights((prev) => [fight, ...prev]);
    // Refetch boxer profile to get updated wins/losses/draws
    dispatch(fetchMyBoxer());
  }, [dispatch]);

  // Handle fight updated - update in list and refetch boxer if result might have changed
  const handleFightUpdated = useCallback((updatedFight: FightHistory) => {
    setFights((prev) =>
      prev.map((f) => (f.id === updatedFight.id ? updatedFight : f))
    );
    // Refetch boxer profile to get updated wins/losses/draws
    dispatch(fetchMyBoxer());
  }, [dispatch]);

  // Handle fight deleted - remove from list and refetch boxer to update record
  const handleFightDeleted = useCallback((fightId: string) => {
    setFights((prev) => prev.filter((f) => f.id !== fightId));
    // Refetch boxer profile to get updated wins/losses/draws
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
        fightHistory={fights}
        availability={myBoxer?.availability || []}
        videos={videos}
        isOwner={true}
        isLoading={isLoading}
        onEdit={() => setIsEditing(true)}
      />

      {/* Fight History Section */}
      {myBoxer && (
        <FightHistoryList
          fights={fights}
          isOwner={true}
          onFightCreated={handleFightCreated}
          onFightUpdated={handleFightUpdated}
          onFightDeleted={handleFightDeleted}
          isLoading={fightsLoading}
        />
      )}

      {/* Training Videos Section */}
      {myBoxer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Training Videos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Upload */}
            <VideoUpload
              currentCount={videoCount}
              maxVideos={maxVideos}
              onVideoUploaded={handleVideoUploaded}
            />

            {/* Video List */}
            <VideoList
              videos={videos}
              isOwner={true}
              onVideoDeleted={handleVideoDeleted}
              isLoading={videosLoading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
