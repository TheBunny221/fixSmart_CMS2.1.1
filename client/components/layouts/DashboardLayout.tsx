import React from "react";
import Navigation from "../Navigation";
import SimplifiedSidebarNav from "../ui/simplified-sidebar-nav";
import { cn } from "../../lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className,
}) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <Navigation />

      <div className="flex pt-16">
        {/* Sidebar Navigation */}
        <div className="sticky top-0 h-[calc(100vh-4rem)] overflow-y-auto">
          <SimplifiedSidebarNav />
        </div>

        {/* Main Content */}
        <main className={cn("flex-1 p-6 overflow-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
