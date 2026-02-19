import React from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserPlus, Check, X, UserMinus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
  Button,
  getInitials,
} from '@/components/ui';
import type { Connection, ConnectionRequest } from '@/types';

interface ConnectionsCardProps {
  connections: Connection[];
  isLoading?: boolean;
  totalCount?: number;
  isOwner?: boolean;
  incomingRequests?: ConnectionRequest[];
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onDisconnect?: (connectionId: string) => void;
}

export const ConnectionsCard: React.FC<ConnectionsCardProps> = ({
  connections,
  isLoading = false,
  totalCount,
  isOwner = false,
  incomingRequests = [],
  onAccept,
  onDecline,
  onDisconnect,
}) => {
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const display = connections.filter((c) => c.boxer).slice(0, 6);
  const count = totalCount ?? connections.length;
  const overflow = count - display.length;

  const pendingRequests = isOwner
    ? incomingRequests.filter((r) => r.status === 'PENDING')
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connections
          {count > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-1">({count})</span>
          )}
          {pendingRequests.length > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-boxing-red bg-boxing-red/10 px-2 py-0.5 rounded-full">
              <UserPlus className="h-3 w-3" />
              {pendingRequests.length} pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Pending Incoming Requests — owner only */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pending Requests
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage
                          src={req.requesterBoxer?.profilePhotoUrl ?? undefined}
                          alt={req.requesterBoxer?.name}
                        />
                        <AvatarFallback className="bg-boxing-red/10 text-boxing-red text-xs">
                          {getInitials(req.requesterBoxer?.name ?? '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{req.requesterBoxer?.name ?? 'Unknown Boxer'}</p>
                        {req.requesterBoxer?.experienceLevel && (
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {req.requesterBoxer.experienceLevel.toLowerCase()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => onAccept?.(req.id)}
                          aria-label={`Accept connection from ${req.requesterBoxer?.name}`}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => onDecline?.(req.id)}
                          aria-label={`Decline connection from ${req.requesterBoxer?.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Connections */}
            {display.length === 0 && pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No connections yet.</p>
              </div>
            ) : display.length > 0 ? (
              <div>
                {pendingRequests.length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Connected
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {display.map((conn) => (
                    <div key={conn.id} className="relative group">
                      <Link
                        to={`/boxers/${conn.boxer.id}`}
                        className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                        aria-label={conn.boxer.name}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={conn.boxer.profilePhotoUrl ?? undefined} alt={conn.boxer.name} />
                          <AvatarFallback className="bg-boxing-red/10 text-boxing-red text-sm">
                            {getInitials(conn.boxer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{conn.boxer.name}</p>
                          {(conn.boxer.city || conn.boxer.country) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[conn.boxer.city, conn.boxer.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </Link>
                      {isOwner && onDisconnect && (
                        confirmingId === conn.id ? (
                          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/95 border border-destructive/50">
                            <span className="text-xs text-muted-foreground">Remove?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 px-2 text-xs"
                              onClick={() => { onDisconnect(conn.id); setConfirmingId(null); }}
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setConfirmingId(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(conn.id)}
                            className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label={`Remove connection with ${conn.boxer.name}`}
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
                {overflow > 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    +{overflow} more connection{overflow !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};
