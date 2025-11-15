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
      <div className={`rounded-xl bg-gradient-to-r ${config.bgGradient} border p-6 mb-6`} data-testid="branded-header">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-background/80 backdrop-blur-sm p-3">
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-company-name">
              {displayName}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">
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
      className="rounded-xl bg-gradient-to-r from-background to-muted/30 border-2 shadow-lg p-8 mb-8" 
      data-testid="branded-header"
    >
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border-2 flex items-center justify-center p-3">
            <img 
              src={activeLogo.fileUrl} 
              alt="Company Logo" 
              className="max-w-full max-h-full object-contain"
              data-testid="img-company-logo"
            />
          </div>
        </div>

        {/* Company Name & Subtitle */}
        <div className="flex-1 min-w-0">
          <h1 
            className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-1"
            data-testid="text-company-name"
          >
            {displayName}
          </h1>
          {subtitle && (
            <p className="text-base md:text-lg text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/30 rounded-full"></div>
            <div className="h-1 w-8 bg-gradient-to-r from-primary/30 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
