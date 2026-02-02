import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs } from '@/features/gym-owner/gymOwnerSlice';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { ClubCoach } from '@/features/gym-owner/gymOwnerSlice';

interface CoachWithClub extends ClubCoach {
  clubName: string;
  clubId: string;
}

export const GymOwnerCoachesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { ownedClubs, clubsLoading, clubsError } = useAppSelector((state) => state.gymOwner);
  const [coaches, setCoaches] = React.useState<CoachWithClub[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyClubs());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const loadCoaches = async () => {
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

        const allCoaches: CoachWithClub[] = [];
        clubDetails.forEach((club) => {
          club.coaches.forEach((coach) => {
            allCoaches.push({
              ...coach,
              clubName: club.name,
              clubId: club.id,
            });
          });
        });

        setCoaches(allCoaches);
      } catch (err) {
        console.error('Failed to load coaches:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load coaches');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!clubsLoading) {
      loadCoaches();
    }

    return () => {
      cancelled = true;
    };
  }, [ownedClubs, clubsLoading]);

  const columns: Column<CoachWithClub>[] = [
    {
      header: 'Coach Name',
      cell: (coach) => coach.coach.name,
    },
    {
      header: 'Club',
      accessorKey: 'clubName',
    },
    {
      header: 'Email',
      cell: (coach) => coach.coach.email,
    },
    {
      header: 'Is Head Coach',
      cell: (coach) => (
        <Badge variant={coach.isHead ? 'default' : 'secondary'}>
          {coach.isHead ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: () => (
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Coaches</h1>
        <p className="text-muted-foreground mt-1">Manage coaches across all your clubs</p>
      </div>

      {(clubsError || error) && (
        <Alert variant="destructive">
          <AlertDescription>{clubsError || error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={coaches}
        isLoading={loading || clubsLoading}
        emptyMessage="No coaches in your clubs yet. Invite coaches to join your clubs."
        keyExtractor={(coach) => coach.id}
      />
    </div>
  );
};
