import { getPrisma } from "../db/connection.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const prisma = getPrisma();

// @desc    Get materials for a complaint
// @route   GET /api/complaints/:id/materials
// @access  Private (Maintenance Team, Ward Officer, Admin)
export const getComplaintMaterials = asyncHandler(async (req, res) => {
  const { id: complaintId } = req.params;

  // Check if complaint exists and user has access
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      materials: {
        include: {
          addedBy: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!complaint) {
    return res.status(404).json({
      success: false,
      message: "Complaint not found",
    });
  }

  // Check authorization
  const isAuthorized =
    req.user.role === "ADMINISTRATOR" ||
    (req.user.role === "WARD_OFFICER" &&
      complaint.wardId === req.user.wardId) ||
    (req.user.role === "MAINTENANCE_TEAM" &&
      (complaint.assignedToId === req.user.id ||
        complaint.maintenanceTeamId === req.user.id));

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this complaint's materials",
    });
  }

  res.status(200).json({
    success: true,
    message: "Materials retrieved successfully",
    data: {
      materials: complaint.materials,
    },
  });
});

// @desc    Add material to a complaint
// @route   POST /api/complaints/:id/materials
// @access  Private (Maintenance Team only)
export const addComplaintMaterial = asyncHandler(async (req, res) => {
  const { id: complaintId } = req.params;
  const { materialName, quantity, unit, notes, usedAt } = req.body;

  // Validate required fields
  if (!materialName || !quantity || !unit) {
    return res.status(400).json({
      success: false,
      message: "Material name, quantity, and unit are required",
    });
  }

  // Check if complaint exists
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    return res.status(404).json({
      success: false,
      message: "Complaint not found",
    });
  }

  // Check authorization - only maintenance team assigned to this complaint
  const isAuthorized =
    req.user.role === "MAINTENANCE_TEAM" &&
    (complaint.assignedToId === req.user.id ||
      complaint.maintenanceTeamId === req.user.id);

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: "Only assigned maintenance team members can add materials",
    });
  }

  // Validate quantity is positive
  if (quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be greater than 0",
    });
  }

  // Create material entry
  const material = await prisma.material.create({
    data: {
      complaintId,
      materialName: materialName.trim(),
      quantity: parseInt(quantity),
      unit: unit.trim(),
      notes: notes?.trim() || null,
      usedAt: usedAt ? new Date(usedAt) : new Date(),
      addedById: req.user.id,
    },
    include: {
      addedBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Material added successfully",
    data: {
      material,
    },
  });
});

// @desc    Update material entry
// @route   PUT /api/materials/:id
// @access  Private (Maintenance Team - creator only)
export const updateMaterial = asyncHandler(async (req, res) => {
  const { id: materialId } = req.params;
  const { materialName, quantity, unit, notes, usedAt } = req.body;

  // Check if material exists
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      addedBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!material) {
    return res.status(404).json({
      success: false,
      message: "Material entry not found",
    });
  }

  // Check authorization - only the creator can update
  if (material.addedById !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the creator can update this material entry",
    });
  }

  // Validate quantity if provided
  if (quantity !== undefined && quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be greater than 0",
    });
  }

  // Update material
  const updatedMaterial = await prisma.material.update({
    where: { id: materialId },
    data: {
      ...(materialName && { materialName: materialName.trim() }),
      ...(quantity && { quantity: parseInt(quantity) }),
      ...(unit && { unit: unit.trim() }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(usedAt && { usedAt: new Date(usedAt) }),
    },
    include: {
      addedBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Material updated successfully",
    data: {
      material: updatedMaterial,
    },
  });
});

// @desc    Delete material entry
// @route   DELETE /api/materials/:id
// @access  Private (Maintenance Team - creator only)
export const deleteMaterial = asyncHandler(async (req, res) => {
  const { id: materialId } = req.params;

  // Check if material exists
  const material = await prisma.material.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    return res.status(404).json({
      success: false,
      message: "Material entry not found",
    });
  }

  // Check authorization - only the creator can delete
  if (material.addedById !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the creator can delete this material entry",
    });
  }

  // Delete material
  await prisma.material.delete({
    where: { id: materialId },
  });

  res.status(200).json({
    success: true,
    message: "Material entry deleted successfully",
  });
});
