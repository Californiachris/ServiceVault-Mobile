import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Clock, Package, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export default function WorkerProfile() {
  const { workerId } = useParams();

  const { data: workerData } = useQuery({
    queryKey: ["/api/contractor/workers", workerId],
  });

  const { data: timesheetData } = useQuery({
    queryKey: ["/api/contractor/workers", workerId, "timesheet"],
    enabled: !!workerId,
  });

  const { data: assetsData } = useQuery({
    queryKey: ["/api/contractor/workers", workerId, "assets"],
    enabled: !!workerId,
  });

  const worker = workerData?.worker;
  const visits = timesheetData?.visits || [];
  const assets = assetsData?.assets || [];

  // Calculate this week's hours
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hoursByDay = daysOfWeek.map(day => {
    const dayVisits = visits.filter((v: any) => {
      if (!v.checkInAt) return false;
      const visitDate = new Date(v.checkInAt);
      return format(visitDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });

    const totalMinutes = dayVisits.reduce((sum: number, v: any) => {
      if (!v.checkInAt) return sum;
      const checkIn = new Date(v.checkInAt);
      const checkOut = v.checkOutAt ? new Date(v.checkOutAt) : new Date();
      return sum + (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
    }, 0);

    return {
      day: format(day, 'EEE'),
      date: format(day, 'MMM d'),
      hours: (totalMinutes / 60).toFixed(1),
    };
  });

  const totalWeekHours = hoursByDay.reduce((sum, d) => sum + parseFloat(d.hours), 0);

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/contractor/workers/${workerId}/timesheet/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${worker?.name || 'worker'}-timesheet.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  if (!worker) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <p className="text-slate-400">Loading worker profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contractor/team">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{worker.name}</h1>
          <p className="text-slate-400">{worker.role || 'Worker'}</p>
        </div>
        <Button onClick={handleDownloadPDF} variant="outline" data-testid="button-download-pdf">
          <Download className="h-4 w-4 mr-2" />
          Download Timesheet PDF
        </Button>
      </div>

      {/* Contact Info */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-white font-medium">{worker.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Phone</p>
              <p className="text-white font-medium">{worker.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Status</p>
              <p className="text-white font-medium">{worker.status || 'ACTIVE'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week's Hours */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-cyan-400" />
            This Week's Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {hoursByDay.map((day, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-slate-400 mb-1">{day.day}</div>
                <div className="text-sm text-slate-500 mb-2">{day.date}</div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-cyan-400">{day.hours}</div>
                  <div className="text-xs text-slate-400">hrs</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">Total This Week</p>
            <p className="text-3xl font-bold text-cyan-400">{totalWeekHours.toFixed(1)} hours</p>
          </div>
        </CardContent>
      </Card>

      {/* Assets Installed */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-teal-400" />
            Assets Installed ({assets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No assets installed yet</p>
          ) : (
            <div className="space-y-3">
              {assets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                  data-testid={`card-asset-${asset.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{asset.name}</h4>
                      <p className="text-sm text-slate-400">{asset.category}</p>
                      {asset.propertyName && (
                        <p className="text-xs text-slate-500 mt-1">{asset.propertyName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {asset.installedAt ? format(new Date(asset.installedAt), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
