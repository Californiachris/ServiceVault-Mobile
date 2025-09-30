import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Wrench, AlertTriangle, CheckCircle2, Edit } from "lucide-react";
import type { Asset } from "@shared/schema";

interface AssetCardProps {
  asset: Asset & {
    events?: any[];
    documents?: any[];
    reminders?: any[];
  };
  onEdit?: () => void;
  onViewHistory?: () => void;
}

const categoryIcons: Record<string, any> = {
  PLUMBING: '🔧',
  ELECTRICAL: '⚡',
  HVAC: '❄️',
  APPLIANCE: '📱',
  FURNITURE: '🪑',
  STRUCTURAL: '🏗️',
  VEHICLE: '🚗',
  HEAVY_EQUIPMENT: '🚜',
  OTHER: '📦',
};

const statusColors = {
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  INACTIVE: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  MAINTENANCE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  RETIRED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AssetCard({ asset, onEdit, onViewHistory }: AssetCardProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getNextServiceDate = () => {
    // This would typically be calculated based on reminders or maintenance schedules
    const lastService = asset.events?.find(e => e.type === 'SERVICE')?.createdAt;
    if (lastService) {
      const next = new Date(lastService);
      next.setMonth(next.getMonth() + 6); // Assume 6-month service interval
      return next;
    }
    return null;
  };

  const getWarrantyStatus = () => {
    // This would typically be calculated based on documents or installation date
    if (asset.installedAt) {
      const warranty = new Date(asset.installedAt);
      warranty.setFullYear(warranty.getFullYear() + 5); // Assume 5-year warranty
      const now = new Date();
      
      if (warranty > now) {
        const years = Math.floor((warranty.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return `${years} years remaining`;
      }
    }
    return 'Expired';
  };

  const nextService = getNextServiceDate();
  const warrantyStatus = getWarrantyStatus();
  const isServiceDue = nextService && nextService < new Date();

  return (
    <Card 
      className="hover:border-primary/50 transition-colors"
      data-testid={`asset-card-${asset.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-lg">
              {categoryIcons[asset.category] || '📦'}
            </div>
            <div>
              <h4 className="font-semibold">{asset.name}</h4>
              {(asset.brand || asset.model) && (
                <p className="text-sm text-muted-foreground">
                  {[asset.brand, asset.model].filter(Boolean).join(' ')}
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${statusColors[asset.status as keyof typeof statusColors] || statusColors.ACTIVE}`}
          >
            {asset.status || 'Active'}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Code:</span>
            <span className="font-mono text-xs">{asset.identifierId || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Installed:</span>
            <span>{formatDate(asset.installedAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Warranty:</span>
            <span className={warrantyStatus.includes('remaining') ? 'text-green-400' : 'text-red-400'}>
              {warrantyStatus}
            </span>
          </div>
          {nextService && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next Service:</span>
              <span className={isServiceDue ? 'text-orange-400' : ''}>
                {isServiceDue ? 'Due now' : formatDate(nextService)}
              </span>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mb-4">
          {asset.events && asset.events.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
              {asset.events.length} events
            </div>
          )}
          {asset.documents && asset.documents.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1 text-blue-400" />
              {asset.documents.length} docs
            </div>
          )}
          {isServiceDue && (
            <div className="flex items-center text-xs text-orange-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Service due
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={onViewHistory}
            data-testid={`button-view-history-${asset.id}`}
          >
            View History
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            data-testid={`button-edit-asset-${asset.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
