#!/bin/bash
# Kochi Smart City - Development Migration Script (Unix/Linux/macOS)
# ==================================================================

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
log_header "🔄 Kochi Smart City - Development Database Migration"
log_header "=============================================="
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

log_success "✅ Environment check passed"
echo

# Generate Prisma client first
log_info "🔧 Step 1/2: Generating Prisma client for development..."
npm run db:generate:dev
echo

# Run migrations with error handling
log_info "🗃�� Step 2/2: Running database migrations..."
if ! npm run db:migrate; then
    log_error "❌ Migration failed"
    echo
    read -p "Reset database and try again? (y/N): " reset
    if [[ $reset =~ ^[Yy]$ ]]; then
        log_info "Resetting database..."
        npm run db:migrate:reset:dev --force
    else
        log_warning "Migration cancelled"
        exit 1
    fi
fi
echo

log_success "✅ Development migration completed successfully!"
echo
log_header "💡 Next steps:"
echo "1. Run seeding: npm run seed:dev"
echo "2. Start development server: npm run dev"
echo "3. Open Prisma Studio: npm run db:studio:dev"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ]; then
    read -p "Press Enter to continue..."
fi
