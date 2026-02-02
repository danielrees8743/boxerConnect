import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs } from '@/features/gym-owner/gymOwnerSlice';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye } from 'lucide-react';
import type { Club } from '@/types';

export const MyClubsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { ownedClubs, clubsLoading, clubsError } = useAppSelector((state) => state.gymOwner);

  useEffect(() => {
    dispatch(fetchMyClubs());
  }, [dispatch]);

  const columns: Column<Club>[] = [
    {
      header: 'Club Name',
      accessorKey: 'name',
    },
    {
      header: 'Region',
      accessorKey: 'region',
    },
    {
      header: 'Boxers',
      cell: (club) => club._count?.boxers ?? 0,
    },
    {
      header: 'Coaches',
      cell: (club) => club._count?.coaches ?? 0,
    },
    {
      header: 'Actions',
      cell: (club) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/gym-owner/clubs/${club.id}`);
          }}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Clubs</h1>
        <p className="text-muted-foreground mt-1">View and manage your clubs</p>
      </div>

      {clubsError && (
        <Alert variant="destructive">
          <AlertDescription>{clubsError}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={ownedClubs}
        isLoading={clubsLoading}
        emptyMessage="You don't have any clubs assigned yet. Please contact an administrator."
        keyExtractor={(club) => club.id}
        onRowClick={(club) => navigate(`/gym-owner/clubs/${club.id}`)}
      />
    </div>
  );
};
