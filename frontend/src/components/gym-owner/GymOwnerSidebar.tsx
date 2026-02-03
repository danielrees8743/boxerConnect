import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Calendar,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { membershipRequestService } from '@/services/membershipRequestService';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/gym-owner',
    icon: LayoutDashboard,
  },
  {
    label: 'My Clubs',
    path: '/gym-owner/clubs',
    icon: Building2,
  },
  {
    label: 'Boxers',
    path: '/gym-owner/boxers',
    icon: Users,
  },
  {
    label: 'Coaches',
    path: '/gym-owner/coaches',
    icon: UserCog,
  },
  {
    label: 'Membership Requests',
    path: '/gym-owner/membership-requests',
    icon: UserPlus,
  },
  {
    label: 'Match Requests',
    path: '/gym-owner/matches',
    icon: Calendar,
  },
];

export const GymOwnerSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [pendingCount, setPendingCount] = React.useState(0);

  // Load pending membership requests count
  React.useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const requests = await membershipRequestService.getPendingRequests();
        setPendingCount(requests.length);
      } catch (err) {
        console.error('Failed to load pending requests count:', err);
      }
    };

    loadPendingCount();
    // Refresh count every 60 seconds
    const interval = setInterval(loadPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-bold text-boxing-red-600">Gym Owner</h2>
        <p className="text-sm text-muted-foreground">Club Management</p>
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/gym-owner'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-boxing-red-600 text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.path === '/gym-owner/membership-requests' && pendingCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-auto bg-boxing-red-600 text-white"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="mb-3 px-4">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};
