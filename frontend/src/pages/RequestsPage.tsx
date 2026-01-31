import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  fetchIncomingRequests,
  fetchOutgoingRequests,
  fetchMatchRequestStats,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
} from '@/features/requests/requestsSlice';
import { RequestList } from '@/components/requests';
import { Alert, AlertDescription, Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * RequestsPage for managing incoming and outgoing match requests.
 * Shows request statistics and allows accepting/declining/cancelling requests.
 */
export const RequestsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    incomingRequests,
    outgoingRequests,
    stats,
    isLoading,
    isStatsLoading,
    error,
  } = useAppSelector((state) => state.requests);

  const [activeTab, setActiveTab] = React.useState<'incoming' | 'outgoing'>('incoming');
  const [loadingRequestId, setLoadingRequestId] = React.useState<string | null>(null);

  // Fetch requests and stats on mount
  React.useEffect(() => {
    dispatch(fetchIncomingRequests());
    dispatch(fetchOutgoingRequests());
    dispatch(fetchMatchRequestStats());
  }, [dispatch]);

  // Handle accept request
  const handleAccept = async (id: string) => {
    setLoadingRequestId(id);
    await dispatch(acceptMatchRequest({ id }));
    setLoadingRequestId(null);
  };

  // Handle decline request
  const handleDecline = async (id: string) => {
    setLoadingRequestId(id);
    await dispatch(declineMatchRequest({ id }));
    setLoadingRequestId(null);
  };

  // Handle cancel request
  const handleCancel = async (id: string) => {
    setLoadingRequestId(id);
    await dispatch(cancelMatchRequest(id));
    setLoadingRequestId(null);
  };

  // Handle tab change
  const handleTabChange = (tab: 'incoming' | 'outgoing') => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Match Requests
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your incoming and outgoing match requests
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending"
            value={stats.pending}
            variant="pending"
            isLoading={isStatsLoading}
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            variant="success"
            isLoading={isStatsLoading}
          />
          <StatCard
            label="Declined"
            value={stats.declined}
            variant="destructive"
            isLoading={isStatsLoading}
          />
          <StatCard
            label="Total"
            value={stats.total}
            variant="default"
            isLoading={isStatsLoading}
          />
        </div>
      )}

      {/* Request List */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          <RequestList
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onCancel={handleCancel}
            loadingRequestId={loadingRequestId}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Stat card component for displaying request statistics.
 */
interface StatCardProps {
  label: string;
  value: number;
  variant: 'pending' | 'success' | 'destructive' | 'default';
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, variant, isLoading }) => {
  const variantStyles = {
    pending: 'border-blue-500/50 bg-blue-500/5',
    success: 'border-green-500/50 bg-green-500/5',
    destructive: 'border-red-500/50 bg-red-500/5',
    default: 'border-border bg-card',
  };

  const valueStyles = {
    pending: 'text-blue-600',
    success: 'text-green-600',
    destructive: 'text-red-600',
    default: 'text-foreground',
  };

  return (
    <Card className={cn('transition-colors', variantStyles[variant])}>
      <CardContent className="pt-6">
        <div className="text-center">
          {isLoading ? (
            <div className="h-8 w-12 bg-muted rounded animate-pulse mx-auto" />
          ) : (
            <p className={cn('text-3xl font-bold', valueStyles[variant])}>
              {value}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestsPage;
