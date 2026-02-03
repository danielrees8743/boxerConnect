import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchMyClubs, fetchGymOwnerStats } from '@/features/gym-owner/gymOwnerSlice';
import { StatsCard } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  UserCog,
  Calendar,
  UserPlus,
  Eye,
  Plus,
} from 'lucide-react';
import { membershipRequestService } from '@/services/membershipRequestService';

export const GymOwnerDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, statsLoading, statsError } = useAppSelector((state) => state.gymOwner);
  const [pendingMembershipRequests, setPendingMembershipRequests] = useState(0);

  useEffect(() => {
    dispatch(fetchMyClubs());
    dispatch(fetchGymOwnerStats());
  }, [dispatch]);

  // Load pending membership requests count
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const requests = await membershipRequestService.getPendingRequests();
        setPendingMembershipRequests(requests.length);
      } catch (err) {
        console.error('Failed to load pending membership requests:', err);
      }
    };

    loadPendingRequests();
  }, []);

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Gym Owner Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your clubs and members</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Gym Owner Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your clubs and members</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gym Owner Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your clubs and members</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clubs Owned"
          value={stats?.totalClubs ?? 0}
          icon={Building2}
          description="Your clubs"
          iconClassName="bg-blue-100 text-blue-600"
          href="/gym-owner/clubs"
        />
        <StatsCard
          title="Total Boxers"
          value={stats?.totalBoxers ?? 0}
          icon={Users}
          description="Across all clubs"
          iconClassName="bg-boxing-gold-100 text-boxing-gold-600"
          href="/gym-owner/boxers"
        />
        <StatsCard
          title="Total Coaches"
          value={stats?.totalCoaches ?? 0}
          icon={UserCog}
          description="Across all clubs"
          iconClassName="bg-green-100 text-green-600"
          href="/gym-owner/coaches"
        />
        <StatsCard
          title="Pending Membership Requests"
          value={pendingMembershipRequests}
          icon={UserPlus}
          description="Awaiting approval"
          iconClassName="bg-purple-100 text-purple-600"
          href="/gym-owner/membership-requests"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => navigate('/gym-owner/boxers')}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View All Boxers
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/gym-owner/matches')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Match Request
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/gym-owner/clubs')}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Manage Clubs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State or Recent Activity */}
      {stats?.totalClubs === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Clubs Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any clubs assigned yet. Please contact an administrator to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
