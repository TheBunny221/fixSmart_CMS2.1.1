#!/bin/bash
# Kochi Smart City - Production Environment Setup (Unix/Linux/macOS)
# ==================================================================

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
log_header "🏭 Kochi Smart City - Production Environment Setup"
log_header "================================================"
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

# Check environment variables
if [ -z "${DATABASE_URL}" ]; then
    log_error "❌ DATABASE_URL environment variable is not set"
    log_info "Please set DATABASE_URL for PostgreSQL connection"
    log_info "Example: postgresql://user:password@host:port/database"
    exit 1
fi

if [ -z "${NODE_ENV}" ]; then
    log_warning "⚠️ NODE_ENV not set, setting to production"
    export NODE_ENV=production
fi

log_success "✅ Environment check passed"
echo

log_warning "⚠️ PRODUCTION SETUP WARNING ⚠️"
log_warning "This will set up the production database."
log_warning "Make sure you have:"
log_warning "1. Backed up any existing data"
log_warning "2. Verified DATABASE_URL is correct"
log_warning "3. Set ADMIN_PASSWORD environment variable"
echo

# Ask for confirmation unless --force flag is provided
if [ "${1}" != "--force" ]; then
    read -p "Continue with production setup? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Setup cancelled by user"
        exit 0
    fi
fi
echo

# Step 1: Install dependencies if needed
log_info "📦 Step 1/4: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm ci
else
    log_info "Dependencies already installed"
fi
echo

# Step 2: Generate Prisma client for production
log_info "🔧 Step 2/4: Generating Prisma client for production..."
npm run db:generate:prod
echo

# Step 3: Deploy migrations to production
log_info "🗃️ Step 3/4: Deploying migrations to production..."
npm run db:migrate:deploy:prod
echo

# Step 4: Seed production data
log_info "🌱 Step 4/4: Seeding production data..."
if ! npm run seed:production; then
    log_warning "❌ Failed to seed production data"
    log_warning "Note: This might be expected if data already exists"
    log_warning "Check the logs above for details"
fi
echo

log_success "✅ Production environment setup completed!"
echo
log_header "🔑 Production Admin Credentials:"
echo "Email: admin@cochinsmartcity.gov.in"
if [ -n "${ADMIN_PASSWORD}" ]; then
    echo "Password: [Set via ADMIN_PASSWORD environment variable]"
else
    echo "Password: [Default - CHANGE IMMEDIATELY]"
fi
echo
log_header "🔒 IMPORTANT SECURITY REMINDERS:"
echo "1. Change the admin password immediately after first login"
echo "2. Verify all environment variables are set correctly"
echo "3. Enable SSL for database connections"
echo "4. Set up monitoring and backup procedures"
echo "5. Review system configuration settings"
echo
log_header "💡 Next steps:"
echo "1. Start the production server: npm start"
echo "2. Access admin panel and change default password"
echo "3. Configure system settings through admin interface"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ] && [ "${1}" != "--force" ]; then
    read -p "Press Enter to continue..."
fi
