import React, { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { membershipRequestService } from '@/services/membershipRequestService';
import type { MembershipRequest } from '@/services/membershipRequestService';

export const MembershipRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MembershipRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await membershipRequestService.getPendingRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load membership requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load membership requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (request: MembershipRequest) => {
    try {
      setActionLoading(true);
      setError(null);
      await membershipRequestService.approveRequest(request.id);
      setSuccessMessage(`Approved ${request.user.name}'s membership request`);
      // Refresh the list
      await loadRequests();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to approve request:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (request: MembershipRequest) => {
    setSelectedRequest(request);
    setRejectNotes('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      setError(null);
      await membershipRequestService.rejectRequest(selectedRequest.id, rejectNotes || undefined);
      setSuccessMessage(`Rejected ${selectedRequest.user.name}'s membership request`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectNotes('');
      // Refresh the list
      await loadRequests();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to reject request:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: Column<MembershipRequest>[] = [
    {
      header: 'Boxer Name',
      accessorKey: 'user',
      cell: (request) => (
        <div>
          <div className="font-medium">{request.user.name}</div>
          <div className="text-sm text-muted-foreground">{request.user.email}</div>
        </div>
      ),
    },
    {
      header: 'Club',
      accessorKey: 'club',
      cell: (request) => request.club.name,
    },
    {
      header: 'Experience Level',
      cell: (request) => (
        request.user.experienceLevel ? (
          <Badge variant="outline">{request.user.experienceLevel}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      header: 'Weight (kg)',
      cell: (request) => request.user.weightKg ?? '-',
    },
    {
      header: 'Requested Date',
      cell: (request) => formatDate(request.requestedAt),
    },
    {
      header: 'Actions',
      cell: (request) => (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(request);
            }}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRejectClick(request);
            }}
            disabled={actionLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Membership Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve boxer membership requests for your clubs
        </p>
      </div>

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={requests}
        isLoading={loading}
        emptyMessage="No pending membership requests"
        keyExtractor={(request) => request.id}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Membership Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedRequest?.user.name}'s membership request?
              You can optionally provide a reason for the rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectNotes">Rejection Notes (Optional)</Label>
            <Textarea
              id="rejectNotes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Explain why the request is being rejected..."
              rows={4}
              disabled={actionLoading}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
