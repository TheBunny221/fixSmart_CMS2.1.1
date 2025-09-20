@echo off
REM Kochi Smart City - Production Migration Script (Windows)
REM =======================================================

echo.
echo 🏭 Kochi Smart City - Production Database Migration
echo =============================================
echo.

REM Check basic requirements
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    pause
    exit /b 1
)

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
    pause
    exit /b 1
)

echo ✅ Environment check passed
echo.

echo ⚠️ PRODUCTION MIGRATION WARNING ⚠️
echo This will apply database migrations to production.
echo Make sure you have:
echo 1. Backed up the production database
echo 2. Tested migrations in staging environment
echo 3. Verified DATABASE_URL is correct
echo.
set /p confirm="Continue with production migration? (y/N): "
if /i not "%confirm%"=="y" (
    echo Migration cancelled by user
    pause
    exit /b 0
)
echo.

REM Generate Prisma client first
echo 🔧 Step 1/2: Generating Prisma client for production...
npm run db:generate:prod
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Deploy migrations
echo 🗃️ Step 2/2: Deploying migrations to production...
npm run db:migrate:deploy:prod
if %ERRORLEVEL% neq 0 (
    echo ❌ Migration deployment failed
    echo Please check your DATABASE_URL and database connectivity
    pause
    exit /b 1
)
echo.

echo ✅ Production migration completed successfully!
echo.
echo 💡 Next steps:
echo 1. Verify application functionality
echo 2. Monitor for any issues
echo 3. Update application if needed
echo.
pause
