@echo off
REM Kochi Smart City - Development Seeding Script (Windows)
REM =======================================================

echo.
echo 🌱 Kochi Smart City - Development Database Seeding
echo ============================================
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

echo ✅ Environment check passed
echo.

echo 🌱 Seeding development database with sample data...
echo This will add:
echo • Sample wards and sub-zones
echo • Test user accounts
echo • Sample complaints and service requests
echo • Development system configuration
echo.

npm run seed:dev
if %ERRORLEVEL% neq 0 (
    echo ❌ Development seeding failed
    pause
    exit /b 1
)
echo.

echo ✅ Development seeding completed successfully!
echo.
echo 🔑 Development Credentials:
echo Administrator: admin@cochinsmartcity.dev / admin123
echo Ward Officer:  officer1@cochinsmartcity.dev / officer123
echo Maintenance:   suresh.kumar@cochinsmartcity.dev / maintenance123
echo Citizen:       arjun.menon@email.dev / citizen123
echo.
echo 💡 Next steps:
echo 1. Start development server: npm run dev
echo 2. Login with any of the above credentials
echo 3. Open Prisma Studio: npm run db:studio:dev
echo.
pause
