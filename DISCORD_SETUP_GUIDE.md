# 🎮 DISCORD DEVELOPER PORTAL CONFIGURATION GUIDE

## Complete setup guide for Opure.exe Discord Bot and Activity

---

## 📋 **OVERVIEW**

This guide will help you configure both the Discord Bot and Discord Activity in the Discord Developer Portal to ensure:
- ✅ Context menu commands appear and work
- ✅ OAuth2 authentication flows properly
- ✅ Discord Activity integration works

---

## 🤖 **PART 1: DISCORD BOT CONFIGURATION**

### Step 1: Access Developer Portal
1. Go to https://discord.com/developers/applications
2. Select your application: **Opure.exe** (ID: 1388207626944249856)

### Step 2: Bot Settings
Navigate to **Bot** section:

```yaml
Username: Opure.exe
Public Bot: ✅ Enabled
Requires OAuth2 Code Grant: ❌ Disabled
Server Members Intent: ✅ Enabled
Message Content Intent: ✅ Enabled
```

### Step 3: Bot Permissions
Under **Bot** → **Permissions**, ensure these are checked:
```yaml
General Permissions:
  - Read Messages/View Channels
  - Send Messages
  - Use Slash Commands
  - Use External Emojis
  - Add Reactions
  - Read Message History
  - Mention Everyone

Voice Permissions:
  - Connect
  - Speak
  - Use Voice Activity

Advanced Permissions:
  - Manage Messages (for music queue management)
  - Embed Links
  - Attach Files
```

### Step 4: OAuth2 Scopes
Navigate to **OAuth2** → **General**:

**Required Scopes:**
```yaml
✅ bot
✅ applications.commands
✅ identify
✅ guilds
```

**Bot Permissions** (auto-selected based on scopes):
- Use Slash Commands
- Send Messages
- Read Messages/View Channels
- All permissions from Step 3

---

## 🎮 **PART 2: DISCORD ACTIVITY CONFIGURATION**

### Step 5: Activity Settings
Navigate to **Activities** section (if not visible, contact Discord Support):

```yaml
Activity Name: Opure Activity
Activity Type: Game
Description: Interactive AI companion with music, games, and Scottish personality
```

### Step 6: Activity URLs
Configure these URLs in the Activities section:

```yaml
Target URL: https://api.opure.uk
Proxy URL: https://api.opure.uk (same as target)
```

### Step 7: Activity OAuth2 Configuration
In **OAuth2** → **General**, add Activity-specific settings:

**Additional Scopes for Activity:**
```yaml
✅ rpc
✅ rpc.activities.write
✅ guilds.members.read (optional)
```

**Redirect URIs:**
```yaml
https://api.opure.uk/api/auth/discord
https://api.opure.uk/auth/callback
http://localhost:3000/api/auth/discord (for development)
```

---

## 🔧 **PART 3: TECHNICAL CONFIGURATION**

### Step 8: Application Commands
Ensure these settings in **General Information**:

```yaml
Application ID: 1388207626944249856
Application Type: Bot & Activity
Interactions Endpoint URL: (leave blank for now)
```

### Step 9: Context Menu Command Setup
For context menus to work properly:

1. **Command Registration**: Bot must be in the server with `applications.commands` scope
2. **Permissions**: Bot needs "Use Application Commands" permission
3. **Sync**: Commands must be synced to the specific guild (not globally for Activities)

### Step 10: OAuth2 Client Configuration
Navigate to **OAuth2** → **General**:

```yaml
Client ID: 1388207626944249856
Client Secret: [KEEP SECRET - set in environment]
Redirect URIs:
  - https://api.opure.uk/api/auth/discord
  - https://api.opure.uk/auth/callback
  - http://localhost:3000/api/auth/discord
```

---

## 🌐 **PART 4: ENVIRONMENT VARIABLES**

### Required Environment Variables
Create/update your `.env` file:

```bash
# Discord Bot Configuration
BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=1388207626944249856
DISCORD_CLIENT_SECRET=your_client_secret_here

# Guild Configuration
GUILD_ID=your_test_guild_id_here

# Activity Configuration
DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/discord

# API Configuration
NODE_ENV=production
```

---

## 🧪 **PART 5: TESTING & VERIFICATION**

### Test Context Menu Commands

1. **Run the Bot:**
   ```bash
   cd /mnt/d/Opure.exe
   python bot.py
   ```

2. **Check Bot Logs:**
   Look for these messages:
   ```
   ✓ Successfully loaded Cog: context_menu_cog
   📋 Loaded 5 context menu commands:
     ✓ Ask Opure (message)
     ✓ Explain This (message)
     ✓ User Profile (user)
     ✓ Queue Audio (message)
     ✓ Analyze Sentiment (message)
   ```

3. **Test in Discord:**
   - Right-click on any message → Should see "Ask Opure", "Explain This", etc.
   - Right-click on any user → Should see "User Profile"

### Test OAuth2 Flow

1. **Run Test Suite:**
   ```bash
   cd /mnt/d/Opure.exe/activity/server
   python -m http.server 8000
   ```

2. **Open Test Page:**
   Navigate to: `http://localhost:8000/test-oauth.html`

3. **Run Tests:**
   - Click "Run Complete Test"
   - Should see all tests pass

### Test Activity Integration

1. **In Discord:**
   - Go to a voice channel
   - Click the rocket ship icon (Activities)
   - Select "Opure Activity" (if available)
   - Should load the activity interface

---

## 🚨 **TROUBLESHOOTING**

### Context Menus Not Appearing

**Problem:** Right-clicking doesn't show context menu commands

**Solutions:**
1. **Check Bot Permissions:**
   ```bash
   # Bot needs these permissions in the server:
   - Use Application Commands
   - View Channels
   - Send Messages
   ```

2. **Verify Command Sync:**
   ```bash
   # Check bot logs for:
   ✓ Synced X commands to Guild ID: XXXXX
   📋 Context menus synced: 5
   ```

3. **Re-invite Bot:**
   Use this URL (replace CLIENT_ID):
   ```
   https://discord.com/api/oauth2/authorize?client_id=1388207626944249856&permissions=2147483647&scope=bot%20applications.commands
   ```

### OAuth2 Flow Issues

**Problem:** Authentication fails or shows errors

**Solutions:**
1. **Check Environment Variables:**
   ```bash
   DISCORD_CLIENT_SECRET=your_actual_secret
   DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/discord
   ```

2. **Verify Redirect URIs:**
   Must match exactly what's in Developer Portal

3. **Check CORS Headers:**
   API should return:
   ```
   Access-Control-Allow-Origin: *
   ```

### Activity Not Loading

**Problem:** Activity doesn't appear in Discord or fails to load

**Solutions:**
1. **Check Activity Configuration:**
   - Target URL must be HTTPS
   - Must be publicly accessible
   - Must serve the correct content

2. **Verify Scopes:**
   ```yaml
   ✅ rpc
   ✅ rpc.activities.write
   ✅ identify
   ✅ guilds
   ```

---

## 📞 **SUPPORT & TESTING**

### Manual Test Commands

Run these to verify everything works:

```bash
# Test context menus
cd /mnt/d/Opure.exe/activity/server
python test-context-menus.py

# Test OAuth2
open http://localhost:8000/test-oauth.html

# Check bot logs
tail -f /mnt/d/Opure.exe/logs/bot.log
```

### Contact Information

If you need help:
1. Check bot logs first
2. Run the test scripts
3. Verify all settings match this guide
4. Check Discord Developer Portal for any warnings

---

## ✅ **SUCCESS CHECKLIST**

Before going live, ensure:

- [ ] Bot is in your test server with correct permissions
- [ ] Context menu commands appear when right-clicking
- [ ] OAuth2 test page passes all tests
- [ ] Activity loads in Discord (if configured)
- [ ] All environment variables are set correctly
- [ ] API endpoints return proper responses
- [ ] CORS headers are configured
- [ ] Redirect URIs match exactly

**When all items are checked, your Opure.exe bot and activity should be fully functional!** 🎉