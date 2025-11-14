import { ReactNode } from "react";
import { useEntitlements } from "@/hooks/use-entitlements";
import type { FeatureKey } from "../../../shared/planFeatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = false 
}: FeatureGateProps) {
  const { hasFeature, isLoading, plan } = useEntitlements();

  if (isLoading) {
    return null; // Or a skeleton loader
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (showUpgradePrompt) {
    return (
      <Card className="border-2 border-dashed" data-testid={`upgrade-prompt-${feature}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Upgrade Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This feature is not included in your current plan ({plan || 'Free'}).
          </p>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{fallback}</>;
}

// Helper component for inline feature checks
export function RequireFeature({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  return (
    <FeatureGate feature={feature} fallback={null}>
      {children}
    </FeatureGate>
  );
}
