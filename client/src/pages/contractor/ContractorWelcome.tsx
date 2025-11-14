import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Shield, 
  Sparkles, 
  Users, 
  QrCode,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import serviceVaultLogo from "@assets/servicevault-logo.png";

export default function ContractorWelcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={serviceVaultLogo} 
              alt="ServiceVault Logo" 
              className="h-12 w-12 object-contain"
            />
            <span className="text-xl font-bold tracking-tight">ServiceVault</span>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Users className="h-3 w-3 mr-1" />
            Contractor
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-600 border-orange-500/20 text-base px-4 py-2" data-testid="badge-contractor-hero">
            <Sparkles className="h-4 w-4 mr-2" />
            Welcome to ServiceVault
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight" data-testid="heading-contractor-welcome">
            Turn every install into a<br />lifetime customer.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-contractor-subtitle">
            Place a ServiceVault QR on each job. One scan shows the customer AND you the full asset history and routes them back to your company.
          </p>

          {/* Benefits with Icons */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-branding">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Your logo + contact on every installed asset</p>
                <p className="text-sm text-muted-foreground">Build your brand with every job</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-reminders">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Automatic warranty & service reminders</p>
                <p className="text-sm text-muted-foreground">AI keeps customers coming back</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg" data-testid="card-benefit-history">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-base mb-2">Proof of work and asset history in one scan</p>
                <p className="text-sm text-muted-foreground">Complete digital paper trail</p>
              </CardContent>
            </Card>
          </div>

          {/* Primary CTA */}
          <Button 
            size="lg"
            className="w-full md:w-auto text-lg px-8 py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-xl"
            onClick={() => setLocation("/contractor/plans")}
            data-testid="button-generate-sticker-pack"
          >
            Generate Your Sticker Pack
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            <button 
              className="underline hover:text-primary transition-colors"
              onClick={() => {
                const howItWorks = document.getElementById('how-it-works');
                howItWorks?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-how-it-works-scroll"
            >
              See how it works (30-second overview)
            </button>
          </p>
        </div>

        {/* How It Works - 3 Steps */}
        <div id="how-it-works" className="mt-24 scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple as 1-2-3</h2>
            <p className="text-lg text-muted-foreground">Start building lifetime customers today</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center" data-testid="step-1">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">We ship you contractor-branded QR stickers</h3>
              <p className="text-muted-foreground">Choose your plan and receive your custom stickers with your company logo</p>
            </div>

            <div className="text-center" data-testid="step-2">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">You stick one on each installed asset</h3>
              <p className="text-muted-foreground">Place a sticker on water heaters, HVAC units, appliances—anything you install</p>
            </div>

            <div className="text-center" data-testid="step-3">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Customers scan → see details → call you directly</h3>
              <p className="text-muted-foreground">Every scan routes back to your company for future service and repairs</p>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Button 
              size="lg"
              variant="outline"
              className="text-base px-6 py-5 border-2"
              onClick={() => setLocation("/contractor/plans")}
              data-testid="button-choose-plan"
            >
              Choose Your Plan & Get Stickers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
