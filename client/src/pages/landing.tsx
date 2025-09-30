import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/ui/navigation";
import StatsCard from "@/components/ui/stats-card";
import ToolCard from "@/components/ui/tool-card";
import PricingCard from "@/components/ui/pricing-card";
import { 
  QrCode, 
  Rocket, 
  Play, 
  History, 
  FileText, 
  Bell, 
  Tag, 
  Smartphone,
  Camera,
  Link,
  Wrench,
  Upload,
  BarChart3,
  CheckCircle2,
  CalendarPlus,
  FileCheck,
  Twitter,
  Linkedin,
  Github,
  Handshake
} from "lucide-react";

export default function Landing() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { label: "Active Assets", value: "2,847", change: "+12%", icon: Wrench },
    { label: "QR Codes Generated", value: "15,234", change: "+8%", icon: QrCode },
    { label: "Properties Managed", value: "342", change: "+5%", icon: FileText },
    { label: "Active Subscriptions", value: "89", change: "+15%", icon: BarChart3 },
  ];

  const tools = [
    {
      title: "QR Code Generator",
      description: "Batch generate branded QR/NFC codes for assets and properties. Print stickers with your company branding.",
      icon: QrCode,
      status: "Active",
      statusColor: "green",
    },
    {
      title: "Asset Management",
      description: "Create master property codes and bind assets. Manage installation records and contractor assignments.",
      icon: Wrench,
      status: "Core",
      statusColor: "blue",
    },
    {
      title: "Document Storage",
      description: "Upload and organize warranties, receipts, manuals, and inspection reports for easy access.",
      icon: Upload,
      status: "Essential",
      statusColor: "purple",
    },
    {
      title: "Health Reports",
      description: "Generate professional Home Health Tag™ PDFs with complete property and asset timelines.",
      icon: BarChart3,
      status: "Premium",
      statusColor: "orange",
    },
    {
      title: "Inspection Logs",
      description: "Record inspection results with digital checklists and inspector signatures for compliance tracking.",
      icon: CheckCircle2,
      status: "Professional",
      statusColor: "cyan",
    },
    {
      title: "Smart Reminders",
      description: "Automatic notifications for warranty expirations, maintenance schedules, and service intervals.",
      icon: Bell,
      status: "Automated",
      statusColor: "red",
    },
  ];

  const features = [
    {
      title: "QR Code Generation",
      description: "Batch generate branded QR codes with your company logo and colors. Print professional stickers for any asset.",
      icon: QrCode,
    },
    {
      title: "Complete Timeline",
      description: "Every installation, service, inspection, and transfer is recorded in a chronological timeline with full audit trail.",
      icon: History,
    },
    {
      title: "Document Storage",
      description: "Secure cloud storage for warranties, receipts, manuals, and inspection reports with instant access.",
      icon: FileText,
    },
    {
      title: "Smart Reminders",
      description: "Automatic notifications for warranty expirations, maintenance schedules, and inspection due dates.",
      icon: Bell,
    },
    {
      title: "Health Certificates",
      description: "Generate professional Home Health Tag™ PDFs with complete property and asset history for inspections.",
      icon: Tag,
    },
    {
      title: "Mobile Optimized",
      description: "Fast, responsive interface designed for on-site use by contractors, inspectors, and property managers.",
      icon: Smartphone,
    },
  ];

  const scanFeatures = [
    {
      title: "Instant Recognition",
      description: "Advanced QR code detection with automatic focus and lighting adjustment for fast scanning in any environment.",
      icon: Camera,
    },
    {
      title: "One-Touch Claiming",
      description: "Streamlined claim flow that lets users bind assets to properties with minimal taps and automatic data population.",
      icon: Link,
    },
    {
      title: "Instant History Access",
      description: "View complete asset timeline, warranties, service records, and documents immediately after scanning.",
      icon: History,
    },
    {
      title: "Mobile-First Design",
      description: "Optimized for on-site use by contractors, inspectors, and homeowners with touch-friendly interfaces.",
      icon: Smartphone,
    },
  ];

  const pricingPlans = [
    {
      name: "Contractor Basic",
      price: 19,
      period: "month",
      description: "Perfect for small contractors",
      features: [
        "50 QR codes per month",
        "Custom branding",
        "Basic analytics",
        "Email support",
      ],
      isPopular: false,
    },
    {
      name: "Contractor Pro",
      price: 29,
      period: "month",
      description: "For growing businesses",
      features: [
        "100 QR codes per month",
        "Advanced branding",
        "Advanced analytics",
        "Priority support",
        "API access",
      ],
      isPopular: true,
    },
    {
      name: "Homeowner Lifetime",
      price: 100,
      period: "lifetime",
      description: "One-time purchase",
      features: [
        "1 Master house code",
        "Unlimited assets",
        "Document storage",
        "Health certificates",
      ],
      isPopular: false,
    },
    {
      name: "Homeowner Annual",
      price: 15,
      period: "year",
      description: "Ongoing maintenance",
      features: [
        "Cloud hosting",
        "Automatic backups",
        "Smart reminders",
        "Support updates",
      ],
      isPopular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section 
          className={`text-center py-20 hero-gradient rounded-2xl mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/10 text-primary">
              <QrCode className="mr-2 h-4 w-4" />
              Carfax for Everything
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Property Asset History Made Simple
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Every appliance, installation, and service gets a permanent digital history. 
              Scan QR codes to instantly access warranties, maintenance records, and complete asset timelines.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="px-8 py-4 font-semibold transform hover:scale-105 transition-all"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-start-trial"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 font-semibold"
                data-testid="button-watch-demo"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <QrCode className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">QR Code Tracking</h3>
                <p className="text-sm text-muted-foreground">Branded stickers for every asset</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Digital Documents</h3>
                <p className="text-sm text-muted-foreground">Warranties, receipts, manuals</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Health Reports</h3>
                <p className="text-sm text-muted-foreground">Professional certificates</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section id="dashboard" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Professional Dashboard</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Manage all your properties, assets, and workflows from one central location
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <ToolCard key={index} {...tool} />
            ))}
          </div>
        </section>

        {/* Mobile Scan Interface */}
        <section id="scan" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Mobile-Optimized Scanning</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Fast, intuitive QR code scanning with instant asset recognition and claim interface
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mobile Mockup */}
            <div className="mx-auto">
              <div className="relative">
                <div className="w-80 h-[640px] bg-gray-900 rounded-[3rem] p-2 mx-auto">
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-2 text-xs text-muted-foreground">
                      <span>9:41</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-2 bg-current rounded-sm opacity-50"></div>
                        <div className="w-4 h-2 bg-current rounded-sm opacity-75"></div>
                        <div className="w-6 h-2 bg-current rounded-sm"></div>
                      </div>
                    </div>

                    <div className="px-4 py-2">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold">Scan Asset QR Code</h3>
                        <p className="text-sm text-muted-foreground">Point camera at QR sticker</p>
                      </div>

                      <div className="scan-camera aspect-square rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-4 border-2 border-primary rounded-2xl"></div>
                        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary rounded-tl-lg"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary rounded-tr-lg"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary rounded-br-lg"></div>
                        
                        <div className="qr-code-preview w-24 h-24">
                          <div className="w-full h-full bg-black opacity-80 grid grid-cols-8 gap-px">
                            {Array.from({ length: 64 }).map((_, i) => (
                              <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>
                            ))}
                          </div>
                        </div>

                        <div className="absolute inset-0 bg-primary/20 opacity-50 animate-scan-line"></div>
                      </div>

                      <Card className="bg-green-500/10 border-green-500/20 p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle2 className="text-green-400 mr-2 h-4 w-4" />
                          <span className="text-sm font-medium text-green-400">QR Code Detected</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Code: FT-HVAC-2024-A7K9</p>
                        
                        <div className="space-y-2">
                          <Button className="w-full text-sm">
                            <Link className="mr-2 h-4 w-4" />
                            Claim & Bind Asset
                          </Button>
                          <Button variant="outline" className="w-full text-sm">
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </Button>
                        </div>
                      </Card>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Recent Scans</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                            <div>
                              <div className="text-sm font-medium">Water Heater</div>
                              <div className="text-xs text-muted-foreground">FT-PLUMB-2024-B3M7</div>
                            </div>
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                            <div>
                              <div className="text-sm font-medium">HVAC Unit</div>
                              <div className="text-xs text-muted-foreground">FT-HVAC-2024-A7K9</div>
                            </div>
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-8">
              {scanFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>

          <Card className="cta-gradient border-primary/20 p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Enterprise Solutions</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Need custom integrations, white-label solutions, or volume pricing? 
              We work with property management companies, large contractors, and government agencies.
            </p>
            <Button size="lg" data-testid="button-contact-sales">
              <Handshake className="mr-2 h-5 w-5" />
              Contact Sales
            </Button>
          </Card>
        </section>

        {/* Features Overview */}
        <section id="features" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive asset tracking and management tools for contractors and homeowners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="text-primary h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20 cta-gradient rounded-2xl">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Asset Management?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of contractors and homeowners who trust Fix-Track to maintain their property histories.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                size="lg" 
                className="px-8 py-4 font-semibold transform hover:scale-105 transition-all"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-start-trial-cta"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Your Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 font-semibold"
                data-testid="button-schedule-demo"
              >
                <CalendarPlus className="mr-2 h-5 w-5" />
                Schedule Demo
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
              <div>
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Assets Tracked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="brand-logo">FT</div>
                <span className="text-xl font-bold text-primary">Fix-Track</span>
              </div>
              <p className="text-muted-foreground text-sm">
                The professional asset tracking platform for contractors and homeowners.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Integration</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Fix-Track. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
