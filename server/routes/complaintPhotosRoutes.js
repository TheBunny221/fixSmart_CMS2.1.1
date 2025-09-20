import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getComplaintPhotos,
  uploadComplaintPhotos,
  updatePhotoDescription,
  deleteComplaintPhoto,
  getComplaintPhoto,
  uploadPhoto,
} from "../controller/complaintPhotosController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Complaint photos routes
router.get(
  "/complaints/:id/photos",
  authorize("MAINTENANCE_TEAM", "WARD_OFFICER", "ADMINISTRATOR", "CITIZEN"),
  getComplaintPhotos
);

router.post(
  "/complaints/:id/photos",
  authorize("MAINTENANCE_TEAM"),
  uploadPhoto.array("photos", 10), // Allow up to 10 photos at once
  uploadComplaintPhotos
);

// Individual photo routes
router.get(
  "/complaint-photos/:id",
  authorize("MAINTENANCE_TEAM", "WARD_OFFICER", "ADMINISTRATOR", "CITIZEN"),
  getComplaintPhoto
);

router.put(
  "/complaint-photos/:id",
  authorize("MAINTENANCE_TEAM"),
  updatePhotoDescription
);

router.delete(
  "/complaint-photos/:id",
  authorize("MAINTENANCE_TEAM"),
  deleteComplaintPhoto
);

export default router;
