import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CheckInByCode() {
  const [, params] = useRoute("/worker/check-in/:masterQr");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geofenceWarning, setGeofenceWarning] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setGeoError(`Unable to get location: ${error.message}`);
      }
    );
  }, []);

  const checkInMutation = useMutation({
    mutationFn: async ({ masterQrCode, location, overrideReason }: any) => {
      const res = await apiRequest("POST", "/api/worker/check-in", {
        masterQrCode,
        location,
        method: "QR",
        overrideReason,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Store active visit ID
      localStorage.setItem('worker-active-visit', data.visit.id);
      
      // Check geofence result
      if (data.geofence) {
        if (data.geofence.status === 'soft_warning') {
          setGeofenceWarning(data.geofence);
          return;
        }
      }
      
      toast({
        title: "Checked In Successfully",
        description: "Your visit has started",
      });
      setLocation(`/worker/visit/${data.visit.id}`);
    },
    onError: (error: any) => {
      if (error.geofence && error.geofence.status === 'hard_block') {
        setGeofenceWarning(error.geofence);
      } else if (error.activeVisitId) {
        toast({
          title: "Already Checked In",
          description: "You have an active visit",
        });
        setLocation(`/worker/visit/${error.activeVisitId}`);
      } else {
        toast({
          title: "Check-In Failed",
          description: error.error || "An error occurred",
          variant: "destructive",
        });
      }
    },
  });

  const handleCheckIn = () => {
    if (!params?.masterQr) return;
    
    checkInMutation.mutate({
      masterQrCode: params.masterQr,
      location: geolocation,
      overrideReason: null,
    });
  };

  const handleOverrideCheckIn = () => {
    if (!params?.masterQr || !overrideReason.trim()) return;
    
    checkInMutation.mutate({
      masterQrCode: params.masterQr,
      location: geolocation,
      overrideReason: overrideReason.trim(),
    });
    setGeofenceWarning(null);
  };

  const handleContinueAnyway = () => {
    if (!params?.masterQr) return;
    
    checkInMutation.mutate({
      masterQrCode: params.masterQr,
      location: geolocation,
      overrideReason: "Worker confirmed location",
    });
    setGeofenceWarning(null);
  };

  if (!params?.masterQr) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Invalid QR code</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Confirm Check-In</CardTitle>
            <CardDescription>
              Property Code: {params.masterQr}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {geoError && (
              <Alert variant="destructive">
                <AlertDescription>{geoError}</AlertDescription>
              </Alert>
            )}

            {!geolocation && !geoError && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Getting your location...</span>
              </div>
            )}

            {geolocation && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Location captured: {geolocation.lat.toFixed(6)}, {geolocation.lng.toFixed(6)}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCheckIn}
              disabled={!geolocation || checkInMutation.isPending}
              className="w-full"
              data-testid="button-confirm-check-in"
            >
              {checkInMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Check-In
            </Button>

            {geoError && (
              <Button
                onClick={() => setLocation(`/worker/check-in/${params.masterQr}`)}
                variant="outline"
                className="w-full"
                data-testid="button-retry-location"
              >
                Retry Location
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geofence Warning Dialog */}
      <Dialog open={!!geofenceWarning} onOpenChange={() => setGeofenceWarning(null)}>
        <DialogContent data-testid="dialog-geofence-warning">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Location Warning
            </DialogTitle>
            <DialogDescription>
              {geofenceWarning?.message}
            </DialogDescription>
          </DialogHeader>

          {geofenceWarning?.status === 'soft_warning' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are {Math.round(geofenceWarning.distanceMeters)}m from the property center 
                ({Math.round(geofenceWarning.thresholdMeters)}m boundary). You can continue anyway or retry.
              </p>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setGeofenceWarning(null)}
                  data-testid="button-cancel-override"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleContinueAnyway}
                  data-testid="button-continue-anyway"
                >
                  Continue Anyway
                </Button>
              </DialogFooter>
            </div>
          )}

          {geofenceWarning?.status === 'hard_block' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are {Math.round(geofenceWarning.distanceMeters)}m from the property, which exceeds 
                the maximum allowed distance. Please provide a reason for manual override.
              </p>
              <Textarea
                placeholder="Reason for override (e.g., parked nearby, working from adjacent building)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                data-testid="input-override-reason"
              />
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setGeofenceWarning(null)}
                  data-testid="button-cancel-override"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOverrideCheckIn}
                  disabled={!overrideReason.trim()}
                  data-testid="button-submit-override"
                >
                  Submit Override
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
