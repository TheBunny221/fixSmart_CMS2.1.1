#!/bin/bash
# Kochi Smart City - Development Seeding Script (Unix/Linux/macOS)
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
trap 'log_error "Seeding failed at line $LINENO. Exit code: $?"' ERR

echo
log_header "🌱 Kochi Smart City - Development Database Seeding"
log_header "==========================================="
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

log_info "🌱 Seeding development database with sample data..."
log_info "This will add:"
log_info "• Sample wards and sub-zones"
log_info "• Test user accounts"
log_info "• Sample complaints and service requests"
log_info "��� Development system configuration"
echo

npm run seed:dev
echo

log_success "✅ Development seeding completed successfully!"
echo
log_header "🔑 Development Credentials:"
echo "Administrator: admin@cochinsmartcity.dev / admin123"
echo "Ward Officer:  officer1@cochinsmartcity.dev / officer123"
echo "Maintenance:   suresh.kumar@cochinsmartcity.dev / maintenance123"
echo "Citizen:       arjun.menon@email.dev / citizen123"
echo
log_header "💡 Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Login with any of the above credentials"
echo "3. Open Prisma Studio: npm run db:studio:dev"
echo

# Make the script pause-like behavior optional
if [ "${1}" != "--no-pause" ]; then
    read -p "Press Enter to continue..."
fi
