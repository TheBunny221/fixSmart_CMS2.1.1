@echo off
REM Kochi Smart City - Development Environment Setup (Windows)
REM ============================================================

echo.
echo 🚀 Kochi Smart City - Development Environment Setup
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

echo ✅ Environment check passed
echo.

REM Step 1: Install dependencies if needed
echo 📦 Step 1/4: Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)
echo.

REM Step 2: Generate Prisma client for development
echo 🔧 Step 2/4: Generating Prisma client for development...
npm run db:generate:dev
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Step 3: Run database migrations
echo 🗃️ Step 3/4: Running database migrations...
npm run db:migrate
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to run migrations
    echo Trying to reset and migrate...
    npm run db:migrate:reset:dev --force
    if %ERRORLEVEL% neq 0 (
        echo ❌ Failed to reset and migrate
        pause
        exit /b 1
    )
)
echo.

REM Step 4: Seed development data
echo 🌱 Step 4/4: Seeding development data...
npm run seed:dev
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to seed development data
    pause
    exit /b 1
)
echo.

echo ✅ Development environment setup completed successfully!
echo.
echo 🔑 Development Credentials:
echo Administrator: admin@cochinsmartcity.dev / admin123
echo Ward Officer:  officer1@cochinsmartcity.dev / officer123
echo Citizen:       arjun.menon@email.dev / citizen123
echo.
echo 💡 Next steps:
echo 1. Start the development server: npm run dev
echo 2. Open Prisma Studio: npm run db:studio:dev
echo 3. Access the application at: http://localhost:3000
echo.
pause
