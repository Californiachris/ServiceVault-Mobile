import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { REMINDER_TYPES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
  Home,
  Package
} from "lucide-react";
import { formatDistanceToNow, format, addDays, isPast, isBefore } from "date-fns";

type Priority = 'high' | 'medium' | 'low' | 'all';

export default function RemindersToolView() {
  const { isAuthenticated } = useAuth();
  const [selectedPriority, setSelectedPriority] = useState<Priority>('all');

  const { data: remindersData, isLoading: remindersLoading } = useQuery<{ processed: number; reminders: any[] }>({
    queryKey: ["/api/reminders/due"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: assets } = useQuery<any[]>({
    queryKey: ["/api/assets"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    enabled: isAuthenticated,
    retry: false,
  });

  const reminders = remindersData?.reminders || [];

  // Create lookup maps for assets and properties
  const assetMap = useMemo(() => {
    if (!assets) return new Map();
    return new Map(assets.map((a: any) => [a.id, a]));
  }, [assets]);

  const propertyMap = useMemo(() => {
    if (!properties) return new Map();
    return new Map(properties.map((p: any) => [p.id, p]));
  }, [properties]);

  // Enrich reminders with asset/property info
  const enrichedReminders = useMemo(() => {
    return reminders.map((reminder: any) => {
      const asset = reminder.assetId ? assetMap.get(reminder.assetId) : null;
      const property = reminder.propertyId 
        ? propertyMap.get(reminder.propertyId)
        : asset?.propertyId 
          ? propertyMap.get(asset.propertyId)
          : null;
      
      const reminderType = REMINDER_TYPES.find(rt => rt.value === reminder.type);
      
      return {
        ...reminder,
        asset,
        property,
        reminderType,
        dueDate: new Date(reminder.dueDate),
      };
    });
  }, [reminders, assetMap, propertyMap]);

  // Split into "Due Now" (past) and "Upcoming" (next 60 days)
  const now = new Date();
  const sixtyDaysFromNow = addDays(now, 60);

  const dueNowReminders = useMemo(() => {
    return enrichedReminders.filter((r: any) => isPast(r.dueDate));
  }, [enrichedReminders]);

  const upcomingReminders = useMemo(() => {
    return enrichedReminders.filter((r: any) => 
      !isPast(r.dueDate) && isBefore(r.dueDate, sixtyDaysFromNow)
    );
  }, [enrichedReminders, sixtyDaysFromNow]);

  // Filter by priority
  const filterByPriority = (remindersList: any[]) => {
    if (selectedPriority === 'all') return remindersList;
    return remindersList.filter((r: any) => r.reminderType?.priority === selectedPriority);
  };

  const filteredDueNow = filterByPriority(dueNowReminders);
  const filteredUpcoming = filterByPriority(upcomingReminders);

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-orange-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const ReminderCard = ({ reminder }: { reminder: any }) => {
    const IconComponent = reminder.reminderType?.icon || Bell;
    const isOverdue = isPast(reminder.dueDate);

    return (
      <Card 
        className="hover:shadow-lg transition-shadow"
        data-testid={`card-reminder-${reminder.id}`}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-100 dark:bg-red-900/20' : 'bg-muted'}`}>
              <IconComponent className={`h-5 w-5 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-lg" data-testid={`text-reminder-title-${reminder.id}`}>
                    {reminder.reminderType?.label || reminder.type}
                  </h4>
                  {reminder.asset && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span data-testid={`text-asset-name-${reminder.id}`}>{reminder.asset.name}</span>
                    </div>
                  )}
                  {reminder.property && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Home className="h-4 w-4" />
                      <span data-testid={`text-property-name-${reminder.id}`}>{reminder.property.name}</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  className={getPriorityBadgeColor(reminder.reminderType?.priority)}
                  data-testid={`badge-priority-${reminder.id}`}
                >
                  {reminder.reminderType?.priority || 'medium'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'} data-testid={`text-due-date-${reminder.id}`}>
                  {isOverdue ? 'Overdue: ' : 'Due: '}
                  {format(reminder.dueDate, 'MMM d, yyyy')}
                  {' '}
                  ({formatDistanceToNow(reminder.dueDate, { addSuffix: true })})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: 'due' | 'upcoming' }) => (
    <div className="text-center py-12 space-y-3">
      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${type === 'due' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
        {type === 'due' ? (
          <AlertCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        ) : (
          <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div>
        <p className="font-medium" data-testid={`text-empty-${type}`}>
          {type === 'due' ? 'No Overdue Reminders' : 'No Upcoming Reminders'}
        </p>
        <p className="text-sm text-muted-foreground">
          {type === 'due' 
            ? 'All caught up! No immediate actions required.'
            : 'No reminders scheduled for the next 60 days.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Reminders</h3>
        <p className="text-muted-foreground">
          Stay on top of warranty expirations, scheduled maintenance, inspections, and renewals
        </p>
      </div>

      <Separator />

      {/* Priority Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground self-center">Filter by priority:</span>
        <div className="flex gap-2" data-testid="filter-priority-chips">
          {(['all', 'high', 'medium', 'low'] as Priority[]).map((priority) => (
            <button
              key={priority}
              onClick={() => setSelectedPriority(priority)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPriority === priority
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
              data-testid={`chip-priority-${priority}`}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {remindersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-reminders" />
        </div>
      ) : (
        <Tabs defaultValue="due" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="due" className="flex items-center gap-2" data-testid="tab-due-now">
              <AlertCircle className="h-4 w-4" />
              Due Now
              {filteredDueNow.length > 0 && (
                <Badge variant="destructive" className="ml-1" data-testid="badge-due-count">
                  {filteredDueNow.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2" data-testid="tab-upcoming">
              <Clock className="h-4 w-4" />
              Upcoming (60 days)
              {filteredUpcoming.length > 0 && (
                <Badge variant="secondary" className="ml-1" data-testid="badge-upcoming-count">
                  {filteredUpcoming.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Due Now Section */}
          <TabsContent value="due" className="mt-6">
            <div className="space-y-4">
              {filteredDueNow.length > 0 ? (
                filteredDueNow.map((reminder: any) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <EmptyState type="due" />
              )}
            </div>
          </TabsContent>

          {/* Upcoming Section */}
          <TabsContent value="upcoming" className="mt-6">
            <div className="space-y-4">
              {filteredUpcoming.length > 0 ? (
                filteredUpcoming
                  .sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime())
                  .map((reminder: any) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))
              ) : (
                <EmptyState type="upcoming" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
