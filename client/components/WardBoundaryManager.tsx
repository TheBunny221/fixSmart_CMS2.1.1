import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  MapPin,
  Navigation,
  Save,
  Trash2,
  Info,
  RotateCcw,
  Square,
  AlertCircle,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface Ward {
  id: string;
  name: string;
  description?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  boundingBox?: string;
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
}

interface WardBoundaryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  ward: Ward;
  subZones?: SubZone[];
  onSave: (wardData: Ward, subZoneData?: SubZone[]) => void;
}

const WardBoundaryManager: React.FC<WardBoundaryManagerProps> = ({
  isOpen,
  onClose,
  ward,
  subZones = [],
  onSave,
}) => {
  // Default to Kochi, India coordinates
  const defaultCenter = { lat: 9.9312, lng: 76.2673 };
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const drawingRef = useRef<any>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [wardBoundary, setWardBoundary] = useState<any[]>([]);
  const [subZoneBoundaries, setSubZoneBoundaries] = useState<{
    [key: string]: any[];
  }>({});
  const [editingMode, setEditingMode] = useState<"ward" | "subzone" | null>(
    null,
  );
  const [selectedSubZone, setSelectedSubZone] = useState<string | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState(
    ward.centerLat && ward.centerLng
      ? { lat: ward.centerLat, lng: ward.centerLng }
      : defaultCenter,
  );
  const [livePreview, setLivePreview] = useState<[number, number][]>([]);
  const [livePreviewSub, setLivePreviewSub] = useState<[number, number][]>([]);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        // Dynamically import leaflet and plugins
        const leafletModule = await import("leaflet");
        const L = (leafletModule as any).default ?? leafletModule;

        // Expose L to window since many leaflet plugins expect a global L
        if (typeof window !== "undefined") {
          (window as any).L = L;
        }

        // Import leaflet-draw and its CSS; attach to the global L
        try {
          await import("leaflet-draw");
          try {
            await import("leaflet-draw/dist/leaflet.draw.css");
          } catch (cssErr) {
            console.warn("Could not load leaflet-draw CSS:", cssErr);
          }
        } catch (drawError) {
          console.warn(
            "Leaflet-draw failed to load, drawing features may be limited:",
            drawError,
          );
        }

        // Set up the default icon
        const DefaultIcon = L.icon({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        // Create map if it doesn't exist
        if (!leafletMapRef.current && mapRef.current) {
          leafletMapRef.current = new L.Map(mapRef.current, {
            center: [centerCoordinates.lat, centerCoordinates.lng],
            zoom: 13,
            scrollWheelZoom: true,
            preferCanvas: true,
          });

          // Add tile layer
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(leafletMapRef.current);

          // Create feature groups for drawn layers
          const drawnItems = new L.FeatureGroup();
          leafletMapRef.current.addLayer(drawnItems);

          // Add drawing controls only if plugin is available
          const hasDrawControl =
            !!(L as any).Control && !!(L as any).Control.Draw;
          let drawControl: any = null;

          if (hasDrawControl) {
            drawControl = new (L as any).Control.Draw({
              position: "topright",
              draw: {
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: "#e1e100",
                    message:
                      "<strong>Error:</strong> Shape edges cannot cross!",
                  },
                  shapeOptions: {
                    color: "#2563eb",
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                  },
                },
                rectangle: {
                  shapeOptions: {
                    color: "#dc2626",
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                  },
                },
                circle: false,
                marker: false,
                polyline: false,
                circlemarker: false,
              },
              edit: {
                featureGroup: drawnItems,
                remove: true,
              },
            });

            leafletMapRef.current.addControl(drawControl);
          } else {
            console.warn(
              "Leaflet-draw control not available; drawing disabled.",
            );
          }

          drawingRef.current = { drawnItems, drawControl };

          // Handle drawing events only if draw plugin is available
          if (hasDrawControl) {
            // Use plugin's constant if available, otherwise fallback to the string event
            const drawCreatedEvent =
              (L as any).Draw?.Event?.CREATED ?? "draw:created";
            const drawEditedEvent =
              (L as any).Draw?.Event?.EDITED ?? "draw:edited";
            const drawDeletedEvent =
              (L as any).Draw?.Event?.DELETED ?? "draw:deleted";
            const drawVertexEvent =
              (L as any).Draw?.Event?.DRAWVERTEX ?? "draw:drawvertex";

            leafletMapRef.current.on(drawCreatedEvent, (e: any) => {
              const { layer, layerType } = e;

              // Ensure the new layer is added to the drawn items group
              drawnItems.addLayer(layer);

              if (editingMode === "ward") {
                // Replace existing ward boundary
                setWardBoundary([]);
                // remove previous layers leaving only the new one
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);

                if (layerType === "polygon" || layerType === "rectangle") {
                  const coords = layer
                    .getLatLngs()[0]
                    .map((latlng: any) => [latlng.lat, latlng.lng]);
                  setWardBoundary(coords);

                  // Calculate center
                  const center = calculatePolygonCenter(coords);
                  setCenterCoordinates(center);
                }
              } else if (editingMode === "subzone" && selectedSubZone) {
                // Replace boundary for this subzone
                const newBoundaries = { ...subZoneBoundaries };
                newBoundaries[selectedSubZone] = [];
                setSubZoneBoundaries(newBoundaries);

                drawnItems.addLayer(layer);

                if (layerType === "polygon" || layerType === "rectangle") {
                  const coords = layer
                    .getLatLngs()[0]
                    .map((latlng: any) => [latlng.lat, latlng.lng]);
                  setSubZoneBoundaries((prev) => ({
                    ...prev,
                    [selectedSubZone]: coords,
                  }));
                }
              }
            });

            // Handle edits
            leafletMapRef.current.on(drawEditedEvent, (e: any) => {
              const layers = e.layers;
              layers.eachLayer((layer: any) => {
                const coords = layer
                  .getLatLngs()[0]
                  .map((latlng: any) => [latlng.lat, latlng.lng]);
                if (editingMode === "ward") {
                  setWardBoundary(coords);
                  setCenterCoordinates(calculatePolygonCenter(coords));
                } else if (editingMode === "subzone" && selectedSubZone) {
                  setSubZoneBoundaries((prev) => ({
                    ...prev,
                    [selectedSubZone]: coords,
                  }));
                }
              });
            });

            // Handle deletions
            leafletMapRef.current.on(drawDeletedEvent, (e: any) => {
              const layers = e.layers;
              layers.eachLayer((layer: any) => {
                // if deleted, clear current editing target
                if (editingMode === "ward") {
                  setWardBoundary([]);
                } else if (editingMode === "subzone" && selectedSubZone) {
                  setSubZoneBoundaries((prev) => {
                    const copy = { ...prev };
                    delete copy[selectedSubZone];
                    return copy;
                  });
                }
              });
            });

            // Live preview while drawing
            leafletMapRef.current.on(drawVertexEvent, (e: any) => {
              try {
                const latlngs =
                  e?.layers?.getLayers?.()[0]?.getLatLngs?.()[0] ??
                  e?.layer?.getLatLngs?.()[0] ??
                  [];
                const coords = latlngs.map((latlng: any) => [
                  latlng.lat,
                  latlng.lng,
                ]);
                // Show live preview in ward or subzone state without committing
                if (editingMode === "ward") {
                  setLivePreview(coords);
                } else if (editingMode === "subzone" && selectedSubZone) {
                  setLivePreviewSub(coords);
                }
              } catch (err) {
                // ignore
              }
            });

            // Also update states when map is clicked for enabling drawing via custom toolbar
            leafletMapRef.current.on("click", () => {
              // clear any preview when clicking
              setLivePreview([]);
              setLivePreviewSub([]);
            });
          }

          // Load existing boundaries
          loadExistingBoundaries(L, drawnItems);

          // Add a simple custom toolbar overlay in case CSS-based icons are missing
          const mapContainer = leafletMapRef.current.getContainer();
          if (
            mapContainer &&
            !mapContainer.querySelector(".custom-draw-toolbar")
          ) {
            const toolbar = document.createElement("div");
            toolbar.className =
              "custom-draw-toolbar absolute top-4 right-4 z-50 flex flex-col gap-2";

            const makeButton = (
              iconHtml: string,
              title: string,
              onClick: () => void,
            ) => {
              const btn = document.createElement("button");
              btn.innerHTML = iconHtml;
              btn.title = title;
              btn.className = "p-2 rounded bg-white shadow hover:bg-gray-100";
              btn.onclick = onClick;
              return btn;
            };

            // Polygon button
            const polyBtn = makeButton(
              '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l7 4v8l-7 4-7-4V6z"/></svg>',
              "Draw Polygon",
              () => {
                if (!(L as any).Draw) return;
                const drawer = new (L as any).Draw.Polygon(
                  leafletMapRef.current,
                  {},
                );
                drawer.enable();
              },
            );

            // Rectangle button
            const rectBtn = makeButton(
              '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>',
              "Draw Rectangle",
              () => {
                if (!(L as any).Draw) return;
                const drawer = new (L as any).Draw.Rectangle(
                  leafletMapRef.current,
                  {},
                );
                drawer.enable();
              },
            );

            // Delete/clear button
            const delBtn = makeButton(
              '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
              "Clear All",
              () => {
                clearBoundaries();
              },
            );

            toolbar.appendChild(polyBtn);
            toolbar.appendChild(rectBtn);
            toolbar.appendChild(delBtn);

            // Use absolute positioning wrapper
            const wrapper = document.createElement("div");
            wrapper.style.position = "absolute";
            wrapper.style.top = "8px";
            wrapper.style.right = "8px";
            wrapper.style.zIndex = "1000";
            wrapper.appendChild(toolbar);
            mapContainer.style.position = "relative";
            mapContainer.appendChild(wrapper);
          }
        }

        setMapError(null);
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Failed to load map. Please refresh and try again.");
      }
    };

    const timer = setTimeout(initializeMap, 100);
    return () => clearTimeout(timer);
  }, [
    isOpen,
    centerCoordinates.lat,
    centerCoordinates.lng,
    editingMode,
    selectedSubZone,
  ]);

  // Load existing boundaries from ward and subzones data
  const loadExistingBoundaries = async (L: any, drawnItems: any) => {
    try {
      // Load ward boundary
      if (ward.boundaries) {
        const coords = JSON.parse(ward.boundaries);
        setWardBoundary(coords);

        if (coords.length > 0) {
          const polygon = L.polygon(coords, {
            color: "#2563eb",
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2,
          });
          drawnItems.addLayer(polygon);
        }
      }

      // Load subzone boundaries
      const loadedSubZoneBoundaries: { [key: string]: any[] } = {};
      for (const subZone of subZones) {
        if (subZone.boundaries) {
          const coords = JSON.parse(subZone.boundaries);
          loadedSubZoneBoundaries[subZone.id] = coords;

          if (coords.length > 0) {
            const polygon = L.polygon(coords, {
              color: "#dc2626",
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.1,
            });
            drawnItems.addLayer(polygon);
          }
        }
      }
      setSubZoneBoundaries(loadedSubZoneBoundaries);
    } catch (error) {
      console.error("Error loading existing boundaries:", error);
    }
  };

  // Calculate polygon center point
  const calculatePolygonCenter = (
    coords: [number, number][],
  ): { lat: number; lng: number } => {
    const latSum = coords.reduce((sum, coord) => sum + coord[0], 0);
    const lngSum = coords.reduce((sum, coord) => sum + coord[1], 0);
    return {
      lat: latSum / coords.length,
      lng: lngSum / coords.length,
    };
  };

  // Calculate bounding box for polygon
  const calculateBoundingBox = (
    coords: [number, number][],
  ): { north: number; south: number; east: number; west: number } => {
    const lats = coords.map((coord) => coord[0]);
    const lngs = coords.map((coord) => coord[1]);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCenterCoordinates(newPos);

          // Update map view
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([newPos.lat, newPos.lng], 14);
          }

          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLoadingLocation(false);
          alert(
            "Could not get your location. Please ensure location access is enabled.",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 },
      );
    } else {
      setIsLoadingLocation(false);
      alert("Geolocation is not supported by this browser.");
    }
  }, []);

  // Clear all boundaries
  const clearBoundaries = () => {
    if (drawingRef.current?.drawnItems) {
      drawingRef.current.drawnItems.clearLayers();
    }
    setWardBoundary([]);
    setSubZoneBoundaries({});
    setEditingMode(null);
    setSelectedSubZone(null);
  };

  // Save boundaries
  const toastHook = useToast();

  const handleSave = () => {
    // Validation: ensure at least one boundary exists
    const hasWard = wardBoundary && wardBoundary.length > 0;
    const hasSub = Object.keys(subZoneBoundaries).some(
      (k) => subZoneBoundaries[k] && subZoneBoundaries[k].length > 0,
    );

    if (!hasWard && !hasSub) {
      toastHook.toast({
        title: "No boundaries",
        description: "Draw a ward or sub-zone boundary before saving.",
      });
      return;
    }

    const updatedWard: Ward = {
      ...ward,
      boundaries: hasWard ? JSON.stringify(wardBoundary) : undefined,
      centerLat: centerCoordinates.lat,
      centerLng: centerCoordinates.lng,
      boundingBox: hasWard
        ? JSON.stringify(calculateBoundingBox(wardBoundary))
        : undefined,
    };

    const updatedSubZones: SubZone[] = subZones.map((subZone) => {
      const boundaries = subZoneBoundaries[subZone.id];
      return {
        ...subZone,
        boundaries:
          boundaries && boundaries.length > 0
            ? JSON.stringify(boundaries)
            : undefined,
        centerLat:
          boundaries && boundaries.length > 0
            ? calculatePolygonCenter(boundaries).lat
            : undefined,
        centerLng:
          boundaries && boundaries.length > 0
            ? calculatePolygonCenter(boundaries).lng
            : undefined,
        boundingBox:
          boundaries && boundaries.length > 0
            ? JSON.stringify(calculateBoundingBox(boundaries))
            : undefined,
      };
    });

    onSave(updatedWard, updatedSubZones);
  };

  // Cleanup map when dialog closes
  useEffect(() => {
    if (!isOpen && leafletMapRef.current) {
      const container = leafletMapRef.current.getContainer?.();
      if (container) {
        const toolbar = container.querySelector(".custom-draw-toolbar");
        if (toolbar && toolbar.parentElement)
          toolbar.parentElement.removeChild(toolbar);
      }

      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      drawingRef.current = null;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Set Geographic Boundaries - {ward.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Controls Sidebar */}
          <div className="w-80 p-4 border-r bg-gray-50 overflow-y-auto">
            <div className="space-y-4">
              {/* Instructions */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Use the drawing tools on the map to define geographic
                  boundaries for wards and sub-zones.
                </AlertDescription>
              </Alert>

              {/* Ward Boundary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Ward Boundary</Label>
                  <Badge
                    variant={wardBoundary.length > 0 ? "default" : "secondary"}
                  >
                    {wardBoundary.length > 0 ? "Set" : "Not Set"}
                  </Badge>
                </div>

                <Button
                  onClick={() => {
                    setEditingMode("ward");
                    setSelectedSubZone(null);
                  }}
                  variant={editingMode === "ward" ? "default" : "outline"}
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {editingMode === "ward"
                    ? "Drawing Ward..."
                    : "Set Ward Boundary"}
                </Button>

                {wardBoundary.length > 0 && (
                  <div className="text-xs text-gray-600 bg-white p-2 rounded">
                    <div>Points: {wardBoundary.length}</div>
                    <div>
                      Center: {centerCoordinates.lat.toFixed(4)},{" "}
                      {centerCoordinates.lng.toFixed(4)}
                    </div>
                  </div>
                )}

                {/* Live preview while drawing */}
                {editingMode === "ward" &&
                  livePreview &&
                  livePreview.length > 0 && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded">
                      <div>Preview Points: {livePreview.length}</div>
                      <div className="truncate">
                        {livePreview
                          .slice(0, 3)
                          .map((c) => `${c[0].toFixed(4)}, ${c[1].toFixed(4)}`)
                          .join("; ")}
                        {livePreview.length > 3 ? " ..." : ""}
                      </div>
                    </div>
                  )}
              </div>

              {/* Sub-Zone Boundaries */}
              <div className="space-y-3">
                <Label className="font-medium">Sub-Zone Boundaries</Label>

                {subZones.map((subZone) => (
                  <div key={subZone.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {subZone.name}
                      </span>
                      <Badge
                        variant={
                          subZoneBoundaries[subZone.id]
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {subZoneBoundaries[subZone.id] ? "Set" : "Not Set"}
                      </Badge>
                    </div>

                    <Button
                      onClick={() => {
                        setEditingMode("subzone");
                        setSelectedSubZone(subZone.id);
                      }}
                      variant={
                        editingMode === "subzone" &&
                        selectedSubZone === subZone.id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="w-full"
                    >
                      <Square className="h-3 w-3 mr-2" />
                      {editingMode === "subzone" &&
                      selectedSubZone === subZone.id
                        ? "Drawing..."
                        : "Set Boundary"}
                    </Button>

                    {subZoneBoundaries[subZone.id] && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded">
                        Points: {subZoneBoundaries[subZone.id].length}
                      </div>
                    )}

                    {/* Live preview for this subzone while drawing */}
                    {editingMode === "subzone" &&
                      selectedSubZone === subZone.id &&
                      livePreviewSub &&
                      livePreviewSub.length > 0 && (
                        <div className="text-xs text-gray-600 bg-white p-2 rounded">
                          <div>Preview Points: {livePreviewSub.length}</div>
                          <div className="truncate">
                            {livePreviewSub
                              .slice(0, 3)
                              .map(
                                (c) => `${c[0].toFixed(4)}, ${c[1].toFixed(4)}`,
                              )
                              .join("; ")}
                            {livePreviewSub.length > 3 ? " ..." : ""}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={getCurrentLocation}
                  variant="outline"
                  disabled={isLoadingLocation}
                  className="w-full"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {isLoadingLocation ? "Getting..." : "Center on Location"}
                </Button>

                <Button
                  onClick={clearBoundaries}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>

              {/* Current Mode */}
              {editingMode && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Drawing Mode:</strong>{" "}
                    {editingMode === "ward"
                      ? "Ward Boundary"
                      : `Sub-Zone: ${subZones.find((z) => z.id === selectedSubZone)?.name}`}
                    <br />
                    Click on the map to start drawing a polygon.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {mapError ? (
              <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-4">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 text-sm">{mapError}</p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            ) : (
              <div
                ref={mapRef}
                className="h-full w-full"
                style={{ minHeight: "500px" }}
              />
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Boundaries
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WardBoundaryManager;
