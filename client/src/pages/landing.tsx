import { useState } from "react";
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
  Camera, Bell, Upload, TrendingUp, Phone, Globe, Lock, Server, Link2
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

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
              onClick={() => setLocation("/pricing")}
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
            className="text-base font-semibold px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-yellow-500 hover:from-cyan-600 hover:to-yellow-600"
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
            onClick={() => setLocation("/pricing")}
            data-testid="button-hero-try-free"
          >
            Try It Free
          </Button>
        </div>

        {/* Trust Signals - Now Clickable with Orange Styling */}
        <div className="flex flex-wrap justify-center gap-8 items-center text-sm">
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
      </div>

      {/* Who It's For */}
      <div className="bg-muted/30 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Everyone</h2>
            <p className="text-xl text-muted-foreground">Homeowners, contractors, fleet managers, and property managers</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Homeowners */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Homeowners</h3>
                <ul className="space-y-3">
                  {[
                    "Log every home repair, upgrade, and warranty in one place",
                    "Scan your Home Master QR to save fixes instantly",
                    "Scan in any warranty, for appliances, furniture, jewelry etc with ease.",
                    "AI detects warranty, recall, and service dates and automatically sends reminders",
                    "Get lifetime maintenance reminders for all appliances & systems",
                    "Show full home history to inspectors, insurance, and future buyers with one scan inside electrical meter box",
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
                    "Custom branded QR stickers for every install",
                    "Customers scan to view install details & contact you instantly",
                    "Log all jobs, warranties, photos, and service notes",
                    "AI sends customers maintenance & warranty reminders with YOUR branding",
                    "Create lifetime repeat business automatically",
                    "Build trust with verified digital records for homeowners, inspectors & realtors",
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
                    "Track unlimited fleet assets using durable scannable IDs for each vehicle, machine, and tool",
                    "AI-powered maintenance forecasting to eliminate breakdowns and prevent costly downtime",
                    "Fully automatic logging of repairs, inspections, technician notes, and service events",
                    "Smart dashboards with role-based access for managers, drivers, and mechanics",
                    "Usage tracking (hours, mileage, runtime, wear cycles) to plan replacements and prevent failures",
                    "Compliance alerts when service schedules or inspections are missed",
                    "Cost analytics that show high-expense assets and predict end-of-life cycles",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Starting at</div>
                  <div className="text-3xl font-bold">$4.99/asset/mo</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Up to 250: $4.99/asset</div>
                    <div>Up to 1,000: $3.49/asset</div>
                    <div>1,000+: $1.99–$2.49/asset</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Managers */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Property Managers</h3>
                <ul className="space-y-3">
                  {[
                    "Manage multiple properties from a single dashboard",
                    "Worker check-in/out with GPS verification",
                    "Task assignment with photo/video completion proof",
                    "Tenant issue reporting via public QR codes",
                    "Complete activity timeline for all properties",
                    "Track worker performance and visit history",
                    "Generate property reports and analytics",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 text-center space-y-2">
                  <div className="text-sm text-muted-foreground">Starting at</div>
                  <div className="text-3xl font-bold">$4.99/property/mo</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>100+: $3.49/property</div>
                    <div>500+: $2.49/property</div>
                    <div>1,000+: $1.99/property</div>
                  </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            PATENT PENDING
          </p>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} FixTrack Pro. All rights reserved.</p>
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
                  We ship pre-printed FixTrack stickers to you (no printing required). 
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
                  Speak with a real person who understands FixTrack Pro
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
