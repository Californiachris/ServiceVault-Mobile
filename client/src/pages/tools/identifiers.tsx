import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Printer, Copy, RefreshCw } from "lucide-react";

export default function IdentifiersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [count, setCount] = useState(10);
  const [type, setType] = useState<'ASSET' | 'MASTER'>('ASSET');
  const [brandLabel, setBrandLabel] = useState('Your Company');

  const generateMutation = useMutation({
    mutationFn: async (data: { count: number; type: string; brandLabel: string }) => {
      const response = await apiRequest("POST", "/api/identifiers/batch", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "QR Codes Generated",
        description: `Successfully created ${data.created?.length || 0} identifiers`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate QR codes",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (count < 1 || count > 500) {
      toast({
        title: "Invalid Count",
        description: "Count must be between 1 and 500",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({ count, type, brandLabel });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const downloadQR = (qrCodeDataURL: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = qrCodeDataURL;
    link.click();
  };

  if (!isAuthenticated) {
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
          <h1 className="text-3xl font-bold mb-2">QR Code Generator</h1>
          <p className="text-muted-foreground">
            Batch generate branded QR codes for assets and properties. Print professional stickers with your company branding.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Generation Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Generate QR Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="count">Quantity</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="500"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                    placeholder="Number of QR codes"
                    data-testid="input-count"
                  />
                  <p className="text-xs text-muted-foreground">Maximum 500 codes per batch</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(value: 'ASSET' | 'MASTER') => setType(value)}>
                    <SelectTrigger data-testid="select-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSET">Asset Identifier</SelectItem>
                      <SelectItem value="MASTER">Master Property Code</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {type === 'ASSET' 
                      ? 'Individual asset tracking codes' 
                      : 'Master codes for entire properties'
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand Label</Label>
                  <Input
                    id="brand"
                    value={brandLabel}
                    onChange={(e) => setBrandLabel(e.target.value)}
                    placeholder="Your company name"
                    data-testid="input-brand"
                  />
                  <p className="text-xs text-muted-foreground">Appears on printed stickers</p>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={generateMutation.isPending || count < 1 || count > 500}
                  className="w-full"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate {count} QR Code{count !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {generateMutation.data?.created ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generated QR Codes ({generateMutation.data.created.length})</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" data-testid="button-download-all">
                        <Download className="mr-2 h-4 w-4" />
                        Download All
                      </Button>
                      <Button variant="outline" size="sm" data-testid="button-print-all">
                        <Printer className="mr-2 h-4 w-4" />
                        Print Labels
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {generateMutation.data.created.map((identifier: any) => (
                      <Card key={identifier.id} className="p-4">
                        <div className="text-center space-y-3">
                          <Badge 
                            variant="outline" 
                            className={identifier.type === 'MASTER' ? 'bg-primary/10 border-primary' : ''}
                          >
                            {identifier.type}
                          </Badge>
                          
                          <div 
                            className="font-mono text-sm font-bold cursor-pointer hover:text-primary transition-colors"
                            onClick={() => copyToClipboard(identifier.code)}
                            data-testid={`code-${identifier.id}`}
                          >
                            {identifier.code}
                          </div>
                          
                          {identifier.qrCodeDataURL && (
                            <div className="flex justify-center">
                              <img 
                                src={identifier.qrCodeDataURL} 
                                alt={`QR Code for ${identifier.code}`}
                                className="w-32 h-32 border border-border rounded"
                                data-testid={`qr-image-${identifier.id}`}
                              />
                            </div>
                          )}
                          
                          {identifier.brandLabel && (
                            <p className="text-xs text-muted-foreground">{identifier.brandLabel}</p>
                          )}
                          
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={() => copyToClipboard(identifier.code)}
                              data-testid={`button-copy-${identifier.id}`}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            {identifier.qrCodeDataURL && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={() => downloadQR(identifier.qrCodeDataURL, `${identifier.code}.png`)}
                                data-testid={`button-download-${identifier.id}`}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No QR Codes Generated</h3>
                    <p className="text-muted-foreground">
                      Configure your settings and click generate to create QR codes for your assets.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use Generated QR Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Printer className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">1. Print Stickers</h3>
                <p className="text-sm text-muted-foreground">
                  Print QR codes on adhesive labels using a standard printer or professional label maker.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <QrCode className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">2. Attach to Assets</h3>
                <p className="text-sm text-muted-foreground">
                  Apply stickers to appliances, equipment, or property master locations for easy identification.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Copy className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">3. Scan & Claim</h3>
                <p className="text-sm text-muted-foreground">
                  Use the Fix-Track scanner to claim codes and bind them to specific assets and properties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
