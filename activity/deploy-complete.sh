#!/bin/bash

# Opure Discord Activity Complete Deployment Script
# This script deploys both client and server components

set -e

echo "🚀 Starting Opure Discord Activity Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the activity directory."
    exit 1
fi

# Step 1: Build client
print_info "Building client application..."
cd client
if [ ! -d "node_modules" ]; then
    print_info "Installing client dependencies..."
    npm install
fi

print_info "Building client for production..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Client build completed successfully"
else
    print_error "Client build failed"
    exit 1
fi

cd ..

# Step 2: Prepare server
print_info "Preparing server for deployment..."
cd server

if [ ! -d "node_modules" ]; then
    print_info "Installing server dependencies..."
    npm install
fi

# Step 3: Deploy to Vercel (server)
print_info "Deploying server to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
    if [ $? -eq 0 ]; then
        print_status "Server deployed to Vercel successfully"
    else
        print_error "Vercel deployment failed"
        exit 1
    fi
else
    print_warning "Vercel CLI not found. Please install it: npm i -g vercel"
    print_info "Manual deployment required:"
    print_info "1. Run 'vercel --prod' in the server directory"
    print_info "2. Configure custom domain api.opure.uk to point to Vercel deployment"
fi

cd ..

# Step 4: Deploy client to IONOS
print_info "Preparing client for IONOS deployment..."
cd client

# Create deployment package
if [ -d "../ionos-deploy" ]; then
    rm -rf "../ionos-deploy"
fi

mkdir -p "../ionos-deploy"
cp -r dist/* "../ionos-deploy/"

print_status "Client files prepared for IONOS deployment"
print_info "Upload the contents of 'ionos-deploy' folder to your IONOS hosting at opure.uk"

cd ..

# Step 5: Configuration checks
print_info "Checking configuration..."

# Check environment variables
if [ -f "server/.env" ]; then
    print_status "Server .env file found"
else
    print_warning "Server .env file not found. Create one with:"
    echo "DISCORD_CLIENT_ID=1388207626944249856"
    echo "DISCORD_CLIENT_SECRET=your_discord_client_secret"
    echo "DISCORD_REDIRECT_URI=https://api.opure.uk/auth/callback"
    echo "OLLAMA_HOST=http://your-ollama-host:11434"
fi

if [ -f "client/.env" ]; then
    print_status "Client .env file found"
else
    print_warning "Client .env file not found. Create one with:"
    echo "VITE_DISCORD_CLIENT_ID=1388207626944249856"
    echo "VITE_API_URL=https://api.opure.uk"
fi

# Step 6: Final instructions
echo ""
echo "🎉 Deployment Preparation Complete!"
echo "====================================="
echo ""
print_info "Next steps:"
echo "1. ✅ Server API deployed to Vercel (if Vercel CLI was available)"
echo "2. 📁 Client files ready in 'ionos-deploy' folder"
echo "3. 🌐 Upload ionos-deploy contents to opure.uk hosting"
echo "4. 🔧 Configure DNS:"
echo "   - opure.uk → IONOS hosting (client)"
echo "   - api.opure.uk → Vercel deployment (server)"
echo "5. 🤖 Update bot.py to use https://api.opure.uk/api/bot/data"
echo ""
print_status "Your Discord Activity should be ready after DNS propagation!"
echo ""
print_info "Test endpoints:"
echo "- Client: https://opure.uk"
echo "- API Health: https://api.opure.uk/health"
echo "- Bot Data: https://api.opure.uk/api/bot/data"
echo ""
print_info "Troubleshooting:"
echo "- Check browser console for any CORS issues"
echo "- Verify Discord OAuth2 settings in Discord Developer Portal"
echo "- Ensure bot.py can reach the API endpoint"
echo ""
echo "Happy coding! 🚀"