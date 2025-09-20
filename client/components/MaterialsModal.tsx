import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Plus,
  Trash2,
  Package,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  useGetComplaintMaterialsQuery,
  useAddComplaintMaterialMutation,
} from "../store/api/complaintsApi";

interface MaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  complaintTitle: string;
}

interface NewMaterial {
  materialName: string;
  quantity: number;
  unit: string;
  notes: string;
}

const MaterialsModal: React.FC<MaterialsModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  complaintTitle,
}) => {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState<NewMaterial>({
    materialName: "",
    quantity: 1,
    unit: "piece",
    notes: "",
  });
  const [addError, setAddError] = useState<string | null>(null);

  const {
    data: materialsResponse,
    isLoading,
    error,
    refetch,
  } = useGetComplaintMaterialsQuery(complaintId, {
    skip: !isOpen,
  });

  const [addMaterial, { isLoading: isAdding }] = useAddComplaintMaterialMutation();

  const materials = materialsResponse?.data?.materials || [];

  // Common units
  const commonUnits = [
    "piece",
    "kg",
    "meter",
    "liter",
    "box",
    "roll",
    "bag",
    "bottle",
    "tube",
    "sheet",
    "pack",
    "set",
  ];

  // Handle adding new material
  const handleAddMaterial = async () => {
    if (!newMaterial.materialName.trim()) {
      setAddError("Material name is required");
      return;
    }

    if (newMaterial.quantity <= 0) {
      setAddError("Quantity must be greater than 0");
      return;
    }

    try {
      setAddError(null);
      await addMaterial({
        complaintId,
        materialName: newMaterial.materialName.trim(),
        quantity: newMaterial.quantity,
        unit: newMaterial.unit,
        notes: newMaterial.notes.trim() || undefined,
      }).unwrap();

      // Reset form
      setNewMaterial({
        materialName: "",
        quantity: 1,
        unit: "piece",
        notes: "",
      });
      setIsAddingMaterial(false);
      refetch();
    } catch (error: any) {
      console.error("Add material error:", error);
      setAddError(error.data?.message || "Failed to add material");
    }
  };

  // Cancel adding material
  const handleCancelAdd = () => {
    setNewMaterial({
      materialName: "",
      quantity: 1,
      unit: "piece",
      notes: "",
    });
    setIsAddingMaterial(false);
    setAddError(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Materials Used - {complaintTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading materials...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to load materials. Please try again.</span>
            </div>
          )}

          {/* Materials List */}
          {!isLoading && !error && (
            <>
              {materials.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Materials Used ({materials.length})</h3>
                    <Button
                      size="sm"
                      onClick={() => setIsAddingMaterial(true)}
                      disabled={isAddingMaterial}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Material
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{material.materialName}</h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center">
                                <strong className="mr-1">Quantity:</strong>
                                {material.quantity} {material.unit}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(material.usedAt)}
                              </span>
                            </div>
                            {material.notes && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Notes:</strong> {material.notes}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <Badge variant="secondary">
                              {material.addedBy.fullName}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Materials Added Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start tracking materials used for this complaint.
                  </p>
                  <Button onClick={() => setIsAddingMaterial(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Material
                  </Button>
                </div>
              )}

              {/* Add Material Form */}
              {isAddingMaterial && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-4">Add New Material</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="materialName">Material Name *</Label>
                      <Input
                        id="materialName"
                        value={newMaterial.materialName}
                        onChange={(e) =>
                          setNewMaterial({ ...newMaterial, materialName: e.target.value })
                        }
                        placeholder="e.g., PVC Pipe, Cement, LED Bulb"
                        disabled={isAdding}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={newMaterial.quantity}
                          onChange={(e) =>
                            setNewMaterial({
                              ...newMaterial,
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          disabled={isAdding}
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Select
                          value={newMaterial.unit}
                          onValueChange={(value) =>
                            setNewMaterial({ ...newMaterial, unit: value })
                          }
                          disabled={isAdding}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {commonUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={newMaterial.notes}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, notes: e.target.value })
                      }
                      placeholder="Additional details about the material usage..."
                      rows={3}
                      disabled={isAdding}
                    />
                  </div>

                  {addError && (
                    <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{addError}</span>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelAdd}
                      disabled={isAdding}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddMaterial} disabled={isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Material
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Summary */}
          {!isLoading && !error && materials.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="text-sm text-gray-600">
                <p>Total materials tracked: <strong>{materials.length}</strong></p>
                <p>
                  Materials by type:{" "}
                  <strong>
                    {[...new Set(materials.map(m => m.materialName))].length} unique types
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialsModal;
