import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, TrendingUp, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { fetchMyBoxer } from '@/features/boxer/boxerSlice';
import { boxerService } from '@/services/boxerService';

/**
 * Dashboard page - Main authenticated user dashboard.
 * Displays overview stats, recent activity, and quick actions.
 */
export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { myBoxer } = useAppSelector((state) => state.boxer);
  const [videoCount, setVideoCount] = useState(0);

  // Fetch boxer profile on mount
  useEffect(() => {
    if (user?.role === 'BOXER') {
      dispatch(fetchMyBoxer());
    }
  }, [dispatch, user?.role]);

  // Fetch video count when boxer profile is loaded
  useEffect(() => {
    const fetchVideos = async () => {
      // Only fetch videos for boxers with a profile
      if (user?.role !== 'BOXER' || !myBoxer) return;
      try {
        const result = await boxerService.getMyVideos();
        setVideoCount(result.count);
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      }
    };
    fetchVideos();
  }, [myBoxer, user?.role]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!myBoxer) return { percentage: 0, items: [], incompleteItems: [] };

    const items = [
      {
        label: 'Basic information completed',
        completed: !!(myBoxer.name && myBoxer.gender),
      },
      {
        label: 'Fight record added',
        completed: myBoxer.wins !== null || myBoxer.losses !== null || myBoxer.draws !== null,
      },
      {
        label: 'Add profile photo',
        completed: !!myBoxer.profilePhotoUrl,
      },
      {
        label: 'Add training videos',
        completed: videoCount > 0,
      },
    ];

    const completedCount = items.filter((item) => item.completed).length;
    const percentage = Math.round((completedCount / items.length) * 100);
    const incompleteItems = items.filter((item) => !item.completed);

    return { percentage, items, incompleteItems };
  }, [myBoxer, videoCount]);

  // Stats for boxers (without pending requests - that's for gym owners)
  const stats = [
    {
      label: 'Potential Matches',
      value: '12',
      icon: Users,
      change: '+3 this week',
      changeType: 'positive' as const,
    },
    {
      label: 'Upcoming Matches',
      value: '2',
      icon: Calendar,
      change: 'Next: Feb 15',
      changeType: 'neutral' as const,
    },
    {
      label: 'Profile Views',
      value: '156',
      icon: TrendingUp,
      change: '+23% this month',
      changeType: 'positive' as const,
    },
  ];

  // Placeholder recent activity
  const recentActivity = [
    {
      id: '1',
      type: 'match_request',
      title: 'New match request received',
      description: 'Mike Johnson wants to schedule a sparring session',
      time: '2 hours ago',
    },
    {
      id: '2',
      type: 'profile_view',
      title: 'Profile viewed',
      description: 'Your profile was viewed by 5 new people',
      time: '5 hours ago',
    },
    {
      id: '3',
      type: 'match_confirmed',
      title: 'Match confirmed',
      description: 'Your match with Sarah Williams has been confirmed',
      time: '1 day ago',
    },
    {
      id: '4',
      type: 'message',
      title: 'New message',
      description: 'Coach Martinez sent you a message',
      time: '2 days ago',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Boxer'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your boxing career today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/profile">View Profile</Link>
          </Button>
        </div>
      </div>

      {/* Profile Completion Alert */}
      {profileCompletion.percentage < 100 && profileCompletion.incompleteItems.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Complete your profile</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Your profile is {profileCompletion.percentage}% complete. To get more matches and visibility, please:{' '}
            {profileCompletion.incompleteItems.map((item, index) => (
              <span key={index}>
                {index > 0 && (index === profileCompletion.incompleteItems.length - 1 ? ' and ' : ', ')}
                <span className="lowercase">{item.label}</span>
              </span>
            ))}
            .{' '}
            <Link to="/profile" className="font-medium text-yellow-500 hover:underline">
              Update now →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">{stat.value}</span>
            </div>
            <p
              className={`mt-1 text-sm ${
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : 'text-muted-foreground'
              }`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="font-semibold">Recent Activity</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/activity">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 px-6 py-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Completion Card */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Complete Your Profile</h2>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Profile completion</span>
                <span className="font-medium">{profileCompletion.percentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-boxing-red"
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {profileCompletion.items.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.completed ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link to="/profile">Complete Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
