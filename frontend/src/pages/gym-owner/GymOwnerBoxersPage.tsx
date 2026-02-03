import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs } from '@/features/gym-owner/gymOwnerSlice';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar, UserPlus } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CreateBoxerAccountDialog } from '@/components/gym-owner/CreateBoxerAccountDialog';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { CreateBoxerAccountData } from '@/services/gymOwnerService';
import type { BoxerProfile } from '@/types';

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyClubs());
  }, [dispatch]);

  // Set default club when clubs are loaded
  useEffect(() => {
    if (ownedClubs.length > 0 && !selectedClubId) {
      setSelectedClubId(ownedClubs[0].id);
    }
  }, [ownedClubs, selectedClubId]);

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

  const handleCreateBoxer = async (data: CreateBoxerAccountData) => {
    if (!selectedClubId) {
      throw new Error('Please select a club first');
    }
    await gymOwnerService.createBoxerAccount(selectedClubId, data);
  };

  const handleCreateSuccess = () => {
    setSuccessMessage('Boxer account created successfully!');
    // Refresh the boxer list
    dispatch(fetchMyClubs()).then(() => {
      // Reload boxers after clubs are fetched
      window.location.reload();
    });
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleOpenCreateDialog = () => {
    if (ownedClubs.length === 0) {
      setError('You need to have at least one club to add boxers');
      return;
    }
    if (!selectedClubId && ownedClubs.length > 0) {
      setSelectedClubId(ownedClubs[0].id);
    }
    setCreateDialogOpen(true);
  };

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
              navigate(`/boxers/${boxer.id}`);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCreateDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Boxer
          </Button>
          <Button onClick={() => navigate('/gym-owner/matches')}>
            Create Match Request
          </Button>
        </div>
      </div>

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {(clubsError || error) && (
        <Alert variant="destructive">
          <AlertDescription>{clubsError || error}</AlertDescription>
        </Alert>
      )}

      {/* Club selector for multiple clubs */}
      {ownedClubs.length > 1 && createDialogOpen && (
        <div className="space-y-2">
          <Label>Select Club</Label>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              {ownedClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable
        columns={columns}
        data={boxers}
        isLoading={loading || clubsLoading}
        emptyMessage="No boxers in your clubs yet. Click 'Add Boxer' to create a new boxer account."
        keyExtractor={(boxer) => boxer.id}
        onRowClick={(boxer) => navigate(`/boxers/${boxer.id}`)}
      />

      {/* Create Boxer Account Dialog */}
      {selectedClubId && (
        <CreateBoxerAccountDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clubId={selectedClubId}
          onSubmit={handleCreateBoxer}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};
