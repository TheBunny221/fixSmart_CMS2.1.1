#!/bin/bash
# Kochi Smart City - Production Seeding Script (Unix/Linux/macOS)
# ================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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
trap 'log_error "Seeding failed at line $LINENO. Exit code: $?"' ERR

echo
log_header "🏭 Kochi Smart City - Production Database Seeding"
log_header "=========================================="
echo

# Check basic requirements
if ! command -v node &> /dev/null; then
    log_error "❌ Node.js is not installed or not in PATH"
    exit 1
fi

if [ ! -f "package.json" ]; then
    log_error "❌ package.json not found"
    log_info "Please run this script from the project root directory"
    exit 1
fi

# Check environment variables
if [ -z "${DATABASE_URL}" ]; then
    log_error "❌ DATABASE_URL environment variable is not set"
    log_info "Please set DATABASE_URL for PostgreSQL connection"
    exit 1
fi

if [ -z "${NODE_ENV}" ]; then
    log_warning "⚠️ NODE_ENV not set, setting to production"
    export NODE_ENV=production
fi

log_success "✅ Environment check passed"
echo

log_warning "⚠️ PRODUCTION SEEDING WARNING ⚠️"
log_warning "This will seed the production database with essential data."
log_warning "This includes:"
log_warning "• Real Kochi Corporation wards"
log_warning "• System administrator account"
log_warning "• Essential departments and configurations"
log_warning "• NO sample/test data"
echo

# Ask for confirmation unless --force flag is provided
if [ "${1}" != "--force" ]; then
    read -p "Continue with production seeding? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Seeding cancelled by user"
        exit 0
    fi
fi
echo

log_info "🌱 Seeding production database with essential data..."
if ! npm run seed:production; then
    log_warning "❌ Production seeding failed"
    log_warning "Note: This might be expected if data already exists"
    log_warning "Check the output above for details"
    exit 1
fi
echo

log_success "✅ Production seeding completed successfully!"
echo
log_header "🔑 Production Admin Credentials:"
echo "Email: admin@cochinsmartcity.gov.in"
if [ -n "${ADMIN_PASSWORD}" ]; then
    echo "Password: [Set via ADMIN_PASSWORD environment variable]"
else
    echo "Password: [Default - CHANGE IMMEDIATELY]"
fi
echo
log_header "🔒 SECURITY REMINDER:"
echo "Change the admin password immediately after first login!"
echo
log_header "💡 Next steps:"
echo "1. Start production server: npm start"
echo "2. Login and change admin password"
echo "3. Configure system settings"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ] && [ "${1}" != "--force" ]; then
    read -p "Press Enter to continue..."
fi
