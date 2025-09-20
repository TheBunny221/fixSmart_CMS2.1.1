import React, { useState } from "react";
import {
  useGetWardsWithBoundariesQuery,
  useUpdateWardBoundariesMutation,
} from "../store/api/wardApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import WardBoundaryManager from "../components/WardBoundaryManager";
import { useToast } from "../hooks/use-toast";
import { Map, MapPin, Info, AlertCircle, RefreshCw } from "lucide-react";

interface Ward {
  id: string;
  name: string;
  description?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  boundingBox?: string;
  subZones?: SubZone[];
  isActive: boolean;
}

interface SubZone {
  id: string;
  name: string;
  wardId: string;
  description?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  boundingBox?: string;
  isActive: boolean;
}

const AdminWardBoundaries: React.FC = () => {
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isBoundaryManagerOpen, setIsBoundaryManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API hooks
  const {
    data: wardsResponse,
    isLoading: isLoadingWards,
    error: wardsError,
    refetch,
  } = useGetWardsWithBoundariesQuery();

  const [updateBoundaries] = useUpdateWardBoundariesMutation();

  const wards = wardsResponse?.data || [];

  const handleOpenBoundaryManager = (ward: Ward) => {
    setSelectedWard(ward);
    setIsBoundaryManagerOpen(true);
    setError(null);
  };

  const toastHook = useToast();

  const handleSaveBoundaries = async (
    wardData: Ward,
    subZoneData?: SubZone[],
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await updateBoundaries({
        wardId: wardData.id,
        boundaries: wardData.boundaries,
        centerLat: wardData.centerLat,
        centerLng: wardData.centerLng,
        boundingBox: wardData.boundingBox,
        subZones: subZoneData?.map((sz) => ({
          id: sz.id,
          boundaries: sz.boundaries,
          centerLat: sz.centerLat,
          centerLng: sz.centerLng,
          boundingBox: sz.boundingBox,
        })),
      }).unwrap();

      await refetch();
      setIsBoundaryManagerOpen(false);
      setSelectedWard(null);
      toastHook.toast({
        title: "Saved",
        description: "Ward boundaries saved successfully",
      });
    } catch (err: any) {
      const msg =
        err.data?.message || err.message || "Failed to save boundaries";
      setError(msg);
      toastHook.toast({ title: "Error", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const getWardBoundaryStatus = (ward: Ward) => {
    const hasBoundary = ward.boundaries && ward.boundaries !== "null";
    const subZonesWithBoundaries =
      ward.subZones?.filter((sz) => sz.boundaries && sz.boundaries !== "null")
        .length || 0;
    const totalSubZones = ward.subZones?.length || 0;

    return {
      hasBoundary,
      subZonesWithBoundaries,
      totalSubZones,
    };
  };

  if (wardsError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load wards. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Map className="h-8 w-8 text-primary" />
            Ward Geographic Boundaries
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure geographic boundaries for wards and sub-zones to enable
            automatic location detection
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          disabled={isLoadingWards}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoadingWards ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Setting geographic boundaries allows the system to automatically
          detect which ward and sub-zone a complaint location belongs to. This
          improves the user experience and helps with automatic assignment of
          complaints to the appropriate officers.
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Wards Grid */}
      {isLoadingWards ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span>Loading wards...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wards.map((ward) => {
            const status = getWardBoundaryStatus(ward);
            return (
              <Card key={ward.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ward.name}</CardTitle>
                    <Badge
                      variant={status.hasBoundary ? "default" : "secondary"}
                    >
                      {status.hasBoundary ? "Configured" : "Not Set"}
                    </Badge>
                  </div>
                  {ward.description && (
                    <p className="text-sm text-muted-foreground">
                      {ward.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Boundary Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Ward Boundary:</span>
                      <Badge
                        variant={status.hasBoundary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {status.hasBoundary ? "Set" : "Not Set"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>Sub-Zone Boundaries:</span>
                      <Badge
                        variant={
                          status.subZonesWithBoundaries > 0
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {status.subZonesWithBoundaries}/{status.totalSubZones}
                      </Badge>
                    </div>
                  </div>

                  {/* Center Coordinates */}
                  {ward.centerLat && ward.centerLng && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      Center: {ward.centerLat.toFixed(4)},{" "}
                      {ward.centerLng.toFixed(4)}
                    </div>
                  )}

                  {/* Sub-Zones List */}
                  {ward.subZones && ward.subZones.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Sub-Zones:</p>
                      <div className="space-y-1">
                        {ward.subZones.map((subZone) => (
                          <div
                            key={subZone.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate">{subZone.name}</span>
                            <Badge
                              variant={
                                subZone.boundaries ? "default" : "outline"
                              }
                              className="text-xs"
                            >
                              {subZone.boundaries ? "Set" : "Not Set"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <Button
                    onClick={() => handleOpenBoundaryManager(ward)}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Map className="h-4 w-4 mr-2" />
                    {status.hasBoundary ? "Edit Boundaries" : "Set Boundaries"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Boundary Manager Dialog */}
      {selectedWard && (
        <WardBoundaryManager
          isOpen={isBoundaryManagerOpen}
          onClose={() => {
            setIsBoundaryManagerOpen(false);
            setSelectedWard(null);
            setError(null);
          }}
          ward={selectedWard}
          subZones={selectedWard.subZones || []}
          onSave={handleSaveBoundaries}
        />
      )}
    </div>
  );
};

export default AdminWardBoundaries;
