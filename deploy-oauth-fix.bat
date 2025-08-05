@echo off
echo.
echo 🚀 Opure OAuth2 Fix - Deployment Script
echo =====================================
echo.

echo 📍 Current Setup:
echo    Client: opure.uk (IONOS)
echo    Server: api.opure.uk (Vercel via IONOS DNS)
echo.

echo 🔧 Step 1: Building updated client...
cd /d "D:\Opure.exe\activity\client"
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Client build failed!
    pause
    exit /b 1
)
echo ✅ Client build successful!
echo.

echo 🚀 Step 2: Deploying server to Vercel...
cd /d "D:\Opure.exe\activity\server"
echo.
echo ⚠️ IMPORTANT: Make sure you've set these environment variables in Vercel:
echo    - DISCORD_CLIENT_SECRET (from Discord Developer Portal)
echo    - DISCORD_CLIENT_ID=1388207626944249856
echo    - DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/discord
echo    - CLIENT_URL=https://opure.uk
echo.
pause
echo.
echo Deploying to Vercel...
call vercel --prod
if %errorlevel% neq 0 (
    echo ❌ Vercel deployment failed!
    echo 💡 Run 'vercel login' first if you haven't logged in
    pause
    exit /b 1
)
echo ✅ Server deployed to Vercel!
echo.

echo 🧪 Step 3: Testing deployment...
cd /d "D:\Opure.exe"
node test-oauth-setup.js
echo.

echo 📋 Step 4: Manual tasks remaining:
echo.
echo 🌐 IONOS Upload:
echo    1. Login to IONOS hosting panel
echo    2. Go to opure.uk file manager
echo    3. Upload all files from: D:\Opure.exe\activity\client\dist\
echo    4. Make sure index.html is in the root directory
echo.
echo 🔐 Discord Developer Portal:
echo    1. Go to: https://discord.com/developers/applications/1388207626944249856
echo    2. OAuth2 → Redirects → Add: https://api.opure.uk/api/auth/discord
echo    3. Activities → URL Mappings → Target: https://opure.uk
echo.
echo 🎯 Test OAuth2:
echo    1. Open Discord desktop app
echo    2. Join voice channel
echo    3. Click Activities → Opure Activity
echo    4. Should show authentication prompt
echo    5. Click "Authenticate with Discord"
echo    6. Should work without "Failed to authenticate" error!
echo.
echo 🏴󠁧󠁢󠁳󠁣󠁴󠁿 OAuth2 fix complete! Your Discord Activity should now work perfectly!
echo.
pause