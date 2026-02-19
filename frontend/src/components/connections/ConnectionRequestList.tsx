import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, X, UserPlus, Send, Loader2 } from 'lucide-react';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Button,
  getInitials,
} from '@/components/ui';
import type { ConnectionRequest } from '@/types';
import { cn } from '@/lib/utils';

interface ConnectionRequestListProps {
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  activeTab: 'incoming' | 'outgoing';
  onTabChange: (tab: 'incoming' | 'outgoing') => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
  loadingRequestId?: string | null;
  isLoading?: boolean;
}

export const ConnectionRequestList: React.FC<ConnectionRequestListProps> = ({
  incomingRequests,
  outgoingRequests,
  activeTab,
  onTabChange,
  onAccept,
  onDecline,
  onCancel,
  loadingRequestId,
  isLoading = false,
}) => {
  const pendingIncoming = incomingRequests.filter((r) => r.status === 'PENDING');
  const pendingOutgoing = outgoingRequests.filter((r) => r.status === 'PENDING');
  const activeList = activeTab === 'incoming' ? pendingIncoming : pendingOutgoing;

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex border-b mb-4">
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'incoming'
              ? 'border-boxing-red text-boxing-red'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onTabChange('incoming')}
        >
          <UserPlus className="h-4 w-4" />
          Received
          {pendingIncoming.length > 0 && (
            <Badge variant="pending" className="ml-1 h-5 min-w-5 text-xs">
              {pendingIncoming.length}
            </Badge>
          )}
        </button>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'outgoing'
              ? 'border-boxing-red text-boxing-red'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onTabChange('outgoing')}
        >
          <Send className="h-4 w-4" />
          Sent
          {pendingOutgoing.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
              {pendingOutgoing.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Request List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeList.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">
          {activeTab === 'incoming' ? 'No incoming connection requests.' : 'No sent connection requests.'}
        </p>
      ) : (
        <div className="space-y-3">
          {activeList.map((request) => {
            const boxer = activeTab === 'incoming' ? request.requesterBoxer : request.targetBoxer;
            const isActionLoading = loadingRequestId === request.id;

            return (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={boxer?.profilePhotoUrl ?? undefined} alt={boxer?.name} />
                    <AvatarFallback className="bg-boxing-red/10 text-boxing-red text-sm">
                      {getInitials(boxer?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {boxer ? (
                      <Link
                        to={`/boxers/${boxer.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {boxer.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-sm">Unknown Boxer</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.createdAt), 'MMM d, yyyy')}
                    </p>
                    {request.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        &ldquo;{request.message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeTab === 'incoming' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => onAccept?.(request.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span className="ml-1">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => onDecline?.(request.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <span className="ml-1">Decline</span>
                      </Button>
                    </>
                  )}
                  {activeTab === 'outgoing' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel?.(request.id)}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="ml-1">Cancel</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
