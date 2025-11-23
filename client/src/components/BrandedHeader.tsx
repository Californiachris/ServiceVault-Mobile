import { useQuery } from "@tanstack/react-query";
import { Building2, Home, Truck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Logo {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  logoType: "UPLOADED" | "AI_GENERATED";
  isActive: boolean;
}

interface BrandedHeaderProps {
  sector: "homeowner" | "contractor" | "fleet" | "property_manager";
  companyName?: string;
  subtitle?: string;
}

const SECTOR_CONFIG = {
  homeowner: {
    icon: Home,
    defaultName: "My Home",
    iconColor: "text-blue-500",
    bgGradient: "from-blue-500/10 to-purple-500/10",
  },
  contractor: {
    icon: Building2,
    defaultName: "My Business",
    iconColor: "text-green-500",
    bgGradient: "from-green-500/10 to-blue-500/10",
  },
  fleet: {
    icon: Truck,
    defaultName: "My Fleet",
    iconColor: "text-purple-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  property_manager: {
    icon: Users,
    defaultName: "My Properties",
    iconColor: "text-orange-500",
    bgGradient: "from-orange-500/10 to-red-500/10",
  },
};

export default function BrandedHeader({ sector, companyName, subtitle }: BrandedHeaderProps) {
  const { user } = useAuth();
  
  // Fetch user's logos
  const { data: logos = [] } = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
    retry: false,
  });

  // Get the active logo
  const activeLogo = logos.find(logo => logo.isActive);
  
  // Get sector configuration
  const config = SECTOR_CONFIG[sector];
  const Icon = config.icon;
  
  // Get display name based on sector and user data
  const getDisplayName = () => {
    if (companyName) return companyName;
    
    // Try to get from user data
    if (user) {
      const firstName = user.firstName;
      const lastName = user.lastName || user.familyName;
      
      if (sector === "homeowner" && (firstName || lastName)) {
        return `The ${lastName || firstName} Family`;
      }
    }
    
    return config.defaultName;
  };

  const displayName = getDisplayName();

  // If no logo, show minimal branded header
  if (!activeLogo) {
    return (
      <div 
        className={`rounded-lg md:rounded-xl bg-gradient-to-r ${config.bgGradient} border p-4 md:p-6 mb-4 md:mb-6`}
        style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}
        data-testid="branded-header"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex-shrink-0 rounded-lg bg-background/80 backdrop-blur-sm p-2 md:p-3">
            <Icon className={`h-6 w-6 md:h-8 md:w-8 ${config.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h2 
              className="text-xl md:text-4xl font-extrabold tracking-tight leading-tight text-white"
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}
              data-testid="text-company-name"
            >
              {displayName}
            </h2>
            {subtitle && (
              <p className="text-xs md:text-base text-white/70 mt-1 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show full branded header with logo
  return (
    <div 
      className="rounded-lg md:rounded-xl bg-gradient-to-r from-background to-muted/30 border shadow-lg p-4 md:p-8 mb-4 md:mb-8"
      style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}
      data-testid="branded-header"
    >
      <div className="flex items-start gap-3 md:gap-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-card border border-primary/30 shadow-lg flex items-center justify-center p-2 md:p-3">
            <img 
              src={activeLogo.fileUrl} 
              alt="Company Logo" 
              className="max-w-full max-h-full object-contain"
              data-testid="img-company-logo"
            />
          </div>
        </div>

        {/* Company Name & Subtitle */}
        <div className="flex-1 min-w-0 pt-1">
          <h1 
            className="text-lg md:text-5xl font-extrabold tracking-tight leading-tight text-white mb-1 md:mb-2"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}
            data-testid="text-company-name"
          >
            {displayName}
          </h1>
          {subtitle && (
            <p className="text-xs md:text-lg text-white/70 font-medium">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 w-8 md:w-12 bg-gradient-to-r from-cyan-400 to-cyan-400/30 rounded-full"></div>
            <div className="h-1 w-6 md:w-8 bg-gradient-to-r from-cyan-400/30 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
