import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Package, AlertCircle } from "lucide-react";

export default function IdentifiersPage() {
  const { isAuthenticated, user } = useAuth();
  
  const { data: identifiers, isLoading } = useQuery({
    queryKey: ["/api/identifiers"],
    enabled: isAuthenticated,
  });

  const { data: quota } = useQuery({
    queryKey: ["/api/me/quota"],
    enabled: isAuthenticated && user?.role === 'CONTRACTOR',
  });

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sticker Management</h1>
          <p className="text-muted-foreground">
            View your claimed FixTrack Pro stickers and subscription quota. Stickers are shipped with your subscription plan.
          </p>
        </div>

        {/* Quota Card (for contractors) */}
        {user?.role === 'CONTRACTOR' && quota && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Subscription Quota
                </span>
                <Badge variant={quota.quotaUsed >= quota.quotaTotal ? "destructive" : "default"}>
                  {quota.quotaUsed} / {quota.quotaTotal} Claimed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      quota.quotaUsed >= quota.quotaTotal ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((quota.quotaUsed / quota.quotaTotal) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {quota.quotaTotal - quota.quotaUsed} stickers remaining. 
                  {quota.quotaUsed >= quota.quotaTotal && ' Upgrade your plan to claim more stickers.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claimed Stickers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Claimed Stickers {identifiers && `(${identifiers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {identifiers && identifiers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {identifiers.map((identifier: any) => (
                  <Card key={identifier.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={identifier.kind === 'HOUSE' ? 'default' : 'secondary'}>
                          {identifier.kind}
                        </Badge>
                        {identifier.tamperState === 'TRIPPED' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Tampered
                          </Badge>
                        )}
                      </div>
                      
                      <div className="font-mono text-lg font-bold" data-testid={`code-${identifier.id}`}>
                        {identifier.code}
                      </div>
                      
                      {identifier.claimedAt && (
                        <p className="text-xs text-muted-foreground">
                          Claimed {new Date(identifier.claimedAt).toLocaleDateString()}
                        </p>
                      )}
                      
                      {identifier.brandLabel && (
                        <p className="text-sm text-muted-foreground">{identifier.brandLabel}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Stickers Claimed</h3>
                <p className="text-muted-foreground mb-4">
                  Scan FixTrack Pro stickers to claim them and start tracking assets.
                </p>
                <p className="text-sm text-muted-foreground">
                  Pre-printed stickers are shipped with your subscription. Check your order confirmation email for details.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How FixTrack Pro Stickers Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Package className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">1. Receive Stickers</h3>
                <p className="text-sm text-muted-foreground">
                  Professional QR stickers are shipped with your subscription. Pre-printed with tamper-resistant material.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <QrCode className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">2. Apply & Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Attach stickers to assets and scan them to claim. Binds the sticker to your account and creates an asset record.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">3. Track History</h3>
                <p className="text-sm text-muted-foreground">
                  All service logs, warranties, and transfers are recorded in a tamper-proof hash chain for complete transparency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
