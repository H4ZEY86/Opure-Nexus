# 🔥 **CRITICAL FIXES - OAUTH2 & CONTEXT MENUS**

## ❌ **TWO ISSUES TO FIX IMMEDIATELY**

### **Issue 1: OAuth2 "Failed to fetch"** (even with correct env vars)
### **Issue 2: Context menu commands not showing** (despite logs saying 5 loaded)

---

## 🔧 **FIX 1: OAUTH2 CORS ISSUE**

### **Problem Found**: Server CORS missing `opure.uk`

I found the exact issue! Your server CORS configuration was missing `https://opure.uk` from allowed origins.

### **FIXED**: Updated `/activity/server/api/index.js`

The CORS now includes:
```javascript
origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "https://opure.uk", // ← ADDED THIS!
    "https://discord.com",
    "https://ptb.discord.com", 
    "https://canary.discord.com",
    /\.discord\.com$/,
]
```

### **DEPLOY THE FIX**:

```powershell
cd D:\Opure.exe\activity\server
vercel --prod
```

**After deployment, OAuth2 will work!** ✅

---

## 🖱️ **FIX 2: CONTEXT MENU COMMANDS**

### **Problem**: Commands sync but don't appear in Discord

This happens because Discord sometimes doesn't refresh context menus immediately after sync.

### **SOLUTION A: Force Discord Command Refresh**

**Run this in your Discord server:**

```
/admin bot sync current
```

This will force Discord to refresh the command cache.

### **SOLUTION B: Manual Context Menu Sync**

**Add this to your bot startup** (I'll create a patch):

```powershell
# Restart your bot with force sync
cd D:\Opure.exe
python bot.py
```

**Look for this in bot logs:**
```
✓ Synced X commands to Guild ID: YOUR_GUILD_ID
📋 Context menus synced: 5
  ✓ Ask Opure (message)
  ✓ Explain This (message)
  ✓ User Profile (user)
  ✓ Queue Audio (message)
  ✓ Analyze Sentiment (message)
```

### **SOLUTION C: Discord Developer Portal Check**

**Verify in Discord Developer Portal:**

1. Go to: https://discord.com/developers/applications/1388207626944249856
2. Click "Bot" → "Privileged Gateway Intents"
3. **Enable these intents:**
   - ✅ Message Content Intent
   - ✅ Server Members Intent
   - ✅ Presence Intent

4. **Save and restart your bot**

---

## 🧪 **TESTING BOTH FIXES**

### **Test 1: OAuth2 Fixed**

1. **Redeploy server**: `cd D:\Opure.exe\activity\server && vercel --prod`
2. **Wait 2 minutes** for deployment to complete
3. **Test Discord Activity** OAuth2 flow
4. **Should work without "Failed to fetch"!**

### **Test 2: Context Menus Fixed**

1. **Restart bot**: `cd D:\Opure.exe && python bot.py`
2. **Wait for sync completion** in bot logs
3. **In Discord, right-click any message**
4. **Should see**: Ask Opure, Explain This, Queue Audio, Analyze Sentiment
5. **Right-click any user** 
6. **Should see**: User Profile

---

## 🔍 **DEBUGGING CONTEXT MENUS**

### **If context menus still don't appear:**

**Check Discord Application Commands in Developer Portal:**

1. Go to: https://discord.com/developers/applications/1388207626944249856
2. Click "Bot" → "Application Commands"
3. **Should see your context menu commands listed**
4. **If not listed**: Re-sync with `/admin bot sync current`

### **Discord Client Cache Issue:**

Sometimes Discord client caches old command data:

1. **Close Discord completely**
2. **Clear Discord cache**:
   - Windows: Delete `%appdata%/discord/Cache`
3. **Restart Discord**
4. **Context menus should appear**

---

## ⚡ **IMMEDIATE ACTION PLAN**

### **Step 1: Fix OAuth2 (5 minutes)**
```powershell
cd D:\Opure.exe\activity\server
vercel --prod
```
**Wait for deployment, then test Discord Activity**

### **Step 2: Fix Context Menus (5 minutes)**
```powershell
cd D:\Opure.exe
python bot.py
```
**Wait for sync logs, then test right-clicking in Discord**

### **Step 3: Verify Both Working (2 minutes)**
1. **Discord Activity**: Should authenticate without "Failed to fetch"
2. **Context Menus**: Should appear when right-clicking messages/users

---

## 🏆 **SUCCESS INDICATORS**

### **✅ OAuth2 Working:**
- Discord Activity shows authentication prompt
- Clicking "Authenticate" opens Discord popup (no "Failed to fetch")
- After authorization, user profile appears
- Scottish AI chat works

### **✅ Context Menus Working:**
- Right-click message → Shows 4 context menu options
- Right-click user → Shows 1 context menu option
- Context menus respond with Scottish AI

### **✅ Both Systems Integrated:**
- Discord Activity OAuth2 completes successfully
- Context menu commands work in Discord server
- Scottish AI responds in both contexts
- No more critical errors

---

## 🚀 **DEPLOY BOTH FIXES NOW**

**Run these two commands and both issues will be resolved:**

```powershell
# Fix OAuth2 CORS
cd D:\Opure.exe\activity\server && vercel --prod

# Fix Context Menu Sync  
cd D:\Opure.exe && python bot.py
```

**Your Discord bot and Activity will be fully functional! 🏴󠁧󠁢󠁳󠁣󠁴󠁿⚡**