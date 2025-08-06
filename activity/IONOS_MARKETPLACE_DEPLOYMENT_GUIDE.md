# OPURE MARKETPLACE - IONOS DEPLOYMENT GUIDE

## 📋 Complete Deployment Guide for AI Token Economy Marketplace

This guide provides step-by-step instructions for deploying the Opure Discord Activity Marketplace to IONOS hosting with external API gateway support.

---

## 🏗️ Architecture Overview

```
Discord Client → Vercel Static Frontend → External API Gateway → Database
                  (www.opure.uk)      (Vercel)
                                    (api.opure.uk)             (PostgreSQL)
```

**Components:**
- **Frontend**: React/TypeScript static site hosted on IONOS
- **API Gateway**: Node.js backend on Railway/Vercel  
- **Database**: PostgreSQL with Redis caching
- **WebSocket**: Real-time updates via external service
- **CDN**: IONOS built-in CDN for asset delivery

---

## 🚀 Phase 1: Prepare the Frontend for IONOS

### 1.1 Build Configuration

Update `activity/client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../build-ionos/public',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          marketplace: ['./src/components/marketplace'],
          ui: ['lucide-react']
        }
      }
    }
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify('https://api.opure.uk'),
    'process.env.VITE_WS_URL': JSON.stringify('wss://api.opure.uk'),
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
```

### 1.2 Environment Configuration

Create `activity/client/.env.production`:

```bash
# Production Environment for IONOS
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_API_URL=https://api.opure.uk
VITE_WS_URL=wss://api.opure.uk
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_MARKETPLACE_ENABLED=true
VITE_REALTIME_ENABLED=true
```

### 1.3 Build the Frontend

```bash
cd activity/client
npm install
npm run build
```

---

## 🌐 Phase 2: Deploy API Gateway to Railway

### 2.1 Prepare Railway Deployment

Create `api-gateway/railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "opure-marketplace-api"
source = "."

[services.variables]
NODE_ENV = "production"
PORT = "3001"
```

### 2.2 Environment Variables for Railway

Set these environment variables in Railway dashboard:

```bash
# Core Configuration
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port

# Discord Integration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Security
JWT_SECRET=your_super_secure_jwt_secret_min_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key

# CORS Configuration
CLIENT_URL=https://opure.uk
ALLOWED_ORIGINS=https://opure.uk,https://www.opure.uk,https://discord.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Marketplace Configuration
MARKETPLACE_ENABLED=true
WEBSOCKET_ENABLED=true
ANTI_FRAUD_ENABLED=true
```

### 2.3 Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new opure-marketplace-api

# Deploy
cd api-gateway
railway up
```

### 2.4 Configure Custom Domain

1. Go to Railway project settings
2. Add custom domain: `api.opure.uk`
3. Update DNS records at your domain provider:
   ```
   Type: CNAME
   Name: api
   Value: your-railway-domain.railway.app
   ```

---

## 📁 Phase 3: Upload to IONOS Hosting

### 3.1 Prepare Files for Upload

1. **Copy built files**:
   ```bash
   cd activity/build-ionos/public
   ls -la
   # Should contain: index.html, assets/, manifest.json, .htaccess
   ```

2. **Verify .htaccess file** (created by deployment script):
   ```apache
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
   ```

### 3.2 Upload via IONOS File Manager

1. **Login to IONOS Control Panel**
   - Go to https://www.ionos.com/
   - Login to your account
   - Navigate to "Web Hosting" section

2. **Access File Manager**
   - Click on your hosting package
   - Open "File Manager"
   - Navigate to root directory (usually `/` or `/public_html/`)

3. **Upload Files**
   - Delete existing files in root directory
   - Upload all files from `activity/build-ionos/public/`
   - Ensure `.htaccess` is uploaded and visible
   - Verify directory structure:
     ```
     /
     ├── index.html
     ├── manifest.json
     ├── .htaccess
     ├── robots.txt
     ├── sitemap.xml
     └── assets/
         ├── index.css
         ├── index.js
         └── [other assets]
     ```

### 3.3 Verify Upload

1. **Check main page**: Visit https://opure.uk
2. **Test routing**: Visit https://opure.uk/marketplace
3. **Check API connectivity**: Open browser dev tools and verify API calls to api.opure.uk

---

## 🔧 Phase 4: Configure Discord Application

### 4.1 Discord Developer Portal Setup

1. **Go to Discord Developer Portal**
   - Visit https://discord.com/developers/applications
   - Select your application

2. **Configure Activities**
   - Navigate to "Activities" section
   - Set **Target URL**: `https://opure.uk`
   - **Supported Platforms**: ✅ Desktop, ✅ Mobile
   - **Activity URL**: `https://opure.uk`

3. **OAuth2 Configuration**
   - Go to "OAuth2" section
   - **Redirect URIs**: 
     - `https://opure.uk/auth/callback`
     - `https://opure.uk`
   - **Scopes**: `activities.read`, `identify`

4. **Bot Configuration** (if using bot features)
   - Go to "Bot" section
   - **Token**: Save securely for API gateway
   - **Privileged Gateway Intents**: Enable as needed

### 4.2 Test Discord Integration

1. **Open Discord**
2. **Start Activity**:
   - Go to any server
   - Click "+" next to voice channel
   - Select "Opure Marketplace"
   - Verify activity loads correctly

---

## 📊 Phase 5: Database Setup

### 5.1 PostgreSQL Configuration

Create the database schema using the provided SQL files:

```bash
# Connect to your PostgreSQL instance
psql postgresql://user:password@host:port/database

# Run schema files
\i database_schema_v2.sql
\i ai_personalization_schema.sql

# Verify tables
\dt
```

### 5.2 Initial Data Setup

```sql
-- Create default marketplace items
INSERT INTO marketplace_items (name, description, category, rarity, base_value, properties) VALUES
('Starter Pack', 'Welcome package for new users', 'premium', 'common', 100, '{"tradeable": true, "consumable": false}'),
('Discord Nitro Boost', 'Enhance your Discord experience', 'boost', 'rare', 500, '{"tradeable": true, "consumable": true}'),
('Legendary Avatar Frame', 'Exclusive animated frame', 'cosmetic', 'legendary', 2000, '{"tradeable": true, "consumable": false}');

-- Create achievement badges
INSERT INTO marketplace_badges (name, description, criteria, rarity) VALUES
('First Trader', 'Complete your first marketplace transaction', '{"trades_completed": 1}', 'common'),
('Market Expert', 'Complete 100 successful trades', '{"trades_completed": 100}', 'legendary'),
('Speed Demon', 'Win an auction in the last 5 minutes', '{"auction_wins_last_minute": 1}', 'epic');
```

### 5.3 Redis Configuration (Optional)

If using Redis for caching:

```bash
# Configure Redis connection
# Add REDIS_URL to environment variables
# Test connection in API gateway startup
```

---

## 🔍 Phase 6: Testing & Validation

### 6.1 Frontend Testing

**Test List:**
- [ ] Homepage loads correctly
- [ ] Marketplace components render
- [ ] Mobile interface works
- [ ] Search and filters functional
- [ ] User authentication works
- [ ] Real-time updates connect
- [ ] Error handling displays properly

### 6.2 API Testing

```bash
# Test health endpoint
curl https://api.opure.uk/health

# Test marketplace endpoint (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.opure.uk/api/marketplace/listings

# Test WebSocket connection
# Use browser dev tools to verify WebSocket connects to wss://api.opure.uk
```

### 6.3 Discord Activity Testing

1. **Desktop Testing**:
   - Launch activity from Discord desktop app
   - Test all marketplace features
   - Verify real-time updates

2. **Mobile Testing**:
   - Open Discord mobile app
   - Launch activity
   - Test touch interactions
   - Verify mobile layout

---

## 🚨 Phase 7: Monitoring & Maintenance

### 7.1 IONOS Monitoring

**Monitor in IONOS Control Panel:**
- Bandwidth usage
- Storage utilization  
- Request volumes
- Error rates

### 7.2 API Gateway Monitoring

**Railway/Vercel Monitoring:**
- Response times
- Error rates
- Memory/CPU usage
- Database connections

### 7.3 Discord Activity Analytics

**Track Key Metrics:**
- Daily/Monthly Active Users
- Session duration
- Feature adoption rates
- Marketplace transaction volume
- User retention

---

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. **Frontend not loading**
```bash
# Check .htaccess configuration
# Verify file permissions (755 for directories, 644 for files)
# Check IONOS hosting status
```

#### 2. **API connection failed**
```bash
# Verify Railway deployment status
# Check environment variables
# Test API endpoint directly
curl https://api.opure.uk/health
```

#### 3. **Discord Activity not starting**
```bash
# Verify Discord application configuration
# Check Target URL in Discord Developer Portal
# Ensure HTTPS is working correctly
```

#### 4. **WebSocket connection issues**
```bash
# Check if wss:// URL is accessible
# Verify CORS headers
# Test WebSocket connection in browser dev tools
```

#### 5. **Database connection errors**
```bash
# Verify DATABASE_URL environment variable
# Check PostgreSQL instance status
# Test connection from API gateway
```

---

## 📈 Performance Optimization

### Frontend Optimization

1. **Enable IONOS CDN**
   - Configure in IONOS control panel
   - Set appropriate cache headers

2. **Asset Optimization**
   - Images compressed and optimized
   - CSS/JS minified and compressed
   - Use WebP images where supported

3. **Lazy Loading**
   - Implement for marketplace images
   - Code splitting for route components

### Backend Optimization

1. **Database Optimization**
   - Index frequently queried columns
   - Use connection pooling
   - Implement query caching

2. **API Caching**
   - Redis for session storage
   - Cache marketplace listings
   - Implement ETags for conditional requests

---

## 🔐 Security Checklist

- [ ] HTTPS enabled for all domains
- [ ] Content Security Policy configured
- [ ] CORS properly configured
- [ ] API rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection headers
- [ ] Secure JWT token handling
- [ ] Environment variables secured
- [ ] Regular security updates

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Frontend built successfully
- [ ] API gateway tested locally
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Discord application configured

### Deployment
- [ ] API gateway deployed to Railway
- [ ] Custom domain configured (api.opure.uk)
- [ ] Frontend uploaded to IONOS
- [ ] .htaccess file configured
- [ ] SSL certificates active

### Post-Deployment
- [ ] All endpoints responding correctly
- [ ] WebSocket connections working
- [ ] Discord Activity launches successfully
- [ ] Mobile interface tested
- [ ] Error monitoring configured
- [ ] Performance monitoring active

---

## 🆘 Support & Resources

### Documentation
- [Discord Activities Documentation](https://discord.com/developers/docs/activities/overview)
- [IONOS Hosting Guide](https://www.ionos.com/help/hosting/)
- [Railway Deployment Docs](https://docs.railway.app/)

### Support Contacts
- **Discord Developer Support**: https://discord.com/developers/support
- **IONOS Technical Support**: Available in control panel
- **Railway Support**: https://railway.app/help

### Community Resources
- Discord Developers Server
- IONOS Community Forums
- Railway Discord Community

---

## 🎉 Success Criteria

Your marketplace is successfully deployed when:

✅ **Frontend accessible at https://opure.uk**  
✅ **API gateway responding at https://api.opure.uk**  
✅ **Discord Activity launches correctly**  
✅ **Marketplace features functional**  
✅ **Real-time updates working**  
✅ **Mobile interface responsive**  
✅ **Database operations successful**  
✅ **Authentication/authorization working**  

---


**Congratulations! Your AI Token Economy Marketplace is now live on IONOS with full Discord integration! 🚀**
