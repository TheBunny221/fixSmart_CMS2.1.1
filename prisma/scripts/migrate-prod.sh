#!/bin/bash
# Kochi Smart City - Production Migration Script (Unix/Linux/macOS)
# =================================================================

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
trap 'log_error "Migration failed at line $LINENO. Exit code: $?"' ERR

echo
log_header "🏭 Kochi Smart City - Production Database Migration"
log_header "============================================="
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

log_success "✅ Environment check passed"
echo

log_warning "⚠️ PRODUCTION MIGRATION WARNING ⚠️"
log_warning "This will apply database migrations to production."
log_warning "Make sure you have:"
log_warning "1. Backed up the production database"
log_warning "2. Tested migrations in staging environment"
log_warning "3. Verified DATABASE_URL is correct"
echo

# Ask for confirmation unless --force flag is provided
if [ "${1}" != "--force" ]; then
    read -p "Continue with production migration? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Migration cancelled by user"
        exit 0
    fi
fi
echo

# Generate Prisma client first
log_info "🔧 Step 1/2: Generating Prisma client for production..."
npm run db:generate:prod
echo

# Deploy migrations
log_info "🗃️ Step 2/2: Deploying migrations to production..."
npm run db:migrate:deploy:prod
echo

log_success "✅ Production migration completed successfully!"
echo
log_header "💡 Next steps:"
echo "1. Verify application functionality"
echo "2. Monitor for any issues"
echo "3. Update application if needed"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ] && [ "${1}" != "--force" ]; then
    read -p "Press Enter to continue..."
fi
