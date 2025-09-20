# Prisma Setup Scripts

This directory contains automated setup scripts for the Kochi Smart City database in both Windows and Unix/Linux environments.

## Available Scripts

### Windows Batch Scripts (.bat)

- **`setup-dev.bat`** - Complete development environment setup (SQLite)
- **`setup-prod.bat`** - Complete production environment setup (PostgreSQL)
- **`migrate-dev.bat`** - Development database migrations only
- **`migrate-prod.bat`** - Production database migrations only
- **`seed-dev.bat`** - Development data seeding only
- **`seed-prod.bat`** - Production data seeding only

### Unix/Linux Shell Scripts (.sh)

- **`setup-dev.sh`** - Complete development environment setup (SQLite)
- **`setup-prod.sh`** - Complete production environment setup (PostgreSQL)
- **`migrate-dev.sh`** - Development database migrations only
- **`migrate-prod.sh`** - Production database migrations only
- **`seed-dev.sh`** - Development data seeding only
- **`seed-prod.sh`** - Production data seeding only

## Usage

### Windows

```batch
# Complete setup
.\prisma\scripts\setup-dev.bat      # Development
.\prisma\scripts\setup-prod.bat     # Production

# Individual operations
.\prisma\scripts\migrate-dev.bat    # Development migrations
.\prisma\scripts\migrate-prod.bat   # Production migrations
.\prisma\scripts\seed-dev.bat       # Development seeding
.\prisma\scripts\seed-prod.bat      # Production seeding
```

### Unix/Linux/macOS

```bash
# Make scripts executable (if needed)
chmod +x prisma/scripts/*.sh

# Complete setup
./prisma/scripts/setup-dev.sh       # Development
./prisma/scripts/setup-prod.sh      # Production

# Individual operations
./prisma/scripts/migrate-dev.sh     # Development migrations
./prisma/scripts/migrate-prod.sh    # Production migrations
./prisma/scripts/seed-dev.sh        # Development seeding
./prisma/scripts/seed-prod.sh       # Production seeding

# Silent mode (no pause at end)
./prisma/scripts/setup-dev.sh --no-pause
./prisma/scripts/setup-prod.sh --force  # Skip confirmation prompts
```

## Interactive Setup

For an interactive setup experience, use the main setup script:

```bash
# Interactive setup (recommended for beginners)
node prisma/setup.js
```

This will present a menu-driven interface to choose your setup option.

## What Each Script Does

### Development Setup (`setup-dev.*`)

1. **Dependencies Check** - Verifies Node.js and npm are available
2. **Install Dependencies** - Runs `npm install` if needed
3. **Generate Client** - Creates Prisma client for development schema
4. **Run Migrations** - Applies SQLite migrations
5. **Seed Data** - Adds sample data including test accounts

**Creates:**

- SQLite database file (`prisma/dev.db`)
- Test user accounts with `.dev` email domains
- Sample complaints and service requests
- Development system configuration

### Production Setup (`setup-prod.*`)

1. **Environment Check** - Validates DATABASE_URL and other env vars
2. **Dependencies Check** - Verifies Node.js and npm are available
3. **Install Dependencies** - Runs `npm ci` for production dependencies
4. **Generate Client** - Creates Prisma client for production schema
5. **Deploy Migrations** - Applies PostgreSQL migrations
6. **Seed Data** - Adds essential production data only

**Creates:**

- PostgreSQL database schema
- System administrator account
- Real Kochi Corporation wards
- Essential departments and configurations
- No test/sample data

### Migration Scripts (`migrate-*.*`)

Focused scripts that only handle database schema migrations:

- Generate Prisma client
- Apply/deploy migrations
- Handle migration failures with reset options

### Seeding Scripts (`seed-*.*`)

Focused scripts that only handle data seeding:

- Development: Sample data with test accounts
- Production: Essential data with safety checks

## Safety Features

### Development Scripts

- ✅ Can be run multiple times safely
- ✅ Automatically reset database if migration fails
- ✅ Clear error messages and recovery suggestions

### Production Scripts

- ✅ Confirmation prompts before destructive operations
- ✅ Environment variable validation
- ✅ Safety checks to prevent data loss
- ✅ Backup reminders and warnings

## Error Handling

All scripts include comprehensive error handling:

1. **Prerequisites Check** - Verifies Node.js, npm, and project structure
2. **Environment Validation** - Checks required environment variables
3. **Graceful Failures** - Clear error messages with troubleshooting steps
4. **Recovery Options** - Suggests corrective actions when possible

## Customization

### Script Arguments

Unix/Linux scripts support additional arguments:

- `--no-pause` - Skip "Press Enter to continue" prompts
- `--force` - Skip confirmation prompts (production scripts)

Example:

```bash
./prisma/scripts/setup-prod.sh --force
```

### Environment Variables

Scripts respect the following environment variables:

- `DATABASE_URL` - Database connection string
- `NODE_ENV` - Environment mode (development/production)
- `ADMIN_PASSWORD` - Production admin password
- `JWT_SECRET` - JWT signing secret

## Troubleshooting

### Common Issues

1. **Permission Denied (Unix/Linux)**

   ```bash
   chmod +x prisma/scripts/*.sh
   ```

2. **Script Not Found**
   - Ensure you're running from project root directory
   - Check if the script file exists

3. **Database Connection Failed**
   - Verify DATABASE_URL environment variable
   - Check if PostgreSQL server is running
   - Verify database credentials

4. **Migration Failed**
   - Development: Script will offer to reset database
   - Production: Check database connectivity and permissions

### Getting Help

- Use the interactive setup: `node prisma/setup.js`
- Check the main README: `../README.md`
- Run validation: `npm run db:setup:validate`

## Contributing

When adding new scripts:

1. Create both `.bat` and `.sh` versions
2. Include proper error handling and validation
3. Add colored output for better user experience
4. Test on both Windows and Unix systems
5. Update this README with new script descriptions

## Security Notes

- Production scripts include safety prompts and confirmations
- Never commit database URLs or passwords to version control
- Use environment variables for sensitive configuration
- Production seeding includes safety checks to prevent data loss
