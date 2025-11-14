import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, MapPin, Loader2, CheckCircle, Camera, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function ActiveVisit() {
  const [, params] = useRoute("/worker/visit/:visitId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: visit, isLoading } = useQuery<any>({
    queryKey: ['/api/worker/visits', params?.visitId],
    enabled: !!params?.visitId,
    refetchInterval: 30000,
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/property-manager/properties', visit?.managedPropertyId, 'tasks'],
    enabled: !!visit?.managedPropertyId,
  });

  useEffect(() => {
    if (!params?.visitId) return;
    localStorage.setItem('worker-active-visit', params.visitId);
  }, [params?.visitId]);

  useEffect(() => {
    if (!showCheckOutDialog) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [showCheckOutDialog]);

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/worker/check-out/${params?.visitId}`, {
        location: geolocation,
        method: "QR",
        visitSummary: visitNotes,
        photoUrls,
      });
      return await res.json();
    },
    onSuccess: () => {
      localStorage.removeItem('worker-active-visit');
      queryClient.invalidateQueries({ queryKey: ['/api/worker/visits'] });
      toast({
        title: "Visit Completed",
        description: "Thank you! Your visit has been recorded.",
      });
      setLocation('/worker/check-in');
    },
    onError: (error: any) => {
      toast({
        title: "Check-Out Failed",
        description: error.error || "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!visit) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Visit not found</AlertDescription>
      </Alert>
    );
  }

  const visitDuration = visit.checkInAt
    ? formatDistanceToNow(new Date(visit.checkInAt), { addSuffix: false })
    : '0m';

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Visit</CardTitle>
                <CardDescription>
                  Started {formatDistanceToNow(new Date(visit.checkInAt), { addSuffix: true })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Clock className="h-6 w-6" />
                {visitDuration}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {visit.checkInLocation && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Check-in Location</p>
                  <p className="text-muted-foreground">
                    {visit.checkInLocation.lat.toFixed(6)}, {visit.checkInLocation.lng.toFixed(6)}
                    {visit.checkInLocation.verified && (
                      <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {tasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks</CardTitle>
              <CardDescription>
                {tasks.filter(t => t.status === 'COMPLETED').length} of {tasks.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={task.status === 'COMPLETED'}
                      disabled
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visit Notes</CardTitle>
            <CardDescription>
              Add notes about your visit (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any notes about the visit..."
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              rows={4}
              data-testid="input-visit-notes"
            />
          </CardContent>
        </Card>

        <Button
          onClick={() => setShowCheckOutDialog(true)}
          size="lg"
          className="w-full"
          data-testid="button-complete-visit"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete Visit
        </Button>
      </div>

      {/* Check-Out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent data-testid="dialog-check-out">
          <DialogHeader>
            <DialogTitle>Complete Visit</DialogTitle>
            <DialogDescription>
              Confirm check-out to complete this visit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{visitDuration}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tasks Completed</span>
                <span className="font-medium">
                  {tasks.filter((t: any) => t.status === 'COMPLETED').length} of {tasks.length}
                </span>
              </div>
              {geolocation && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Check-out Location</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>

            {!geolocation && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Capturing location...</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCheckOutDialog(false)}
              data-testid="button-cancel-check-out"
            >
              Cancel
            </Button>
            <Button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              data-testid="button-confirm-check-out"
            >
              {checkOutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Check-Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
