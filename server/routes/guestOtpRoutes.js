import express from "express";
import {
  requestComplaintOtp,
  verifyComplaintOtp,
  getComplaintDetailsWithOtp,
} from "../controller/guestOtpController.js";

const router = express.Router();

// Test endpoint to verify routing
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Guest OTP routes are accessible",
    timestamp: new Date().toISOString()
  });
});

// Public endpoints - no authentication required
router.post("/request-complaint-otp", requestComplaintOtp);
router.post("/verify-complaint-otp", verifyComplaintOtp);
router.post("/complaint-details", getComplaintDetailsWithOtp);

export default router;
