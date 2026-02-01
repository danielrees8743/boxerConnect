import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchClubs, deleteClub } from '@/features/admin/adminSlice';
import {
  DataTable,
  Column,
  SearchInput,
  StatusBadge,
  ConfirmDialog,
} from '@/components/admin';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Users, UserCircle } from 'lucide-react';
import type { Club } from '@/types';

const verificationOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

export const AdminClubsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clubs } = useAppSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(
    searchParams.get('isVerified') || 'all'
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    club: Club | null;
  }>({
    open: false,
    club: null,
  });

  const page = parseInt(searchParams.get('page') || '1', 10);

  const loadClubs = useCallback(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      limit: 20,
    };
    if (verifiedFilter !== 'all') params.isVerified = verifiedFilter === 'true';
    dispatch(fetchClubs(params));
  }, [dispatch, page, verifiedFilter]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const handlePageChange = (newPage: number) => {
    searchParams.set('page', String(newPage));
    setSearchParams(searchParams);
  };

  const handleVerifiedChange = (value: string) => {
    setVerifiedFilter(value);
    if (value === 'all') {
      searchParams.delete('isVerified');
    } else {
      searchParams.set('isVerified', value);
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handleDelete = (club: Club) => {
    setDeleteDialog({ open: true, club });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.club) return;
    await dispatch(deleteClub(deleteDialog.club.id));
    setDeleteDialog({ open: false, club: null });
  };

  const columns: Column<Club>[] = [
    {
      header: 'Name',
      cell: (club) => (
        <div>
          <p className="font-medium">{club.name}</p>
          <p className="text-sm text-muted-foreground">
            {club.region || '-'}
          </p>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (club) => (
        <div>
          <p className="text-sm">{club.email || '-'}</p>
          <p className="text-sm text-muted-foreground">{club.phone || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (club) =>
        club.postcode ? (
          <span className="text-sm">{club.postcode}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: 'Members',
      cell: (club) => (
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1" title="Boxers">
            <UserCircle className="h-4 w-4 text-boxing-red-500" />
            {club._count?.boxers ?? 0}
          </span>
          <span className="flex items-center gap-1" title="Coaches">
            <Users className="h-4 w-4 text-blue-500" />
            {club._count?.coaches ?? 0}
          </span>
        </div>
      ),
    },
    {
      header: 'Owner',
      cell: (club) =>
        club.owner ? (
          <span className="text-sm">{club.owner.name}</span>
        ) : (
          <span className="text-muted-foreground text-sm">No owner</span>
        ),
    },
    {
      header: 'Status',
      cell: (club) => <StatusBadge status={club.isVerified} type="verification" />,
    },
    {
      header: 'Created',
      cell: (club) => (
        <span className="text-sm text-muted-foreground">
          {new Date(club.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (club) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/clubs/${club.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(club)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter data by search term (client-side)
  const filteredData = search
    ? clubs.data.filter(
        (club) =>
          club.name.toLowerCase().includes(search.toLowerCase()) ||
          club.region?.toLowerCase().includes(search.toLowerCase()) ||
          club.postcode?.toLowerCase().includes(search.toLowerCase())
      )
    : clubs.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clubs</h1>
          <p className="text-muted-foreground mt-1">Manage boxing clubs</p>
        </div>
        <Button asChild>
          <Link to="/admin/clubs/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Club
          </Link>
        </Button>
      </div>

      {clubs.error && (
        <Alert variant="destructive">
          <AlertDescription>{clubs.error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clubs..."
          className="md:w-80"
        />
        <Select value={verifiedFilter} onValueChange={handleVerifiedChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {verificationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        pagination={clubs.pagination}
        onPageChange={handlePageChange}
        onRowClick={(club) => navigate(`/admin/clubs/${club.id}/edit`)}
        isLoading={clubs.loading}
        emptyMessage="No clubs found"
        keyExtractor={(club) => club.id}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, club: null })}
        title="Delete Club"
        description={`Are you sure you want to delete "${deleteDialog.club?.name}"? This will remove the club and unlink all members. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
