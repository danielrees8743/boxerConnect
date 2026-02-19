import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  searchBoxers,
  setSearchParams,
  clearSearchParams,
  setPage,
} from '@/features/boxer/boxerSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import { BoxerList, BoxerSearchFilters } from '@/components/boxer';
import { SendRequestDialog } from '@/components/requests';
import { Alert, AlertDescription } from '@/components/ui';
import type { BoxerProfile, BoxerSearchParams } from '@/types';

/**
 * BoxersPage for searching and browsing boxers.
 * Includes search filters and paginated results.
 */
export const BoxersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { boxers, pagination, searchParams, isLoading, error } = useAppSelector(
    (state) => state.boxer
  );
  const { myBoxer } = useAppSelector((state) => state.boxer);
  const requestsState = useAppSelector((state) => state.requests);

  // Dialog state
  const [selectedBoxer, setSelectedBoxer] = React.useState<BoxerProfile | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  // Fetch boxers on mount and when search params change
  React.useEffect(() => {
    dispatch(searchBoxers(searchParams));
  }, [dispatch, searchParams]);

  // Handle filter changes
  const handleFiltersChange = (filters: BoxerSearchParams) => {
    dispatch(setSearchParams({ ...filters, page: 1 }));
  };

  // Handle search
  const handleSearch = () => {
    dispatch(searchBoxers(searchParams));
  };

  // Handle reset filters
  const handleReset = () => {
    dispatch(clearSearchParams());
    dispatch(searchBoxers({}));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
    dispatch(searchBoxers({ ...searchParams, page }));
  };

  // Handle view profile
  const handleViewProfile = (id: string) => {
    navigate(`/boxers/${id}`);
  };

  // Handle send request (kept for dialog flow, not wired to cards)
  const handleSendRequest = (id: string) => {
    const boxer = boxers.find((b) => b.id === id);
    if (boxer) {
      setSelectedBoxer(boxer);
      setIsRequestDialogOpen(true);
    }
  };

  // Handle connect — local state only until backend is wired
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConnect = (_id: string) => {
    // no-op: ConnectButton manages optimistic UI state internally
  };

  // Handle submit request
  const handleSubmitRequest = async (data: { targetBoxerId: string; message?: string; proposedDate?: string; proposedVenue?: string }) => {
    const result = await dispatch(createMatchRequest(data));
    if (createMatchRequest.fulfilled.match(result)) {
      setIsRequestDialogOpen(false);
      setSelectedBoxer(null);
    }
  };

  // Filter out current user's boxer from results
  const filteredBoxers = boxers.filter((b) => b.id !== myBoxer?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Find Boxers
        </h1>
        <p className="text-muted-foreground mt-1">
          Search and connect with boxers in your area
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Filters Sidebar */}
        <aside className="space-y-4">
          <BoxerSearchFilters
            filters={searchParams}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </aside>

        {/* Results */}
        <main>
          <BoxerList
            boxers={filteredBoxers}
            pagination={pagination}
            onPageChange={handlePageChange}
            onViewProfile={handleViewProfile}
            onConnect={myBoxer ? handleConnect : undefined}
            isLoading={isLoading}
            emptyMessage="No boxers found matching your criteria."
          />
        </main>
      </div>

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

export default BoxersPage;
