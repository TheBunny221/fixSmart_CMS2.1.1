import { getPrisma } from "../db/connection.js";
import { sendEmail } from "../utils/emailService.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const prisma = getPrisma();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate JWT token
const generateJWTToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      wardId: user.wardId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" },
  );
};

// Request OTP for complaint tracking
export const requestComplaintOtp = async (req, res) => {
  try {
    const { complaintId } = req.body;
    console.log('🔍 Guest OTP Request Debug:', {
      body: req.body,
      headers: req.headers,
      url: req.url,
      method: req.method
    });
    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    // Find the complaint by complaintId (human-readable ID like KSC0001)
    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [
          { complaintId: complaintId.trim() },
          { id: complaintId.trim() }, // Fallback to UUID if needed
        ],
      },
      select: {
        id: true,
        complaintId: true,
        title: true,
        type: true,
        contactEmail: true,
        contactName: true,
        submittedBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found with the provided ID",
      });
    }

    // Use contact email if no user is linked (guest complaint)
    const email = complaint.submittedBy?.email || complaint.contactEmail;
    const fullName = complaint.submittedBy?.fullName || complaint.contactName;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "No email associated with this complaint",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in OTPSession table (correct table name)
    await prisma.oTPSession.create({
      data: {
        email: email,
        otpCode: otp,
        expiresAt: otpExpiry,
        purpose: "COMPLAINT_TRACKING",
        userId: complaint.submittedBy?.id || null,
      },
    });

    // Send OTP email
    const emailSubject = `OTP for Complaint Tracking - ${complaint.complaintId || complaint.id}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🔐 Complaint Verification</h1>
          </div>

          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px;">Hello ${fullName},</h2>
            <p style="margin: 0; color: #374151; line-height: 1.6;">
              You've requested to track your complaint <strong>${complaint.complaintId || complaint.id}</strong>.
              Please use the verification code below to access your complaint details.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #1f2937; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; display: inline-block;">
              ${otp}
            </div>
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">
              This code will expire in 10 minutes
            </p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Security Note:</strong> Never share this OTP with anyone. Our team will never ask for your OTP.
            </p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
              If you didn't request this verification, please ignore this email.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailContent,
    });

    res.json({
      success: true,
      message: "OTP sent successfully to your registered email address",
      data: {
        complaintId: complaint.complaintId || complaint.id,
        email: email.replace(/(.{2}).*(@.*)/, "$1***$2"), // Masked email
      },
    });
  } catch (error) {
    console.error("Error requesting OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verify OTP and return complaint details with auto-login
export const verifyComplaintOtp = async (req, res) => {
  try {
    const { complaintId, otpCode } = req.body;

    if (!complaintId || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID and OTP are required",
      });
    }

    // Find valid OTP in OTPSession table
    const otpSession = await prisma.oTPSession.findFirst({
      where: {
        otpCode: otpCode.trim(),
        expiresAt: {
          gt: new Date(),
        },
        purpose: "COMPLAINT_TRACKING",
        isVerified: false,
      },
    });

    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Find the complaint
    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [{ complaintId: complaintId.trim() }, { id: complaintId.trim() }],
      },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
          },
        },
        subZone: {
          select: {
            id: true,
            name: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
            wardId: true,
          },
        },
        wardOfficer: {
          select: {
            fullName: true,
            role: true,
          },
        },
        attachments: true,
        statusLogs: {
          orderBy: { timestamp: "desc" },
          include: {
            user: {
              select: {
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Verify the OTP email matches the complaint contact email
    const complaintEmail =
      complaint.submittedBy?.email || complaint.contactEmail;
    if (otpSession.email !== complaintEmail) {
      return res.status(400).json({
        success: false,
        message: "OTP does not match the complaint contact email",
      });
    }

    let user = complaint.submittedBy;
    let isNewUser = false;

    // If no user exists, auto-register as citizen
    if (!user) {
      user = await prisma.user.create({
        data: {
          fullName: complaint.contactName,
          email: complaint.contactEmail,
          phoneNumber: complaint.contactPhone,
          role: "CITIZEN",
          isActive: true,
          joinedOn: new Date(),
        },
      });

      // Link the complaint to the new user
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: { submittedById: user.id },
      });

      isNewUser = true;
    }

    // Mark OTP as verified
    await prisma.oTPSession.update({
      where: { id: otpSession.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        userId: user.id,
      },
    });

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token for auto-login
    const token = generateJWTToken(user);

    // Remove password from user response
    const { password: _, ...userResponse } = user;

    // Return complaint details with auth token for auto-login
    res.json({
      success: true,
      message: "OTP verified successfully. You are now logged in.",
      data: {
        complaint: {
          id: complaint.id,
          complaintId: complaint.complaintId,
          title: complaint.title,
          description: complaint.description,
          status: complaint.status,
          priority: complaint.priority,
          type: complaint.type,
          area: complaint.area,
          address: complaint.address,
          landmark: complaint.landmark,
          ward: complaint.ward,
          subZone: complaint.subZone,
          submittedOn: complaint.submittedOn,
          assignedOn: complaint.assignedOn,
          resolvedOn: complaint.resolvedOn,
          wardOfficer: complaint.wardOfficer,
          attachments: complaint.attachments,
          statusLogs: complaint.statusLogs,
          coordinates: complaint.coordinates
            ? JSON.parse(complaint.coordinates)
            : null,
        },
        user: userResponse,
        token, // JWT token for auto-login
        isNewUser,
        redirectTo: `/complaints/${complaint.id}`, // Redirect path for frontend
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Send detailed complaint information via email
const sendComplaintDetailsEmail = async (complaint) => {
  try {
    const statusColor = {
      REGISTERED: "#f59e0b",
      ASSIGNED: "#3b82f6",
      IN_PROGRESS: "#f97316",
      RESOLVED: "#10b981",
      CLOSED: "#6b7280",
    };

    const priorityColor = {
      LOW: "#10b981",
      MEDIUM: "#f59e0b",
      HIGH: "#ef4444",
      URGENT: "#dc2626",
    };

    const emailSubject = `Complaint Details - ${complaint.id}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📋 Complaint Details</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Complaint ID: ${complaint.id}</p>
          </div>

          <!-- Status Badge -->
          <div style="padding: 20px 30px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
              <div>
                <span style="background-color: ${statusColor[complaint.status] || "#6b7280"}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                  ${complaint.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <span style="background-color: ${priorityColor[complaint.priority] || "#6b7280"}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                  ${complaint.priority} Priority
                </span>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px;">
            
            <!-- Complaint Information -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                🔍 Complaint Information
              </h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #374151; font-weight: 600; width: 140px; vertical-align: top;">Type:</td>
                  <td style="padding: 12px 0; color: #1f2937;">${complaint.complaintType?.name || "N/A"}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 0; color: #374151; font-weight: 600; vertical-align: top;">Description:</td>
                  <td style="padding: 12px 0; color: #1f2937; line-height: 1.6;">${complaint.description}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #374151; font-weight: 600; vertical-align: top;">Location:</td>
                  <td style="padding: 12px 0; color: #1f2937;">${complaint.area}</td>
                </tr>
                ${
                  complaint.address
                    ? `
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 0; color: #374151; font-weight: 600; vertical-align: top;">Address:</td>
                  <td style="padding: 12px 0; color: #1f2937;">${complaint.address}</td>
                </tr>
                `
                    : ""
                }
                ${
                  complaint.ward?.name
                    ? `
                <tr>
                  <td style="padding: 12px 0; color: #374151; font-weight: 600; vertical-align: top;">Ward:</td>
                  <td style="padding: 12px 0; color: #1f2937;">${complaint.ward.name}</td>
                </tr>
                `
                    : ""
                }
              </table>
            </div>

            <!-- Timeline -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                ⏱️ Timeline
              </h2>
              
              <div style="position: relative; padding-left: 30px;">
                <!-- Registered -->
                <div style="position: relative; margin-bottom: 20px;">
                  <div style="position: absolute; left: -30px; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; top: 5px;"></div>
                  <div style="font-weight: 600; color: #1f2937;">Complaint Registered</div>
                  <div style="color: #6b7280; font-size: 14px;">${new Date(complaint.createdAt).toLocaleString()}</div>
                </div>
                
                ${
                  complaint.assignedAt
                    ? `
                <div style="position: relative; margin-bottom: 20px;">
                  <div style="position: absolute; left: -30px; width: 12px; height: 12px; background-color: #3b82f6; border-radius: 50%; top: 5px;"></div>
                  <div style="font-weight: 600; color: #1f2937;">Assigned to Team</div>
                  <div style="color: #6b7280; font-size: 14px;">${new Date(complaint.assignedAt).toLocaleString()}</div>
                  ${complaint.assignedTo ? `<div style="color: #374151; font-size: 14px; margin-top: 5px;">Assigned to: ${complaint.assignedTo.fullName}</div>` : ""}
                </div>
                `
                    : ""
                }
                
                ${
                  complaint.resolvedAt
                    ? `
                <div style="position: relative; margin-bottom: 20px;">
                  <div style="position: absolute; left: -30px; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; top: 5px;"></div>
                  <div style="font-weight: 600; color: #1f2937;">Complaint Resolved</div>
                  <div style="color: #6b7280; font-size: 14px;">${new Date(complaint.resolvedAt).toLocaleString()}</div>
                </div>
                `
                    : ""
                }
              </div>
            </div>

            <!-- Contact Information -->
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">📞 Need Help?</h3>
              <p style="margin: 0; color: #374151; line-height: 1.6;">
                If you have any questions about your complaint, please contact our support team at 
                <strong>support@cochinsmartcity.in</strong> or call our helpline.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;">Thank you for using our complaint management system.</p>
              <p style="margin: 5px 0 0 0;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await sendEmail(complaint.user.email, emailSubject, emailContent);
  } catch (error) {
    console.error("Error sending complaint details email:", error);
  }
};

// Get estimated resolution time based on priority and type
const getEstimatedResolution = (priority, type) => {
  const baseTime = {
    LOW: 7,
    MEDIUM: 5,
    HIGH: 3,
    URGENT: 1,
  };

  const typeMultiplier = {
    "Water Supply": 1.2,
    "Road Maintenance": 1.5,
    "Waste Management": 1.0,
    "Street Lighting": 0.8,
    Drainage: 1.3,
  };

  const days = Math.ceil(baseTime[priority] * (typeMultiplier[type] || 1.0));
  return `${days} ${days === 1 ? "day" : "days"}`;
};

export const getComplaintDetailsWithOtp = async (req, res) => {
  try {
    const { complaintId, sessionToken } = req.body;

    // This would be used for fetching additional details after initial verification
    // Implementation depends on your session management strategy

    res.json({
      success: true,
      message: "Additional details retrieved successfully",
      data: {},
    });
  } catch (error) {
    console.error("Error getting complaint details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve complaint details",
    });
  }
};
