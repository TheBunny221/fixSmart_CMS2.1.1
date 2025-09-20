import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config();
// Function to load environment-specific configuration
export function loadEnvironmentConfig() {
  // Preserve the initial NODE_ENV set by the runtime (e.g., scripts)
  const initialNodeEnv = process.env.NODE_ENV || 'development';

  console.log(`🔧 Loading ${initialNodeEnv} environment configuration...`);

  // Load base .env file first (do not override existing env)
  const baseEnvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath });
    console.log(`✅ Base environment loaded from: ${baseEnvPath}`);
  }

  // Load environment-specific .env file (override is allowed for most vars)
  const envPath = path.resolve(process.cwd(), `.env.${initialNodeEnv}`);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Environment-specific config loaded from: ${envPath}`);
  } else {
    console.log(`⚠️ No environment-specific config found at: ${envPath}`);
  }

  // Ensure NODE_ENV isn't inadvertently overridden by .env files
  if (process.env.NODE_ENV !== initialNodeEnv) {
    console.warn(
      `⚠️ Detected NODE_ENV override from env files ('${process.env.NODE_ENV}') — restoring '${initialNodeEnv}'`,
    );
    process.env.NODE_ENV = initialNodeEnv;
  }

  // Validate required environment variables
  validateEnvironmentVariables();

  return {
    NODE_ENV: initialNodeEnv,
    isDevelopment: initialNodeEnv === 'development',
    isProduction: initialNodeEnv === 'production',
    isTest: initialNodeEnv === 'test'
  };
}

// Function to validate required environment variables
function validateEnvironmentVariables() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   • ${key}`);
      
      // Provide specific guidance
      if (key === 'DATABASE_URL') {
        if (process.env.NODE_ENV === 'development') {
          console.error('     For development: DATABASE_URL="file:./dev.db"');
        } else {
          console.error('     For production: DATABASE_URL="postgresql://user:pass@host:port/db"');
        }
      } else if (key === 'JWT_SECRET') {
        console.error('     Example: JWT_SECRET="your-secure-secret-key"');
      }
    });

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Exiting due to missing environment variables in production');
      process.exit(1);
    } else {
      console.warn('⚠️ Some environment variables are missing - this may cause issues');
    }
  } else {
    console.log('✅ All required environment variables are set');
  }
}

// Function to get database connection module based on environment
export async function getDatabaseConnection() {
  const envInfo = loadEnvironmentConfig();

  // Prefer DATABASE_URL scheme to decide driver, so dev can use Postgres too
  const dbUrl = process.env.DATABASE_URL || '';
  const usePostgres = /postgres(ql)?:/i.test(dbUrl);

  if (usePostgres) {
    console.log('📊 Using PostgreSQL database based on DATABASE_URL');
    const { connectDB } = await import('../db/connection.js');
    return connectDB;
  }

  if (envInfo.isDevelopment) {
    console.log('📊 Using SQLite database for development');
    const { connectDB } = await import('../db/connection.dev.js');
    return connectDB;
  } else {
    console.log('📊 Using PostgreSQL database for production');
    const { connectDB } = await import('../db/connection.js');
    return connectDB;
  }
}

// Function to get Prisma client based on environment
export async function getPrismaClient() {
  const envInfo = loadEnvironmentConfig();
  const dbUrl = process.env.DATABASE_URL || '';
  const usePostgres = /postgres(ql)?:/i.test(dbUrl);

  if (usePostgres || envInfo.isProduction) {
    const { getPrisma } = await import('../db/connection.js');
    return getPrisma();
  } else {
    const { getPrisma } = await import('../db/connection.dev.js');
    return getPrisma();
  }
}

// Export environment info
export const env = loadEnvironmentConfig();
