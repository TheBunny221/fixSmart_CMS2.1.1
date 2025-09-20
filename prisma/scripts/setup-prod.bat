@echo off
REM Kochi Smart City - Production Environment Setup (Windows)
REM ========================================================

echo.
echo 🏭 Kochi Smart City - Production Environment Setup
echo ================================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not available
    echo Please ensure npm is installed with Node.js
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check environment variables
if "%DATABASE_URL%"=="" (
    echo ❌ DATABASE_URL environment variable is not set
    echo Please set DATABASE_URL for PostgreSQL connection
    echo Example: postgresql://user:password@host:port/database
    pause
    exit /b 1
)

if "%NODE_ENV%"=="" (
    echo ⚠️ NODE_ENV not set, setting to production
    set NODE_ENV=production
)

echo ✅ Environment check passed
echo.

echo ⚠️ PRODUCTION SETUP WARNING ⚠️
echo This will set up the production database.
echo Make sure you have:
echo 1. Backed up any existing data
echo 2. Verified DATABASE_URL is correct
echo 3. Set ADMIN_PASSWORD environment variable
echo.
set /p confirm="Continue with production setup? (y/N): "
if /i not "%confirm%"=="y" (
    echo Setup cancelled by user
    pause
    exit /b 0
)
echo.

REM Step 1: Install dependencies if needed
echo 📦 Step 1/4: Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm ci
    if %ERRORLEVEL% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)
echo.

REM Step 2: Generate Prisma client for production
echo 🔧 Step 2/4: Generating Prisma client for production...
npm run db:generate:prod
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Step 3: Deploy migrations to production
echo 🗃️ Step 3/4: Deploying migrations to production...
npm run db:migrate:deploy:prod
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to deploy migrations
    echo Please check your DATABASE_URL and database connectivity
    pause
    exit /b 1
)
echo.

REM Step 4: Seed production data
echo 🌱 Step 4/4: Seeding production data...
npm run seed:production
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to seed production data
    echo Note: This might be expected if data already exists
    echo Check the logs above for details
)
echo.

echo ✅ Production environment setup completed!
echo.
echo 🔑 Production Admin Credentials:
echo Email: admin@cochinsmartcity.gov.in
if defined ADMIN_PASSWORD (
    echo Password: [Set via ADMIN_PASSWORD environment variable]
) else (
    echo Password: [Default - CHANGE IMMEDIATELY]
)
echo.
echo 🔒 IMPORTANT SECURITY REMINDERS:
echo 1. Change the admin password immediately after first login
echo 2. Verify all environment variables are set correctly
echo 3. Enable SSL for database connections
echo 4. Set up monitoring and backup procedures
echo 5. Review system configuration settings
echo.
echo 💡 Next steps:
echo 1. Start the production server: npm start
echo 2. Access admin panel and change default password
echo 3. Configure system settings through admin interface
echo.
pause
