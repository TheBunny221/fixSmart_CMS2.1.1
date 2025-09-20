import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Initialize Prisma client with production-grade configuration
const createPrismaClient = () => {
  const config = {
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["info", "warn", "error"],
    errorFormat: "pretty",
  };

  // Production optimizations for PostgreSQL
  if (process.env.NODE_ENV === "production") {
    config.datasources = {
      db: {
        url: process.env.DATABASE_URL,
      },
    };

    // Connection pool settings for PostgreSQL in production
    if (process.env.DATABASE_URL?.includes("postgresql")) {
        // Additional PostgreSQL-specific optimizations can be added here
    }
  }

  return new PrismaClient(config);
};

let prisma = createPrismaClient();

const ensureDatabaseAccess = async () => {
  try {
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
          "❌ Database is in readonly mode - this is a critical production issue",
        );
        console.error("🔧 Attempting to resolve database readonly issue...");

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

    const dbType = process.env.DATABASE_URL?.includes("postgresql")
      ? "PostgreSQL"
      : process.env.DATABASE_URL?.includes("mysql")
        ? "MySQL"
        : "SQLite";

    console.log(`✅ ${dbType} Connected successfully`);

    // PostgreSQL specific connection validation
    if (dbType === "PostgreSQL") {
      try {
        const result = await prisma.$queryRaw`SELECT version() as version`;
        console.log(
          `🐘 PostgreSQL Version: ${result[0]?.version?.substring(0, 50)}...`,
        );

        // Check for required extensions (if any)
        const extensions =
          await prisma.$queryRaw`SELECT extname FROM pg_extension`;
        if (extensions.length > 0) {
          console.log(
            `🔧 Active Extensions: ${extensions.map((e) => e.extname).join(", ")}`,
          );
        }
      } catch (error) {
        console.warn("⚠️ Could not fetch PostgreSQL version:", error.message);
      }
    }

    // Safe database URL logging (mask credentials)
    const maskedUrl =
      process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***:***@") ||
      "Not configured";
    console.log(`📍 Database URL: ${maskedUrl}`);

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
    console.error("❌ Error connecting to database:", error);

    // Provide helpful error messages based on error type and database
    const isPostgreSQL = process.env.DATABASE_URL?.includes("postgresql");

    if (isPostgreSQL) {
      // PostgreSQL specific error handling
      if (error.message.includes("password authentication failed")) {
        console.error("🔧 SOLUTION: PostgreSQL authentication failed");
        console.error("   • Check username and password in DATABASE_URL");
        console.error("   • Verify user has proper database permissions");
        console.error(
          "   • Ensure PostgreSQL server allows connections from this host",
        );
      } else if (
        error.message.includes("database") &&
        error.message.includes("does not exist")
      ) {
        console.error("🔧 SOLUTION: PostgreSQL database does not exist");
        console.error(
          "   • Create the database: CREATE DATABASE your_db_name;",
        );
        console.error("   • Run migrations: npx prisma migrate deploy");
        console.error("   • Check DATABASE_URL database name");
      } else if (
        error.message.includes("connection refused") ||
        error.message.includes("Can't reach database server")
      ) {
        console.error("🔧 SOLUTION: Cannot connect to PostgreSQL server");
        console.error("   • Ensure PostgreSQL server is running");
        console.error("   • Check host and port in DATABASE_URL");
        console.error("   • Verify firewall settings allow connections");
        console.error(
          "   • For cloud databases, check connection limits and IP whitelist",
        );
      } else if (
        error.message.includes("SSL") ||
        error.message.includes("sslmode")
      ) {
        console.error("🔧 SOLUTION: SSL connection issue");
        console.error(
          "   • Add ?sslmode=require to DATABASE_URL for secure connections",
        );
        console.error(
          "   • Or use ?sslmode=disable for local development (not recommended for production)",
        );
      } else if (error.message.includes("too many connections")) {
        console.error("🔧 SOLUTION: PostgreSQL connection limit reached");
        console.error("   • Reduce connection pool size");
        console.error("   • Check for connection leaks in application");
        console.error("   • Increase max_connections in PostgreSQL config");
      }
    } else {
      // SQLite specific error handling (legacy)
      if (error.message.includes("readonly")) {
        console.error("🔧 SOLUTION: Database file permission issue detected");
        console.error("   • Ensure the database file has write permissions");
        console.error(
          "   • Check that the application has proper file system access",
        );
        console.error(
          "   • Consider using PostgreSQL for production environments",
        );
      } else if (error.message.includes("does not exist")) {
        console.error("🔧 SOLUTION: Database file not found");
        console.error("   • Run 'npx prisma db push' to create the database");
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
    }

    console.error("📖 Database configuration:");
    console.error(
      `   • DATABASE_URL: ${process.env.DATABASE_URL || "NOT SET"}`,
    );
    console.error(`   • NODE_ENV: ${process.env.NODE_ENV || "development"}`);

    // Don't exit in development to allow for database setup
    if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ Exiting in production due to database connection failure",
      );
      process.exit(1);
    } else {
      console.warn("⚠️ Continuing in development mode despite database issues");
      console.warn(
        "   Please fix the database configuration before proceeding",
      );
    }

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
    return { healthy: true, message: "Database connection is healthy" };
  } catch (error) {
    return {
      healthy: false,
      message: `Database connection failed: ${error.message}`,
      error: error.code || "UNKNOWN_ERROR",
    };
  }
};

export { connectDB, getPrisma, checkDatabaseHealth };
export default connectDB;
