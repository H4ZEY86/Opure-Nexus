# 🔧 **IONOS + VERCEL OAUTH2 CONFIGURATION**

## 🏗️ **YOUR CURRENT SETUP**

- **Client (Activity)**: `opure.uk` → IONOS hosting
- **Server (API)**: `api.opure.uk` → Vercel (via IONOS DNS CNAME)
- **DNS**: IONOS subdomain `api.opure.uk` CNAME points to Vercel

**This setup is perfect! Let's configure it correctly.**

---

## 🚀 **STEP 1: VERCEL PROJECT CONFIGURATION**

### **1.1: Add Custom Domain to Vercel**

1. **Go to your Vercel dashboard**
2. **Select your project** (or create new one for the API)
3. **Go to Settings → Domains**
4. **Add domain**: `api.opure.uk`
5. **Vercel will show DNS instructions** - but you already have CNAME set up!

### **1.2: Deploy Activity Server to Vercel**

```powershell
# Navigate to server directory
cd D:\Opure.exe\activity\server

# Login to Vercel
vercel login

# Deploy to production and link to existing project
vercel --prod
```

**When prompted:**
- Link to existing project? → **Yes**
- Select your project that has `api.opure.uk` domain
- Override settings? → **No** (use vercel.json configuration)

### **1.3: Set Environment Variables in Vercel**

**In Vercel Dashboard → Your Project → Settings → Environment Variables:**

```
DISCORD_CLIENT_ID = 1388207626944249856
DISCORD_CLIENT_SECRET = [YOUR_DISCORD_CLIENT_SECRET_FROM_DEVELOPER_PORTAL]
DISCORD_REDIRECT_URI = https://api.opure.uk/api/auth/discord
DISCORD_BOT_TOKEN = [YOUR_BOT_TOKEN]
NODE_ENV = production
CLIENT_URL = https://opure.uk
ALLOWED_ORIGINS = https://discord.com,https://ptb.discord.com,https://canary.discord.com,https://opure.uk
JWT_SECRET = opure_super_secure_jwt_secret_for_production_min_32_chars_long
SESSION_SECRET = opure_session_secret_for_production_security
LOG_LEVEL = info
ENABLE_REQUEST_LOGGING = true
```

**After adding environment variables, redeploy:**
```powershell
vercel --prod
```

---

## 🌐 **STEP 2: IONOS CLIENT CONFIGURATION**

### **2.1: Upload Updated Client to IONOS**

The built client is ready with correct API URLs:

```powershell
# Files to upload are in:
D:\Opure.exe\activity\client\dist\
```

**Upload to IONOS opure.uk:**
1. **Login to IONOS hosting panel**
2. **Go to your opure.uk hosting space**
3. **Upload all files from `dist/` folder to the root directory**
4. **Make sure `index.html` is in the web root**
5. **Ensure `.html`, `.js`, `.css` files are uploaded**

### **2.2: IONOS File Structure Should Be:**
```
opure.uk/
├── index.html
├── assets/
│   ├── index-DDXbqBZL.js
│   ├── index-Bu8GkC4b.css
│   ├── discord-DbY_imvY.js
│   ├── vendor-DxKjgnCq.js
│   └── ui-D6oc6lcc.js
└── [other asset files]
```

---

## 🔐 **STEP 3: DISCORD DEVELOPER PORTAL CONFIGURATION**

### **3.1: Get Your Discord Client Secret**

1. **Go to**: https://discord.com/developers/applications/1388207626944249856
2. **Click "OAuth2"** in left sidebar
3. **Copy the "Client Secret"** (click Copy button)
4. **Add this to Vercel environment variables** as `DISCORD_CLIENT_SECRET`

### **3.2: Configure OAuth2 Redirect URIs**

**In Discord Developer Portal → OAuth2 → Redirects:**

```
Add these exact URLs:
✅ https://api.opure.uk/api/auth/discord
✅ https://discord.com/channels/@me
```

### **3.3: Configure Discord Activity Settings**

**In Discord Developer Portal → Activities:**

```
Activity Configuration:
- URL Mappings: 
  * Target URL: https://opure.uk
  * Root Mapping: /
- Supported Platforms: Desktop, Mobile
- Age Rating: Teen (13+)
```

### **3.4: Required Scopes**

**In Discord Developer Portal → OAuth2 → Scopes:**
```
✅ applications.commands
✅ bot
✅ identify  
✅ guilds
```

---

## 🧪 **STEP 4: TEST THE CONFIGURATION**

### **4.1: Test Server (Vercel)**

**Test API health:**
```
https://api.opure.uk/health
```
**Expected:** `{"status":"healthy",...}`

**Test OAuth2 endpoint:**
```powershell
curl -X POST https://api.opure.uk/api/auth/discord -H "Content-Type: application/json" -d "{\"code\":\"test\"}"
```
**Expected:** `{"success":false,"error":"Invalid authorization code"}` *(This is correct!)*

### **4.2: Test Client (IONOS)**

**Open browser to:**
```
https://opure.uk
```
**Expected:** Activity loads with authentication prompt (not demo mode)

### **4.3: Test Full OAuth2 Flow**

1. **Open Discord desktop app**
2. **Join voice channel** in your server
3. **Click Activities button** (rocket icon)
4. **Select "Opure Activity"**
5. **Should see authentication screen** with Rangers FC styling
6. **Click "Authenticate with Discord"**
7. **Discord popup appears** for authorization
8. **Click "Authorize"**
9. **Returns to Activity** with your Discord profile visible
10. **Test Scottish AI chat** - should work!

---

## 🔍 **STEP 5: TROUBLESHOOTING GUIDE**

### **❌ "Failed to authenticate with server"**
**Causes:**
- Server not deployed to Vercel
- Missing `DISCORD_CLIENT_SECRET` in Vercel environment variables
- Wrong `DISCORD_REDIRECT_URI`

**Fix:**
- Check `https://api.opure.uk/health` returns 200
- Verify environment variables in Vercel dashboard
- Ensure redirect URI is exactly: `https://api.opure.uk/api/auth/discord`

### **❌ CORS Errors**
**Causes:**
- Missing `CLIENT_URL=https://opure.uk` in Vercel
- Wrong `ALLOWED_ORIGINS` configuration

**Fix:**
- Add `CLIENT_URL=https://opure.uk` to Vercel environment variables
- Verify `ALLOWED_ORIGINS` includes Discord domains and opure.uk

### **❌ "Invalid client" error**
**Causes:**
- Wrong Discord Client Secret
- Wrong Client ID

**Fix:**
- Copy Client Secret from Discord Developer Portal
- Verify Client ID is `1388207626944249856`

### **❌ "Redirect URI mismatch"**
**Causes:**
- Redirect URI not added to Discord Developer Portal
- Typo in redirect URI

**Fix:**
- Add exact URI: `https://api.opure.uk/api/auth/discord`
- No trailing slashes or extra characters

---

## 🏆 **STEP 6: VERIFY SUCCESS**

### **✅ Server Working:**
- `https://api.opure.uk/health` returns healthy status
- `https://api.opure.uk/` shows welcome message
- Vercel deployment shows "Ready"

### **✅ Client Working:**
- `https://opure.uk` loads Activity interface
- Shows authentication prompt (not demo)
- No JavaScript errors in browser console

### **✅ DNS Working:**
- `api.opure.uk` resolves to Vercel
- `opure.uk` resolves to IONOS
- Both domains load correctly

### **✅ OAuth2 Working:**
- Discord authorization popup appears
- After authorization, user profile appears
- Scottish AI chat responds
- No authentication errors

---

## 📋 **QUICK DEPLOYMENT CHECKLIST**

### **Vercel (api.opure.uk):**
- [ ] Deploy Activity server code
- [ ] Add `api.opure.uk` domain to project
- [ ] Set all environment variables (especially `DISCORD_CLIENT_SECRET`)
- [ ] Test `/health` endpoint responds

### **IONOS (opure.uk):**
- [ ] Upload `dist/` folder contents to web root
- [ ] Verify `index.html` loads
- [ ] Test Activity shows authentication prompt

### **Discord Developer Portal:**
- [ ] Add redirect URI: `https://api.opure.uk/api/auth/discord`
- [ ] Copy Client Secret to Vercel environment variables
- [ ] Configure Activity URL: `https://opure.uk`

**Once all checkboxes are complete, OAuth2 will work perfectly! 🏴󠁧󠁢󠁳󠁣󠁴󠁿🚀**