#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const cwd = process.cwd();
const nodeEnv = process.env.NODE_ENV || 'development';

// Load base env then env-specific
const baseEnv = path.resolve(cwd, '.env');
if (fs.existsSync(baseEnv)) dotenv.config({ path: baseEnv });
const envFile = path.resolve(cwd, `.env.${nodeEnv}`);
if (fs.existsSync(envFile)) dotenv.config({ path: envFile, override: true });

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`ℹ️  ${msg}`);
}

const url = process.env.DATABASE_URL || '';
console.log('🔍 Validating environment variables...', process.env.DATABASE_URL);
const port = process.env.PORT || '';

info(`NODE_ENV=${nodeEnv}`);

if (!url) {
  if (nodeEnv === 'production') {
    fail('DATABASE_URL is required in production (e.g. postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public)');
  } else {
    console.warn('⚠️  DATABASE_URL not set. For dev, set DATABASE_URL="file:./dev.db" in .env.development');
  }
} else {
  if (nodeEnv === 'production') {
    const pgRegex = /^postgres(ql)?:\/\/[\w%+-.]+(?::[^@\s]+)?@[^\s:@/]+:\d+\/[\w%+-.]+(\?[\w%&=.-]+)?$/i;
    if (!pgRegex.test(url)) {
      fail(`Invalid PostgreSQL DATABASE_URL format: ${url}`);
    }
    info('PostgreSQL DATABASE_URL format looks valid.');
  } else {
    if (!url.startsWith('file:')) {
      console.warn(`⚠️  For dev, DATABASE_URL should look like file:./dev.db, received: ${url}`);
    } else {
      info('SQLite DATABASE_URL format looks valid.');
    }
  }
}

if (nodeEnv === 'production' && !port) {
  console.warn('⚠️  PORT not set. Defaulting to 4005 at runtime.');
}

console.log('✅ Environment validation complete');
