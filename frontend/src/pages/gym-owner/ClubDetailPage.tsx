import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchClubWithMembers, clearSelectedClub } from '@/features/gym-owner/gymOwnerSlice';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Calendar, UserPlus } from 'lucide-react';
import { CreateBoxerAccountDialog } from '@/components/gym-owner/CreateBoxerAccountDialog';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { CreateBoxerAccountData } from '@/services/gymOwnerService';
import type { BoxerProfile } from '@/types';
import type { ClubCoach } from '@/features/gym-owner/gymOwnerSlice';

export const ClubDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedClub, selectedClubLoading, selectedClubError } = useAppSelector(
    (state) => state.gymOwner
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchClubWithMembers(id));
    }
    return () => {
      dispatch(clearSelectedClub());
    };
  }, [dispatch, id]);

  const handleCreateBoxer = async (data: CreateBoxerAccountData) => {
    if (!id) return;
    await gymOwnerService.createBoxerAccount(id, data);
  };

  const handleCreateSuccess = () => {
    setSuccessMessage('Boxer account created successfully!');
    // Refresh the club members list
    if (id) {
      dispatch(fetchClubWithMembers(id));
    }
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const boxerColumns: Column<Pick<BoxerProfile, 'id' | 'name' | 'userId' | 'weightKg' | 'experienceLevel' | 'wins' | 'losses' | 'draws'>>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
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
      header: 'Record',
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
            Create Match
          </Button>
        </div>
      ),
    },
  ];

  const coachColumns: Column<ClubCoach>[] = [
    {
      header: 'Name',
      cell: (coach) => coach.coach.name,
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

  if (selectedClubLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedClubError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gym-owner/clubs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clubs
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{selectedClubError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!selectedClub) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/gym-owner/clubs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clubs
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{selectedClub.name}</h1>
        <p className="text-muted-foreground mt-1">{selectedClub.region}</p>
      </div>

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Club Info */}
      <Card>
        <CardHeader>
          <CardTitle>Club Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Contact Name</p>
            <p className="font-medium">{selectedClub.contactName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{selectedClub.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{selectedClub.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Postcode</p>
            <p className="font-medium">{selectedClub.postcode || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Boxers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Boxers ({selectedClub.boxers.length})</CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Boxer
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={boxerColumns}
            data={selectedClub.boxers}
            emptyMessage="No boxers in this club yet. Click 'Add Boxer' to create a new boxer account."
            keyExtractor={(boxer) => boxer.id}
          />
        </CardContent>
      </Card>

      {/* Coaches Section */}
      <Card>
        <CardHeader>
          <CardTitle>Coaches ({selectedClub.coaches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={coachColumns}
            data={selectedClub.coaches}
            emptyMessage="No coaches in this club yet."
            keyExtractor={(coach) => coach.id}
          />
        </CardContent>
      </Card>

      {/* Create Boxer Account Dialog */}
      {id && (
        <CreateBoxerAccountDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clubId={id}
          onSubmit={handleCreateBoxer}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};
