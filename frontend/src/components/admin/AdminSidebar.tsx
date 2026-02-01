import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Building2,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: Users,
  },
  {
    label: 'Boxers',
    path: '/admin/boxers',
    icon: UserCircle,
  },
  {
    label: 'Clubs',
    path: '/admin/clubs',
    icon: Building2,
  },
];

export const AdminSidebar: React.FC = () => {
  return (
    <aside className="w-64 min-h-screen bg-card border-r">
      <div className="p-6 border-b">
        <h2 className="text-lg font-bold text-boxing-red-600">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">BoxerConnect Management</p>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/admin'}
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
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
