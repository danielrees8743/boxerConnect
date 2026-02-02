import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs } from '@/features/gym-owner/gymOwnerSlice';
import {
  fetchIncomingRequests,
  fetchOutgoingRequests,
  acceptRequest,
  declineRequest,
  cancelRequest,
} from '@/features/requests/requestsSlice';
import {
  fetchCompatibleMatches,
  clearMatches,
} from '@/features/matching/matchingSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CompatibleBoxersList } from '@/components/matching/CompatibleBoxersList';
import { RequestList } from '@/components/requests/RequestList';
import { SendRequestDialog } from '@/components/requests/SendRequestDialog';
import { gymOwnerService } from '@/services/gymOwnerService';
import { matchRequestService } from '@/services/matchRequestService';
import type { BoxerProfile, CreateMatchRequestData } from '@/types';
import { Search } from 'lucide-react';

interface BoxerOption {
  id: string;
  name: string;
  clubName: string;
  weightKg: number | null;
  experienceLevel: string;
}

export const GymOwnerMatchesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { ownedClubs, clubsLoading } = useAppSelector((state) => state.gymOwner);
  const { compatibleMatches, isLoading: matchingLoading } = useAppSelector(
    (state) => state.matching
  );
  const {
    incomingRequests,
    outgoingRequests,
    isLoading: requestsLoading,
    error: requestsError,
  } = useAppSelector((state) => state.requests);

  const [boxerOptions, setBoxerOptions] = useState<BoxerOption[]>([]);
  const [selectedBoxerId, setSelectedBoxerId] = useState<string>('');
  const [showCompatibleMatches, setShowCompatibleMatches] = useState(false);
  const [selectedTargetBoxer, setSelectedTargetBoxer] = useState<BoxerProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load boxers from all clubs
  useEffect(() => {
    dispatch(fetchMyClubs());
  }, [dispatch]);

  useEffect(() => {
    const loadBoxers = async () => {
      if (ownedClubs.length === 0) return;

      try {
        const clubDetails = await Promise.all(
          ownedClubs.map((club) => gymOwnerService.getClubWithMembers(club.id))
        );

        const allBoxers: BoxerOption[] = [];
        clubDetails.forEach((club) => {
          club.boxers.forEach((boxer) => {
            allBoxers.push({
              id: boxer.id,
              name: boxer.name,
              clubName: club.name,
              weightKg: boxer.weightKg,
              experienceLevel: boxer.experienceLevel,
            });
          });
        });

        setBoxerOptions(allBoxers);

        // Set from URL param if present
        const boxerIdParam = searchParams.get('boxerId');
        if (boxerIdParam && allBoxers.some((b) => b.id === boxerIdParam)) {
          setSelectedBoxerId(boxerIdParam);
        }
      } catch (error) {
        console.error('Failed to load boxers:', error);
      }
    };

    if (!clubsLoading) {
      loadBoxers();
    }
  }, [ownedClubs, clubsLoading, searchParams]);

  // Load match requests
  useEffect(() => {
    dispatch(fetchIncomingRequests());
    dispatch(fetchOutgoingRequests());
  }, [dispatch]);

  const handleFindMatches = () => {
    if (!selectedBoxerId) return;
    dispatch(fetchCompatibleMatches(selectedBoxerId));
    setShowCompatibleMatches(true);
  };

  const handleSendRequest = (targetBoxerId: string) => {
    const targetBoxer = compatibleMatches.find((m) => m.boxer.id === targetBoxerId);
    if (targetBoxer) {
      setSelectedTargetBoxer(targetBoxer.boxer);
      setDialogOpen(true);
    }
  };

  const handleSubmitRequest = async (data: CreateMatchRequestData) => {
    if (!selectedBoxerId) return;

    try {
      setSendingRequest(true);
      setSendError(null);
      await matchRequestService.createRequest({
        ...data,
        requesterBoxerId: selectedBoxerId,
      });
      setDialogOpen(false);
      // Refresh outgoing requests
      dispatch(fetchOutgoingRequests());
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAccept = (id: string) => {
    dispatch(acceptRequest(id));
  };

  const handleDecline = (id: string) => {
    dispatch(declineRequest(id));
  };

  const handleCancel = (id: string) => {
    dispatch(cancelRequest(id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Match Requests</h1>
        <p className="text-muted-foreground mt-1">
          Find compatible opponents and manage match requests
        </p>
      </div>

      {/* Boxer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Create Match Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select a boxer to create match requests</Label>
            <Select
              value={selectedBoxerId}
              onValueChange={(value) => {
                setSelectedBoxerId(value);
                setShowCompatibleMatches(false);
                dispatch(clearMatches());
                setSearchParams(value ? { boxerId: value } : {});
              }}
              disabled={clubsLoading || boxerOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a boxer from your clubs" />
              </SelectTrigger>
              <SelectContent>
                {boxerOptions.map((boxer) => (
                  <SelectItem key={boxer.id} value={boxer.id}>
                    {boxer.name} - {boxer.clubName} ({boxer.experienceLevel}
                    {boxer.weightKg ? `, ${boxer.weightKg}kg` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleFindMatches}
            disabled={!selectedBoxerId || matchingLoading}
            className="w-full sm:w-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            {matchingLoading ? 'Searching...' : 'Find Compatible Matches'}
          </Button>

          {boxerOptions.length === 0 && !clubsLoading && (
            <Alert>
              <AlertDescription>
                No boxers in your clubs yet. Add boxers to your clubs to create match requests.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Compatible Matches */}
      {showCompatibleMatches && selectedBoxerId && (
        <Card>
          <CardHeader>
            <CardTitle>Compatible Opponents</CardTitle>
          </CardHeader>
          <CardContent>
            <CompatibleBoxersList
              matches={compatibleMatches}
              boxerId={selectedBoxerId}
              isLoading={matchingLoading}
              onSendRequest={handleSendRequest}
            />
          </CardContent>
        </Card>
      )}

      {/* Match Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Match Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{requestsError}</AlertDescription>
            </Alert>
          )}

          <RequestList
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onCancel={handleCancel}
            isLoading={requestsLoading}
          />
        </CardContent>
      </Card>

      {/* Send Request Dialog */}
      <SendRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetBoxer={selectedTargetBoxer}
        onSubmit={handleSubmitRequest}
        isLoading={sendingRequest}
        error={sendError}
      />
    </div>
  );
};
