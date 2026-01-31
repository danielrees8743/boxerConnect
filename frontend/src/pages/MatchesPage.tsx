import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyBoxer } from '@/features/boxer/boxerSlice';
import {
  fetchSuggestedMatches,
  fetchCompatibleMatches,
} from '@/features/matching/matchingSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import { MatchSuggestions, CompatibleBoxersList } from '@/components/matching';
import { SendRequestDialog } from '@/components/requests';
import { Alert, AlertDescription, Card, CardContent } from '@/components/ui';
import type { BoxerProfile, CompatibleMatchOptions } from '@/types';

/**
 * MatchesPage displays match suggestions and compatible boxers.
 * Allows users to find and request matches with compatible partners.
 */
export const MatchesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { myBoxer, isLoading: isBoxerLoading } = useAppSelector((state) => state.boxer);
  const {
    suggestedMatches,
    compatibleMatches,
    isLoading,
    isSuggestionsLoading,
    error,
  } = useAppSelector((state) => state.matching);
  const requestsState = useAppSelector((state) => state.requests);

  // Dialog state
  const [selectedBoxer, setSelectedBoxer] = React.useState<BoxerProfile | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  // Match options
  const [matchOptions, setMatchOptions] = React.useState<CompatibleMatchOptions>({
    weightRangeKg: 5,
    experienceRange: 1,
    limit: 10,
  });

  // Fetch boxer profile and suggestions on mount
  React.useEffect(() => {
    dispatch(fetchMyBoxer());
  }, [dispatch]);

  // Fetch matches when boxer profile is loaded
  React.useEffect(() => {
    if (myBoxer?.id) {
      dispatch(fetchSuggestedMatches(5));
      dispatch(fetchCompatibleMatches({ boxerId: myBoxer.id, options: matchOptions }));
    }
  }, [dispatch, myBoxer?.id]);

  // Handle refresh suggestions
  const handleRefreshSuggestions = () => {
    dispatch(fetchSuggestedMatches(5));
  };

  // Handle options change
  const handleOptionsChange = (options: CompatibleMatchOptions) => {
    setMatchOptions(options);
  };

  // Handle search with new options
  const handleSearch = () => {
    if (myBoxer?.id) {
      dispatch(fetchCompatibleMatches({ boxerId: myBoxer.id, options: matchOptions }));
    }
  };

  // Handle view profile
  const handleViewProfile = (id: string) => {
    navigate(`/boxers/${id}`);
  };

  // Handle send request from suggestions
  const handleSendRequestFromSuggestions = (boxerId: string) => {
    const suggestion = suggestedMatches.find((s) => s.boxer.id === boxerId);
    if (suggestion) {
      setSelectedBoxer(suggestion.boxer);
      setIsRequestDialogOpen(true);
    }
  };

  // Handle send request from compatible list
  const handleSendRequestFromList = (boxerId: string) => {
    const match = compatibleMatches.find((m) => m.boxer.id === boxerId);
    if (match) {
      setSelectedBoxer(match.boxer);
      setIsRequestDialogOpen(true);
    }
  };

  // Handle submit request
  const handleSubmitRequest = async (data: { targetBoxerId: string; message?: string; proposedDate?: string; proposedVenue?: string }) => {
    const result = await dispatch(createMatchRequest(data));
    if (createMatchRequest.fulfilled.match(result)) {
      setIsRequestDialogOpen(false);
      setSelectedBoxer(null);
    }
  };

  // No boxer profile
  if (!isBoxerLoading && !myBoxer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-boxing-gold" />
            Find Matches
          </h1>
          <p className="text-muted-foreground mt-1">
            View match suggestions and find compatible sparring partners
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Create Your Profile First</h3>
            <p className="text-muted-foreground text-sm mb-4">
              You need to create a boxer profile before you can find matches.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="text-primary hover:underline"
            >
              Go to Profile
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-boxing-gold" />
          Find Matches
        </h1>
        <p className="text-muted-foreground mt-1">
          View match suggestions and find compatible sparring partners
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Suggested Matches */}
      <MatchSuggestions
        suggestions={suggestedMatches}
        isLoading={isSuggestionsLoading || isBoxerLoading}
        onRefresh={handleRefreshSuggestions}
        onViewAll={() => {}}
        onSendRequest={handleSendRequestFromSuggestions}
        maxItems={5}
      />

      {/* Compatible Boxers */}
      {myBoxer && (
        <CompatibleBoxersList
          matches={compatibleMatches}
          boxerId={myBoxer.id}
          isLoading={isLoading}
          options={matchOptions}
          onOptionsChange={handleOptionsChange}
          onSearch={handleSearch}
          onViewProfile={handleViewProfile}
          onSendRequest={handleSendRequestFromList}
        />
      )}

      {/* Send Request Dialog */}
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

export default MatchesPage;
