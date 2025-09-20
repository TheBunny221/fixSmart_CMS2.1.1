#!/bin/bash
# Kochi Smart City - Development Environment Setup (Unix/Linux/macOS)
# ===================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

log_header() {
    echo -e "${MAGENTA}$1${NC}"
}

# Error handling
set -e
trap 'log_error "Setup failed at line $LINENO. Exit code: $?"' ERR

echo
log_header "🚀 Kochi Smart City - Development Environment Setup"
log_header "=================================================="
echo

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log_error "❌ Node.js is not installed or not in PATH"
    log_info "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log_error "❌ npm is not available"
    log_info "Please ensure npm is installed with Node.js"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    log_error "❌ package.json not found"
    log_info "Please run this script from the project root directory"
    exit 1
fi

log_success "✅ Environment check passed"
echo

# Step 1: Install dependencies if needed
log_info "📦 Step 1/4: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install
else
    log_info "Dependencies already installed"
fi
echo

# Step 2: Generate Prisma client for development
log_info "🔧 Step 2/4: Generating Prisma client for development..."
npm run db:generate:dev
echo

# Step 3: Run database migrations
log_info "🗃️ Step 3/4: Running database migrations..."
if ! npm run db:migrate; then
    log_warning "Migration failed, trying to reset and migrate..."
    npm run db:migrate:reset:dev --force
fi
echo

# Step 4: Seed development data
log_info "🌱 Step 4/4: Seeding development data..."
npm run seed:dev
echo

log_success "✅ Development environment setup completed successfully!"
echo
log_header "🔑 Development Credentials:"
echo "Administrator: admin@cochinsmartcity.dev / admin123"
echo "Ward Officer:  officer1@cochinsmartcity.dev / officer123"
echo "Citizen:       arjun.menon@email.dev / citizen123"
echo
log_header "💡 Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Open Prisma Studio: npm run db:studio:dev"
echo "3. Access the application at: http://localhost:3000"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ]; then
    read -p "Press Enter to continue..."
fi
