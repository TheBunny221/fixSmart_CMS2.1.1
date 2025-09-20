import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppSelector } from "../store/hooks";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "../components/ui/tooltip";
import HeatmapGrid, { HeatmapData } from "../components/charts/HeatmapGrid";
import { useComplaintTypes } from "../hooks/useComplaintTypes";
// Recharts components will be loaded dynamically to prevent module loading issues
import {
  CalendarDays,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Users,
  Zap,
  Filter,
  RefreshCw,
  Share2,
  FileSpreadsheet,
  Calendar,
  Info,
} from "lucide-react";
// date-fns and export utilities will be loaded dynamically

interface AnalyticsData {
  complaints: {
    total: number;
    resolved: number;
    pending: number;
    overdue: number;
  };
  sla: {
    compliance: number;
    avgResolutionTime: number;
    target: number;
  };
  trends: Array<{
    date: string;
    complaints: number;
    resolved: number;
    slaCompliance: number;
  }>;
  wards: Array<{
    id: string;
    name: string;
    complaints: number;
    resolved: number;
    avgTime: number;
    slaScore: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
    avgTime: number;
    color: string;
  }>;
  performance: {
    userSatisfaction: number;
    escalationRate: number;
    firstCallResolution: number;
    repeatComplaints: number;
  };
}

interface FilterOptions {
  dateRange: {
    from: string;
    to: string;
  };
  ward: string;
  complaintType: string;
  status: string;
  priority: string;
}

const UnifiedReports: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { translations } = useAppSelector((state) => state.language);
  const { appName, appLogoUrl, getConfig } = useSystemConfig();

  // Dynamic imports state
  const [rechartsLoaded, setRechartsLoaded] = useState(false);
  const [dateFnsLoaded, setDateFnsLoaded] = useState(false);
  const [exportUtilsLoaded, setExportUtilsLoaded] = useState(false);
  const [dynamicLibraries, setDynamicLibraries] = useState<any>({});
  const [libraryLoadError, setLibraryLoadError] = useState<string | null>(null);

  // Load dynamic libraries
  const loadDynamicLibraries = useCallback(async () => {
    try {
      // Load recharts
      if (!rechartsLoaded) {
        const recharts = await import("recharts");
        setDynamicLibraries((prev) => ({ ...prev, recharts }));
        setRechartsLoaded(true);
      }

      // Load date-fns
      if (!dateFnsLoaded) {
        const dateFns = await import("date-fns");
        setDynamicLibraries((prev) => ({ ...prev, dateFns }));
        setDateFnsLoaded(true);
      }

      // Load export utilities
      if (!exportUtilsLoaded) {
        const exportUtils = await import("../utils/exportUtils");
        setDynamicLibraries((prev) => ({ ...prev, exportUtils }));
        setExportUtilsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load dynamic libraries:", error);
      setLibraryLoadError(
        "Failed to load required libraries. Some features may not work.",
      );
    }
  }, [rechartsLoaded, dateFnsLoaded, exportUtilsLoaded]);

  // Load libraries on component mount
  useEffect(() => {
    loadDynamicLibraries();
  }, [loadDynamicLibraries]);

  // Date filters are initialized to the current month using native Date APIs
  // This avoids race conditions where the first fetch used only today's date
  // and resulted in empty analytics when there was no data for that single day.

  // State for filters - initialize with current month (YYYY-MM-DD)
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    return {
      dateRange: { from: firstDay, to: lastDay },
      ward: "all",
      complaintType: "all",
      status: "all",
      priority: "all",
    };
  });

  // State for data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [wards, setWards] = useState<Array<{ id: string; name: string }>>([]);
  const getWardNameById = useCallback(
    (wardId?: string | null) => {
      if (!wardId || wardId === "all") return "All Wards";
      if (user?.wardId && wardId === user.wardId)
        return user?.ward?.name || wardId;
      const found = wards.find((w) => w.id === wardId);
      return found?.name || wardId;
    },
    [user?.wardId, user?.ward?.name, wards],
  );
  const [wardsLoading, setWardsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAbortController, setReportAbortController] =
    useState<AbortController | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [didInitialFetch, setDidInitialFetch] = useState(false);

  // Get role-based access permissions
  const permissions = useMemo(() => {
    const role = user?.role;
    return {
      canViewAllWards: role === "ADMINISTRATOR",
      canViewMaintenanceTasks:
        role === "MAINTENANCE_TEAM" || role === "ADMINISTRATOR",
      canExportData: role === "ADMINISTRATOR" || role === "WARD_OFFICER",
      defaultWard: role === "WARD_OFFICER" ? user?.wardId : "all",
    };
  }, [user]);

  // Load wards for admin selector
  useEffect(() => {
    const loadWards = async () => {
      if (!permissions.canViewAllWards) return;
      setWardsLoading(true);
      try {
        const baseUrl = window.location.origin;
        const resp = await fetch(`${baseUrl}/api/users/wards`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const list = (data?.data || data)?.wards || data?.wards || data;
          if (Array.isArray(list)) {
            setWards(list.map((w: any) => ({ id: w.id, name: w.name })));
          }
        }
      } catch (e) {
        console.warn("Failed to load wards for selector", e);
      } finally {
        setWardsLoading(false);
      }
    };
    loadWards();
  }, [permissions.canViewAllWards]);

  // Apply role-based filter restrictions
  useEffect(() => {
    if (permissions.defaultWard !== "all") {
      setFilters((prev) => ({
        ...prev,
        ward: permissions.defaultWard,
      }));
    }
  }, [permissions.defaultWard]);

  // First load: fetch analytics for the initialized date range only once
  useEffect(() => {
    if (!user) return;
    if (didInitialFetch) return;

    if (filters.dateRange.from && filters.dateRange.to) {
      setDidInitialFetch(true);
      fetchAnalyticsData();
      fetchHeatmapData();
    }
  }, [user, didInitialFetch, filters.dateRange.from, filters.dateRange.to]);

  // Update heatmap dynamically on filter changes
  useEffect(() => {
    if (!user) return;
    if (!didInitialFetch) return;
    fetchHeatmapData();
  }, [filters, user, didInitialFetch]);

  // Memoized analytics fetching with debouncing
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        ...(filters.ward !== "all" && { ward: filters.ward }),
        ...(filters.complaintType !== "all" && { type: filters.complaintType }),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.priority !== "all" && { priority: filters.priority }),
      });

      // Enforce ward scope for Ward Officers
      if (user?.role === "WARD_OFFICER" && user?.wardId) {
        queryParams.set("ward", user.wardId);
      }

      console.log("Fetching analytics with params:", {
        filters,
        queryString: queryParams.toString(),
        url: `/api/reports/analytics?${queryParams}`,
      });

      // Use different endpoints based on user role
      let endpoint = "/api/reports/analytics";
      if (user?.role === "MAINTENANCE_TEAM") {
        endpoint = "/api/maintenance/analytics";
      }

      // Use absolute URL to match the deployed environment
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}${endpoint}?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics data: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Received analytics data:", data);

      // Transform the API response to match the expected format
      const transformedData = {
        complaints: {
          total: data.data?.complaints?.total || 0,
          resolved: data.data?.complaints?.resolved || 0,
          pending: data.data?.complaints?.pending || 0,
          overdue: data.data?.complaints?.overdue || 0,
        },
        sla: {
          compliance: data.data?.sla?.compliance || 0,
          avgResolutionTime: data.data?.sla?.avgResolutionTime || 0,
          target: data.data?.sla?.target || 3,
        },
        trends: data.data?.trends || [],
        wards: data.data?.wards || [],
        categories: data.data?.categories || [],
        performance: {
          userSatisfaction: data.data?.performance?.userSatisfaction || 0,
          escalationRate: data.data?.performance?.escalationRate || 0,
          firstCallResolution: data.data?.performance?.firstCallResolution || 0,
          repeatComplaints: data.data?.performance?.repeatComplaints || 0,
        },
      };

      setAnalyticsData(transformedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics data",
      );
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, user?.role]);

  // Disabled auto-fetch on filter changes; use Generate Report button instead

  // Do not auto clear analytics when filters change; wait for Generate Report

  // Complaint types for readable labels
  const {
    complaintTypes,
    isLoading: complaintTypesLoading,
    getComplaintTypeById,
    getComplaintTypeByName,
  } = useComplaintTypes();

  // Heatmap fetcher
  async function fetchHeatmapData() {
    setHeatmapLoading(true);
    try {
      const queryParams = new URLSearchParams({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        ...(filters.complaintType !== "all" && { type: filters.complaintType }),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.priority !== "all" && { priority: filters.priority }),
      } as Record<string, string>);
      // Enforce ward scope for Ward Officers; allow Admins to scope to a ward
      if (user?.role === "WARD_OFFICER" && user?.wardId) {
        queryParams.set("ward", user.wardId);
      } else if (
        user?.role === "ADMINISTRATOR" &&
        filters.ward &&
        filters.ward !== "all"
      ) {
        queryParams.set("ward", filters.ward);
      }
      const baseUrl = window.location.origin;
      const resp = await fetch(
        `${baseUrl}/api/reports/heatmap?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!resp.ok)
        throw new Error(`Failed to fetch heatmap: ${resp.statusText}`);
      const json = await resp.json();

      // Use server-provided labels directly (server returns display names)
      const apiData = json.data as HeatmapData & {
        xTypeKeys?: string[];
        meta?: any;
      };
      setHeatmapData(apiData as HeatmapData);
    } catch (e) {
      console.warn("Heatmap fetch failed", e);
      setHeatmapData({
        xLabels: [],
        yLabels: [],
        matrix: [],
        xAxisLabel: "",
        yAxisLabel: "",
      });
    } finally {
      setHeatmapLoading(false);
    }
  }

  // Export functionality with enhanced features
  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    if (!permissions.canExportData) {
      alert("You don't have permission to export data");
      return;
    }

    if (!analyticsData) {
      alert("No data available for export");
      return;
    }

    if (!exportUtilsLoaded || !dynamicLibraries.exportUtils) {
      alert(
        "Export functionality is still loading. Please try again in a moment.",
      );
      return;
    }

    setIsExporting(true);
    try {
      const {
        validateExportPermissions,
        exportToPDF,
        exportToExcel,
        exportToCSV,
      } = dynamicLibraries.exportUtils;

      const queryParams = new URLSearchParams({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        ...(filters.ward !== "all" && { ward: filters.ward }),
        ...(filters.complaintType !== "all" && { type: filters.complaintType }),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.priority !== "all" && { priority: filters.priority }),
      });

      // Enforce ward scope for Ward Officers
      if (user?.role === "WARD_OFFICER" && user?.wardId) {
        queryParams.set("ward", user.wardId);
      }

      // Validate export permissions based on role
      const requestedData = {
        includesOtherWards:
          filters.ward === "all" && user?.role !== "ADMINISTRATOR",
        includesUnassignedComplaints:
          user?.role === "MAINTENANCE_TEAM" && filters.ward === "all",
      };

      if (!validateExportPermissions(user?.role || "", requestedData)) {
        alert(
          "You don't have permission to export data outside your assigned scope",
        );
        return;
      }

      // Fetch detailed data for export with real-time backend call
      const baseUrl = window.location.origin;
      const response = await fetch(
        `${baseUrl}/api/reports/export?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch export data");
      }

      const exportData = await response.json();

      if (!exportData.success) {
        throw new Error(exportData.message || "Export failed");
      }

      // Prepare export options with system config
      const exportOptions = {
        systemConfig: {
          appName,
          appLogoUrl,
          complaintIdPrefix: getConfig("COMPLAINT_ID_PREFIX", "KSC"),
        },
        userRole: user?.role || "Unknown",
        userWard: user?.ward || permissions.defaultWard,
        includeCharts: true,
        maxRecords: user?.role === "ADMINISTRATOR" ? 1000 : 500,
      };

      // Use appropriate export utility based on format
      switch (format) {
        case "pdf":
          await exportToPDF(
            exportData.data,
            analyticsData.trends,
            analyticsData.categories,
            exportOptions,
          );
          break;
        case "excel":
          exportToExcel(
            exportData.data,
            analyticsData.trends,
            analyticsData.categories,
            exportOptions,
          );
          break;
        case "csv":
          exportToCSV(exportData.data, exportOptions);
          break;
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Generate custom report with countdown and cancellation
  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;

    setIsGeneratingReport(true);
    setShowReportModal(true);
    setReportProgress(0);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    setReportAbortController(abortController);

    try {
      // Start countdown timer - more realistic progression
      let progress = 0;
      const timer = setInterval(() => {
        progress += Math.random() * 3 + 1; // Random increment between 1-4
        if (progress > 95) progress = 95; // Cap at 95% until API responds
        setReportProgress(progress);
      }, 200); // Update every 200ms

      // Prepare query parameters
      const queryParams = new URLSearchParams({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        ...(filters.ward !== "all" && { ward: filters.ward }),
        ...(filters.complaintType !== "all" && { type: filters.complaintType }),
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.priority !== "all" && { priority: filters.priority }),
        detailed: "true",
      });

      // Enforce ward scope for Ward Officers
      if (user?.role === "WARD_OFFICER" && user?.wardId) {
        queryParams.set("ward", user.wardId);
      }

      // Make API call with abort signal
      const baseUrl = window.location.origin;
      const response = await fetch(
        `${baseUrl}/api/reports/analytics?${queryParams}`,
        {
          signal: abortController.signal,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const reportData = await response.json();

      // In parallel, refresh heatmap based on same filters
      fetchHeatmapData();

      // Clear timer
      clearInterval(timer);
      setReportProgress(100);

      // Wait a bit to show completion
      setTimeout(() => {
        setShowReportModal(false);
        setIsGeneratingReport(false);
        setReportAbortController(null);

        // Update analytics data with fresh report data
        setAnalyticsData(reportData.data);

        // Report completed successfully - no alert needed
        console.log(
          `Report generated successfully! Found ${reportData.data?.complaints?.total || 0} records based on applied filters.`,
        );
      }, 500);
    } catch (error) {
      clearInterval(timer);

      if (error.name === "AbortError") {
        console.log("Report generation cancelled by user");
      } else {
        console.error("Report generation error:", error);
        alert(`Failed to generate report: ${error.message}`);
      }

      setShowReportModal(false);
      setIsGeneratingReport(false);
      setReportAbortController(null);
      setReportProgress(0);
    }
  };

  // Cancel report generation
  const handleCancelReport = () => {
    if (reportAbortController) {
      reportAbortController.abort();
    }
    setShowReportModal(false);
    setIsGeneratingReport(false);
    setReportAbortController(null);
    setReportProgress(0);
  };

  // Calculate time period for chart titles
  const getTimePeriodLabel = useCallback(() => {
    if (!dateFnsLoaded || !dynamicLibraries.dateFns) {
      return `${filters.dateRange.from} - ${filters.dateRange.to}`;
    }

    try {
      const { format } = dynamicLibraries.dateFns;
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Format dates for display
      const formatDate = (date: Date) => format(date, "MMM dd, yyyy");
      const fromFormatted = formatDate(fromDate);
      const toFormatted = formatDate(toDate);

      // Determine period type
      if (diffDays <= 1) {
        return `${fromFormatted}`;
      } else if (diffDays <= 7) {
        return `Past Week (${fromFormatted} - ${toFormatted})`;
      } else if (diffDays <= 31) {
        return `Past Month (${fromFormatted} - ${toFormatted})`;
      } else if (diffDays <= 90) {
        return `Past 3 Months (${fromFormatted} - ${toFormatted})`;
      } else {
        return `${fromFormatted} - ${toFormatted}`;
      }
    } catch (error) {
      console.error("Error formatting date period:", error);
      return `${filters.dateRange.from} - ${filters.dateRange.to}`;
    }
  }, [filters.dateRange, dateFnsLoaded, dynamicLibraries.dateFns]);

  // Chart colors
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  // Memoized chart data processing for better performance
  const processedChartData = useMemo(() => {
    if (!analyticsData) return null;

    console.log("Processing chart data:", analyticsData);

    let trendsData = [];
    if (analyticsData.trends) {
      if (dateFnsLoaded && dynamicLibraries.dateFns) {
        try {
          const { format } = dynamicLibraries.dateFns;
          trendsData = analyticsData.trends.map((trend) => ({
            ...trend,
            date: format(new Date(trend.date), "MMM dd"),
            fullDate: format(new Date(trend.date), "MMM dd, yyyy"),
            rawDate: trend.date,
          }));
        } catch (error) {
          console.error("Error formatting trend dates:", error);
          trendsData = analyticsData.trends.map((trend) => ({
            ...trend,
            date: new Date(trend.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            fullDate: new Date(trend.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            rawDate: trend.date,
          }));
        }
      } else {
        // Fallback formatting without date-fns
        trendsData = analyticsData.trends.map((trend) => ({
          ...trend,
          date: new Date(trend.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          fullDate: new Date(trend.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          rawDate: trend.date,
        }));
      }
    }

    return {
      trendsData,
      categoriesWithColors:
        analyticsData.categories?.map((category, index) => ({
          ...category,
          color: COLORS[index % COLORS.length],
        })) || [],
      wardsData:
        analyticsData.wards?.map((ward) => ({
          ...ward,
          efficiency:
            ward.complaints > 0 ? (ward.resolved / ward.complaints) * 100 : 0,
        })) || [],
    };
  }, [analyticsData, filters, dateFnsLoaded, dynamicLibraries.dateFns]); // Added dependencies

  // Helper function to render charts with dynamic recharts
  const renderChart = (chartType: string, chartProps: any) => {
    if (!rechartsLoaded || !dynamicLibraries.recharts) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading chart...</p>
          </div>
        </div>
      );
    }

    try {
      const {
        ResponsiveContainer,
        AreaChart,
        Area,
        PieChart,
        Pie,
        Cell,
        BarChart,
        Bar,
        ComposedChart,
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip: RechartsTooltip,
        Legend,
      } = dynamicLibraries.recharts;

      const { data, ...otherProps } = chartProps;

      switch (chartType) {
        case "area":
          return (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...otherProps.xAxis} />
                <YAxis />
                <RechartsTooltip {...otherProps.tooltip} />
                <Legend />
                {otherProps.areas?.map((area: any, index: number) => (
                  <Area key={index} {...area} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        case "pie":
          return (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie {...otherProps.pie} data={data}>
                  {data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip {...otherProps.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          );
        case "bar":
          return (
            <ResponsiveContainer width="100%" height={otherProps.height || 300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...otherProps.xAxis} />
                <YAxis />
                <RechartsTooltip {...otherProps.tooltip} />
                <Legend />
                {otherProps.bars?.map((bar: any, index: number) => (
                  <Bar key={index} {...bar} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
        case "composed":
          return (
            <ResponsiveContainer width="100%" height={otherProps.height || 400}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...otherProps.xAxis} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip {...otherProps.tooltip} />
                <Legend />
                {otherProps.bars?.map((bar: any, index: number) => (
                  <Bar key={index} {...bar} />
                ))}
                {otherProps.lines?.map((line: any, index: number) => (
                  <Line key={index} {...line} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          );
        default:
          return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p>Chart type not supported</p>
            </div>
          );
      }
    } catch (error) {
      console.error("Error rendering chart:", error);
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p>Error loading chart</p>
          </div>
        </div>
      );
    }
  };

  if (isLoading && !analyticsData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (libraryLoadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Feature Loading Error</h2>
          <p className="text-gray-600 mb-4">{libraryLoadError}</p>
          <Button onClick={loadDynamicLibraries}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading Features
          </Button>
        </div>
      </div>
    );
  }

  if (!rechartsLoaded || !dateFnsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading chart libraries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <nav
          className="mb-2 text-xs text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1">
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium">Reports</li>
          </ol>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {translations?.reports?.title || "Reports & Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              {appName} –{" "}
              {user?.role === "ADMINISTRATOR"
                ? "Comprehensive system-wide insights and analytics"
                : user?.role === "WARD_OFFICER"
                  ? `Analytics for ${getWardNameById(user?.wardId)}`
                  : "Your assigned task analytics and performance metrics"}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-2" />
                Data Period: {getTimePeriodLabel()}
              </Badge>
              {user?.role === "WARD_OFFICER" && user?.wardId && (
                <Badge variant="outline" className="text-xs">
                  Ward: {getWardNameById(user.wardId)}
                </Badge>
              )}
            </div>
          </div>

          {permissions.canExportData && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={isExporting}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="sticky top-20 z-10 bg-card shadow-sm ring-1 ring-border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center text-base font-semibold">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-3">
            {/* Date Range */}
            <div className="col-span-1 lg:col-span-2">
              <Label>Date Range</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    size="sm"
                  >
                    <span>
                      {filters.dateRange.from} → {filters.dateRange.to}
                    </span>
                    <Calendar className="h-4 w-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px]" align="start">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="from-date-picker">From</Label>
                        <Input
                          id="from-date-picker"
                          type="date"
                          defaultValue={filters.dateRange.from}
                        />
                      </div>
                      <div>
                        <Label htmlFor="to-date-picker">To</Label>
                        <Input
                          id="to-date-picker"
                          type="date"
                          defaultValue={filters.dateRange.to}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDatePopoverOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const fromInput =
                            (
                              document.getElementById(
                                "from-date-picker",
                              ) as HTMLInputElement
                            )?.value || filters.dateRange.from;
                          const toInput =
                            (
                              document.getElementById(
                                "to-date-picker",
                              ) as HTMLInputElement
                            )?.value || filters.dateRange.to;
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: { from: fromInput, to: toInput },
                          }));
                          setDatePopoverOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ward Filter (only for admins) */}
            {permissions.canViewAllWards && (
              <div>
                <Label htmlFor="ward-filter">Ward</Label>
                <Select
                  value={filters.ward}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, ward: value }))
                  }
                >
                  <SelectTrigger disabled={wardsLoading || isLoading}>
                    <SelectValue
                      placeholder={
                        wardsLoading ? "Loading wards..." : "Select ward"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wards.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Complaint Type */}
            <div>
              <Label htmlFor="type-filter">Complaint Type</Label>
              <Select
                value={filters.complaintType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, complaintType: value }))
                }
              >
                <SelectTrigger disabled={isLoading}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="water">Water Supply</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="road">Road Repair</SelectItem>
                  <SelectItem value="garbage">Garbage Collection</SelectItem>
                  <SelectItem value="lighting">Street Lighting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger disabled={isLoading}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-2 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => {
                console.log("Resetting filters...");
                // Reset to original data range if available
                if (analyticsData?.trends && analyticsData.trends.length > 0) {
                  const dates = analyticsData.trends
                    .map((t) => new Date(t.date))
                    .sort((a, b) => a.getTime() - b.getTime());
                  // Use fallback date formatting
                  const earliestDate = dates[0].toISOString().split("T")[0];
                  const latestDate = dates[dates.length - 1]
                    .toISOString()
                    .split("T")[0];

                  setFilters({
                    dateRange: {
                      from: earliestDate,
                      to: latestDate,
                    },
                    ward: permissions.defaultWard,
                    complaintType: "all",
                    status: "all",
                    priority: "all",
                  });
                } else {
                  // Fallback to current month if no data
                  const now = new Date();
                  const firstDay = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1,
                  );
                  const lastDay = new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0,
                  );

                  setFilters({
                    dateRange: {
                      from: firstDay.toISOString().split("T")[0],
                      to: lastDay.toISOString().split("T")[0],
                    },
                    ward: permissions.defaultWard,
                    complaintType: "all",
                    status: "all",
                    priority: "all",
                  });
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {isGeneratingReport ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Key Metrics</h2>
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          {getTimePeriodLabel()}
        </Badge>
      </div>
      {isLoading && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          aria-live="polite"
        >
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {analyticsData && (
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Total Complaints
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      All complaints matching your selected filters and date
                      range.
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.complaints.total}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Resolved
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Number of complaints marked resolved in the selected
                      period. The rate shows Resolved ÷ Total.
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.complaints.resolved}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {(analyticsData.complaints.total > 0
                    ? (analyticsData.complaints.resolved /
                        analyticsData.complaints.total) *
                      100
                    : 0
                  ).toFixed(1)}
                  % resolution rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  SLA Compliance
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Average on‑time performance across complaint types, using
                      each type’s configured SLA hours.
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.sla.compliance}%
                </div>
                <Progress
                  value={analyticsData.sla.compliance}
                  className="mt-2"
                />
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Avg: {analyticsData.sla.avgResolutionTime} days
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Satisfaction
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Average citizen feedback rating during the selected
                      period.
                    </TooltipContent>
                  </UITooltip>
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.performance.userSatisfaction.toFixed(2)}/5
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +0.2 from last month
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>
      )}

      {/* Analytics Tabs */}
      {analyticsData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            {permissions.canViewAllWards && (
              <TabsTrigger value="wards">Ward Analysis</TabsTrigger>
            )}
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Complaints Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Complaints Trend</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTimePeriodLabel()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div id="trends-chart">
                    {processedChartData?.trendsData?.length > 0 ? (
                      renderChart("area", {
                        data: processedChartData.trendsData,
                        xAxis: {
                          dataKey: "date",
                          tick: { fontSize: 12 },
                          angle: -45,
                          textAnchor: "end",
                          height: 60,
                        },
                        tooltip: {
                          labelFormatter: (label: any, payload: any) => {
                            if (payload && payload[0]) {
                              return `Date: ${payload[0].payload.fullDate || label}`;
                            }
                            return `Date: ${label}`;
                          },
                          formatter: (value: any, name: any) => [
                            value,
                            name === "complaints"
                              ? "Total Complaints"
                              : "Resolved Complaints",
                          ],
                        },
                        areas: [
                          {
                            type: "monotone",
                            dataKey: "complaints",
                            stackId: "1",
                            stroke: "#8884d8",
                            fill: "#8884d8",
                          },
                          {
                            type: "monotone",
                            dataKey: "resolved",
                            stackId: "1",
                            stroke: "#82ca9d",
                            fill: "#82ca9d",
                          },
                        ],
                      })
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No trend data available for selected period</p>
                          <p className="text-sm font-medium">
                            {getTimePeriodLabel()}
                          </p>
                          <p className="text-xs">
                            Try adjusting your date range or filters
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Categories</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTimePeriodLabel()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div id="categories-chart">
                    {processedChartData?.categoriesWithColors?.length > 0 ? (
                      renderChart("pie", {
                        data: processedChartData.categoriesWithColors,
                        pie: {
                          cx: "50%",
                          cy: "50%",
                          labelLine: false,
                          label: ({ name, percent }: any) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`,
                          outerRadius: 80,
                          fill: "#8884d8",
                          dataKey: "count",
                        },
                        tooltip: {
                          formatter: (value: any, name: any) => [
                            `${value} complaints`,
                            name,
                          ],
                          labelFormatter: (label: any) => `Category: ${label}`,
                        },
                      })
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No category data available for selected period</p>
                          <p className="text-sm font-medium">
                            {getTimePeriodLabel()}
                          </p>
                          <p className="text-xs">
                            Try adjusting your filters or date range
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Heatmap */}
            {(user?.role === "ADMINISTRATOR" ||
              user?.role === "WARD_OFFICER") && (
              <div className="mt-6">
                <HeatmapGrid
                  title={
                    user?.role === "ADMINISTRATOR"
                      ? "Complaints × Wards Heatmap"
                      : "Complaints × Sub-zones Heatmap"
                  }
                  description={
                    user?.role === "ADMINISTRATOR"
                      ? "Distribution of complaints by type across all wards"
                      : `Distribution of complaints by type across sub-zones in ${getWardNameById(user?.wardId)}`
                  }
                  data={
                    heatmapData || {
                      xLabels: [],
                      yLabels: [],
                      matrix: [],
                      xAxisLabel: "Complaint Type",
                      yAxisLabel:
                        user?.role === "ADMINISTRATOR" ? "Ward" : "Sub-zone",
                    }
                  }
                />
                {heatmapLoading && (
                  <div className="h-8 flex items-center text-xs text-muted-foreground mt-2">
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> Updating
                    heatmap...
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Trends Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getTimePeriodLabel()}
                </p>
              </CardHeader>
              <CardContent>
                <div id="detailed-trends-chart">
                  {processedChartData?.trendsData?.length ? (
                    renderChart("composed", {
                      data: processedChartData.trendsData,
                      height: 400,
                      xAxis: {
                        dataKey: "date",
                        tick: { fontSize: 12 },
                        angle: -45,
                        textAnchor: "end",
                        height: 60,
                      },
                      tooltip: {
                        labelFormatter: (label: any, payload: any) => {
                          if (payload && payload[0]) {
                            return `Date: ${payload[0].payload.fullDate || label}`;
                          }
                          return `Date: ${label}`;
                        },
                        formatter: (value: any, name: any) => [
                          name === "slaCompliance" ? `${value}%` : value,
                          name === "slaCompliance" ? "SLA Compliance" : name,
                        ],
                      },
                      bars: [
                        {
                          yAxisId: "left",
                          dataKey: "complaints",
                          fill: "#8884d8",
                        },
                        {
                          yAxisId: "left",
                          dataKey: "resolved",
                          fill: "#82ca9d",
                        },
                      ],
                      lines: [
                        {
                          yAxisId: "right",
                          type: "monotone",
                          dataKey: "slaCompliance",
                          stroke: "#ff7300",
                        },
                      ],
                    })
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No trend data available for selected filters</p>
                        <p className="text-sm font-medium">
                          {getTimePeriodLabel()}
                        </p>
                        <p className="text-xs">
                          Try adjusting your date range or filters
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {/* <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTimePeriodLabel()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>User Satisfaction</span>
                      <Badge variant="outline">
                        {analyticsData.performance.userSatisfaction.toFixed(2)}
                        /5
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Escalation Rate</span>
                      <Badge variant="outline">
                        {analyticsData.performance.escalationRate.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>First Call Resolution</span>
                      <Badge variant="outline">
                        {analyticsData.performance.firstCallResolution.toFixed(
                          2,
                        )}
                        %
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Repeat Complaints</span>
                      <Badge variant="outline">
                        {analyticsData.performance.repeatComplaints.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card> */}

              <Card>
                <CardHeader>
                  <CardTitle>Resolution Time Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTimePeriodLabel()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div id="resolution-time-chart">
                    {(processedChartData?.categoriesWithColors?.length || 0) >
                    0 ? (
                      renderChart("bar", {
                        data: processedChartData?.categoriesWithColors || [],
                        xAxis: {
                          dataKey: "name",
                          tick: { fontSize: 11 },
                          angle: -45,
                          textAnchor: "end",
                          height: 80,
                        },
                        tooltip: {
                          formatter: (value: any) => [
                            `${value} days`,
                            "Avg Resolution Time",
                          ],
                          labelFormatter: (label: any) => `Category: ${label}`,
                        },
                        bars: [
                          {
                            dataKey: "avgTime",
                            fill: "#8884d8",
                            name: "Avg Resolution Time (days)",
                          },
                        ],
                      })
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>
                            No category metrics to display for selected filters
                          </p>
                          <p className="text-sm font-medium">
                            {getTimePeriodLabel()}
                          </p>
                          <p className="text-xs">
                            Refine filters to include more data
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ward Analysis Tab (Admin only) */}
          {permissions.canViewAllWards && (
            <TabsContent value="wards" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ward Performance Comparison</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTimePeriodLabel()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div id="ward-performance-chart">
                    {(processedChartData?.wardsData?.length || 0) > 0 ? (
                      renderChart("bar", {
                        data: processedChartData?.wardsData || [],
                        height: 400,
                        xAxis: {
                          dataKey: "name",
                          tick: { fontSize: 11 },
                          angle: -45,
                          textAnchor: "end",
                          height: 80,
                        },
                        bars: [
                          { dataKey: "complaints", fill: "#8884d8" },
                          { dataKey: "resolved", fill: "#82ca9d" },
                        ],
                      })
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No ward comparison data for current filters</p>
                          <p className="text-xs">
                            Adjust filters or date range
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getTimePeriodLabel()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(processedChartData?.categoriesWithColors || []).map(
                    (category, index) => (
                      <div
                        key={category.name}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{category.count} complaints</span>
                          <span>Avg: {category.avgTime} days</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Report Generation Modal */}
      <Dialog open={showReportModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Generating Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">
                Generating Report...
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Processing {getTimePeriodLabel()} data
              </div>

              {/* Circular Progress with Percentage */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full border-4 border-border">
                  <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {Math.floor(reportProgress)}%
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {reportProgress < 100
                  ? `Estimated time remaining: ${Math.max(0, Math.ceil((100 - reportProgress) * 0.05))} seconds`
                  : "Finalizing report..."}
              </div>
            </div>

            <div className="bg-muted border border-border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-foreground">
                  Report Scope
                </span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-medium">{getTimePeriodLabel()}</span>
                </div>
                {filters.ward !== "all" && (
                  <div className="flex justify-between">
                    <span>Ward:</span>
                    <span className="font-medium">
                      {getWardNameById(filters.ward)}
                    </span>
                  </div>
                )}
                {filters.complaintType !== "all" && (
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">{filters.complaintType}</span>
                  </div>
                )}
                {filters.status !== "all" && (
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium">{filters.status}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelReport}
              disabled={reportProgress >= 100}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedReports;
