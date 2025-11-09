import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UserRole = "HOMEOWNER" | "CONTRACTOR" | "FLEET";

interface DevRoleOverrideContextType {
  overrideRole: UserRole | null;
  setOverrideRole: (role: UserRole | null) => void;
  isDevMode: boolean;
}

const DevRoleOverrideContext = createContext<DevRoleOverrideContextType | undefined>(undefined);

export function DevRoleOverrideProvider({ children }: { children: ReactNode }) {
  const isDevMode = import.meta.env.DEV;
  const [overrideRole, setOverrideRoleState] = useState<UserRole | null>(null);

  useEffect(() => {
    if (isDevMode) {
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get('role')?.toUpperCase();
      
      if (roleParam && ['HOMEOWNER', 'CONTRACTOR', 'FLEET'].includes(roleParam)) {
        setOverrideRoleState(roleParam as UserRole);
        sessionStorage.setItem("dev_role_override", roleParam);
      } else {
        const stored = sessionStorage.getItem("dev_role_override");
        if (stored) {
          setOverrideRoleState(stored as UserRole);
        }
      }
    }
  }, [isDevMode]);

  const setOverrideRole = (role: UserRole | null) => {
    if (!isDevMode) return;
    
    setOverrideRoleState(role);
    if (role) {
      sessionStorage.setItem("dev_role_override", role);
    } else {
      sessionStorage.removeItem("dev_role_override");
    }
  };

  return (
    <DevRoleOverrideContext.Provider value={{ overrideRole, setOverrideRole, isDevMode }}>
      {children}
    </DevRoleOverrideContext.Provider>
  );
}

export function useDevRoleOverride() {
  const context = useContext(DevRoleOverrideContext);
  if (!context) {
    throw new Error("useDevRoleOverride must be used within DevRoleOverrideProvider");
  }
  return context;
}
