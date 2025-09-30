import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/ui/navigation";
import PricingCard from "@/components/ui/pricing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Check, 
  Handshake, 
  Star,
  Users,
  Building,
  Shield,
  Zap,
  Headphones,
  TrendingUp
} from "lucide-react";

type PlanType = 'contractor_50' | 'contractor_100' | 'home_lifetime' | 'home_annual';

export default function Pricing() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async (plan: PlanType) => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", { plan });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Checkout Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Sign In",
          description: "You need to be signed in to purchase a plan",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/customer-portal");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Portal Access Failed",
        description: error.message || "Failed to access customer portal",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    if (isAuthenticated) {
      checkoutMutation.mutate(plan);
    } else {
      toast({
        title: "Sign In Required",
        description: "Please sign in to purchase a plan",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    }
  };

  const pricingPlans = [
    {
      id: 'contractor_50' as PlanType,
      name: "Contractor Basic",
      price: 19,
      period: "month" as const,
      description: "Perfect for small contractors",
      features: [
        "50 QR codes per month",
        "Custom company branding",
        "Basic asset tracking",
        "Document storage",
        "Email support",
        "Mobile scanning app"
      ],
      isPopular: false,
      badge: "STARTER",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      id: 'contractor_100' as PlanType,
      name: "Contractor Pro",
      price: 29,
      period: "month" as const,
      description: "For growing businesses",
      features: [
        "100 QR codes per month",
        "Advanced company branding",
        "Complete asset management",
        "Unlimited document storage",
        "Priority support",
        "API access",
        "Team collaboration",
        "Advanced analytics"
      ],
      isPopular: true,
      badge: "MOST POPULAR",
      badgeColor: "bg-primary/20 text-primary border-primary/30",
    },
    {
      id: 'home_lifetime' as PlanType,
      name: "Homeowner Lifetime",
      price: 100,
      period: "lifetime" as const,
      description: "One-time purchase",
      features: [
        "1 Master house code",
        "Unlimited asset tracking",
        "Document storage",
        "Health certificates",
        "Transfer on sale",
        "Lifetime access"
      ],
      isPopular: false,
      badge: "BEST VALUE",
      badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
    },
    {
      id: 'home_annual' as PlanType,
      name: "Homeowner Annual",
      price: 15,
      period: "year" as const,
      description: "Ongoing maintenance",
      features: [
        "Cloud hosting",
        "Automatic backups",
        "Smart reminders",
        "Support updates",
        "Cancel anytime"
      ],
      isPopular: false,
      badge: "FLEXIBLE",
      badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    },
  ];

  const features = [
    {
      title: "Enterprise-Grade Security",
      description: "Bank-level encryption and secure cloud storage for all your documents and data.",
      icon: Shield,
    },
    {
      title: "Lightning Fast Performance",
      description: "Instant QR code scanning and real-time data synchronization across all devices.",
      icon: Zap,
    },
    {
      title: "24/7 Customer Support",
      description: "Expert support team available around the clock to help you succeed.",
      icon: Headphones,
    },
    {
      title: "Proven Success Rate",
      description: "Join thousands of contractors and homeowners who trust Fix-Track.",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <section className="text-center py-12 mb-12">
          <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/10 text-primary">
            <Star className="mr-2 h-4 w-4" />
            Trusted by 5,000+ Properties
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Start free, scale as you grow. 
            No hidden fees, cancel anytime.
          </p>

          {isAuthenticated && (
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                Manage Subscription
              </Button>
            </div>
          )}
        </section>

        {/* Pricing Cards */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div key={plan.id} className="relative">
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className={plan.badgeColor}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <PricingCard
                  name={plan.name}
                  price={plan.price}
                  period={plan.period}
                  description={plan.description}
                  features={plan.features}
                  isPopular={plan.isPopular}
                  onSelect={() => handlePlanSelect(plan.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="mb-16">
          <Card className="cta-gradient border-primary/20 p-8 text-center">
            <CardContent className="pt-6">
              <Building className="h-16 w-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">Enterprise Solutions</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Need custom integrations, white-label solutions, or volume pricing? 
                We work with property management companies, large contractors, and government agencies.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Team Management</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>SSO Integration</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Custom Features</span>
                </div>
              </div>
              
              <Button size="lg" data-testid="button-contact-enterprise">
                <Handshake className="mr-2 h-5 w-5" />
                Contact Sales Team
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Fix-Track?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Industry-leading features and reliability you can count on
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
                    <p className="text-sm text-muted-foreground">
                      Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately 
                      and you'll only pay the prorated difference.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">What happens to my data if I cancel?</h4>
                    <p className="text-sm text-muted-foreground">
                      Your data remains accessible for 30 days after cancellation. You can export all your 
                      information or reactivate your account anytime during this period.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Do you offer volume discounts?</h4>
                    <p className="text-sm text-muted-foreground">
                      Yes! Contact our sales team for custom pricing on large deployments or multiple 
                      properties. We offer significant discounts for volume customers.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Is there a free trial?</h4>
                    <p className="text-sm text-muted-foreground">
                      All contractor plans include a 14-day free trial with full access to all features. 
                      No credit card required to start.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">How secure is my data?</h4>
                    <p className="text-sm text-muted-foreground">
                      We use bank-level encryption and store all data in secure, SOC 2 compliant data centers. 
                      Your information is protected with the highest security standards.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Can I use my own branding?</h4>
                    <p className="text-sm text-muted-foreground">
                      Absolutely! Both contractor plans support custom branding on QR codes, reports, 
                      and client-facing materials. Upload your logo and customize colors.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="text-center py-16 cta-gradient rounded-2xl">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of professionals who trust Fix-Track for their asset management needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => isAuthenticated ? handlePlanSelect('contractor_100') : (window.location.href = "/api/login")}
                data-testid="button-start-free-trial"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = "/dashboard"}
                data-testid="button-view-demo"
              >
                View Live Demo
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
