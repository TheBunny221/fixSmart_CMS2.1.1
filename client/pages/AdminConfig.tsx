import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { showSuccessToast, showErrorToast } from "../store/slices/uiSlice";
import { getApiErrorMessage } from "../store/api/baseApi";
import {
  useGetComplaintTypesQuery,
  useCreateComplaintTypeMutation,
  useUpdateComplaintTypeMutation,
  useDeleteComplaintTypeMutation,
} from "../store/api/complaintTypesApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Settings,
  Map,
  MapPin,
  FileText,
  Users,
  Clock,
  Mail,
  Phone,
  Database,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Globe,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import WardBoundaryManager from "../components/WardBoundaryManager";

interface Ward {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  subZones: SubZone[];
  _count?: {
    users: number;
    complaints: number;
  };
}

interface SubZone {
  id: string;
  name: string;
  wardId: string;
  description: string;
  isActive: boolean;
}

interface ComplaintType {
  id: string;
  name: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  slaHours: number;
  isActive: boolean;
}

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  type: "string" | "number" | "boolean" | "json";
}

const AdminConfig: React.FC = () => {
  const dispatch = useAppDispatch();
  const { translations } = useAppSelector((state) => state.language);
  const { user } = useAppSelector((state) => state.auth);

  // Get URL parameters for tab navigation
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "wards";

  // API queries
  const {
    data: complaintTypesResponse,
    isLoading: complaintTypesLoading,
    error: complaintTypesError,
    refetch: refetchComplaintTypes,
  } = useGetComplaintTypesQuery();
  const [createComplaintType] = useCreateComplaintTypeMutation();
  const [updateComplaintType] = useUpdateComplaintTypeMutation();
  const [deleteComplaintType] = useDeleteComplaintTypeMutation();

  // State management
  const [wards, setWards] = useState<Ward[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingSubZone, setEditingSubZone] = useState<SubZone | null>(null);
  const [editingComplaintType, setEditingComplaintType] =
    useState<ComplaintType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [isWardDialogOpen, setIsWardDialogOpen] = useState(false);
  const [isSubZoneDialogOpen, setIsSubZoneDialogOpen] = useState(false);
  const [isComplaintTypeDialogOpen, setIsComplaintTypeDialogOpen] =
    useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(
    null,
  );
  const [showAdvancedMap, setShowAdvancedMap] = useState(false);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadMode, setLogoUploadMode] = useState<"url" | "file">("url");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedWardForBoundary, setSelectedWardForBoundary] =
    useState<Ward | null>(null);
  const [isBoundaryManagerOpen, setIsBoundaryManagerOpen] = useState(false);

  // Reset logo upload state
  const resetLogoUploadState = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUploadMode("url");
  };

  // API calls with retry logic for rate limiting
  const apiCall = async (
    url: string,
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<any> => {
    const token = localStorage.getItem("token");
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    console.log(
      `[AdminConfig] Making API call to: ${url} (attempt ${retryCount + 1})`,
    );

    const response = await fetch(`/api${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    console.log(`[AdminConfig] Response for ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      contentType,
      isJson,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[AdminConfig] Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiCall(url, options, retryCount + 1);
      }

      if (isJson) {
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
          console.log(`[AdminConfig] Error response for ${url}:`, error);
        } catch {
          // Failed to parse JSON error response
          console.log(
            `[AdminConfig] Failed to parse JSON error response for ${url}`,
          );
        }
      } else {
        // Non-JSON response (likely HTML error page)
        const text = await response.text();
        console.log(
          `[AdminConfig] Non-JSON error response for ${url}:`,
          text.substring(0, 200),
        );
        if (text.includes("<!doctype") || text.includes("<html")) {
          errorMessage =
            "Server returned an error page. Please check your authentication and try again.";
        } else {
          errorMessage = text.substring(0, 100) || errorMessage;
        }
      }

      throw new Error(errorMessage);
    }

    if (!isJson) {
      const text = await response.text();
      console.log(
        `[AdminConfig] Non-JSON success response for ${url}:`,
        text.substring(0, 200),
      );
      throw new Error("Server returned non-JSON response. Expected JSON data.");
    }

    const data = await response.json();
    console.log(`[AdminConfig] Success response for ${url}:`, {
      success: data?.success,
      dataLength: Array.isArray(data?.data)
        ? data.data.length
        : typeof data?.data,
    });

    return data;
  };

  // Load data on component mount
  useEffect(() => {
    // Check if user is authenticated and has admin role
    if (!user) {
      dispatch(
        showErrorToast(
          "Authentication Required",
          "Please log in to access this page.",
        ),
      );
      setDataLoading(false);
      return;
    }

    if (user.role !== "ADMINISTRATOR") {
      dispatch(
        showErrorToast(
          "Access Denied",
          "Administrator privileges required to access this page.",
        ),
      );
      setDataLoading(false);
      return;
    }

    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setDataLoading(true);

    try {
      // Load wards (admin endpoint with flags to include isActive and subZones)
      let wardsResponse;
      try {
        wardsResponse = await apiCall("/users/wards?all=true&include=subzones");
        const wardsData = wardsResponse?.data?.wards || [];
        setWards(wardsData);
      } catch (error: any) {
        console.error("Failed to load wards:", error);
        if (error.message.includes("HTTP 429")) {
          dispatch(
            showErrorToast(
              "Rate Limit",
              "Too many requests. Please wait a moment and try again.",
            ),
          );
        }
        setWards([]);
      }

      // Add a small delay between API calls to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Complaint types are loaded via RTK Query hooks

      // Load system settings (admin-only endpoint)
      let settingsResponse;
      try {
        settingsResponse = await apiCall("/system-config");
        setSystemSettings(settingsResponse.data || []);
      } catch (error: any) {
        console.error("Failed to load system settings:", error);
        if (error.message.includes("HTTP 429")) {
          dispatch(
            showErrorToast(
              "Rate Limit",
              "Too many requests. Please wait a moment and try again.",
            ),
          );
        } else if (
          error.message.includes("Not authorized") ||
          error.message.includes("Authentication")
        ) {
          // This is expected for non-admin users, don't show error
          setSystemSettings([]);
        } else {
          // Unexpected error, show it
          dispatch(
            showErrorToast(
              "Settings Load Failed",
              `Failed to load system settings: ${error.message}`,
            ),
          );
          setSystemSettings([]);
        }
      }
    } catch (error: any) {
      console.error("Unexpected error during data loading:", error);
      dispatch(
        showErrorToast(
          "Load Failed",
          "An unexpected error occurred while loading data.",
        ),
      );
    } finally {
      setDataLoading(false);
    }
  };

  // Ward Management Functions
  const handleSaveWard = async (ward: Ward) => {
    setIsLoading(true);
    try {
      const wardData = {
        name: ward.name,
        description: ward.description,
        isActive: ward.isActive,
      };

      let response;
      if (ward.id && ward.id !== "") {
        // Update existing ward
        response = await apiCall(`/users/wards/${ward.id}`, {
          method: "PUT",
          body: JSON.stringify(wardData),
        });
        setWards((prev) =>
          prev.map((w) =>
            w.id === ward.id ? { ...ward, ...response.data } : w,
          ),
        );
      } else {
        // Create new ward
        response = await apiCall("/users/wards", {
          method: "POST",
          body: JSON.stringify(wardData),
        });
        setWards((prev) => [...prev, response.data]);
      }

      setEditingWard(null);
      setIsWardDialogOpen(false);
      dispatch(
        showSuccessToast(
          "Ward Saved",
          `Ward "${ward.name}" has been saved successfully.`,
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Save Failed",
          error.message || "Failed to save ward. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWard = async (wardId: string) => {
    if (!confirm("Are you sure you want to delete this ward?")) return;

    setIsLoading(true);
    try {
      await apiCall(`/users/wards/${wardId}`, { method: "DELETE" });
      setWards((prev) => prev.filter((w) => w.id !== wardId));

      dispatch(
        showSuccessToast("Ward Deleted", "Ward has been deleted successfully."),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Delete Failed",
          error.message || "Failed to delete ward. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Ward Boundary Management Function
  const handleSaveBoundaries = async (wardData: any) => {
    setIsLoading(true);
    try {
      // Update ward boundaries
      const response = await apiCall(`/wards/${wardData.wardId}/boundaries`, {
        method: "PUT",
        body: JSON.stringify(wardData),
      });

      // Update the ward in local state if needed
      setWards((prev) =>
        prev.map((ward) =>
          ward.id === wardData.wardId ? { ...ward, ...response.data } : ward,
        ),
      );

      setIsBoundaryManagerOpen(false);
      setSelectedWardForBoundary(null);

      dispatch(
        showSuccessToast(
          "Boundaries Saved",
          "Ward boundaries have been updated successfully.",
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Save Failed",
          error.message || "Failed to save ward boundaries. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sub-Zone Management Functions
  const handleSaveSubZone = async (subZone: SubZone) => {
    setIsLoading(true);
    try {
      const subZoneData = {
        name: subZone.name,
        description: subZone.description,
        isActive: subZone.isActive,
      };

      let response;
      if (subZone.id && subZone.id !== "") {
        // Update existing sub-zone
        response = await apiCall(
          `/users/wards/${subZone.wardId}/subzones/${subZone.id}`,
          {
            method: "PUT",
            body: JSON.stringify(subZoneData),
          },
        );
      } else {
        // Create new sub-zone
        response = await apiCall(`/users/wards/${subZone.wardId}/subzones`, {
          method: "POST",
          body: JSON.stringify(subZoneData),
        });
      }

      // Update wards state to include the new/updated sub-zone
      setWards((prev) =>
        prev.map((ward) => {
          if (ward.id === subZone.wardId) {
            const updatedSubZones = subZone.id
              ? ward.subZones.map((sz) =>
                  sz.id === subZone.id ? response.data : sz,
                )
              : [...ward.subZones, response.data];
            return { ...ward, subZones: updatedSubZones };
          }
          return ward;
        }),
      );

      setEditingSubZone(null);
      setIsSubZoneDialogOpen(false);
      dispatch(
        showSuccessToast(
          "Sub-Zone Saved",
          `Sub-zone "${subZone.name}" has been saved successfully.`,
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Save Failed",
          error.message || "Failed to save sub-zone. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubZone = async (wardId: string, subZoneId: string) => {
    if (!confirm("Are you sure you want to delete this sub-zone?")) return;

    setIsLoading(true);
    try {
      await apiCall(`/users/wards/${wardId}/subzones/${subZoneId}`, {
        method: "DELETE",
      });

      // Update wards state to remove the deleted sub-zone
      setWards((prev) =>
        prev.map((ward) => {
          if (ward.id === wardId) {
            return {
              ...ward,
              subZones: ward.subZones.filter((sz) => sz.id !== subZoneId),
            };
          }
          return ward;
        }),
      );

      dispatch(
        showSuccessToast(
          "Sub-Zone Deleted",
          "Sub-zone has been deleted successfully.",
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Delete Failed",
          error.message || "Failed to delete sub-zone. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Complaint Type Management Functions
  const handleSaveComplaintType = async (type: ComplaintType) => {
    setIsLoading(true);
    try {
      const typeData = {
        name: type.name,
        description: type.description,
        priority: type.priority,
        slaHours: type.slaHours,
        isActive: type.isActive,
      };

      console.log("Saving complaint type with data:", typeData);
      console.log("Original type object:", type);

      let result;
      if (type.id && type.id !== "") {
        // Update existing type
        console.log("Updating existing complaint type with ID:", type.id);
        result = await updateComplaintType({
          id: type.id,
          data: typeData,
        }).unwrap();
        console.log("Update result:", result);
      } else {
        // Create new type
        console.log("Creating new complaint type");
        result = await createComplaintType(typeData).unwrap();
        console.log("Create result:", result);
      }

      setEditingComplaintType(null);
      setIsComplaintTypeDialogOpen(false);

      // Force a refetch to ensure UI is updated
      await refetchComplaintTypes();

      dispatch(
        showSuccessToast(
          "Complaint Type Saved",
          `Complaint type "${type.name}" has been saved successfully. Active status: ${type.isActive ? "Active" : "Inactive"}`,
        ),
      );
    } catch (error: any) {
      console.error("Error saving complaint type:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.message,
        fullError: error,
      });

      const errorMessage = getApiErrorMessage(error);
      console.log("Extracted error message:", errorMessage);

      dispatch(showErrorToast("Error saving complaint type", errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick toggle for active status
  const handleToggleComplaintTypeStatus = async (type: ComplaintType) => {
    try {
      const updatedData = {
        name: type.name,
        description: type.description,
        priority: type.priority,
        slaHours: type.slaHours,
        isActive: !type.isActive, // Toggle the status
      };

      console.log(
        `Toggling complaint type ${type.name} to ${!type.isActive ? "Active" : "Inactive"}`,
      );

      await updateComplaintType({
        id: type.id,
        data: updatedData,
      }).unwrap();

      // Force a refetch to ensure UI is updated
      await refetchComplaintTypes();

      dispatch(
        showSuccessToast(
          "Status Updated",
          `${type.name} is now ${!type.isActive ? "Active" : "Inactive"}`,
        ),
      );
    } catch (error: any) {
      console.error("Error toggling complaint type status:", error);

      const errorMessage = getApiErrorMessage(error);

      dispatch(showErrorToast("Update Failed", errorMessage));
    }
  };

  const handleDeleteComplaintType = async (typeId: string) => {
    if (!confirm("Are you sure you want to delete this complaint type?"))
      return;

    setIsLoading(true);
    try {
      await deleteComplaintType(typeId).unwrap();

      dispatch(
        showSuccessToast(
          "Complaint Type Deleted",
          "Complaint type has been deleted successfully.",
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Delete Failed",
          error.message || "Failed to delete complaint type. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // System Settings Functions
  const handleUpdateSystemSetting = async (key: string, value: string) => {
    setIsLoading(true);
    try {
      const response = await apiCall(`/system-config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });

      setSystemSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value } : s)),
      );

      dispatch(
        showSuccessToast(
          "Setting Updated",
          `System setting "${key}" has been updated.`,
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Update Failed",
          error.message || "Failed to update system setting. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logo File Upload
  const handleLogoFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/uploads/logo", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();

      // Update the APP_LOGO_URL setting with the new file URL
      const logoSetting = systemSettings.find((s) => s.key === "APP_LOGO_URL");
      if (logoSetting) {
        const updatedSetting = { ...logoSetting, value: data.data.url };
        await handleSaveSystemSetting(updatedSetting);
      }

      return data.data.url;
    } catch (error: any) {
      throw error;
    }
  };

  const handleSaveSystemSetting = async (setting: SystemSetting) => {
    setIsLoading(true);
    try {
      const settingData = {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        type: setting.type,
      };

      let response;
      const existingSetting = systemSettings.find((s) => s.key === setting.key);

      if (existingSetting) {
        // Update existing setting
        response = await apiCall(`/system-config/${setting.key}`, {
          method: "PUT",
          body: JSON.stringify({
            value: setting.value,
            description: setting.description,
          }),
        });
        setSystemSettings((prev) =>
          prev.map((s) =>
            s.key === setting.key ? { ...setting, ...response.data } : s,
          ),
        );
      } else {
        // Create new setting
        response = await apiCall("/system-config", {
          method: "POST",
          body: JSON.stringify(settingData),
        });
        setSystemSettings((prev) => [...prev, response.data]);
      }

      setEditingSetting(null);
      setIsSettingDialogOpen(false);
      dispatch(
        showSuccessToast(
          "Setting Saved",
          `System setting "${setting.key}" has been saved successfully.`,
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Save Failed",
          error.message || "Failed to save system setting. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSystemSetting = async (key: string) => {
    if (!confirm("Are you sure you want to delete this system setting?"))
      return;

    setIsLoading(true);
    try {
      await apiCall(`/system-config/${key}`, { method: "DELETE" });
      setSystemSettings((prev) => prev.filter((s) => s.key !== key));

      dispatch(
        showSuccessToast(
          "Setting Deleted",
          "System setting has been deleted successfully.",
        ),
      );
    } catch (error: any) {
      dispatch(
        showErrorToast(
          "Delete Failed",
          error.message || "Failed to delete system setting. Please try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleWardExpansion = (wardId: string) => {
    setExpandedWards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wardId)) {
        newSet.delete(wardId);
      } else {
        newSet.add(wardId);
      }
      return newSet;
    });
  };

  const handleOpenBoundaryManager = (ward: Ward) => {
    setSelectedWardForBoundary(ward);
    setIsBoundaryManagerOpen(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the system configuration.
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== "ADMINISTRATOR") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Administrator privileges required to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configuration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">System Configuration</h1>
        <p className="text-gray-300">
          Manage wards, complaint types, system settings, and administrative
          controls
        </p>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wards">Wards & Zones</TabsTrigger>
          <TabsTrigger value="types">Complaint Types</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
          {/* <TabsTrigger value="advanced">Advanced</TabsTrigger> */}
        </TabsList>

        {/* Ward Management */}
        <TabsContent value="wards" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Ward Management
                </CardTitle>
                <Button
                  onClick={() => {
                    setEditingWard({
                      id: "",
                      name: "",
                      description: "",
                      isActive: true,
                      subZones: [],
                    });
                    setIsWardDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wards.map((ward) => (
                  <div key={ward.id} className="border rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWardExpansion(ward.id)}
                          >
                            {expandedWards.has(ward.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <h3 className="font-medium">{ward.name}</h3>
                            <p className="text-sm text-gray-600">
                              {ward.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {ward.subZones?.length || 0} zones
                          </Badge>
                          <Badge
                            className={
                              ward.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {ward.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenBoundaryManager(ward)}
                            title="Set Geographic Boundaries"
                          >
                            <Map className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingWard(ward);
                              setIsWardDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteWard(ward.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Sub-zones */}
                      {expandedWards.has(ward.id) && (
                        <div className="mt-4 pl-8 border-l-2 border-gray-200">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-sm">Sub-Zones</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSubZone({
                                  id: "",
                                  name: "",
                                  wardId: ward.id,
                                  description: "",
                                  isActive: true,
                                });
                                setIsSubZoneDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Sub-Zone
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {ward.subZones?.map((subZone) => (
                              <div
                                key={subZone.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <span className="text-sm font-medium">
                                    {subZone.name}
                                  </span>
                                  <p className="text-xs text-gray-600">
                                    {subZone.description}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={
                                      subZone.isActive ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {subZone.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingSubZone(subZone);
                                      setIsSubZoneDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleDeleteSubZone(ward.id, subZone.id)
                                    }
                                    disabled={isLoading}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )) || (
                              <p className="text-sm text-gray-500">
                                No sub-zones defined
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaint Types Management */}
        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Complaint Type Management
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => refetchComplaintTypes()}
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingComplaintType({
                        id: "",
                        name: "",
                        description: "",
                        priority: "MEDIUM",
                        slaHours: 48,
                        isActive: true,
                      });
                      setIsComplaintTypeDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Type
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>SLA (Hours)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaintTypesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading complaint types...
                      </TableCell>
                    </TableRow>
                  ) : complaintTypesError ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-4 text-red-600"
                      >
                        Failed to load complaint types. Please try again.
                      </TableCell>
                    </TableRow>
                  ) : complaintTypesResponse?.data?.length ? (
                    complaintTypesResponse.data.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">
                          {type.name}
                        </TableCell>
                        <TableCell>{type.description}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(type.priority)}>
                            {type.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{type.slaHours}h</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                type.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {type.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleToggleComplaintTypeStatus(type)
                              }
                              disabled={isLoading}
                              className="h-6 w-6 p-0"
                              title={`Make ${type.isActive ? "Inactive" : "Active"}`}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingComplaintType(type);
                                setIsComplaintTypeDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteComplaintType(type.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-4 text-gray-500"
                      >
                        No complaint types found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Application Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Application Settings
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const s = systemSettings.find((x) => x.key === "APP_NAME");
                      if (!s) return null;
                      return (
                        <div className="border rounded-lg p-4" key={s.key}>
                          <div className="mb-2">
                            <h4 className="font-medium">Application Name</h4>
                            <p className="text-sm text-gray-600">Shown in headers, emails and PDFs.</p>
                          </div>
                          <Input
                            type="text"
                            value={s.value}
                            onChange={(e) =>
                              setSystemSettings((prev) => prev.map((it) => (it.key === s.key ? { ...it, value: e.target.value } : it)))
                            }
                            onBlur={(e) => handleUpdateSystemSetting(s.key, e.target.value)}
                            placeholder="Enter application name"
                            className="max-w-md"
                          />
                        </div>
                      );
                    })()}
                    {(() => {
                      const s = systemSettings.find((x) => x.key === "APP_LOGO_URL");
                      if (!s) return null;
                      return (
                        <div className="border rounded-lg p-4" key={s.key}>
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Application Logo</h4>
                              <p className="text-sm text-gray-600">Use a public URL or upload a file. Uploading will automatically update the URL.</p>
                            </div>
                            {s.value && (
                              <img src={s.value} alt="Logo" className="h-10 w-10 object-contain border rounded ml-4" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                            )}
                          </div>

                          {/* URL/File mode toggle */}
                          <div className="flex gap-4 mb-3">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="url"
                                checked={logoUploadMode === "url"}
                                onChange={(e) => setLogoUploadMode(e.target.value as "url" | "file")}
                                className="form-radio"
                              />
                              <span>URL</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="file"
                                checked={logoUploadMode === "file"}
                                onChange={(e) => setLogoUploadMode(e.target.value as "url" | "file")}
                                className="form-radio"
                              />
                              <span>Upload File</span>
                            </label>
                          </div>

                          {logoUploadMode === "url" ? (
                            <Input
                              type="text"
                              value={s.value}
                              onChange={(e) =>
                                setSystemSettings((prev) => prev.map((it) => (it.key === s.key ? { ...it, value: e.target.value } : it)))
                              }
                              onBlur={(e) => handleUpdateSystemSetting(s.key, e.target.value)}
                              placeholder="https://.../logo.png"
                              className="max-w-md"
                            />
                          ) : (
                            <div className="space-y-2">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setLogoFile(file);
                                    const url = await handleLogoFileUpload(file);
                                    setSystemSettings((prev) => prev.map((it) => (it.key === s.key ? { ...it, value: url } : it)));
                                    resetLogoUploadState();
                                  }
                                }}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                              />
                              {logoPreview && (
                                <div className="mt-2">
                                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 object-contain border rounded" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {(() => {
                      const s = systemSettings.find((x) => x.key === "APP_LOGO_SIZE");
                      if (!s) return null;
                      return (
                        <div className="border rounded-lg p-4" key={s.key}>
                          <div className="mb-2">
                            <h4 className="font-medium">Logo Size</h4>
                            <p className="text-sm text-gray-600">Controls the displayed logo size (small/medium/large).</p>
                          </div>
                          <Select
                            value={s.value}
                            onValueChange={(value) => {
                              setSystemSettings((prev) => prev.map((it) => (it.key === s.key ? { ...it, value } : it)));
                              handleUpdateSystemSetting(s.key, value);
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Complaint ID Configuration */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Complaint ID Configuration
                  </h3>
                  <div className="space-y-4">
                    {systemSettings
                      .filter((s) => s.key.startsWith("COMPLAINT_ID"))
                      .map((setting) => (
                        <div
                          key={setting.key}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{setting.key}</h4>
                              <p className="text-sm text-gray-600">
                                {setting.description}
                              </p>
                            </div>

                          </div>
                          <div className="mt-3">
                            <Input
                              type={
                                setting.type === "number" ? "number" : "text"
                              }
                              value={setting.value}
                              onChange={(e) =>
                                setSystemSettings((prev) =>
                                  prev.map((s) =>
                                    s.key === setting.key
                                      ? { ...s, value: e.target.value }
                                      : s,
                                  ),
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateSystemSetting(
                                  setting.key,
                                  e.target.value,
                                )
                              }
                              placeholder={`Enter ${setting.type} value`}
                              className="max-w-md"
                            />
                          </div>
                        </div>
                      ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">
                            Complaint ID Preview
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            With current settings, new complaint IDs will look
                            like:
                            <span className="font-mono bg-white px-2 py-1 rounded border ml-2">
                              {systemSettings.find(
                                (s) => s.key === "COMPLAINT_ID_PREFIX",
                              )?.value || "KSC"}
                              {(
                                parseInt(
                                  systemSettings.find(
                                    (s) =>
                                      s.key === "COMPLAINT_ID_START_NUMBER",
                                  )?.value,
                                ) || 1
                              )
                                .toString()
                                .padStart(
                                  parseInt(
                                    systemSettings.find(
                                      (s) => s.key === "COMPLAINT_ID_LENGTH",
                                    )?.value,
                                  ) || 4,
                                  "0",
                                )}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complaint Management Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Complaint Management
                  </h3>
                  <div className="space-y-4">
                    {systemSettings
                      .filter((s) => s.key === "AUTO_ASSIGN_COMPLAINTS")
                      .map((setting) => (
                        <div
                          key={setting.key}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">
                                Auto-Assign Complaints
                              </h4>
                              <p className="text-sm text-gray-600">
                                When enabled, complaints will be automatically
                                assigned to Ward Officers based on the ward
                                location
                              </p>
                            </div>

                          </div>
                          <div className="mt-3">
                            <Select
                              value={setting.value}
                              onValueChange={(value) => {
                                setSystemSettings((prev) =>
                                  prev.map((s) =>
                                    s.key === setting.key
                                      ? { ...s, value: value }
                                      : s,
                                  ),
                                );
                                handleUpdateSystemSetting(setting.key, value);
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Enabled</SelectItem>
                                <SelectItem value="false">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}

                    {/* Auto-assign info card */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">
                            How Auto-Assignment Works
                          </h4>
                          <div className="text-sm text-green-700 mt-1 space-y-1">
                            <p>
                              • When a complaint is submitted by a citizen, it
                              gets automatically assigned to a Ward Officer in
                              that ward
                            </p>
                            <p>
                              • When an admin creates a complaint, it also gets
                              auto-assigned to the respective Ward Officer
                            </p>
                            <p>
                              • If disabled, complaints remain in "Registered"
                              status until manually assigned
                            </p>
                            <p>
                              • Ward Officers can then assign complaints to
                              Maintenance Team members
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map & Location Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Map & Location Settings
                  </h3>
                  <div className="space-y-4">
                    {systemSettings.filter((s) => s.key.startsWith("MAP_")).length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        No map settings configured yet.
                      </div>
                    )}
                    {/* Core map settings */}
                    {systemSettings
                      .filter((s) => ["MAP_SEARCH_PLACE","MAP_DEFAULT_LAT","MAP_DEFAULT_LNG"].includes(s.key))
                      .map((setting) => (
                        <div key={setting.key} className="border rounded-lg p-4">
                          <div className="mb-2">
                            <h4 className="font-medium">{({MAP_SEARCH_PLACE:"Search Place Context",MAP_DEFAULT_LAT:"Default Latitude",MAP_DEFAULT_LNG:"Default Longitude",MAP_COUNTRY_CODES:"Country Codes (ISO2, comma-separated)",MAP_BBOX_NORTH:"Bounding Box North",MAP_BBOX_SOUTH:"Bounding Box South",MAP_BBOX_EAST:"Bounding Box East",MAP_BBOX_WEST:"Bounding Box West"} as any)[setting.key] || setting.key}</h4>
                            <p className="text-sm text-gray-600">{setting.description}</p>
                          </div>
                          <Input
                            type={setting.type === "number" ? "number" : "text"}
                            value={setting.value}
                            onChange={(e) =>
                              setSystemSettings((prev) =>
                                prev.map((s) => (s.key === setting.key ? { ...s, value: e.target.value } : s)),
                              )
                            }
                            onBlur={(e) => handleUpdateSystemSetting(setting.key, e.target.value)}
                            placeholder={`Enter ${setting.type} value`}
                            className="max-w-md"
                          />
                        </div>
                      ))}

                    {/* Advanced map settings */}
                    <div>
                      <Button variant="outline" size="sm" onClick={() => setShowAdvancedMap((v) => !v)}>
                        {showAdvancedMap ? "Hide Advanced Map Settings" : "Show Advanced Map Settings"}
                      </Button>
                      {showAdvancedMap && (
                        <div className="mt-3 space-y-4">
                          {systemSettings
                            .filter(
                              (s) =>
                                s.key.startsWith("MAP_") &&
                                !["MAP_SEARCH_PLACE","MAP_DEFAULT_LAT","MAP_DEFAULT_LNG"].includes(s.key),
                            )
                            .map((setting) => (
                              <div key={setting.key} className="border rounded-lg p-4">
                                <div className="mb-2">
                                  <h4 className="font-medium">{({MAP_SEARCH_PLACE:"Search Place Context",MAP_DEFAULT_LAT:"Default Latitude",MAP_DEFAULT_LNG:"Default Longitude",MAP_COUNTRY_CODES:"Country Codes (ISO2, comma-separated)",MAP_BBOX_NORTH:"Bounding Box North",MAP_BBOX_SOUTH:"Bounding Box South",MAP_BBOX_EAST:"Bounding Box East",MAP_BBOX_WEST:"Bounding Box West"} as any)[setting.key] || setting.key}</h4>
                            <p className="text-sm text-gray-600">{setting.description}</p>
                                </div>
                                <Input
                                  type={setting.type === "number" ? "number" : "text"}
                                  value={setting.value}
                                  onChange={(e) =>
                                    setSystemSettings((prev) =>
                                      prev.map((s) => (s.key === setting.key ? { ...s, value: e.target.value } : s)),
                                    )
                                  }
                                  onBlur={(e) => handleUpdateSystemSetting(setting.key, e.target.value)}
                                  placeholder={`Enter ${setting.type} value`}
                                  className="max-w-md"
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    {systemSettings
                      .filter((s) => s.key.startsWith("CONTACT_"))
                      .map((setting) => (
                        <div
                          key={setting.key}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{({CONTACT_HELPLINE:"Helpline Number",CONTACT_EMAIL:"Support Email",CONTACT_OFFICE_HOURS:"Office Hours",CONTACT_OFFICE_ADDRESS:"Office Address"} as any)[setting.key] || setting.key}</h4>
                              <p className="text-sm text-gray-600">
                                {setting.description}
                              </p>
                            </div>

                          </div>
                          <div className="mt-3">
                            <Input
                              type="text"
                              value={setting.value}
                              onChange={(e) =>
                                setSystemSettings((prev) =>
                                  prev.map((s) =>
                                    s.key === setting.key
                                      ? { ...s, value: e.target.value }
                                      : s,
                                  ),
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateSystemSetting(
                                  setting.key,
                                  e.target.value,
                                )
                              }
                              placeholder={`Enter ${setting.type} value`}
                              className="max-w-md"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Restore Database
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Optimize Tables
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Password Policies
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Session Management
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Security Logs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  SMTP Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Email Templates
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Version:</span> 1.0.0
                  </p>
                  <p>
                    <span className="font-medium">Environment:</span> Production
                  </p>
                  <p>
                    <span className="font-medium">Uptime:</span> 7 days
                  </p>
                </div>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ward Dialog */}
      <Dialog open={isWardDialogOpen} onOpenChange={setIsWardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWard?.id ? "Edit Ward" : "Add New Ward"}
            </DialogTitle>
          </DialogHeader>
          {editingWard && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="wardName">Ward Name</Label>
                <Input
                  id="wardName"
                  value={editingWard.name || ""}
                  onChange={(e) =>
                    setEditingWard({
                      ...editingWard,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter ward name"
                />
              </div>
              <div>
                <Label htmlFor="wardDescription">Description</Label>
                <Textarea
                  id="wardDescription"
                  value={editingWard.description || ""}
                  onChange={(e) =>
                    setEditingWard({
                      ...editingWard,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter ward description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wardActive"
                  checked={editingWard.isActive}
                  onCheckedChange={(checked) =>
                    setEditingWard({
                      ...editingWard,
                      isActive: !!checked,
                    })
                  }
                />
                <Label htmlFor="wardActive">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingWard(null);
                    setIsWardDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveWard(editingWard)}
                  disabled={isLoading || !editingWard.name}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ward Boundary Manager */}
      {selectedWardForBoundary && (
        <WardBoundaryManager
          isOpen={isBoundaryManagerOpen}
          onClose={() => {
            setIsBoundaryManagerOpen(false);
            setSelectedWardForBoundary(null);
          }}
          ward={selectedWardForBoundary}
          subZones={selectedWardForBoundary.subZones || []}
          onSave={handleSaveBoundaries}
        />
      )}

      {/* Sub-Zone Dialog */}
      <Dialog open={isSubZoneDialogOpen} onOpenChange={setIsSubZoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubZone?.id ? "Edit Sub-Zone" : "Add New Sub-Zone"}
            </DialogTitle>
          </DialogHeader>
          {editingSubZone && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subZoneName">Sub-Zone Name</Label>
                <Input
                  id="subZoneName"
                  value={editingSubZone.name || ""}
                  onChange={(e) =>
                    setEditingSubZone({
                      ...editingSubZone,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter sub-zone name"
                />
              </div>
              <div>
                <Label htmlFor="subZoneDescription">Description</Label>
                <Textarea
                  id="subZoneDescription"
                  value={editingSubZone.description || ""}
                  onChange={(e) =>
                    setEditingSubZone({
                      ...editingSubZone,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter sub-zone description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subZoneActive"
                  checked={editingSubZone.isActive}
                  onCheckedChange={(checked) =>
                    setEditingSubZone({
                      ...editingSubZone,
                      isActive: !!checked,
                    })
                  }
                />
                <Label htmlFor="subZoneActive">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSubZone(null);
                    setIsSubZoneDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveSubZone(editingSubZone)}
                  disabled={isLoading || !editingSubZone.name}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complaint Type Dialog */}
      <Dialog
        open={isComplaintTypeDialogOpen}
        onOpenChange={setIsComplaintTypeDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingComplaintType?.id
                ? "Edit Complaint Type"
                : "Add New Complaint Type"}
            </DialogTitle>
          </DialogHeader>
          {editingComplaintType && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="typeName">Type Name</Label>
                <Input
                  id="typeName"
                  value={editingComplaintType.name || ""}
                  onChange={(e) =>
                    setEditingComplaintType({
                      ...editingComplaintType,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter complaint type name"
                />
              </div>
              <div>
                <Label htmlFor="typeDescription">Description</Label>
                <Textarea
                  id="typeDescription"
                  value={editingComplaintType.description || ""}
                  onChange={(e) =>
                    setEditingComplaintType({
                      ...editingComplaintType,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter type description"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={editingComplaintType.priority || "MEDIUM"}
                  onValueChange={(
                    value: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                  ) =>
                    setEditingComplaintType({
                      ...editingComplaintType,
                      priority: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="slaHours">SLA Hours</Label>
                <Input
                  id="slaHours"
                  type="number"
                  value={editingComplaintType.slaHours?.toString() || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === "" ? 48 : parseInt(value, 10);
                    setEditingComplaintType({
                      ...editingComplaintType,
                      slaHours: isNaN(numValue) ? 48 : numValue,
                    });
                  }}
                  placeholder="Enter SLA hours"
                  min="1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="typeActive"
                  checked={editingComplaintType.isActive}
                  onCheckedChange={(checked) =>
                    setEditingComplaintType({
                      ...editingComplaintType,
                      isActive: !!checked,
                    })
                  }
                />
                <Label htmlFor="typeActive">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingComplaintType(null);
                    setIsComplaintTypeDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveComplaintType(editingComplaintType)}
                  disabled={isLoading || !editingComplaintType.name}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* System Setting Dialog */}
      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSetting?.key &&
              systemSettings.find((s) => s.key === editingSetting.key)
                ? "Edit System Setting"
                : "Add New System Setting"}
            </DialogTitle>
          </DialogHeader>
          {editingSetting && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="settingKey">Setting Key</Label>
                <Input
                  id="settingKey"
                  value={editingSetting.key || ""}
                  onChange={(e) =>
                    setEditingSetting({
                      ...editingSetting,
                      key: e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9_]/g, "_"),
                    })
                  }
                  placeholder="SETTING_KEY"
                  disabled={
                    !!systemSettings.find((s) => s.key === editingSetting.key)
                  }
                />
              </div>
              <div>
                <Label htmlFor="settingValue">Value</Label>
                {editingSetting.key === "APP_LOGO_URL" ? (
                  <div className="space-y-4">
                    {/* Mode Selection */}
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="url"
                          checked={logoUploadMode === "url"}
                          onChange={(e) =>
                            setLogoUploadMode(e.target.value as "url" | "file")
                          }
                          className="form-radio"
                        />
                        <span>URL</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="file"
                          checked={logoUploadMode === "file"}
                          onChange={(e) =>
                            setLogoUploadMode(e.target.value as "url" | "file")
                          }
                          className="form-radio"
                        />
                        <span>Upload File</span>
                      </label>
                    </div>

                    {logoUploadMode === "url" ? (
                      <Input
                        id="settingValue"
                        value={editingSetting.value}
                        onChange={(e) =>
                          setEditingSetting({
                            ...editingSetting,
                            value: e.target.value,
                          })
                        }
                        placeholder="Enter logo URL (e.g., https://example.com/logo.png)"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setLogoFile(file);
                              // Create preview
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setLogoPreview(e.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        {logoPreview && (
                          <div className="mt-2">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-16 w-16 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current logo preview */}
                    {editingSetting.value &&
                      editingSetting.value !== "/logo.png" && (
                        <div className="mt-2">
                          <Label>Current Logo:</Label>
                          <img
                            src={editingSetting.value}
                            alt="Current logo"
                            className="h-16 w-16 object-contain border rounded mt-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                  </div>
                ) : editingSetting.key === "APP_LOGO_SIZE" ? (
                  <Select
                    value={editingSetting.value}
                    onValueChange={(value) =>
                      setEditingSetting({
                        ...editingSetting,
                        value: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select logo size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="settingValue"
                    value={editingSetting.value}
                    onChange={(e) =>
                      setEditingSetting({
                        ...editingSetting,
                        value: e.target.value,
                      })
                    }
                    placeholder="Setting value"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="settingDescription">Description</Label>
                <Textarea
                  id="settingDescription"
                  value={editingSetting.description || ""}
                  onChange={(e) =>
                    setEditingSetting({
                      ...editingSetting,
                      description: e.target.value,
                    })
                  }
                  placeholder="Setting description"
                />
              </div>
              <div>
                <Label htmlFor="settingType">Type</Label>
                <Select
                  value={editingSetting.type || "string"}
                  onValueChange={(
                    value: "string" | "number" | "boolean" | "json",
                  ) =>
                    setEditingSetting({
                      ...editingSetting,
                      type: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSetting(null);
                    setIsSettingDialogOpen(false);
                    resetLogoUploadState();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (
                      editingSetting.key === "APP_LOGO_URL" &&
                      logoUploadMode === "file" &&
                      logoFile
                    ) {
                      try {
                        setIsLoading(true);
                        await handleLogoFileUpload(logoFile);
                        // Reset file upload state
                        setLogoFile(null);
                        setLogoPreview(null);
                        setLogoUploadMode("url");
                        setEditingSetting(null);
                        setIsSettingDialogOpen(false);
                        dispatch(
                          showSuccessToast(
                            "Logo Uploaded",
                            "App logo has been uploaded and updated successfully.",
                          ),
                        );
                        // Refresh system settings
                        await loadAllData();
                      } catch (error: any) {
                        dispatch(
                          showErrorToast(
                            "Upload Failed",
                            error.message ||
                              "Failed to upload logo. Please try again.",
                          ),
                        );
                      } finally {
                        setIsLoading(false);
                      }
                    } else {
                      await handleSaveSystemSetting(editingSetting);
                    }
                  }}
                  disabled={
                    isLoading ||
                    !editingSetting.key ||
                    (logoUploadMode === "file" &&
                    editingSetting.key === "APP_LOGO_URL"
                      ? !logoFile
                      : !editingSetting.value)
                  }
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConfig;
