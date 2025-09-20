import { getPrisma } from "../db/connection.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = getPrisma();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const baseUploadDir =
      process.env.UPLOAD_PATH || path.join(__dirname, "../../uploads");
    const uploadDir = path.join(baseUploadDir, "complaint-photos");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `complaint-${req.params.id}-${uniqueSuffix}${fileExtension}`);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP image files are allowed!"), false);
  }
};

// Configure multer with limits
export const uploadPhoto = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files at once
  },
});

// @desc    Get photos for a complaint
// @route   GET /api/complaints/:id/photos
// @access  Private (Maintenance Team, Ward Officer, Admin)
export const getComplaintPhotos = asyncHandler(async (req, res) => {
  const { id: complaintId } = req.params;

  // Check if complaint exists and user has access
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      photos: {
        include: {
          uploadedByTeam: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { uploadedAt: "desc" },
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
        complaint.maintenanceTeamId === req.user.id)) ||
    complaint.submittedById === req.user.id; // Allow complaint submitter to view

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this complaint's photos",
    });
  }

  res.status(200).json({
    success: true,
    message: "Photos retrieved successfully",
    data: {
      photos: complaint.photos,
    },
  });
});

// @desc    Upload photos for a complaint
// @route   POST /api/complaints/:id/photos
// @access  Private (Maintenance Team only)
export const uploadComplaintPhotos = asyncHandler(async (req, res) => {
  const { id: complaintId } = req.params;
  const { description } = req.body;

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
      message: "Only assigned maintenance team members can upload photos",
    });
  }

  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No photos were uploaded",
    });
  }

  try {
    // Create photo records in database
    const photoPromises = req.files.map(async (file) => {
      const photoUrl = `/uploads/complaint-photos/${file.filename}`;

      return prisma.complaintPhoto.create({
        data: {
          complaintId,
          uploadedByTeamId: req.user.id,
          photoUrl,
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          description: description?.trim() || null,
        },
        include: {
          uploadedByTeam: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });
    });

    const photos = await Promise.all(photoPromises);

    res.status(201).json({
      success: true,
      message: `${photos.length} photo(s) uploaded successfully`,
      data: {
        photos,
      },
    });
  } catch (error) {
    // Clean up uploaded files if database save fails
    req.files.forEach((file) => {
      const filePath = file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    throw error;
  }
});

// @desc    Update photo description
// @route   PUT /api/complaint-photos/:id
// @access  Private (Maintenance Team - uploader only)
export const updatePhotoDescription = asyncHandler(async (req, res) => {
  const { id: photoId } = req.params;
  const { description } = req.body;

  // Check if photo exists
  const photo = await prisma.complaintPhoto.findUnique({
    where: { id: photoId },
    include: {
      uploadedByTeam: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!photo) {
    return res.status(404).json({
      success: false,
      message: "Photo not found",
    });
  }

  // Check authorization - only the uploader can update
  if (photo.uploadedByTeamId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the uploader can update this photo",
    });
  }

  // Update photo description
  const updatedPhoto = await prisma.complaintPhoto.update({
    where: { id: photoId },
    data: {
      description: description?.trim() || null,
    },
    include: {
      uploadedByTeam: {
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
    message: "Photo description updated successfully",
    data: {
      photo: updatedPhoto,
    },
  });
});

// @desc    Delete a photo
// @route   DELETE /api/complaint-photos/:id
// @access  Private (Maintenance Team - uploader only)
export const deleteComplaintPhoto = asyncHandler(async (req, res) => {
  const { id: photoId } = req.params;

  // Check if photo exists
  const photo = await prisma.complaintPhoto.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    return res.status(404).json({
      success: false,
      message: "Photo not found",
    });
  }

  // Check authorization - only the uploader can delete
  if (photo.uploadedByTeamId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Only the uploader can delete this photo",
    });
  }

  try {
    // Delete photo from database
    await prisma.complaintPhoto.delete({
      where: { id: photoId },
    });

    // Delete physical file
    const baseUploadDir =
      process.env.UPLOAD_PATH || path.join(__dirname, "../../uploads");
    const filePath = path.join(
      baseUploadDir,
      "complaint-photos",
      photo.fileName,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
});

// @desc    Get a single photo (for viewing)
// @route   GET /api/complaint-photos/:id
// @access  Private (Authorized users)
export const getComplaintPhoto = asyncHandler(async (req, res) => {
  const { id: photoId } = req.params;

  // Check if photo exists
  const photo = await prisma.complaintPhoto.findUnique({
    where: { id: photoId },
    include: {
      complaint: true,
      uploadedByTeam: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!photo) {
    return res.status(404).json({
      success: false,
      message: "Photo not found",
    });
  }

  // Check authorization
  const isAuthorized =
    req.user.role === "ADMINISTRATOR" ||
    (req.user.role === "WARD_OFFICER" &&
      photo.complaint.wardId === req.user.wardId) ||
    (req.user.role === "MAINTENANCE_TEAM" &&
      (photo.complaint.assignedToId === req.user.id ||
        photo.complaint.maintenanceTeamId === req.user.id)) ||
    photo.complaint.submittedById === req.user.id;

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this photo",
    });
  }

  res.status(200).json({
    success: true,
    message: "Photo retrieved successfully",
    data: {
      photo,
    },
  });
});
