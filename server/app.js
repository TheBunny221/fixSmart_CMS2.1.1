import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import database connection
import connectDB from "./db/connection.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import guestRoutes from "./routes/guestRoutes.js";
import wardRoutes from "./routes/wardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import maintenanceAnalyticsRoutes from "./routes/maintenanceAnalyticsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import complaintTypeRoutes from "./routes/complaintTypeRoutes.js";
import systemConfigRoutes from "./routes/systemConfigRoutes.js";
import captchaRoutes from "./routes/captchaRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import guestOtpRoutes from "./routes/guestOtpRoutes.js";
import materialsRoutes from "./routes/materialsRoutes.js";
import complaintPhotosRoutes from "./routes/complaintPhotosRoutes.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// // Express app configuration
// const app = express();

// // Trust proxy setup
// app.set('trust proxy', true);

// // Basic middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(compression());

// // CORS setup
// app.use(cors({
//   origin: process.env.CORS_ORIGIN,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));

// // Handle preflight requests
// app.options('*', cors());

// // Additional headers for connection handling
// app.use((req, res, next) => {
//   res.setHeader('Connection', 'keep-alive');
//   res.setHeader('Keep-Alive', 'timeout=5');
//   next();
// });

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cochin Smart City API",
      version: "1.0.0",
      description:
        "Comprehensive API for the Cochin Smart City Complaint Management System",
      contact: {
        name: "API Support",
        email: "api-support@cochinsmartcity.gov.in",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.cochinsmartcity.gov.in"
            : `http://localhost:${process.env.PORT || 4005}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./server/routes/*.js", "./server/controller/*.js"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

export function createApp() {
  const app = express();

  // Trust proxy for cloud deployments (fixes rate limiting X-Forwarded-For issue)
  // Use a more specific trust proxy setting for security
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Trust only first proxy
  } else {
    app.set("trust proxy", "loopback"); // Trust only localhost in development
  }

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
        },
      },
    }),
  );

  // Rate limiting - more lenient for development and admin operations
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max:
      parseInt(process.env.RATE_LIMIT_MAX) ||
      (process.env.NODE_ENV === "development" ? 2000 : 200), // Higher limit for development
    message: {
      success: false,
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain conditions
    skip: (req) => {
      // Skip for development environment
      if (process.env.NODE_ENV === "development") {
        return true;
      }
      // Skip for admin operations (authenticated users with admin endpoints)
      if (
        req.path.startsWith("/api/admin") ||
        req.path.startsWith("/api/system-config") ||
        req.path.startsWith("/api/users/wards")
      ) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          return true; // Skip rate limiting for authenticated admin operations
        }
      }
      return false;
    },
  });

  app.use("/api/", limiter);

  // Development routes for rate limiting management
  if (process.env.NODE_ENV === "development") {
    app.get("/api/rate-limit/status", (req, res) => {
      res.json({
        success: true,
        ip: req.ip,
        headers: {
          "x-forwarded-for": req.headers["x-forwarded-for"],
          "x-real-ip": req.headers["x-real-ip"],
        },
        rateLimit: {
          windowMs:
            parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
          max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
        },
      });
    });

    app.post("/api/rate-limit/reset", (req, res) => {
      try {
        // Clear the rate limit store (this will reset all rate limits)
        limiter.resetKey(req.ip);
        res.json({
          success: true,
          message: `Rate limit reset for IP: ${req.ip}`,
        });
      } catch (error) {
        res.json({
          success: true,
          message:
            "Rate limit store cleared (server restart also clears limits)",
        });
      }
    });
  }

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || [
        process.env.CLIENT_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:8080",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
  );

  // Compression
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging
  app.use(requestLogger);

  // Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Cochin Smart City API Documentation",
    }),
  );

  // Debug middleware for guest OTP routes
  app.use("/api/guest-otp", (req, res, next) => {
    console.log("🔍 Guest OTP request:", {
      path: req.path,
      method: req.method,
      headers: req.headers,
    });
    next();
  });

  // Public routes first (no auth required)
  app.use("/api/guest-otp", guestOtpRoutes);
  app.use("/api/captcha", captchaRoutes);
  
  // Other API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/complaints", complaintRoutes);
  app.use("/api/guest", guestRoutes);
  app.use("/api/wards", wardRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/maintenance", maintenanceAnalyticsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/complaint-types", complaintTypeRoutes);
  app.use("/api/system-config", systemConfigRoutes);
  app.use("/api", materialsRoutes);
  app.use("/api", complaintPhotosRoutes);

  // Serve uploaded files
  const uploadsPath = path.join(__dirname, "../uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Development test routes (only in development)
  if (process.env.NODE_ENV !== "production") {
    app.use("/api/test", testRoutes);
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is running",
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
    });
  });

  // API documentation endpoint
  app.get("/api/docs/json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      data: null,
    });
  });

  // Serve static files from the React build
  const distPath = path.resolve(__dirname, "../dist/spa");
  console.log("Serving static files from:", distPath);

  // Check if the build directory exists
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback - serve index.html for all non-API routes
    app.get("*", (req, res, next) => {
      // Skip API routes and static asset requests (those containing a dot)
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }

      // Serve index.html for all other routes (SPA routing)
      console.log("Serving index.html for:", req.path);
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.warn("Build directory not found:", distPath);
    // Fallback to API info
    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Cochin Smart City API - Build files not found",
        documentation: "/api-docs",
        health: "/api/health",
        note: "Run 'npm run build' to generate static files",
      });
    });
  }

  // Error handling middleware (should be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
