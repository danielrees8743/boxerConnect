import React from 'react';
import { InboxIcon, Send, MessageSquare } from 'lucide-react';
import { CardSkeleton } from '@/components/ui';
import { RequestCard } from './RequestCard';
import type { MatchRequest } from '@/types';
import { cn } from '@/lib/utils';

interface RequestListProps {
  incomingRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
  activeTab?: 'incoming' | 'outgoing';
  onTabChange?: (tab: 'incoming' | 'outgoing') => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
  loadingRequestId?: string | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * RequestList component displays incoming and outgoing match requests.
 * Includes tabs for switching between request types.
 *
 * @example
 * <RequestList
 *   incomingRequests={incoming}
 *   outgoingRequests={outgoing}
 *   onAccept={handleAccept}
 *   onDecline={handleDecline}
 *   onCancel={handleCancel}
 * />
 */
export const RequestList: React.FC<RequestListProps> = ({
  incomingRequests,
  outgoingRequests,
  activeTab = 'incoming',
  onTabChange,
  onAccept,
  onDecline,
  onCancel,
  loadingRequestId,
  isLoading = false,
  className,
}) => {
  const [tab, setTab] = React.useState<'incoming' | 'outgoing'>(activeTab);

  const handleTabChange = (newTab: 'incoming' | 'outgoing') => {
    setTab(newTab);
    onTabChange?.(newTab);
  };

  const requests = tab === 'incoming' ? incomingRequests : outgoingRequests;
  const pendingIncoming = incomingRequests.filter((r) => r.status === 'PENDING').length;
  const pendingOutgoing = outgoingRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => handleTabChange('incoming')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'incoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <InboxIcon className="h-4 w-4" />
          Incoming
          {pendingIncoming > 0 && (
            <span className="ml-1 rounded-full bg-boxing-red px-2 py-0.5 text-xs text-white">
              {pendingIncoming}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('outgoing')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'outgoing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Send className="h-4 w-4" />
          Outgoing
          {pendingOutgoing > 0 && (
            <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
              {pendingOutgoing}
            </span>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-1">
            No {tab} requests
          </h3>
          <p className="text-muted-foreground text-sm">
            {tab === 'incoming'
              ? 'When other boxers send you match requests, they will appear here.'
              : 'Match requests you send to other boxers will appear here.'}
          </p>
        </div>
      ) : (
        /* Request Cards */
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              type={tab}
              onAccept={onAccept}
              onDecline={onDecline}
              onCancel={onCancel}
              isLoading={loadingRequestId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestList;
