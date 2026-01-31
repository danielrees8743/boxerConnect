import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  getInitials,
} from '@/components/ui';
import type { MatchRequest, MatchRequestStatus } from '@/types';
import { cn } from '@/lib/utils';

interface RequestCardProps {
  request: MatchRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Status badge variant mapping.
 */
const statusBadgeVariant: Record<MatchRequestStatus, 'pending' | 'success' | 'destructive' | 'secondary' | 'outline' | 'warning'> = {
  PENDING: 'pending',
  ACCEPTED: 'success',
  DECLINED: 'destructive',
  EXPIRED: 'secondary',
  CANCELLED: 'outline',
  COMPLETED: 'success',
};

/**
 * Format status for display.
 */
function formatStatus(status: MatchRequestStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * RequestCard component displays a match request with actions.
 * Shows requester/target info, status, proposed details, and action buttons.
 *
 * @example
 * <RequestCard
 *   request={matchRequest}
 *   type="incoming"
 *   onAccept={handleAccept}
 *   onDecline={handleDecline}
 * />
 */
export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  type,
  onAccept,
  onDecline,
  onCancel,
  isLoading = false,
  className,
}) => {
  const boxer = type === 'incoming' ? request.requesterBoxer : request.targetBoxer;
  const isPending = request.status === 'PENDING';
  const canRespond = type === 'incoming' && isPending;
  const canCancel = type === 'outgoing' && isPending;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Boxer Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {boxer ? (
              <Link to={`/boxers/${boxer.id}`}>
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                  <AvatarImage
                    src={boxer.profilePhotoUrl || undefined}
                    alt={boxer.name}
                  />
                  <AvatarFallback className="bg-boxing-red/10 text-boxing-red">
                    {getInitials(boxer.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {boxer ? (
                  <Link
                    to={`/boxers/${boxer.id}`}
                    className="font-semibold hover:underline truncate"
                  >
                    {boxer.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    Unknown Boxer
                  </span>
                )}
                <Badge variant={statusBadgeVariant[request.status]}>
                  {formatStatus(request.status)}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {type === 'incoming' ? 'Sent you a match request' : 'Match request sent'}
              </p>

              {/* Request Details */}
              <div className="mt-3 space-y-2">
                {request.proposedDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {format(new Date(request.proposedDate), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                )}

                {request.proposedVenue && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{request.proposedVenue}</span>
                  </div>
                )}

                {request.message && (
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{request.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions & Timestamps */}
          <div className="flex flex-col items-end justify-between gap-3">
            <div className="text-xs text-muted-foreground text-right">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Created {format(new Date(request.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              {request.expiresAt && isPending && (
                <p className="mt-1">
                  Expires {format(new Date(request.expiresAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {(canRespond || canCancel) && (
              <div className="flex gap-2">
                {canRespond && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDecline?.(request.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onAccept?.(request.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCancel?.(request.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Cancel'
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Response Message */}
            {request.responseMessage && request.status !== 'PENDING' && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <p className="font-medium text-foreground mb-1">Response:</p>
                <p>{request.responseMessage}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestCard;
