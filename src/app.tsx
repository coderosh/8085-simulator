import { useEffect } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/simulator/app-header";
import { AssembledPanel } from "@/components/simulator/assembled-panel";
import { SimulatorSidebar } from "@/components/simulator/simulator-sidebar";
import { WorkspacePanel } from "@/components/simulator/workspace-panel";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSimulatorStore } from "@/stores";

function App() {
  const initializeWorkspace = useSimulatorStore(
    (state) => state.initializeWorkspace,
  );

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <TooltipProvider>
        <main className="flex h-dvh overflow-hidden flex-col bg-background text-foreground">
          <AppHeader />

          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_4.5rem] md:grid-cols-[4.75rem_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[4.75rem_minmax(0,1fr)_25rem]">
            <SimulatorSidebar />

            <div className="min-h-0 md:order-none">
              <WorkspacePanel />
            </div>

            <aside className="hidden min-h-0 border-l bg-background lg:block">
              <AssembledPanel />
            </aside>
          </div>
        </main>
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
