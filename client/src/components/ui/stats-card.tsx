import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  isLoading?: boolean;
}

export default function StatsCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  trend = "up",
  isLoading = false 
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {change && (
          <div className={`text-sm flex items-center ${
            trend === "up" ? "text-green-400" : "text-red-400"
          }`}>
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {change} from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}
