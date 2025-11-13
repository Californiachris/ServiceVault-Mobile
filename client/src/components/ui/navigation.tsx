import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { 
  QrCode, 
  LogOut, 
  User, 
  Menu, 
  X,
  Home,
  Camera,
  FileText,
  Bell,
  Settings,
  Building2,
  Truck,
  Users,
  Zap
} from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  // Role-specific navigation - only show if authenticated
  const getNavLinks = () => {
    if (!isAuthenticated || !user) {
      return [
        { href: "/scan", label: "Scan", icon: Camera },
        { href: "/pricing", label: "Pricing", icon: Zap },
      ];
    }

    const userRole = user.role || "HOMEOWNER";
    const baseLinks = [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/scan", label: "Scan", icon: Camera },
    ];

    if (userRole === "CONTRACTOR") {
      return [
        ...baseLinks,
        { href: "/tools/assets", label: "My Jobs", icon: Building2 },
        { href: "/tools/reminders", label: "Reminders", icon: Bell },
        { href: "/pricing", label: "Quota & Billing", icon: Zap },
      ];
    }

    if (userRole === "FLEET") {
      return [
        ...baseLinks,
        { href: "/tools/assets", label: "Fleet Assets", icon: Truck },
        { href: "/tools/reminders", label: "Maintenance", icon: Bell },
        { href: "/pricing", label: "Billing", icon: Zap },
      ];
    }

    // HOMEOWNER
    return [
      ...baseLinks,
      { href: "/tools/assets", label: "My Assets", icon: FileText },
      { href: "/tools/reminders", label: "Reminders", icon: Bell },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <img 
              src="/attached_assets/servicevault-logo.png" 
              alt="ServiceVault Logo" 
              className="h-10 w-10 object-contain hover:opacity-90 transition-opacity"
            />
            <span className="text-lg font-bold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 bg-clip-text text-transparent">
              ServiceVault
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {user && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-muted/30 rounded-lg">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {user.firstName || user.email}
                    </span>
                    {user.role && user.role !== 'HOMEOWNER' && (
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    } catch (e) {
                      // Logout endpoint doesn't exist in PUBLIC mode - that's ok
                    }
                    window.location.href = "/";
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-signin"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => setLocation("/pricing")}
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 text-sm font-medium transition-colors hover:text-primary rounded-lg ${
                    isActive(link.href) 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:bg-muted/30'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
              
              <hr className="border-border" />
              
              {isAuthenticated ? (
                <>
                  {user && (
                    <div className="px-3 py-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>{user.firstName || user.email}</span>
                        {user.role && user.role !== 'HOMEOWNER' && (
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full mx-3"
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      try {
                        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                      } catch (e) {
                        // Logout endpoint doesn't exist in PUBLIC mode - that's ok
                      }
                      window.location.href = "/";
                    }}
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <div className="px-3 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      window.location.href = "/api/login";
                    }}
                    data-testid="button-mobile-signin"
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setLocation("/pricing");
                    }}
                    data-testid="button-mobile-get-started"
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
