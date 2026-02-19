import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, User, Home, Users, Calendar, Settings, Building2, Shield, Bell, UserCheck } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggleDropdown, ThemeToggle } from '@/components/theme';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout component with header, navigation, and content area.
 * Provides consistent structure across all authenticated pages.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const incomingRequests = useAppSelector((state) => state.connections.incomingRequests);
  const pendingCount = incomingRequests.filter((r) => r.status === 'PENDING').length;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isBoxer = user?.role === 'BOXER';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/boxers', label: 'Boxers', icon: Users },
    { to: '/matches', label: 'Matches', icon: Calendar },
  ];

  // Clubs visible to non-admin, non-boxer roles (coaches, gym staff, unauthenticated)
  const publicLinks = [
    ...(!isBoxer ? [{ to: '/clubs', label: 'Clubs', icon: Building2 }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          {/* Logo */}
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between">
            <div className="flex items-center space-x-6">
              {/* Public links - visible for non-admin users */}
              {user?.role !== 'ADMIN' && publicLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
              {/* Authenticated links - visible for non-admin users */}
              {isAuthenticated && user?.role !== 'ADMIN' &&
                navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              {/* Connections link - visible for boxers only */}
              {isAuthenticated && isBoxer && (
                <Link
                  to="/connections"
                  className="flex items-center space-x-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Connections</span>
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggleDropdown />
              {isAuthenticated ? (
                <>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="flex items-center space-x-2 text-sm font-medium text-boxing-red-500 transition-colors hover:text-boxing-red-600"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <Link
                      to="/connections"
                      className="relative flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={pendingCount > 0 ? `${pendingCount} pending connection request${pendingCount !== 1 ? 's' : ''}` : 'Connection requests'}
                    >
                      <Bell className="h-5 w-5" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-boxing-red text-[10px] font-bold text-white leading-none">
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    <span>{user?.name || 'Profile'}</span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="ml-auto md:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'md:hidden',
            isMobileMenuOpen ? 'block' : 'hidden'
          )}
        >
          <nav className="container space-y-4 pb-4">
            {isAuthenticated ? (
              <>
                {/* Public links in mobile menu - for non-admin users */}
                {user?.role !== 'ADMIN' && publicLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
                {/* Nav links - for non-admin users */}
                {user?.role !== 'ADMIN' && navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-2 text-sm font-medium text-boxing-red-500 transition-colors hover:text-boxing-red-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
                {user?.role !== 'ADMIN' && (
                  <Link
                    to="/connections"
                    className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="relative">
                      {isBoxer ? <UserCheck className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      {pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-boxing-red text-[9px] font-bold text-white leading-none">
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                    </span>
                    <span>
                      {isBoxer ? 'Connections' : 'Requests'}
                      {pendingCount > 0 && ` (${pendingCount})`}
                    </span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <ThemeToggle showLabel />
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/clubs"
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Clubs</span>
                </Link>
                <Link
                  to="/login"
                  className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block text-sm font-medium text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                  <ThemeToggle showLabel />
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BoxerConnect. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
