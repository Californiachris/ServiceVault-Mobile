import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { 
  Sparkles, Shield, Users, Building2, Zap, Check, QrCode, 
  Camera, Bell, Upload, TrendingUp, Phone, Globe, Lock, Server, Link2,
  Wrench, Home, Truck
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";
import vaultIcon from "@assets/file_000000009c0871fd92f0332b41379de5~3_1763079245926.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "ServiceVault - Premium Asset Tracking & Maintenance Platform";
    
    const updateMetaTags = () => {
      const description = "Track every install, service, and asset with QR codes. AI-powered warranty parsing and maintenance reminders. Trusted by contractors, fleet managers, and property managers.";
      const url = window.location.origin;
      
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
      
      const ogTags = [
        { property: 'og:title', content: 'ServiceVault - Premium Asset Tracking Platform' },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: url },
        { property: 'og:site_name', content: 'ServiceVault' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'ServiceVault - Premium Asset Tracking Platform' },
        { name: 'twitter:description', content: description },
      ];
      
      ogTags.forEach(tag => {
        const attr = tag.property ? 'property' : 'name';
        const attrValue = tag.property || tag.name;
        let metaTag = document.querySelector(`meta[${attr}="${attrValue}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute(attr, attrValue);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', tag.content);
      });
    };
    
    updateMetaTags();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3" data-testid="logo-servicevault">
            <img 
              src={serviceVaultLogo} 
              alt="ServiceVault Logo" 
              className="h-14 w-14 object-contain"
            />
            <span className="text-2xl font-extrabold tracking-tight whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 bg-clip-text text-transparent">
              ServiceVault
            </span>
          </div>
          <div>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              data-testid="button-nav-login"
            >
              Login
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
          Know everything about every asset — and stay ahead of every service need.
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto" data-testid="text-hero-subtitle">
          ServiceVault keeps a permanent, sharable history for anything you own or manage — and uses AI to predict maintenance, warranties, and service reminders before problems happen.
        </p>
        
        <p className="text-sm font-bold tracking-wide text-primary/80 mb-8" data-testid="text-hero-tagline">
          Every install. Every service. Every asset.
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

        {/* Trust Signals - Now Clickable with Orange Styling */}
        <div className="flex flex-wrap justify-center gap-8 items-center text-sm mb-12">
          <button 
            onClick={() => setSecurityDialogOpen(true)}
            className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-all cursor-pointer hover:scale-105 underline decoration-orange-500 hover:decoration-orange-600"
            data-testid="button-info-security"
          >
            <Shield className="h-4 w-4" />
            <span className="font-medium">Bank-Level Security</span>
          </button>
          <button 
            onClick={() => setSetupDialogOpen(true)}
            className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-all cursor-pointer hover:scale-105 underline decoration-orange-500 hover:decoration-orange-600"
            data-testid="button-info-setup"
          >
            <Zap className="h-4 w-4" />
            <span className="font-medium">Instant Setup</span>
          </button>
          <button 
            onClick={() => setSupportDialogOpen(true)}
            className="flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-all cursor-pointer hover:scale-105 underline decoration-orange-500 hover:decoration-orange-600"
            data-testid="button-info-support"
          >
            <Phone className="h-4 w-4" />
            <span className="font-medium">24/7 Support</span>
          </button>
        </div>

        {/* Split Logo Design - Vault Icon (Top) */}
        <div className="flex justify-center mb-10">
          <img 
            src={vaultIcon} 
            alt="ServiceVault Vault Icon" 
            className="h-40 w-auto object-contain drop-shadow-2xl"
            data-testid="logo-vault-icon"
          />
        </div>

        {/* Split Logo Design - ServiceVault Text + Tagline (Bottom, Stretched) */}
        <div className="flex flex-col items-center mb-16">
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black text-center mb-2 bg-gradient-to-r from-cyan-400 to-yellow-400 bg-clip-text text-transparent"
            data-testid="brand-name"
          >
            ServiceVault™
          </h1>
          <p 
            className="text-lg md:text-2xl lg:text-3xl font-semibold text-center tracking-widest uppercase text-muted-foreground"
            data-testid="brand-tagline"
          >
            SCAN • VERIFY • PROTECT
          </p>
        </div>
      </div>

      {/* Premium Role Cards - Choose Your Path */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-choose-path">
            Choose Your Path
          </h2>
          <p className="text-xl text-muted-foreground">
            Select your role to see what ServiceVault can do for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Contractor Card */}
          <Card 
            className="bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
            onClick={() => setLocation("/solutions/contractors")}
            data-testid="card-role-contractor"
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold">For Contractors</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Turn every install into repeat business. Your logo on every asset + automatic service reminders that bring customers back to YOU every time.
                </p>
                <Button 
                  className="w-full sm:w-auto"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/solutions/contractors");
                  }}
                  data-testid="button-contractor-learn-more"
                >
                  Learn more
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Homeowner Card */}
          <Card 
            className="bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
            onClick={() => setLocation("/solutions/homeowners")}
            data-testid="card-role-homeowner"
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold">For Homeowners</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Know everything about every system in your home — model numbers, installations, warranties and who to call when something needs service.
                </p>
                <Button 
                  className="w-full sm:w-auto"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/solutions/homeowners");
                  }}
                  data-testid="button-homeowner-learn-more"
                >
                  Learn more
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fleet Management Card */}
          <Card 
            className="bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
            onClick={() => setLocation("/solutions/fleet")}
            data-testid="card-role-fleet"
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold">For Fleet Management</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every vehicle and unit logged automatically. Reduce breakdowns, track service history, and keep maintenance running on time.
                </p>
                <Button 
                  className="w-full sm:w-auto"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/solutions/fleet");
                  }}
                  data-testid="button-fleet-learn-more"
                >
                  Learn more
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Property Manager Card */}
          <Card 
            className="bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
            onClick={() => setLocation("/solutions/property-managers")}
            data-testid="card-role-property-manager"
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold">For Property Managers</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every unit. Every asset. Every service call. Full history and contractor details in one place — even when tenants change.
                </p>
                <Button 
                  className="w-full sm:w-auto"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/solutions/property-managers");
                  }}
                  data-testid="button-property-manager-learn-more"
                >
                  Learn more
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            PATENT PENDING
          </p>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ServiceVault. All rights reserved.</p>
        </div>
      </div>

      {/* Security Dialog */}
      <Dialog open={securityDialogOpen} onOpenChange={setSecurityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-security">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-primary" />
              Bank-Level Security
            </DialogTitle>
            <DialogDescription>
              Your data is protected with enterprise-grade security measures
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Secure Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Industry-standard OpenID Connect (OIDC) authentication with Google, GitHub, or email. 
                  Signed, HTTP-only session cookies stored in PostgreSQL automatically expire after 7 days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Encrypted Database Storage</h4>
                <p className="text-sm text-muted-foreground">
                  Serverless PostgreSQL database (Neon) with WebSocket connection pooling. 
                  All data encrypted at rest and in transit using industry-standard TLS.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Tamper-Proof Event Logging</h4>
                <p className="text-sm text-muted-foreground">
                  Every asset service event is cryptographically linked using SHA-256 hash chains.
                  Once recorded, event history cannot be modified or deleted without detection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Access Control & Abuse Prevention</h4>
                <p className="text-sm text-muted-foreground">
                  Role-based access control (RBAC), object-level permissions for file storage, 
                  and rate limiting on AI endpoints (10 requests/hour per user) prevent abuse.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-cyan-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Input Validation</h4>
                <p className="text-sm text-muted-foreground">
                  All user inputs are validated using Zod schemas. Image uploads are limited to 10MB 
                  with base64 format verification to prevent malicious files.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-setup">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Zap className="h-6 w-6 text-primary" />
              Instant Setup
            </DialogTitle>
            <DialogDescription>
              Get started in 3 simple steps—no technical knowledge required
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Create Your Account</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Click "Get Started" and sign in securely. No password required—
                  authentication happens automatically with your Google, GitHub, or email account.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setLocation("/pricing")}
                  data-testid="button-dialog-setup-login"
                >
                  Get Started
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Choose Your Plan</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the plan that fits your needs:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><strong>Homeowners:</strong> $99 one-time + $10/year</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><strong>Contractors:</strong> $19.99-$29.99/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span><strong>Fleet:</strong> $2-$3/asset/year</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Receive & Start Scanning</h4>
                <p className="text-sm text-muted-foreground">
                  We ship pre-printed ServiceVault stickers to you (no printing required). 
                  Apply them to your assets and scan with your phone to start tracking instantly.
                </p>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-primary mb-2">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Setup takes less than 5 minutes
              </p>
              <p className="text-xs text-muted-foreground">
                No credit card required for browsing. Only charged when you subscribe.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-support">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Phone className="h-6 w-6 text-primary" />
              24/7 Support
            </DialogTitle>
            <DialogDescription>
              We're here to help whenever you need us
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Call Us Anytime</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Speak with a real person who understands ServiceVault
                </p>
                <a 
                  href="tel:+17602695750" 
                  className="text-lg font-bold text-primary hover:underline"
                  data-testid="link-support-phone"
                >
                  (760) 269-5750
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  Available 24/7 for urgent issues
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Email Support</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Prefer email? We typically respond within 2 hours
                </p>
                <a 
                  href="mailto:trackfixes@gmail.com" 
                  className="text-primary hover:underline"
                  data-testid="link-support-email"
                >
                  trackfixes@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Support Hours</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Emergency Support:</strong> 24/7 by phone</p>
                  <p><strong>General Inquiries:</strong> Monday-Friday, 8AM-8PM EST</p>
                  <p><strong>Email:</strong> Checked and responded to 24/7</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-primary mb-2">
                <Check className="h-4 w-4 inline mr-1" />
                Average Response Time: Under 2 Hours
              </p>
              <p className="text-xs text-muted-foreground">
                We pride ourselves on fast, helpful support. Real people, real solutions.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
