# 🔧 **"FAILED TO FETCH" - IMMEDIATE FIX**

## ✅ **GOOD NEWS: Authentication UI Working!**

Your authentication screen is loading perfectly with Scottish styling! The issue is just the server connection.

## ❌ **PROBLEM: Server Not Responding**

The `Failed to fetch` error means `https://api.opure.uk` is not accessible.

---

## 🔍 **STEP 1: DIAGNOSE THE ISSUE**

**Test these URLs in your browser:**

### **Test 1: Server Health**
Open: `https://api.opure.uk/health`

**Expected**: `{"status":"healthy",...}`
**If you get**: 404 or connection error → Server not deployed

### **Test 2: Server Root**
Open: `https://api.opure.uk/`

**Expected**: `{"message":"👋 Opure Discord Activity API is running!",...}`
**If you get**: 404 or connection error → Server not deployed

### **Test 3: DNS Resolution**
```powershell
nslookup api.opure.uk
```

**Expected**: Should resolve to Vercel IP
**If you get**: No resolution → DNS issue

---

## 🚀 **STEP 2: DEPLOY SERVER TO VERCEL**

The server code is ready, just needs to be deployed:

```powershell
cd D:\Opure.exe\activity\server
vercel login
vercel --prod
```

**When prompted:**
- Link to existing project? → **Yes** (select your api.opure.uk project)
- Override settings? → **No**

---

## 🔐 **STEP 3: SET ENVIRONMENT VARIABLES**

**In Vercel Dashboard → Settings → Environment Variables:**

```
DISCORD_CLIENT_ID = 1388207626944249856
DISCORD_CLIENT_SECRET = [GET_FROM_DISCORD_DEVELOPER_PORTAL]
DISCORD_REDIRECT_URI = https://api.opure.uk/api/auth/discord
NODE_ENV = production
CLIENT_URL = https://opure.uk
ALLOWED_ORIGINS = https://discord.com,https://ptb.discord.com,https://canary.discord.com,https://opure.uk
```

**After adding variables, redeploy:**
```powershell
vercel --prod
```

---

## 🧪 **STEP 4: TEST SERVER RESPONSE**

Run this quick test:

```powershell
cd D:\Opure.exe
node test-oauth-setup.js
```

**This will test:**
- ✅ `https://api.opure.uk/health` 
- ✅ `https://api.opure.uk/api/auth/discord`
- ✅ `https://opure.uk`

---

## 💡 **STEP 5: GET DISCORD CLIENT SECRET**

**CRITICAL**: You need the Discord Client Secret for OAuth2 to work:

1. **Go to**: https://discord.com/developers/applications/1388207626944249856
2. **Click "OAuth2"** in left sidebar
3. **Click "Copy"** next to Client Secret
4. **Add to Vercel environment variables** as `DISCORD_CLIENT_SECRET`

---

## 🔄 **STEP 6: TEST OAUTH2 AGAIN**

After server deployment:

1. **Refresh Discord Activity** (close and reopen)
2. **Click "Authenticate with Discord"** 
3. **Should work without "Failed to fetch" error!**

---

## 🔍 **TROUBLESHOOTING SPECIFIC ERRORS**

### **Error: "Failed to fetch"**
**Cause**: Server not deployed or not responding
**Fix**: Deploy server with `vercel --prod`

### **Error: "CORS error" in browser console**
**Cause**: Missing CORS configuration  
**Fix**: Add `CLIENT_URL=https://opure.uk` to Vercel environment variables

### **Error: "Invalid client"**
**Cause**: Missing Discord Client Secret
**Fix**: Add `DISCORD_CLIENT_SECRET` to Vercel environment variables

### **Error: "Redirect URI mismatch"**
**Cause**: Discord Developer Portal not configured
**Fix**: Add `https://api.opure.uk/api/auth/discord` to Discord OAuth2 redirects

---

## ⚡ **QUICK FIX COMMANDS**

```powershell
# 1. Deploy server
cd D:\Opure.exe\activity\server
vercel --prod

# 2. Test deployment  
cd D:\Opure.exe
node test-oauth-setup.js

# 3. If tests pass, try Discord Activity again!
```

---

## 🎯 **SUCCESS INDICATORS**

### **✅ Server Working:**
- `https://api.opure.uk/health` returns JSON response
- `https://api.opure.uk/` shows welcome message
- Test script shows all green checkmarks

### **✅ OAuth2 Working:**
- Discord Activity shows authentication screen ✅ (already working!)
- Clicking "Authenticate" opens Discord popup (not "Failed to fetch")
- After authorization, shows user profile
- Scottish AI chat works

---

## 🏴󠁧󠁢󠁳󠁣󠁴󠁿 **YOU'RE ALMOST THERE!**

Your authentication UI is **perfect** - it looks amazing with the Scottish Rangers styling! 

The only issue is the server connection. Once you deploy the server to Vercel with the environment variables, OAuth2 will work flawlessly!

**Just run these 3 commands and you're done:**

1. `cd D:\Opure.exe\activity\server && vercel --prod`
2. Add Discord Client Secret to Vercel environment variables
3. Test OAuth2 in Discord Activity

**The "Failed to fetch" error will be completely resolved! 🚀**