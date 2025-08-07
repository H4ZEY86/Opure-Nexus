# 🚨 IMMEDIATE DISCORD AUTHENTICATION FIX 🚨

## URGENT: Follow These Steps RIGHT NOW

Your Discord Activity authentication is failing because of Discord Developer Portal configuration. This guide will fix it in 2 minutes.

## Step 1: Discord Developer Portal (CRITICAL)

1. **Go to:** https://discord.com/developers/applications/1388207626944249856
2. **Login** with your Discord account that owns this Application

### A. OAuth2 Tab - CRITICAL SETTINGS ⚡

1. Click **"OAuth2"** in left sidebar
2. **Redirect URIs** - Add these EXACT URLs:
   ```
   https://api.opure.uk/api/auth/callback
   https://www.opure.uk
   https://1388207626944249856.discordsays.com
   ```
3. **Default Authorization Link** - Set to:
   ```
   https://api.opure.uk/api/auth/callback
   ```

### B. Activities Tab - CRITICAL SETTINGS ⚡

1. Click **"Activities"** in left sidebar
2. **Target URL Origin:** `https://www.opure.uk`
3. **Activity Test URL:** `https://www.opure.uk`
4. **Activity Shelf URL:** `https://www.opure.uk`
5. **Supported Platforms:** Select ALL (Desktop, Mobile, etc.)

### C. Bot Tab - VERIFY SETTINGS ⚡

1. Click **"Bot"** in left sidebar
2. Ensure bot has these **Bot Permissions:**
   - ☑️ Send Messages
   - ☑️ Use Slash Commands
   - ☑️ Connect
   - ☑️ Speak

## Step 2: Activity Scopes (CRITICAL)

Your Activity needs these **EXACT** scopes. In OAuth2 tab:

```
☑️ applications.commands
☑️ identify
☑️ rpc
☑️ rpc.activities.write
☑️ rpc.voice.read
```

## Step 3: Verify Environment Variables

Your Vercel API deployment needs:
```bash
DISCORD_CLIENT_ID=1388207626944249856
DISCORD_CLIENT_SECRET=[your-secret]
DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/callback
```

## Step 4: Test the Fix (2-3 minutes after saving)

1. **Save all changes** in Discord Developer Portal
2. **Wait 2-3 minutes** for Discord propagation
3. **Launch Activity from Discord voice channel**
4. **Check browser console** - you should see:
   ```
   🔐 STEP 1: Using Discord Activity authenticate() method...
   ✅ Discord authenticate() successful: [real user data]
   👤 Setting authenticated user from authenticate(): [your username]
   🎉 Discord Activity authentication completed successfully!
   ```

## Expected Success Signs:

- ✅ Real Discord username (not "DiscordUser")
- ✅ Real Discord user ID (17+ digits)
- ✅ No "permission error" messages
- ✅ Authentication completes in STEP 1
- ✅ User avatar shows correctly

## If Still Failing After 5 Minutes:

1. **Activity Status:** Ensure Activity is published/approved
2. **Server Permissions:** Check Activity is enabled in server
3. **Launch Method:** MUST launch from voice channel, not browser
4. **User Permissions:** User must have Activity permissions

## CRITICAL SUCCESS INDICATOR:

When working, you'll see this console message:
```
👤 Setting authenticated user from authenticate(): [YOUR_REAL_USERNAME] ID: [17_DIGIT_USER_ID]
```

## Deploy Status:

✅ Client authentication fixes deployed  
✅ API server ready and operational  
✅ All endpoints responding correctly  

**TIME TO FIX:** 2-3 minutes after Discord settings updated

## Emergency Contact:

If this doesn't work within 5 minutes, the issue is likely:
1. Discord Application not approved for Activities
2. Missing environment variables on Vercel
3. Activity not properly published in Discord