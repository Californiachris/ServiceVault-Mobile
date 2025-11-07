import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Package, Clock, Mail } from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  quotaTotal: number;
  quotaUsed: number;
  status: string;
  createdAt: string;
  fulfilled?: boolean;
}

export default function AdminFulfillment() {
  const { toast } = useToast();
  
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions/pending'],
  });

  const markFulfilledMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return apiRequest("POST", `/api/admin/subscriptions/${subscriptionId}/fulfill`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions/pending'] });
      toast({
        title: "Subscription Fulfilled",
        description: "The subscription has been marked as fulfilled and the customer has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark subscription as fulfilled",
        variant: "destructive",
      });
    },
  });

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      'contractor_50': 'Contractor 50 ($19.99)',
      'contractor_100': 'Contractor 100 ($29)',
      'home_lifetime': 'Home Lifetime ($100)',
      'home_annual': 'Home Annual ($15/yr)',
    };
    return planNames[plan] || plan;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-fulfillment">Admin Fulfillment Console</h1>
        <p className="text-muted-foreground">Manage subscription orders and sticker shipments</p>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-pending">No pending subscriptions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id} data-testid={`card-subscription-${sub.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {getPlanName(sub.plan)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Order ID: {sub.id.slice(0, 8)}... • {new Date(sub.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                    {sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Stickers to Ship</p>
                    <p className="text-2xl font-bold" data-testid={`text-quota-${sub.id}`}>{sub.quotaTotal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">User ID</p>
                    <p className="text-sm font-mono" data-testid={`text-userid-${sub.id}`}>{sub.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan Type</p>
                    <p className="text-sm font-medium">{sub.plan.includes('contractor') ? 'Contractor' : 'Homeowner'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => markFulfilledMutation.mutate(sub.id)}
                    disabled={markFulfilledMutation.isPending}
                    data-testid={`button-fulfill-${sub.id}`}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Fulfilled
                  </Button>
                  <Button variant="outline" data-testid={`button-print-label-${sub.id}`}>
                    <Package className="mr-2 h-4 w-4" />
                    Print Shipping Label
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Next Steps
                  </p>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Print {sub.quotaTotal} pre-coded QR stickers</li>
                    <li>Package stickers with branding materials</li>
                    <li>Ship via USPS/UPS with tracking</li>
                    <li>Click "Mark as Fulfilled" to notify customer</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
