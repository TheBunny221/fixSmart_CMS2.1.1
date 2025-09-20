import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getComplaintMaterials,
  addComplaintMaterial,
  updateMaterial,
  deleteMaterial,
} from "../controller/materialsController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Complaint materials routes
router.get(
  "/complaints/:id/materials",
  authorize("MAINTENANCE_TEAM", "WARD_OFFICER", "ADMINISTRATOR"),
  getComplaintMaterials
);

router.post(
  "/complaints/:id/materials",
  authorize("MAINTENANCE_TEAM"),
  addComplaintMaterial
);

// Individual material routes
router.put(
  "/materials/:id",
  authorize("MAINTENANCE_TEAM"),
  updateMaterial
);

router.delete(
  "/materials/:id",
  authorize("MAINTENANCE_TEAM"),
  deleteMaterial
);

export default router;
