import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  Sparkles, Shield, Users, Building2, Zap, Check, QrCode, 
  Camera, Bell, Upload, TrendingUp, Phone, Globe
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3" data-testid="logo-fixtrack">
            <img 
              src="/logo.png" 
              alt="FixTrack Logo" 
              className="h-10 w-10 object-contain"
            />
            <span className="font-bold text-xl">FixTrack Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/pricing")}
              data-testid="button-nav-pricing"
            >
              Pricing
            </Button>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-nav-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 text-lg px-4 py-2" data-testid="badge-hero">
          <Sparkles className="h-4 w-4 mr-2" />
          The Future of Asset Tracking
        </Badge>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent" data-testid="heading-hero">
          Every Install.<br />Every Service.<br />Every Asset.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto" data-testid="text-hero-subtitle">
          Scan a QR code. See the installer, installation date, warranty info, and complete history.
          <span className="block mt-4 text-primary font-semibold" data-testid="text-ai-reminder-badge">
            AI Predictive Maintenance Reminders — Free Forever
          </span>
        </p>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm" data-testid="stats-bar">
          <div className="flex items-center gap-2" data-testid="stat-assets">
            <span className="font-semibold">10K+ Assets Tracked</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2" data-testid="stat-companies">
            <span className="font-semibold">500+ Companies</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2" data-testid="stat-uptime">
            <span className="font-semibold">99.9% Uptime</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button 
            size="lg"
            className="text-base font-semibold px-8 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            onClick={() => setLocation("/pricing")}
            data-testid="button-hero-view-pricing"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            View Pricing
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="text-base font-semibold px-8 py-3 rounded-lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-hero-try-free"
          >
            Try It Free
          </Button>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap justify-center gap-8 items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Bank-Level Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Instant Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>

      {/* Who It's For */}
      <div className="bg-muted/30 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Everyone</h2>
            <p className="text-xl text-muted-foreground">Homeowners, contractors, and fleet managers all win</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Homeowners */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Homeowners</h3>
                <ul className="space-y-3">
                  {[
                    "Scan appliance QR codes",
                    "Upload warranty photos",
                    "AI extracts dates automatically",
                    "Get maintenance reminders",
                    "Access everything instantly",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold">$99</div>
                  <div className="text-sm text-muted-foreground">+ $10/year</div>
                </div>
              </CardContent>
            </Card>

            {/* Contractors */}
            <Card className="border-2 border-primary shadow-2xl scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1">
                  Most Popular
                </Badge>
              </div>
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Contractors</h3>
                <ul className="space-y-3">
                  {[
                    "Your logo on every sticker",
                    "Permanent marketing on installs",
                    "Customers scan & call you",
                    "Track all your jobs",
                    "Get repeat business",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold">$19.99/mo</div>
                  <div className="text-sm text-muted-foreground">or $29.99 for Pro</div>
                </div>
              </CardContent>
            </Card>

            {/* Fleet */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Fleet Managers</h3>
                <ul className="space-y-3">
                  {[
                    "Track unlimited assets",
                    "Maintenance schedules",
                    "Role-based dashboards",
                    "Tamper detection",
                    "Usage-based pricing",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold">$3/asset</div>
                  <div className="text-sm text-muted-foreground">$2/asset for 1000+</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple as 1-2-3</h2>
            <p className="text-xl text-muted-foreground">Get started in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Subscribe & Receive</h3>
              <p className="text-muted-foreground">Choose your plan. We ship pre-printed FixTrack stickers to you.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Scan & Upload</h3>
              <p className="text-muted-foreground">Scan the code, log installation details, upload warranty photos.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Access Forever</h3>
              <p className="text-muted-foreground">Open the app anytime. See all your assets, warranties, and reminders instantly.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 py-24">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Tracking?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of homeowners, contractors, and fleet managers using FixTrack Pro
          </p>
          <Button 
            size="lg"
            className="text-lg px-12 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            onClick={() => setLocation("/pricing")}
            data-testid="button-cta-view-pricing"
          >
            View Pricing
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Questions? Email trackfixes@gmail.com
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 FixTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
