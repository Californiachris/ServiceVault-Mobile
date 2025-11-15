import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Clock, CheckCircle2, LogOut, LogIn } from "lucide-react";

export default function WorkerCheckIn() {
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // Get QR code from URL or session storage
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') || sessionStorage.getItem('contractorCheckInCode') || '';
  
  // Get current GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Check-in will proceed without GPS verification.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);
  
  // Fetch active visit for this worker
  const { data: activeVisit } = useQuery<{
    id: string;
    checkInAt: string;
    status: string;
    tasksCompleted: number;
  }>({
    queryKey: ['/api/contractor/active-visit'],
  });
  
  // Fetch today's tasks
  const { data: tasks = [] } = useQuery<Array<{
    id: string;
    title: string;
    description: string;
    address: string;
    priority: string;
    status: string;
  }>>({
    queryKey: ['/api/contractor/worker/tasks'],
  });
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/worker/checkin", {
        identifierCode: code,
        location: location ? {
          lat: location.lat,
          lng: location.lng,
        } : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/active-visit'] });
      toast({
        title: "Checked In Successfully!",
        description: "Your work shift has started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contractor/worker/checkout", {
        location: location ? {
          lat: location.lat,
          lng: location.lng,
        } : null,
        completedTaskIds: Array.from(selectedTasks),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/active-visit'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/worker/tasks'] });
      toast({
        title: "Checked Out Successfully!",
        description: "Your work shift has ended.",
      });
      setLocationPath('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };
  
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Worker Check-In</h1>
          <p className="text-muted-foreground">
            {activeVisit ? "You're currently clocked in" : "Scan to start your shift"}
          </p>
        </div>
        
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Status
              </span>
              <Badge variant={activeVisit ? "default" : "secondary"}>
                {activeVisit ? "Clocked In" : "Clocked Out"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                GPS Location Verified
              </div>
            )}
            
            {activeVisit && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Checked in at:</span>
                  <span className="font-medium">
                    {new Date(activeVisit.checkInAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks completed:</span>
                  <span className="font-medium">{activeVisit.tasksCompleted}</span>
                </div>
              </div>
            )}
            
            <div className="pt-4">
              {!activeVisit ? (
                <Button 
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold h-12"
                  data-testid="button-check-in"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {checkInMutation.isPending ? "Checking In..." : "Check In"}
                </Button>
              ) : (
                <Button 
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  variant="outline"
                  className="w-full border-2 font-semibold h-12"
                  data-testid="button-check-out"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Today's Tasks */}
        {activeVisit && tasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Today's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                    data-testid={`task-${task.id}`}
                  >
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="mt-1"
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge variant={
                          task.priority === 'URGENT' ? 'destructive' :
                          task.priority === 'HIGH' ? 'default' : 
                          'secondary'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      {task.address && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {task.address}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
