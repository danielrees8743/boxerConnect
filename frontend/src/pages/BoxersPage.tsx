import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  searchBoxers,
  setSearchParams,
  clearSearchParams,
  setPage,
  fetchMyBoxer,
} from '@/features/boxer/boxerSlice';
import { createMatchRequest } from '@/features/requests/requestsSlice';
import {
  sendConnectionRequest as sendConnectionRequestThunk,
  fetchMyConnections,
  fetchOutgoingConnectionRequests,
} from '@/features/connections/connectionsSlice';
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
  const { myBoxer, isLoading: boxerLoading } = useAppSelector((state) => state.boxer);
  const connectionsState = useAppSelector((state) => state.connections);
  const requestsState = useAppSelector((state) => state.requests);

  // Dialog state
  const [selectedBoxer, setSelectedBoxer] = React.useState<BoxerProfile | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  // Ensure myBoxer is loaded so the Connect button renders correctly on refresh
  React.useEffect(() => {
    if (!myBoxer && !boxerLoading) {
      dispatch(fetchMyBoxer());
    }
  }, [dispatch, myBoxer, boxerLoading]);

  // Fetch connection state so the Connect button reflects current status
  React.useEffect(() => {
    if (myBoxer) {
      dispatch(fetchMyConnections());
      dispatch(fetchOutgoingConnectionRequests());
    }
  }, [dispatch, myBoxer]);

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

  // Handle connect — dispatches real API call
  const handleConnect = React.useCallback(async (id: string) => {
    await dispatch(sendConnectionRequestThunk({ targetBoxerId: id }));
  }, [dispatch]);

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

  // Derive connect state per boxer from cached connections/requests (no extra API calls)
  const connectStateMap = React.useMemo(() => {
    const map: Record<string, 'idle' | 'pending' | 'connected'> = {};
    for (const conn of connectionsState.connections) {
      if (conn.boxer) map[conn.boxer.id] = 'connected';
    }
    for (const req of connectionsState.outgoingRequests) {
      if (req.status === 'PENDING') map[req.targetBoxerId] = 'pending';
    }
    // statusCache overrides (populated when visiting individual boxer pages)
    for (const [boxerId, result] of Object.entries(connectionsState.statusCache)) {
      map[boxerId] =
        result.status === 'connected' ? 'connected'
        : result.status === 'pending_sent' || result.status === 'pending_received' ? 'pending'
        : 'idle';
    }
    return map;
  }, [connectionsState.connections, connectionsState.outgoingRequests, connectionsState.statusCache]);

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
            connectStateMap={myBoxer ? connectStateMap : undefined}
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
