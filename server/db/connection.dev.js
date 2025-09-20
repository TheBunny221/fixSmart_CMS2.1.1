import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import fs from "fs";
import path from "path";

// Initialize Prisma client for development (SQLite)
const createPrismaClient = () => {
  const config = {
    log: ["info", "warn", "error"],
    errorFormat: "pretty",
  };

  return new PrismaClient(config);
};

let prisma = createPrismaClient();

const ensureDatabaseAccess = async () => {
  try {
    // For SQLite, ensure the directory exists
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      console.log(`📁 Creating database directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (error) {
    console.error("❌ Database access check failed:", error);
    throw error;
  }
};

const connectDB = async () => {
  try {
    // Ensure database access
    await ensureDatabaseAccess();

    // Test database connection
    await prisma.$connect();

    // Run a simple query to verify read/write access
    try {
      await prisma.$queryRaw`SELECT 1 as test;`;
      console.log("✅ Database read access verified");

      // Test write access by checking if we can perform a transaction
      await prisma.$transaction(async (tx) => {
        // This is a no-op transaction just to test write access
        await tx.$queryRaw`SELECT 1 as test;`;
      });
      console.log("✅ Database write access verified");
    } catch (dbError) {
      if (
        dbError.message.includes("readonly") ||
        dbError.message.includes("READONLY")
      ) {
        console.error(
          "❌ Database is in readonly mode - checking file permissions",
        );
        
        // For SQLite, check file permissions
        const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
        try {
          fs.accessSync(dbPath, fs.constants.W_OK);
          console.log("✅ Database file is writable");
        } catch (permError) {
          console.error("❌ Database file permission issue:", permError.message);
          throw permError;
        }

        // Disconnect and reconnect to force re-initialization
        await prisma.$disconnect();
        prisma = createPrismaClient();
        await prisma.$connect();

        // Test again
        await prisma.$queryRaw`SELECT 1 as test;`;
        console.log("✅ Database readonly issue resolved");
      } else {
        throw dbError;
      }
    }

    console.log("✅ SQLite Connected successfully (Development)");

    // Safe database URL logging
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
    console.log(`📍 Database File: ${dbPath}`);

    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 ${signal} received, closing database connection...`);
      try {
        await prisma.$disconnect();
        console.log("✅ Database connection closed successfully");
      } catch (error) {
        console.error("❌ Error closing database connection:", error);
      }
      process.exit(0);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    return prisma;
  } catch (error) {
    console.error("❌ Error connecting to development database:", error);

    // SQLite specific error handling
    if (error.message.includes("readonly")) {
      console.error("🔧 SOLUTION: Database file permission issue detected");
      console.error("   • Ensure the database file has write permissions");
      console.error(
        "   • Check that the application has proper file system access",
      );
    } else if (error.message.includes("does not exist")) {
      console.error("🔧 SOLUTION: Database file not found");
      console.error("   • Run 'npm run db:dev:push' to create the development database");
      console.error(
        "   • Ensure DATABASE_URL points to the correct location",
      );
    } else if (error.message.includes("EACCES")) {
      console.error("🔧 SOLUTION: Permission denied error");
      console.error("   • Check file/directory permissions");
      console.error(
        "   • Ensure the application user has access to the database directory",
      );
    }

    console.error("📖 Development database configuration:");
    console.error(
      `   • DATABASE_URL: ${process.env.DATABASE_URL || "NOT SET"}`,
    );
    console.error(`   • NODE_ENV: ${process.env.NODE_ENV || "development"}`);

    console.warn("⚠️ Continuing in development mode despite database issues");
    console.warn(
      "   Please fix the database configuration before proceeding",
    );

    throw error;
  }
};

// Get the Prisma client instance
const getPrisma = () => {
  if (!prisma) {
    console.warn("⚠️ Prisma client not initialized, creating new instance");
    prisma = createPrismaClient();
  }
  return prisma;
};

// Health check function for database
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1 as test;`;
    return { healthy: true, message: "Development database connection is healthy" };
  } catch (error) {
    return {
      healthy: false,
      message: `Development database connection failed: ${error.message}`,
      error: error.code || "UNKNOWN_ERROR",
    };
  }
};

export { connectDB, getPrisma, checkDatabaseHealth };
export default connectDB;
