import React from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
  getInitials,
} from '@/components/ui';
import type { Connection } from '@/types';

interface ConnectionsCardProps {
  connections: Connection[];
  isLoading?: boolean;
  totalCount?: number;
}

export const ConnectionsCard: React.FC<ConnectionsCardProps> = ({
  connections,
  isLoading = false,
  totalCount,
}) => {
  const display = connections.slice(0, 6);
  const count = totalCount ?? connections.length;
  const overflow = count - display.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connections
          {count > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-1">({count})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No connections yet.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {display.map((conn) => (
                <Link
                  key={conn.id}
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
              ))}
            </div>
            {overflow > 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                +{overflow} more connection{overflow !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
