import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Download, Clock, Package, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const { data: tasksData } = useQuery({
    queryKey: ["/api/worker/tasks"],
    retry: false,
  });

  const { data: visitsData } = useQuery({
    queryKey: ["/api/worker/visits"],
    retry: false,
  });

  const tasks = tasksData?.tasks || [];
  const visits = visitsData?.visits || [];

  // Calculate total hours
  const totalMinutes = visits.reduce((sum: number, v: any) => {
    if (!v.clockInTime) return sum;
    const clockIn = new Date(v.clockInTime);
    const clockOut = v.clockOutTime ? new Date(v.clockOutTime) : new Date();
    return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const handleDownloadHoursPDF = async () => {
    try {
      const response = await fetch(`/api/worker/timesheet/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-timesheet.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleDownloadJobsPDF = async () => {
    try {
      const response = await fetch(`/api/worker/jobs/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-jobs.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.firstName || 'Worker'}</h1>
        <p className="text-slate-400">Your daily tasks and work summary</p>
      </div>

      {/* Hero: Scan In Button */}
      <Card 
        onClick={() => setScanModalOpen(true)}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 border-t-2 border-t-cyan-600/40 shadow-2xl shadow-cyan-900/20 hover:shadow-cyan-500/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer mb-8"
        data-testid="card-scan-in"
      >
        <CardContent className="p-12">
          <div className="flex items-center gap-6">
            <div className="p-6 bg-cyan-500/20 rounded-full shadow-lg">
              <Camera className="h-12 w-12 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2 tracking-tight text-white">Scan In</h2>
              <p className="text-base text-slate-300">
                Clock in/out or scan new assets
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Tasks */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            Today's Tasks ({tasks.filter((t: any) => t.status === 'PENDING').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No tasks assigned yet</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="bg-slate-700/30 rounded-lg p-4"
                  data-testid={`card-task-${task.id}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'COMPLETED'}
                      className="mt-1"
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-slate-400">{task.description}</p>
                      )}
                      {task.scheduledFor && (
                        <p className="text-xs text-slate-500 mt-1">
                          Due: {format(new Date(task.scheduledFor), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Hours (Read-Only) */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="h-5 w-5 text-blue-400" />
            My Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-blue-400 mb-2">{totalHours}</p>
            <p className="text-slate-400">Total Hours Logged</p>
          </div>
          <Button 
            onClick={handleDownloadHoursPDF}
            className="w-full mt-4"
            variant="outline"
            data-testid="button-download-hours"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Hours PDF
          </Button>
        </CardContent>
      </Card>

      {/* Download Jobs */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-teal-400" />
            My Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleDownloadJobsPDF}
            className="w-full"
            variant="outline"
            data-testid="button-download-jobs"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All Jobs PDF
          </Button>
        </CardContent>
      </Card>

      {/* Scan Modal */}
      <Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Choose Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Link href="/worker/check-in">
              <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-500/30 hover:border-blue-500/50 cursor-pointer transition-all hover:scale-[1.02]" data-testid="card-clock-in-out">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-500/20 rounded-full">
                      <Clock className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Clock In/Out</h3>
                      <p className="text-sm text-slate-300">Start or end your work day</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/scan">
              <Card className="bg-gradient-to-br from-teal-900/30 to-teal-800/30 border-teal-500/30 hover:border-teal-500/50 cursor-pointer transition-all hover:scale-[1.02]" data-testid="card-scan-asset">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-teal-500/20 rounded-full">
                      <Package className="h-8 w-8 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Scan New Asset</h3>
                      <p className="text-sm text-slate-300">Install and tag equipment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
