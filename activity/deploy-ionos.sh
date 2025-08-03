#!/bin/bash

# Opure Discord Activity - IONOS Deployment Script
# This script builds and prepares the project for IONOS hosting

set -e  # Exit on any error

echo "🚀 Starting Opure Discord Activity deployment preparation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="build-ionos"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="opure-discord-activity-ionos-${TIMESTAMP}"

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}/public
mkdir -p ${BUILD_DIR}/server

# Check if required files exist
if [ ! -f "client/package.json" ]; then
    echo -e "${RED}❌ Error: client/package.json not found. Are you in the activity directory?${NC}"
    exit 1
fi

if [ ! -f "server/package.json" ]; then
    echo -e "${RED}❌ Error: server/package.json not found. Are you in the activity directory?${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"

echo "Installing root dependencies..."
npm install

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Installing server dependencies..."
cd server && npm install && cd ..

# Build client
echo -e "${BLUE}⚡ Building client application...${NC}"
cd client

# Set environment variables for production build
export VITE_DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID:-your_discord_client_id}"
export VITE_API_URL="https://api.opure.uk"
export VITE_WS_URL="wss://api.opure.uk"
export VITE_NODE_ENV="production"
export VITE_ENABLE_ANALYTICS="true"
export VITE_ENABLE_ERROR_REPORTING="true"

npm run build

# Copy client build to deployment directory
echo -e "${BLUE}📋 Copying client build...${NC}"
cp -r dist/* ../${BUILD_DIR}/public/

cd ..

# Build server
echo -e "${BLUE}⚡ Building server application...${NC}"
cd server
npm run build

# Copy server build to deployment directory
echo -e "${BLUE}📋 Copying server build...${NC}"
cp -r dist/* ../${BUILD_DIR}/server/
cp package.json ../${BUILD_DIR}/server/
cp package-lock.json ../${BUILD_DIR}/server/

cd ..

# Create IONOS-specific configuration files
echo -e "${BLUE}⚙️ Creating IONOS configuration files...${NC}"

# Create .htaccess for client
cat > ${BUILD_DIR}/public/.htaccess << 'EOF'
# Opure Discord Activity - IONOS Configuration
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

# Content Security Policy for Discord Activities
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://discord.com https://*.discord.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; media-src 'self' blob: https: http:; connect-src 'self' wss: https: ws:; frame-src 'self' https://discord.com https://*.discord.com; worker-src 'self' blob:"

# CORS headers for Discord
Header always set Access-Control-Allow-Origin "https://discord.com"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# Cache control for static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Cache control for HTML
<FilesMatch "\.(html|htm)$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Prevent access to sensitive files
<Files ~ "^\.">
    Order allow,deny
    Deny from all
</Files>

<Files "*.log">
    Order allow,deny
    Deny from all
</Files>
EOF

# Create robots.txt
cat > ${BUILD_DIR}/public/robots.txt << 'EOF'
User-agent: *
Allow: /

Sitemap: https://opure.uk/sitemap.xml
EOF

# Create sitemap.xml
cat > ${BUILD_DIR}/public/sitemap.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://opure.uk/</loc>
    <lastmod>2025-08-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://opure.uk/music</loc>
    <lastmod>2025-08-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
EOF

# Create deployment instructions
cat > ${BUILD_DIR}/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
# Opure Discord Activity - IONOS Deployment Instructions

## Quick Deployment Steps

1. **Upload the `public` folder contents to your IONOS web hosting root directory**
   - Usually `/` or `/public_html/` depending on your IONOS setup
   - Make sure `.htaccess` file is uploaded and not hidden

2. **Server Deployment (Choose one option):**

   ### Option A: Use a free service for the backend (Recommended)
   - Deploy the `server` folder to Railway, Render, or Fly.io
   - Update your client's API URL to point to the deployed server

   ### Option B: IONOS hosting with Node.js (if available)
   - Upload the `server` folder contents
   - Run `npm install --production` on the server
   - Configure your IONOS hosting to serve the Node.js application

## Environment Variables

Make sure to set these environment variables in your deployment:

### Client (.env)
```
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_API_URL=https://api.opure.uk
VITE_WS_URL=wss://api.opure.uk
```

### Server (.env)
```
NODE_ENV=production
PORT=3001
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
JWT_SECRET=your_jwt_secret_min_32_chars
CLIENT_URL=https://opure.uk
```

## Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Create a new application or select existing
3. In "Activities" section:
   - Set Target URL to: `https://opure.uk`
   - Set Supported Platforms: Desktop, Mobile
4. In "OAuth2" section:
   - Add redirect URI: `https://opure.uk/auth/callback`

## HTTPS Configuration

Your IONOS hosting should automatically provide HTTPS for opure.uk.
Make sure to:
- Force HTTPS redirects in IONOS control panel
- Update any HTTP references to HTTPS

## Testing

After deployment, test:
1. Visit https://opure.uk - should load the application
2. Check browser console for any errors
3. Test Discord Activity functionality

## Support

If you encounter issues:
1. Check IONOS hosting logs
2. Verify all files uploaded correctly
3. Ensure .htaccess is not being ignored
4. Check Discord application configuration
EOF

# Create archive for easy upload
echo -e "${BLUE}📦 Creating deployment archive...${NC}"
cd ${BUILD_DIR}
tar -czf ${ARCHIVE_NAME}.tar.gz public/ server/ DEPLOYMENT_INSTRUCTIONS.md
cd ..

# Create server deployment for free hosting services
echo -e "${BLUE}🚀 Creating server deployment configurations...${NC}"

# Railway configuration
cat > ${BUILD_DIR}/server/railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "opure-server"
source = "."

[services.variables]
NODE_ENV = "production"
PORT = "3001"
EOF

# Render configuration
cat > ${BUILD_DIR}/server/render.yaml << 'EOF'
services:
  - type: web
    name: opure-discord-activity
    env: node
    buildCommand: npm install --production
    startCommand: npm start
    plan: free
    autoDeploy: false
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
EOF

# Fly.io configuration
cat > ${BUILD_DIR}/server/fly.toml << 'EOF'
app = "opure-discord-activity"
primary_region = "lhr"

[build]
  builder = "heroku/nodejs"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/health"
  timeout = "5s"
EOF

# Summary
echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo -e "${YELLOW}📁 Files created in: ${BUILD_DIR}/${NC}"
echo -e "${YELLOW}📦 Archive created: ${BUILD_DIR}/${ARCHIVE_NAME}.tar.gz${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Extract and upload the 'public' folder contents to your IONOS hosting"
echo "2. Deploy the server to a free service (Railway, Render, or Fly.io)"
echo "3. Update environment variables with your Discord application details"
echo "4. Test the deployment at https://opure.uk"
echo ""
echo -e "${GREEN}🎉 Your Opure Discord Activity is ready for deployment!${NC}"