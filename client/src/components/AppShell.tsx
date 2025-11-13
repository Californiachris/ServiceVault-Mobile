import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  QrCode,
  Camera,
  Building2,
  Truck,
  FileText,
  Bell,
  Settings,
  Zap,
  Menu,
  X,
  LogOut,
  User
} from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const userRole = user?.role || "HOMEOWNER";

  // Role-specific navigation links
  const getNavLinks = (role: string) => {
    const baseLinks = [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/scan", label: "Scan QR", icon: Camera },
    ];

    if (role === "CONTRACTOR") {
      return [
        ...baseLinks,
        { href: "/tools/assets", label: "Jobs", icon: Building2 },
        { href: "/tools/reminders", label: "Reminders", icon: Bell },
        { href: "/pricing", label: "Quota & Billing", icon: Zap },
        { href: "/settings", label: "Settings", icon: Settings },
      ];
    }

    if (role === "FLEET") {
      return [
        ...baseLinks,
        { href: "/tools/assets", label: "Fleet Assets", icon: Truck },
        { href: "/tools/reminders", label: "Maintenance", icon: Bell },
        { href: "/pricing", label: "Billing", icon: Zap },
        { href: "/settings", label: "Settings", icon: Settings },
      ];
    }

    // HOMEOWNER
    return [
      ...baseLinks,
      { href: "/tools/assets", label: "My Assets", icon: FileText },
      { href: "/tools/reminders", label: "Reminders", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ];
  };

  const navLinks = getNavLinks(userRole);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 h-16 px-6 border-b border-border">
            <img 
              src="/attached_assets/servicevault-logo.png" 
              alt="ServiceVault Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-bold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 bg-clip-text text-transparent">
              ServiceVault
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  data-testid={`sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || user?.email || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={async () => {
                try {
                  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                } catch (e) {
                  // Logout endpoint doesn't exist in PUBLIC mode - that's ok
                }
                window.location.href = "/";
              }}
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            
            {/* Patent Notice */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] text-muted-foreground/60 text-center px-2 leading-tight">
                Patent Pending
              </p>
              <p className="text-[9px] text-muted-foreground/40 text-center px-2 mt-1">
                © {new Date().getFullYear()} FixTrack Pro
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-[100] flex items-center justify-between h-16 px-4 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="FixTrack Logo" 
            className="h-8 w-8 object-contain"
          />
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">
            FixTrack Pro
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Badge variant="outline" className="text-xs">
              {userRole}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-mobile-menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <aside className="fixed top-0 bottom-16 left-0 w-64 border-r border-border bg-card shadow-xl z-[160] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col min-h-full">
              {/* Mobile Logo */}
              <div className="flex items-center gap-2 h-16 px-6 border-b border-border flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="FixTrack Logo" 
                  className="h-10 w-10 object-contain"
                />
                <span className="text-lg font-bold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-orange-400 to-orange-500 bg-clip-text text-transparent">
                  FixTrack Pro
                </span>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                      data-testid={`mobile-sidebar-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile User Profile */}
              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-3 mb-3 px-2">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={async () => {
                    setSidebarOpen(false);
                    try {
                      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    } catch (e) {
                      // Logout endpoint doesn't exist in PUBLIC mode - that's ok
                    }
                    window.location.href = "/";
                  }}
                  data-testid="button-mobile-sidebar-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
                
                {/* Patent Notice */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 text-center px-2 leading-tight">
                    Patent Pending
                  </p>
                  <p className="text-[9px] text-muted-foreground/40 text-center px-2 mt-1">
                    © {new Date().getFullYear()} FixTrack Pro
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Top Bar */}
      <div className="hidden lg:block lg:pl-64 sticky top-0 z-[100] bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="h-16 px-6 flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="search"
                placeholder="Search assets, properties, jobs..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-search"
              />
              <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
            </Button>
            
            {/* Profile Avatar/Dropdown */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Link href="/settings">
                <div className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded-lg transition-colors cursor-pointer" data-testid="button-profile">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-sm font-medium leading-none">{user?.firstName || user?.email || 'User'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{userRole}</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Always Visible */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[200] border-t border-border bg-card/80 backdrop-blur-lg safe-area-inset-bottom">
        <div className="grid grid-cols-4 h-16">
          {navLinks.slice(0, 4).map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={`bottom-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom spacing for mobile nav */}
      <div className="lg:hidden h-16" />
    </div>
  );
}
