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
      <div className="relative">
        <TabsList 
          className={cn(
            "inline-flex h-auto items-center gap-2 rounded-xl p-1.5",
            "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/50",
            "shadow-sm",
            "overflow-x-auto max-w-full",
            "scrollbar-hide"
          )}
          data-testid="dashboard-tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
                  "text-sm font-medium transition-all duration-200",
                  "whitespace-nowrap",
                  "data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400",
                  "data-[state=inactive]:hover:text-slate-900 dark:data-[state=inactive]:hover:text-slate-100",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500",
                  "data-[state=active]:text-white data-[state=active]:shadow-md",
                  "data-[state=active]:scale-[1.02]",
                  "hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    "data-[state=active]:bg-white/20",
                    "data-[state=inactive]:bg-slate-200/60 dark:data-[state=inactive]:bg-slate-700/60"
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
