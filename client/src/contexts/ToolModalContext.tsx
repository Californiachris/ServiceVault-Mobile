import { createContext, useContext, useState, ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssetClaimToolView from "@/components/AssetClaimToolView";
import DocumentStorageToolView from "@/components/DocumentStorageToolView";
import ReportsToolView from "@/components/ReportsToolView";
import InspectionsToolView from "@/components/InspectionsToolView";
import RemindersToolView from "@/components/RemindersToolView";

type ToolType = "assets" | "documents" | "reports" | "inspections" | "reminders" | null;

interface ToolModalContextValue {
  openTool: (tool: ToolType) => void;
  closeTool: () => void;
  currentTool: ToolType;
}

const ToolModalContext = createContext<ToolModalContextValue | undefined>(undefined);

export function useToolModal() {
  const context = useContext(ToolModalContext);
  if (!context) {
    throw new Error("useToolModal must be used within ToolModalProvider");
  }
  return context;
}

interface ToolModalProviderProps {
  children: ReactNode;
}

export function ToolModalProvider({ children }: ToolModalProviderProps) {
  const [currentTool, setCurrentTool] = useState<ToolType>(null);

  const openTool = (tool: ToolType) => {
    setCurrentTool(tool);
  };

  const closeTool = () => {
    setCurrentTool(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeTool();
    }
  };

  return (
    <ToolModalContext.Provider value={{ openTool, closeTool, currentTool }}>
      {children}
      
      <Dialog open={currentTool !== null} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="max-w-6xl max-h-[90vh] overflow-y-auto p-0"
          data-testid="dialog-tool-modal"
        >
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {currentTool === "assets" && "Asset Management"}
              {currentTool === "documents" && "Document Storage"}
              {currentTool === "reports" && "Health Reports"}
              {currentTool === "inspections" && "Inspection Logs"}
              {currentTool === "reminders" && "Smart Reminders"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeTool}
              data-testid="button-close-tool-modal"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
            {currentTool === "assets" && <AssetClaimToolView />}
            {currentTool === "documents" && <DocumentStorageToolView />}
            {currentTool === "reports" && <ReportsToolView />}
            {currentTool === "inspections" && <InspectionsToolView />}
            {currentTool === "reminders" && <RemindersToolView />}
          </div>
        </DialogContent>
      </Dialog>
    </ToolModalContext.Provider>
  );
}
