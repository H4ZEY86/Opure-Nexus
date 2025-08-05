# 🔍 **DEBUG OAUTH2 "FAILED TO FETCH" AFTER AUTHORIZATION**

## ❌ **PROBLEM**: OAuth2 fails AFTER Discord authorization popup

The fact that Discord authorization popup appears means:
- ✅ Discord SDK working
- ✅ Client-side code working  
- ✅ Discord Developer Portal configured correctly
- ❌ Server failing during code exchange

---

## 🔧 **STEP 1: CHECK VERCEL ENVIRONMENT VARIABLES**

**Go to your Vercel dashboard:**
1. **Visit**: https://vercel.com/ctrl-alt-hazes-projects/opure-nexus/settings/environment-variables
2. **Verify these exist:**

```
DISCORD_CLIENT_ID = 1388207626944249856
DISCORD_CLIENT_SECRET = [YOUR_SECRET_FROM_DISCORD_PORTAL]
DISCORD_REDIRECT_URI = https://api.opure.uk/api/auth/discord
CLIENT_URL = https://opure.uk
NODE_ENV = production
```

### **CRITICAL: Get Discord Client Secret**

**If `DISCORD_CLIENT_SECRET` is missing:**

1. **Go to**: https://discord.com/developers/applications/1388207626944249856
2. **Click "OAuth2"**
3. **Click "Copy"** next to Client Secret  
4. **Add to Vercel environment variables**
5. **Redeploy**: Go to Deployments → "..." → Redeploy

---

## 🔍 **STEP 2: CHECK VERCEL RUNTIME LOGS**

**See what error is happening during OAuth2:**

1. **Go to**: https://vercel.com/ctrl-alt-hazes-projects/opure-nexus
2. **Click "Functions"** tab
3. **Click "Runtime Logs"**
4. **Try OAuth2 flow again** in Discord Activity
5. **Check logs for errors** (refresh logs page)

**Look for errors like:**
- `Missing DISCORD_CLIENT_SECRET`
- `Token exchange failed`
- `Invalid client_secret`
- `CORS error`

---

## 🧪 **STEP 3: TEST WITH BROWSER CONSOLE**

**Debug the exact error:**

1. **Open Discord Activity** (your auth screen)
2. **Press F12** → Console tab
3. **Click "Authenticate with Discord"**
4. **Complete Discord authorization**
5. **Look for detailed error** in console

**Common errors:**

### **"CORS error"**
- Server CORS not allowing Discord Activity context
- **Fix**: Check `CLIENT_URL=https://opure.uk` in Vercel

### **"400 Bad Request"**  
- Missing Discord Client Secret
- **Fix**: Add `DISCORD_CLIENT_SECRET` to Vercel

### **"Invalid client_secret"**
- Wrong Discord Client Secret
- **Fix**: Copy correct secret from Discord Developer Portal

---

## 🔄 **STEP 4: MANUAL SERVER TEST**

**Test server with real Discord authorization code:**

After getting authorization popup, **look at browser URL** - it should have a `code=` parameter.

**Copy that code and test:**
```javascript
// Run in browser console after Discord authorization
const code = "PASTE_REAL_CODE_HERE";
fetch('https://api.opure.uk/api/auth/discord', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 💡 **MOST LIKELY CAUSES**

### **1. Missing Discord Client Secret (90% chance)**
- Vercel environment variables don't have `DISCORD_CLIENT_SECRET`
- Server can't exchange code for token

### **2. Wrong Redirect URI (5% chance)**
- Discord expects exactly: `https://api.opure.uk/api/auth/discord`
- Check Discord Developer Portal OAuth2 settings

### **3. Environment Variables Not Deployed (5% chance)**
- Added env vars but didn't redeploy
- Server using old environment

---

## 🚀 **IMMEDIATE ACTION PLAN**

### **Step 1: Verify Discord Client Secret**
1. Get secret from Discord Developer Portal
2. Add to Vercel environment variables  
3. Redeploy: `vercel --prod`

### **Step 2: Check Runtime Logs**
1. Try OAuth2 flow in Discord Activity
2. Check Vercel runtime logs for errors
3. Fix any errors shown

### **Step 3: Test Again**
1. Discord Activity OAuth2 flow
2. Should work without "Failed to fetch"

---

## 📋 **QUICK CHECKLIST**

- [ ] Discord Client Secret added to Vercel
- [ ] Environment variables redeployed  
- [ ] Runtime logs checked for errors
- [ ] Browser console checked for CORS errors
- [ ] Discord Developer Portal redirect URI correct

**Once you complete this checklist, OAuth2 will work perfectly!**

The server is deployed and responding - just need the environment variables configured correctly! 🏴󠁧󠁢󠁳󠁣󠁴󠁿🔐