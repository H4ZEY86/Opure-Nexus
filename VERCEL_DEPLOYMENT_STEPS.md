# 🚀 **VERCEL DEPLOYMENT - COMPLETE OAUTH2 FIX**

## 📋 **DEPLOYMENT CHECKLIST**

Since your `api.opure.uk` subdomain is already pointing to Vercel, you just need to deploy the Activity server code to your existing Vercel project.

---

## 🔧 **STEP 1: DEPLOY ACTIVITY SERVER**

### **Option A: Vercel CLI (Recommended)**

```powershell
# Navigate to server directory
cd D:\Opure.exe\activity\server

# Login to Vercel (if not already logged in)
vercel login

# Deploy to production
vercel --prod --yes
```

### **Option B: Vercel Dashboard (Alternative)**

1. Go to your Vercel dashboard
2. Click "Import Project"
3. Select the `D:\Opure.exe\activity\server` folder
4. Vercel will auto-detect it as a Node.js project

---

## 🔐 **STEP 2: SET ENVIRONMENT VARIABLES**

**In your Vercel dashboard** → Project Settings → Environment Variables, add:

### **Required Variables:**
```
DISCORD_CLIENT_ID = 1388207626944249856
DISCORD_CLIENT_SECRET = [YOUR_ACTUAL_DISCORD_CLIENT_SECRET]
DISCORD_REDIRECT_URI = https://api.opure.uk/api/auth/discord
NODE_ENV = production
```

### **CORS & Security Variables:**
```
CLIENT_URL = https://opure.uk
ALLOWED_ORIGINS = https://discord.com,https://ptb.discord.com,https://canary.discord.com,https://opure.uk
JWT_SECRET = opure_super_secure_jwt_secret_for_production_min_32_chars_long
SESSION_SECRET = opure_session_secret_for_production_security
```

### **Optional Variables:**
```
LOG_LEVEL = info
ENABLE_REQUEST_LOGGING = true
ENABLE_COMPRESSION = true
ENABLE_CACHING = true
```

---

## 🧪 **STEP 3: TEST DEPLOYMENT**

### **Test Server Health:**
Open browser and go to: `https://api.opure.uk/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-08-05T00:00:00.000Z",
  "uptime": 123.456,
  "memory": {...},
  "version": "1.0.0"
}
```

### **Test OAuth2 Endpoint:**
```powershell
curl -X POST https://api.opure.uk/api/auth/discord -H "Content-Type: application/json" -d "{\"code\":\"test_code\"}"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid authorization code",
  "details": "..."
}
```
*This error is normal - it means the endpoint is working!*

---

## 🎯 **STEP 4: UPLOAD UPDATED CLIENT**

The client has been built with OAuth2 fixes. Upload to IONOS:

```powershell
# The built files are ready in:
D:\Opure.exe\activity\client\dist\
```

**Upload to IONOS:**
1. Login to your IONOS hosting panel
2. Navigate to opure.uk file manager
3. Upload the entire contents of `dist/` folder
4. Make sure `index.html` is in the root directory

---

## ✅ **STEP 5: VERIFY OAUTH2 WORKS**

### **Test Discord Activity:**

1. **Open Discord desktop app**
2. **Join any voice channel** in your server
3. **Click Activities button** (rocket icon near camera/mic buttons)
4. **Select "Opure Activity"** from the list
5. **Should see authentication prompt** with Rangers FC styling
6. **Click "Authenticate with Discord"**
7. **Discord popup appears** asking for permissions
8. **Click "Authorize"** in the popup
9. **Returns to Activity** showing your Discord profile
10. **Scottish AI chat should work!**

---

## 🔍 **DEBUGGING OAUTH2 ISSUES**

### **Issue: Server not responding**
**Check:**
- `https://api.opure.uk/health` returns 200 status
- Vercel deployment shows "Ready" status
- Environment variables are set in Vercel dashboard

### **Issue: "Invalid client" error**
**Fix:**
- Verify `DISCORD_CLIENT_SECRET` is correctly set in Vercel
- Check Discord Developer Portal has correct client ID

### **Issue: "Redirect URI mismatch"**
**Fix:**
- Go to Discord Developer Portal → OAuth2 → Redirects
- Ensure `https://api.opure.uk/api/auth/discord` is listed exactly

### **Issue: CORS error**
**Fix:**
- Check `CLIENT_URL=https://opure.uk` in Vercel environment variables
- Verify `ALLOWED_ORIGINS` includes Discord domains

---

## 🏆 **SUCCESS INDICATORS**

### **✅ Server Deployed:**
- `https://api.opure.uk/health` returns healthy status
- `https://api.opure.uk/` shows welcome message
- OAuth2 endpoint responds to POST requests

### **✅ Client Updated:**
- Activity loads without errors
- Shows authentication prompt (not demo)
- Browser console shows calls to `https://api.opure.uk`

### **✅ OAuth2 Working:**
- Discord authorization popup appears
- After authorization, user profile shows in Activity
- Scottish AI chat responds properly
- No "Failed to authenticate with server" errors

---

## 🔑 **DISCORD CLIENT SECRET**

**To get your Discord Client Secret:**

1. Go to: https://discord.com/developers/applications/1388207626944249856
2. Click "OAuth2" in the left sidebar
3. Copy the "Client Secret" (click "Copy" button)
4. Add it to Vercel environment variables as `DISCORD_CLIENT_SECRET`

**⚠️ Keep this secret secure - never commit it to Git!**

---

## 🚀 **DEPLOY NOW!**

Your Activity server is ready to deploy. Once you:

1. ✅ Deploy server to Vercel (`vercel --prod --yes`)
2. ✅ Set environment variables in Vercel dashboard  
3. ✅ Upload built client to IONOS opure.uk
4. ✅ Add Discord client secret

**OAuth2 authentication will work perfectly! 🏴󠁧󠁢󠁳󠁣󠁴󠁿🔐**

The "Failed to authenticate with server" error will be completely resolved!