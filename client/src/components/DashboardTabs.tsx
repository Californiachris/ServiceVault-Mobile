import { LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface DashboardTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface DashboardTabsProps {
  tabs: DashboardTab[];
  activeValue: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DashboardTabs({ tabs, activeValue, onChange, className }: DashboardTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <Tabs value={activeValue} onValueChange={onChange} className={className}>
      <div className="relative w-full overflow-x-auto scrollbar-hide">
        <TabsList 
          className={cn(
            "inline-flex h-auto items-center gap-2 rounded-xl p-2",
            "bg-white dark:bg-slate-900 backdrop-blur-xl",
            "border-2 border-slate-200 dark:border-slate-700",
            "shadow-lg",
            "min-w-full w-max"
          )}
          data-testid="dashboard-tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeValue;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-3 rounded-lg min-w-fit",
                  "text-sm font-semibold transition-all duration-200",
                  "whitespace-nowrap flex-shrink-0",
                  // Inactive state - vibrant blue/cyan text, clearly readable
                  "data-[state=inactive]:text-cyan-700 dark:data-[state=inactive]:text-cyan-400",
                  "data-[state=inactive]:bg-slate-50 dark:data-[state=inactive]:bg-slate-800",
                  "data-[state=inactive]:hover:bg-cyan-50 dark:data-[state=inactive]:hover:bg-cyan-900/20",
                  "data-[state=inactive]:hover:text-cyan-900 dark:data-[state=inactive]:hover:text-cyan-300",
                  // Active state - bold gradient background with white text
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg",
                  "data-[state=active]:scale-105",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                <span className="font-semibold">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold",
                    isActive 
                      ? "bg-white/30 text-white" 
                      : "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-900 dark:text-cyan-100"
                  )}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
