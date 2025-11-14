import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, MapPin } from "lucide-react";

export default function CheckInLanding() {
  const [, setLocation] = useLocation();
  const [qrCode, setQrCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      setLocation(`/worker/check-in/${encodeURIComponent(qrCode.trim())}`);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Worker Check-In</CardTitle>
          <CardDescription>
            Scan the property QR code or enter the code manually to check in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-code">Property QR Code</Label>
              <Input
                id="qr-code"
                type="text"
                placeholder="Enter QR code"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                data-testid="input-qr-code"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={!qrCode.trim()}
              data-testid="button-continue-check-in"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Continue to Check In
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Need help? Contact your property manager</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
