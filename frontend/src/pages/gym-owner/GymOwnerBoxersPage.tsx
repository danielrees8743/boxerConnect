import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs } from '@/features/gym-owner/gymOwnerSlice';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar } from 'lucide-react';
import type { BoxerProfile } from '@/types';
import { gymOwnerService } from '@/services/gymOwnerService';

interface BoxerWithClub {
  id: string;
  name: string;
  userId: string;
  weightKg: number | null;
  experienceLevel: string;
  wins: number;
  losses: number;
  draws: number;
  clubName: string;
  clubId: string;
}

export const GymOwnerBoxersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { ownedClubs, clubsLoading, clubsError } = useAppSelector((state) => state.gymOwner);
  const [boxers, setBoxers] = React.useState<BoxerWithClub[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyClubs());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const loadBoxers = async () => {
      if (ownedClubs.length === 0) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const clubDetails = await Promise.all(
          ownedClubs.map((club) => gymOwnerService.getClubWithMembers(club.id))
        );

        if (cancelled) return;

        const allBoxers: BoxerWithClub[] = [];
        clubDetails.forEach((club) => {
          club.boxers.forEach((boxer) => {
            allBoxers.push({
              ...boxer,
              clubName: club.name,
              clubId: club.id,
            });
          });
        });

        setBoxers(allBoxers);
      } catch (err) {
        console.error('Failed to load boxers:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load boxers');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!clubsLoading) {
      loadBoxers();
    }

    return () => {
      cancelled = true;
    };
  }, [ownedClubs, clubsLoading]);

  const columns: Column<BoxerWithClub>[] = [
    {
      header: 'Boxer Name',
      accessorKey: 'name',
    },
    {
      header: 'Club',
      accessorKey: 'clubName',
    },
    {
      header: 'Experience Level',
      cell: (boxer) => (
        <Badge variant="outline">{boxer.experienceLevel}</Badge>
      ),
    },
    {
      header: 'Weight (kg)',
      cell: (boxer) => boxer.weightKg ?? '-',
    },
    {
      header: 'Fight Record',
      cell: (boxer) => `${boxer.wins}-${boxer.losses}-${boxer.draws}`,
    },
    {
      header: 'Actions',
      cell: (boxer) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/boxer/${boxer.id}`);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Profile
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/gym-owner/matches?boxerId=${boxer.id}`);
            }}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Find Matches
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">All Boxers</h1>
          <p className="text-muted-foreground mt-1">Manage boxers across all your clubs</p>
        </div>
        <Button onClick={() => navigate('/gym-owner/matches')}>
          Create Match Request
        </Button>
      </div>

      {(clubsError || error) && (
        <Alert variant="destructive">
          <AlertDescription>{clubsError || error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={boxers}
        isLoading={loading || clubsLoading}
        emptyMessage="No boxers in your clubs yet. Invite boxers to join your clubs."
        keyExtractor={(boxer) => boxer.id}
        onRowClick={(boxer) => navigate(`/boxer/${boxer.id}`)}
      />
    </div>
  );
};
