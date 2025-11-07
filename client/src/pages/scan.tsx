import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/ui/navigation";
import QRScanner from "@/components/scanner/qr-scanner";
import { useAuth } from "@/hooks/useAuth";
import { 
  QrCode, 
  CheckCircle2, 
  Link, 
  History, 
  Camera,
  AlertCircle,
  Home,
  Wrench,
  Upload,
  Eye,
  FileText
} from "lucide-react";

export default function Scan() {
  const [, setLocation] = useLocation();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Check URL for code parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setScannedCode(code);
    }
  }, []);

  const { data: scanResult, isLoading: scanLoading, error: scanError } = useQuery({
    queryKey: ["/api/scan", scannedCode],
    enabled: !!scannedCode,
    retry: false,
  });

  const handleScan = (code: string) => {
    setScannedCode(code);
    setIsScanning(false);
  };

  const handleClaimAsset = () => {
    if (scannedCode) {
      setLocation(`/tools/assets?code=${encodeURIComponent(scannedCode)}`);
    }
  };

  const recentScans = [
    { code: "FT-PLUMB-2024-B3M7", name: "Water Heater", type: "ASSET", claimed: true },
    { code: "FT-HVAC-2024-A7K9", name: "HVAC Unit", type: "ASSET", claimed: true },
    { code: "FT-ELEC-2024-C5N2", name: "Electrical Panel", type: "ASSET", claimed: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">QR Code Scanner</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scan QR codes to access asset information, claim unclaimed assets, or view complete property histories.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Camera Scanner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isScanning ? (
                  <div className="text-center space-y-4">
                    <div className="w-full aspect-square bg-muted/20 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Click to activate camera and scan QR codes
                        </p>
                        <Button 
                          onClick={() => setIsScanning(true)}
                          data-testid="button-start-scanning"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Start Scanning
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <QRScanner onScan={handleScan} onClose={() => setIsScanning(false)} />
                )}

                {/* Manual Code Input */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Or enter code manually:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter QR code (e.g., FT-HVAC-2024-A7K9)"
                      className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            setScannedCode(value);
                          }
                        }
                      }}
                      data-testid="input-manual-code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Scans */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentScans.map((scan, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setScannedCode(scan.code)}
                      data-testid={`recent-scan-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {scan.type === 'MASTER' ? (
                            <Home className="h-4 w-4 text-primary" />
                          ) : (
                            <Wrench className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{scan.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{scan.code}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={scan.claimed ? "default" : "secondary"}>
                          {scan.claimed ? "Claimed" : "Available"}
                        </Badge>
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {scannedCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Scan Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scanLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-muted-foreground">Looking up QR code...</p>
                    </div>
                  ) : scanError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">QR Code Not Found</h3>
                      <p className="text-muted-foreground mb-4">
                        The scanned QR code "{scannedCode}" was not found in our system.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setScannedCode(null)}
                        data-testid="button-scan-another"
                      >
                        Scan Another Code
                      </Button>
                    </div>
                  ) : scanResult ? (
                    <div className="space-y-4">
                      {/* Success State */}
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle2 className="text-green-400 mr-2 h-5 w-5" />
                          <span className="font-medium text-green-400">QR Code Detected</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Code:</span>
                            <span className="font-mono">{scanResult.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <Badge variant="outline">
                              {scanResult.type === 'MASTER' ? 'Property Master' : 'Asset'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Brand:</span>
                            <span>{scanResult.brandLabel || 'Fix-Track'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={scanResult.claimed ? "default" : "secondary"}>
                              {scanResult.claimed ? 'Claimed' : 'Available'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Role-Based Action Buttons */}
                      <div className="space-y-2">
                        {!scanResult.claimed ? (
                          <>
                            {isAuthenticated ? (
                              <Button 
                                className="w-full" 
                                onClick={handleClaimAsset}
                                data-testid="button-claim-asset"
                              >
                                <Link className="mr-2 h-4 w-4" />
                                Claim & Bind {scanResult.type === 'MASTER' ? 'Property' : 'Asset'}
                              </Button>
                            ) : (
                              <Button 
                                className="w-full" 
                                onClick={() => setLocation('/pricing')}
                                data-testid="button-sign-up"
                              >
                                <Link className="mr-2 h-4 w-4" />
                                Sign Up to Claim
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {isAuthenticated && user ? (
                              <>
                                {user.role === 'CONTRACTOR' && (
                                  <>
                                    <Button 
                                      className="w-full" 
                                      onClick={() => setLocation(`/tools/assets?code=${encodeURIComponent(scannedCode)}`)}
                                      data-testid="button-log-service"
                                    >
                                      <Wrench className="mr-2 h-4 w-4" />
                                      Log Service Event
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="w-full" 
                                      onClick={() => setLocation(`/tools/documents`)}
                                      data-testid="button-upload-photo"
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload Service Photos
                                    </Button>
                                  </>
                                )}
                                {user.role === 'HOMEOWNER' && (
                                  <>
                                    <Button 
                                      className="w-full" 
                                      onClick={() => setLocation(`/tools/documents`)}
                                      data-testid="button-upload-receipt"
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload Warranty/Receipt
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="w-full" 
                                      onClick={() => setLocation(`/tools/assets?code=${encodeURIComponent(scannedCode)}`)}
                                      data-testid="button-view-history"
                                    >
                                      <History className="mr-2 h-4 w-4" />
                                      View Service History
                                    </Button>
                                  </>
                                )}
                                {(user.role === 'INSPECTOR' || user.role === 'ADMIN') && (
                                  <Button 
                                    className="w-full" 
                                    onClick={() => setLocation(`/tools/assets?code=${encodeURIComponent(scannedCode)}`)}
                                    data-testid="button-view-details"
                                  >
                                    <History className="mr-2 h-4 w-4" />
                                    View Full Details & History
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button 
                                className="w-full" 
                                onClick={() => setLocation(`/tools/assets?code=${encodeURIComponent(scannedCode)}`)}
                                data-testid="button-view-public"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Public Information
                              </Button>
                            )}
                          </>
                        )}
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setScannedCode(null)}
                          data-testid="button-scan-another-code"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          Scan Another Code
                        </Button>
                      </div>

                      {/* Information */}
                      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                        {scanResult.type === 'MASTER' ? (
                          <p>This is a master property code that provides access to the complete property history, including all assets, documents, and maintenance records.</p>
                        ) : (
                          <p>This is an asset identifier that tracks the complete lifecycle of a specific item including installation, service, warranties, and transfers.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {!scannedCode && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                    <p className="text-muted-foreground">
                      Scan a QR code using the camera or enter a code manually to get started.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
