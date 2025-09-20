#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const DEV_ENV_FILE = path.join(PROJECT_ROOT, '.env.development');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');
const DEV_SCHEMA = path.join(PROJECT_ROOT, 'prisma', 'schema.dev.prisma');
const PROD_SCHEMA = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');

async function setupDevelopmentEnvironment() {
  console.log('🚀 Setting up development environment...');

  try {
    // 1. Copy development environment file if .env doesn't exist
    if (!fs.existsSync(ENV_FILE)) {
      console.log('📄 Creating .env file from development template...');
      fs.copyFileSync(DEV_ENV_FILE, ENV_FILE);
      console.log('✅ .env file created');
    } else {
      console.log('📄 .env file already exists, skipping...');
    }

    // 2. Generate Prisma client for development
    console.log('🔧 Generating Prisma client for development...');
    await execAsync(`npx prisma generate --schema=${DEV_SCHEMA}`);
    console.log('✅ Development Prisma client generated');

    // 3. Create development database and run migrations
    console.log('📊 Setting up development database...');
    process.env.DATABASE_URL = 'file:./dev.db';
    
    try {
      await execAsync(`npx prisma db push --schema=${DEV_SCHEMA}`);
      console.log('✅ Development database schema created');
    } catch (dbError) {
      console.warn('⚠️ Database push failed, attempting reset...');
      await execAsync(`npx prisma db push --schema=${DEV_SCHEMA} --accept-data-loss`);
      console.log('✅ Development database schema created (with reset)');
    }

    // 4. Seed development database
    console.log('🌱 Seeding development database...');
    await execAsync('node prisma/seed.dev.js');
    console.log('✅ Development database seeded');

    // 5. Set development environment variable
    process.env.NODE_ENV = 'development';

    console.log('\n🎉 Development environment setup complete!');
    console.log('\n📋 What was set up:');
    console.log('   ✅ Development environment variables (.env)');
    console.log('   ✅ SQLite development database (dev.db)');
    console.log('   ✅ Database schema and seed data');
    console.log('   ✅ Development Prisma client');

    console.log('\n🔧 Development Commands:');
    console.log('   npm run dev:start     - Start development server');
    console.log('   npm run db:dev:studio - Open database browser');
    console.log('   npm run db:dev:reset  - Reset development database');
    console.log('   npm run db:dev:seed   - Re-seed development database');

    console.log('\n🔑 Test Accounts:');
    console.log('   Admin: admin@cochismartcity.dev / admin123');
    console.log('   Ward Officer: ward.officer.fort@cochismartcity.dev / ward123');
    console.log('   Citizen: citizen1@example.com / citizen123');

    console.log('\n🌐 Next Steps:');
    console.log('   1. Run: npm run dev:start');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Login with any test account above');

  } catch (error) {
    console.error('❌ Error setting up development environment:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Ensure Node.js and npm are installed');
    console.error('   2. Run: npm install');
    console.error('   3. Check file permissions');
    console.error('   4. Try running individual commands manually');
    process.exit(1);
  }
}

async function resetDevelopmentEnvironment() {
  console.log('🔄 Resetting development environment...');

  try {
    // Remove development database
    const dbFile = path.join(PROJECT_ROOT, 'dev.db');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log('🗑️ Removed development database');
    }

    // Remove journal files
    const journalFile = path.join(PROJECT_ROOT, 'dev.db-journal');
    if (fs.existsSync(journalFile)) {
      fs.unlinkSync(journalFile);
      console.log('🗑️ Removed database journal file');
    }

    // Re-setup
    await setupDevelopmentEnvironment();

  } catch (error) {
    console.error('❌ Error resetting development environment:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'reset':
    resetDevelopmentEnvironment();
    break;
  case 'setup':
  default:
    setupDevelopmentEnvironment();
    break;
}
