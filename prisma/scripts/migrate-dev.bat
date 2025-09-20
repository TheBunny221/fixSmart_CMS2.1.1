@echo off
REM Kochi Smart City - Development Migration Script (Windows)
REM ========================================================

echo.
echo 🔄 Kochi Smart City - Development Database Migration
echo ==============================================
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

REM Generate Prisma client first
echo 🔧 Step 1/2: Generating Prisma client for development...
npm run db:generate:dev
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

REM Run migrations
echo 🗃️ Step 2/2: Running database migrations...
npm run db:migrate
if %ERRORLEVEL% neq 0 (
    echo ❌ Migration failed
    echo.
    set /p reset="Reset database and try again? (y/N): "
    if /i "%reset%"=="y" (
        echo Resetting database...
        npm run db:migrate:reset:dev --force
        if %ERRORLEVEL% neq 0 (
            echo ❌ Failed to reset database
            pause
            exit /b 1
        )
    ) else (
        echo Migration cancelled
        pause
        exit /b 1
    )
)
echo.

echo ✅ Development migration completed successfully!
echo.
echo 💡 Next steps:
echo 1. Run seeding: npm run seed:dev
echo 2. Start development server: npm run dev
echo 3. Open Prisma Studio: npm run db:studio:dev
echo.
pause
