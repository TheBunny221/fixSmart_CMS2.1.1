@echo off
REM Kochi Smart City - Production Seeding Script (Windows)
REM ======================================================

echo.
echo 🏭 Kochi Smart City - Production Database Seeding
echo ==========================================
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

if "%NODE_ENV%"=="" (
    echo ⚠️ NODE_ENV not set, setting to production
    set NODE_ENV=production
)

echo ✅ Environment check passed
echo.

echo ⚠️ PRODUCTION SEEDING WARNING ⚠️
echo This will seed the production database with essential data.
echo This includes:
echo • Real Kochi Corporation wards
echo • System administrator account
echo • Essential departments and configurations
echo • NO sample/test data
echo.
set /p confirm="Continue with production seeding? (y/N): "
if /i not "%confirm%"=="y" (
    echo Seeding cancelled by user
    pause
    exit /b 0
)
echo.

echo 🌱 Seeding production database with essential data...
npm run seed:production
if %ERRORLEVEL% neq 0 (
    echo ❌ Production seeding failed
    echo Note: This might be expected if data already exists
    echo Check the output above for details
    pause
    exit /b 1
)
echo.

echo ✅ Production seeding completed successfully!
echo.
echo 🔑 Production Admin Credentials:
echo Email: admin@cochinsmartcity.gov.in
if defined ADMIN_PASSWORD (
    echo Password: [Set via ADMIN_PASSWORD environment variable]
) else (
    echo Password: [Default - CHANGE IMMEDIATELY]
)
echo.
echo 🔒 SECURITY REMINDER:
echo Change the admin password immediately after first login!
echo.
echo 💡 Next steps:
echo 1. Start production server: npm start
echo 2. Login and change admin password
echo 3. Configure system settings
echo.
pause
