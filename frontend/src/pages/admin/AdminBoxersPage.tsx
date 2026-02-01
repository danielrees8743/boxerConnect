import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchBoxers, verifyBoxer, deleteBoxer } from '@/features/admin/adminSlice';
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
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, Shield, ShieldOff } from 'lucide-react';
import type { BoxerProfile } from '@/types';

const verificationOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

export const AdminBoxersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { boxers } = useAppSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(
    searchParams.get('isVerified') || 'all'
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    boxer: BoxerProfile | null;
  }>({
    open: false,
    boxer: null,
  });
  const [verifyDialog, setVerifyDialog] = useState<{
    open: boolean;
    boxer: BoxerProfile | null;
    action: 'verify' | 'unverify';
  }>({
    open: false,
    boxer: null,
    action: 'verify',
  });

  const page = parseInt(searchParams.get('page') || '1', 10);

  const loadBoxers = useCallback(() => {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      limit: 20,
    };
    if (verifiedFilter !== 'all') params.isVerified = verifiedFilter === 'true';
    dispatch(fetchBoxers(params));
  }, [dispatch, page, verifiedFilter]);

  useEffect(() => {
    loadBoxers();
  }, [loadBoxers]);

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

  const handleToggleVerification = (boxer: BoxerProfile) => {
    setVerifyDialog({
      open: true,
      boxer,
      action: boxer.isVerified ? 'unverify' : 'verify',
    });
  };

  const confirmToggleVerification = async () => {
    if (!verifyDialog.boxer) return;
    await dispatch(
      verifyBoxer({
        id: verifyDialog.boxer.id,
        isVerified: !verifyDialog.boxer.isVerified,
      })
    );
    setVerifyDialog({ open: false, boxer: null, action: 'verify' });
  };

  const handleDelete = (boxer: BoxerProfile) => {
    setDeleteDialog({ open: true, boxer });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.boxer) return;
    await dispatch(deleteBoxer(deleteDialog.boxer.id));
    setDeleteDialog({ open: false, boxer: null });
  };

  const columns: Column<BoxerProfile>[] = [
    {
      header: 'Boxer',
      cell: (boxer) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {boxer.profilePhotoUrl ? (
              <img
                src={boxer.profilePhotoUrl}
                alt={boxer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                {boxer.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{boxer.name}</p>
            <p className="text-sm text-muted-foreground">
              {boxer.city && boxer.country
                ? `${boxer.city}, ${boxer.country}`
                : boxer.city || boxer.country || '-'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Experience',
      cell: (boxer) => (
        <span className="text-sm capitalize">
          {boxer.experienceLevel.toLowerCase().replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Record',
      cell: (boxer) => (
        <span className="text-sm font-mono">
          {boxer.wins}-{boxer.losses}-{boxer.draws}
        </span>
      ),
    },
    {
      header: 'Weight',
      cell: (boxer) =>
        boxer.weightKg ? (
          <span className="text-sm">{boxer.weightKg} kg</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: 'Verification',
      cell: (boxer) => <StatusBadge status={boxer.isVerified} type="verification" />,
    },
    {
      header: 'Created',
      cell: (boxer) => (
        <span className="text-sm text-muted-foreground">
          {new Date(boxer.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (boxer) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleVerification(boxer)}
            title={boxer.isVerified ? 'Remove verification' : 'Verify boxer'}
          >
            {boxer.isVerified ? (
              <ShieldOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Shield className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/boxers/${boxer.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(boxer)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter data by search term (client-side)
  const filteredData = search
    ? boxers.data.filter(
        (boxer) =>
          boxer.name.toLowerCase().includes(search.toLowerCase()) ||
          boxer.city?.toLowerCase().includes(search.toLowerCase()) ||
          boxer.country?.toLowerCase().includes(search.toLowerCase())
      )
    : boxers.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boxers</h1>
          <p className="text-muted-foreground mt-1">Manage boxer profiles</p>
        </div>
        <Button asChild>
          <Link to="/admin/boxers/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Boxer
          </Link>
        </Button>
      </div>

      {boxers.error && (
        <Alert variant="destructive">
          <AlertDescription>{boxers.error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search boxers..."
          className="md:w-80"
        />
        <Select value={verifiedFilter} onValueChange={handleVerifiedChange}>
          <SelectTrigger className="w-40">
            <span>
              {verificationOptions.find((opt) => opt.value === verifiedFilter)?.label ||
                'Filter by verification'}
            </span>
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
        pagination={boxers.pagination}
        onPageChange={handlePageChange}
        onRowClick={(boxer) => navigate(`/admin/boxers/${boxer.id}/edit`)}
        isLoading={boxers.loading}
        emptyMessage="No boxers found"
        keyExtractor={(boxer) => boxer.id}
      />

      {/* Verification Dialog */}
      <ConfirmDialog
        open={verifyDialog.open}
        onOpenChange={(open) =>
          setVerifyDialog({ open, boxer: null, action: 'verify' })
        }
        title={verifyDialog.action === 'verify' ? 'Verify Boxer' : 'Remove Verification'}
        description={
          verifyDialog.action === 'verify'
            ? `Are you sure you want to verify "${verifyDialog.boxer?.name}"? This confirms their identity and credentials.`
            : `Are you sure you want to remove verification from "${verifyDialog.boxer?.name}"?`
        }
        confirmLabel={verifyDialog.action === 'verify' ? 'Verify' : 'Remove Verification'}
        variant={verifyDialog.action === 'unverify' ? 'destructive' : 'default'}
        onConfirm={confirmToggleVerification}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, boxer: null })}
        title="Delete Boxer"
        description={`Are you sure you want to delete "${deleteDialog.boxer?.name}"? This will remove their boxer profile and cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
