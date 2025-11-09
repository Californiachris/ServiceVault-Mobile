import { useDevRoleOverride } from "@/hooks/useDevRoleOverride";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Building2, Truck, ChevronDown } from "lucide-react";

const ROLES = [
  { value: "HOMEOWNER", label: "Homeowner", icon: Home, color: "text-blue-500" },
  { value: "CONTRACTOR", label: "Contractor Pro", icon: Building2, color: "text-orange-500" },
  { value: "FLEET", label: "Fleet Manager", icon: Truck, color: "text-purple-500" },
] as const;

export default function DevRoleSwitcher() {
  const { overrideRole, setOverrideRole } = useDevRoleOverride();

  if (!import.meta.env.DEV) {
    return null;
  }

  const currentRole = ROLES.find(r => r.value === overrideRole) || ROLES[0];
  const CurrentIcon = currentRole.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50" data-testid="dev-role-switcher">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="shadow-lg border-2 bg-background hover:bg-muted"
            data-testid="button-dev-role-trigger"
          >
            <CurrentIcon className={`h-5 w-5 mr-2 ${currentRole.color}`} />
            <span className="font-semibold">{currentRole.label}</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch Role (Dev Mode)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <DropdownMenuItem
                key={role.value}
                onClick={() => {
                  setOverrideRole(role.value);
                  window.location.href = "/dashboard";
                }}
                className="cursor-pointer"
                data-testid={`option-role-${role.value.toLowerCase()}`}
              >
                <Icon className={`h-4 w-4 mr-2 ${role.color}`} />
                <span className="font-medium">{role.label}</span>
                {overrideRole === role.value && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
