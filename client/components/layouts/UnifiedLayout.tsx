import React from "react";
import Navigation from "../Navigation";
import SimplifiedSidebarNav from "../ui/simplified-sidebar-nav";
import { useAppSelector } from "../../store/hooks";
import { cn } from "../../lib/utils";

interface UnifiedLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({
  children,
  className,
}) => {
  const { isSidebarCollapsed } = useAppSelector((state) => state.ui);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation - Fixed */}
      <Navigation />

      <div className="pt-16">
        {/* Sidebar Navigation - Fixed height on desktop */}
        {isAuthenticated && (
          <div
            className={cn(
              "hidden md:block fixed top-16 bottom-0 left-0 z-30",
              isSidebarCollapsed ? "w-16" : "w-64",
            )}
          >
            <SimplifiedSidebarNav className="h-full" />
          </div>
        )}

        {/* Main Content - Offset for fixed sidebar on desktop */}
        <main
          className={cn(
            "overflow-auto",
            "p-4 md:p-6",
            "min-h-[calc(100vh-4rem)]",
            isAuthenticated
              ? isSidebarCollapsed
                ? "md:ml-16"
                : "md:ml-64"
              : "",
            className,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default UnifiedLayout;
