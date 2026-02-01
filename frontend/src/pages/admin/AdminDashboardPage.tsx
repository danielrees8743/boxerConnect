import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchAdminStats } from '@/features/admin/adminSlice';
import { StatsCard } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserCircle,
  Building2,
  Shield,
  UserCheck,
  Clock,
  Trophy,
  Briefcase,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { stats, statsLoading, statsError } = useAppSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System overview and statistics</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System overview and statistics</p>
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
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and statistics</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          description={`${stats?.activeUsers ?? 0} active users`}
          href="/admin/users"
        />
        <StatsCard
          title="Total Boxers"
          value={stats?.totalBoxers ?? 0}
          icon={UserCircle}
          description={`${stats?.verifiedBoxers ?? 0} verified`}
          iconClassName="bg-boxing-gold-100 text-boxing-gold-600"
          href="/admin/boxers"
        />
        <StatsCard
          title="Total Clubs"
          value={stats?.totalClubs ?? 0}
          icon={Building2}
          description={`${stats?.verifiedClubs ?? 0} verified`}
          iconClassName="bg-blue-100 text-blue-600"
          href="/admin/clubs"
        />
        <StatsCard
          title="Pending Verifications"
          value={stats?.pendingVerifications ?? 0}
          icon={Clock}
          iconClassName="bg-yellow-100 text-yellow-600"
          href="/admin/boxers?isVerified=false"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Coaches"
          value={stats?.totalCoaches ?? 0}
          icon={Briefcase}
          iconClassName="bg-green-100 text-green-600"
          href="/admin/users?role=COACH"
        />
        <StatsCard
          title="Gym Owners"
          value={stats?.totalGymOwners ?? 0}
          icon={Building2}
          iconClassName="bg-purple-100 text-purple-600"
          href="/admin/users?role=GYM_OWNER"
        />
        <StatsCard
          title="Admins"
          value={stats?.totalAdmins ?? 0}
          icon={Shield}
          iconClassName="bg-red-100 text-red-600"
          href="/admin/users?role=ADMIN"
        />
        <StatsCard
          title="Recent Signups"
          value={stats?.recentSignups ?? 0}
          icon={UserCheck}
          description="Last 7 days"
          iconClassName="bg-teal-100 text-teal-600"
          href="/admin/users"
        />
      </div>

      {/* Match Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-boxing-gold-500" />
            Match Request Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{stats?.totalMatchRequests ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50">
              <p className="text-3xl font-bold text-yellow-600">{stats?.pendingMatchRequests ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <p className="text-3xl font-bold text-green-600">{stats?.acceptedMatchRequests ?? 0}</p>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users by Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {stats?.usersByRole?.map((roleData) => (
              <div
                key={roleData.role}
                className="text-center p-4 rounded-lg bg-muted/50"
              >
                <p className="text-2xl font-bold">{roleData.count}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {roleData.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
