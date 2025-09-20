#!/usr/bin/env node

/**
 * Kochi Smart City - Interactive Database Setup
 * =============================================
 *
 * This script helps users choose and run the appropriate database setup
 * for their environment (development or production).
 */

import { spawn } from "child_process";
import { createInterface } from "readline";
import { platform } from "os";
import fs from "fs";
import path from "path";

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
};

const log = (color, message) =>
  console.log(`${colors[color]}${message}${colors.reset}`);

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Helper to run scripts
const runScript = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    const isWindows = platform() === "win32";
    const command = isWindows ? scriptPath : "bash";
    const scriptArgs = isWindows ? args : [scriptPath, ...args];

    log("blue", `\n🚀 Running: ${command} ${scriptArgs.join(" ")}`);

    const child = spawn(command, scriptArgs, {
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
};

// Check if script files exist
const checkScriptExists = (scriptPath) => {
  try {
    return fs.existsSync(scriptPath);
  } catch (error) {
    return false;
  }
};

// Get appropriate script path based on platform
const getScriptPath = (scriptName) => {
  const isWindows = platform() === "win32";
  const extension = isWindows ? ".bat" : ".sh";
  const scriptPath = `prisma/scripts/${scriptName}${extension}`;

  if (!checkScriptExists(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }

  return scriptPath;
};

// Main menu
const showMainMenu = () => {
  log("magenta", "\n🏙️ Kochi Smart City - Database Setup");
  log("magenta", "===================================");
  log("white", "\nChoose your setup option:");
  log("white", "");
  log("green", "1. 🛠️  Development Setup (SQLite)");
  log("white", "   • Quick setup with sample data");
  log("white", "   • SQLite database (no external setup required)");
  log("white", "   • Test accounts and sample complaints");
  log("white", "");
  log("blue", "2. 🏭 Production Setup (PostgreSQL)");
  log("white", "   • Production-ready PostgreSQL setup");
  log("white", "   • Essential data only");
  log("white", "   • Requires DATABASE_URL configuration");
  log("white", "");
  log("cyan", "3. 🔧 Migration Only");
  log("white", "   • Run database migrations only");
  log("white", "   • Choose between dev/prod environments");
  log("white", "");
  log("yellow", "4. 🌱 Seeding Only");
  log("white", "   • Seed database with data only");
  log("white", "   • Choose between dev/prod environments");
  log("white", "");
  log("white", "5. ❓ Help & Information");
  log("white", "6. 🚪 Exit");
  log("white", "");
};

// Show environment submenu
const showEnvironmentMenu = (operation) => {
  log("cyan", `\n${operation} - Choose Environment:`);
  log("white", "1. Development (SQLite)");
  log("white", "2. Production (PostgreSQL)");
  log("white", "3. Back to main menu");
  log("white", "");
};

// Show help information
const showHelp = () => {
  log("cyan", "\n📚 Help & Information");
  log("cyan", "====================");
  log("white", "");
  log("white", "🛠️ Development Setup:");
  log("white", "• Uses SQLite database (file-based, no server required)");
  log("white", "• Creates sample data including test accounts");
  log("white", "• Perfect for local development and testing");
  log("white", "• Database file: prisma/dev.db");
  log("white", "");
  log("white", "🏭 Production Setup:");
  log("white", "• Uses PostgreSQL database (requires server)");
  log("white", "• Creates only essential production data");
  log("white", "• Requires DATABASE_URL environment variable");
  log("white", "• No test/sample data included");
  log("white", "");
  log("white", "📋 Environment Variables:");
  log("white", '• Development: DATABASE_URL="file:./prisma/dev.db"');
  log(
    "white",
    '• Production: DATABASE_URL="postgresql://user:pass@host:port/db"',
  );
  log("white", "• JWT_SECRET: Required for both environments");
  log("white", "• ADMIN_PASSWORD: Admin password (production)");
  log("white", "");
  log("white", "🔧 Manual Commands:");
  log("white", "• npm run db:setup:dev - Development setup");
  log("white", "• npm run db:setup:prod - Production setup");
  log("white", "• npm run db:studio:dev - Open database browser (dev)");
  log("white", "• npm run db:studio:prod - Open database browser (prod)");
  log("white", "");
  log("white", "📁 Script Locations:");
  log("white", "• Windows: prisma/scripts/*.bat");
  log("white", "• Unix/Linux: prisma/scripts/*.sh");
  log("white", "");
  log("white", "📖 More Information:");
  log("white", "• README: prisma/README.md");
  log("white", "• Database Setup: DB_SETUP.md");
  log("white", "• Architecture: docs/architecture.md");
  log("white", "");
};

// Handle user choice
const handleChoice = async (choice) => {
  try {
    switch (choice) {
      case "1":
        log("green", "\n🛠️ Starting Development Setup...");
        await runScript(getScriptPath("setup-dev"));
        break;

      case "2":
        log("blue", "\n🏭 Starting Production Setup...");

        // Check for DATABASE_URL
        if (
          !process.env.DATABASE_URL ||
          !process.env.DATABASE_URL.startsWith("postgresql://")
        ) {
          log(
            "yellow",
            "\n⚠️ Warning: DATABASE_URL not configured for PostgreSQL",
          );
          log("white", "Please set DATABASE_URL environment variable:");
          log(
            "white",
            'export DATABASE_URL="postgresql://user:password@host:port/database"',
          );
          log("white", "");
          const continueAnyway = await askQuestion("Continue anyway? (y/N): ");
          if (!/^y$/i.test(continueAnyway.trim())) {
            log("yellow", "Setup cancelled");
            return false;
          }
        }

        await runScript(getScriptPath("setup-prod"));
        break;

      case "3":
        showEnvironmentMenu("Migration");
        const migrationChoice = await askQuestion("Enter your choice (1-3): ");

        if (migrationChoice === "1") {
          await runScript(getScriptPath("migrate-dev"));
        } else if (migrationChoice === "2") {
          await runScript(getScriptPath("migrate-prod"));
        } else if (migrationChoice === "3") {
          return false; // Go back to main menu
        } else {
          log("red", "Invalid choice");
          return false;
        }
        break;

      case "4":
        showEnvironmentMenu("Seeding");
        const seedingChoice = await askQuestion("Enter your choice (1-3): ");

        if (seedingChoice === "1") {
          await runScript(getScriptPath("seed-dev"));
        } else if (seedingChoice === "2") {
          await runScript(getScriptPath("seed-prod"));
        } else if (seedingChoice === "3") {
          return false; // Go back to main menu
        } else {
          log("red", "Invalid choice");
          return false;
        }
        break;

      case "5":
        showHelp();
        await askQuestion("\nPress Enter to continue...");
        return false; // Go back to main menu

      case "6":
        log("cyan", "\nGoodbye! 👋");
        return true; // Exit

      default:
        log("red", "Invalid choice. Please enter 1-6.");
        return false;
    }

    return true; // Exit after successful operation
  } catch (error) {
    log("red", `\n❌ Error: ${error.message}`);
    log("yellow", "\nFor help, choose option 5 from the main menu");
    return false;
  }
};

// Main function
const main = async () => {
  try {
    log("magenta", "🏙️ Welcome to Kochi Smart City Database Setup!");

    // Check if we're in the right directory
    if (!fs.existsSync("package.json")) {
      log("red", "\n❌ Error: package.json not found");
      log("white", "Please run this script from the project root directory");
      process.exit(1);
    }

    // Check if prisma directory exists
    if (!fs.existsSync("prisma")) {
      log("red", "\n❌ Error: prisma directory not found");
      log("white", "This doesn't appear to be a Prisma project");
      process.exit(1);
    }

    let shouldExit = false;

    while (!shouldExit) {
      showMainMenu();
      const choice = await askQuestion("Enter your choice (1-6): ");
      shouldExit = await handleChoice(choice.trim());

      if (!shouldExit) {
        log("white", "\n" + "=".repeat(50));
      }
    }
  } catch (error) {
    log("red", `\n❌ Unexpected error: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Handle script interruption
process.on("SIGINT", () => {
  log("yellow", "\n\n👋 Setup interrupted by user");
  rl.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("yellow", "\n\n👋 Setup terminated");
  rl.close();
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  log("red", `Fatal error: ${error.message}`);
  process.exit(1);
});
