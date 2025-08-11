# Discord Activity URL Configuration Update

## ✅ **URL CORRECTION APPLIED**

### **Updated Environment Variables (.env):**
- `DISCORD_REDIRECT_URI`: `https://www.opure.uk/auth/discord/callback`
- `WEBSOCKET_URL`: `wss://www.opure.uk/ws`
- `ACTIVITY_URL`: `https://www.opure.uk`

### **🔧 REQUIRED MANUAL UPDATES:**

#### 1. **Vercel Environment Variables**
Update these in your Vercel dashboard for both client and server deployments:
```
DISCORD_REDIRECT_URI=https://www.opure.uk/auth/discord/callback
ACTIVITY_URL=https://www.opure.uk  
WEBSOCKET_URL=wss://www.opure.uk/ws
```

#### 2. **Discord Developer Portal**
Update Discord Application settings at https://discord.com/developers/applications/1388207626944249856:
- **OAuth2 → Redirects**: `https://www.opure.uk/auth/discord/callback`
- **Activities → URL Mappings**: `https://www.opure.uk`

#### 3. **Domain Configuration** 
Ensure your domain DNS is set up with:
- **www.opure.uk** → Points to Vercel client deployment
- **api.opure.uk** → Points to Vercel API deployment (correct)

### **🚀 DEPLOYMENT STATUS:**
- ✅ Local environment updated
- ⏳ Vercel environment variables need manual update
- ⏳ Discord Application settings need manual update
- ✅ Code already uses correct www subdomain

### **🎮 FINAL URLS:**
- **Discord Activity**: https://www.opure.uk (games hub)
- **API Server**: https://api.opure.uk (backend - correct)
- **Local Dashboard**: http://localhost:3002

The .env file changes are applied locally but won't be committed to Git for security reasons. Make sure to update the Vercel environment variables manually through the dashboard.