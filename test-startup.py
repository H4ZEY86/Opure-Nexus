#!/usr/bin/env python3
"""
Opure.exe Bot Startup Test Script
Tests bot initialization and context menu command loading
"""

import asyncio
import sys
import os
import traceback
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from bot import OpureBot, GUILD_IDS, BOT_TOKEN
import discord

async def test_bot_startup():
    """Test bot startup and context menu loading"""
    print("🤖 OPURE.EXE BOT STARTUP TEST")
    print("=" * 50)
    
    if not BOT_TOKEN:
        print("❌ BOT_TOKEN not found in environment!")
        return False
    
    print(f"🔑 Bot Token: {'*' * 20}{BOT_TOKEN[-5:]}")
    print(f"🏰 Guild IDs: {GUILD_IDS}")
    
    # Create bot instance
    intents = discord.Intents.default()
    intents.message_content = True
    intents.members = True
    
    bot = OpureBot(command_prefix="!", intents=intents)
    
    try:
        print("\n📡 Testing bot initialization...")
        
        # Set up event handlers for testing
        @bot.event
        async def on_ready():
            print(f"✅ Bot logged in as {bot.user}")
            print(f"📊 Connected to {len(bot.guilds)} guilds")
            
            # Test context menu commands
            print("\n🔍 Testing context menu commands...")
            all_commands = bot.tree.get_commands()
            context_menus = [cmd for cmd in all_commands if isinstance(cmd, discord.app_commands.ContextMenu)]
            
            print(f"📋 Total commands: {len(all_commands)}")
            print(f"🖱️ Context menus: {len(context_menus)}")
            
            if context_menus:
                print("\n✅ Context menu commands found:")
                for i, cmd in enumerate(context_menus, 1):
                    print(f"  {i}. {cmd.name} ({cmd.type.name})")
            else:
                print("❌ NO CONTEXT MENU COMMANDS FOUND!")
            
            # Test command sync
            if GUILD_IDS:
                print(f"\n🔄 Testing command sync to {len(GUILD_IDS)} guilds...")
                for guild_id in GUILD_IDS[:1]:  # Test only first guild
                    try:
                        guild = discord.Object(id=guild_id)
                        synced = await bot.tree.sync(guild=guild)
                        print(f"✅ Synced {len(synced)} commands to guild {guild_id}")
                        
                        # Count context menus in synced commands
                        synced_menus = [cmd for cmd in synced if hasattr(cmd, 'type') and cmd.type in [discord.AppCommandType.message, discord.AppCommandType.user]]
                        print(f"🖱️ Context menus synced: {len(synced_menus)}")
                        
                    except Exception as e:
                        print(f"⚠️ Sync failed for guild {guild_id}: {e}")
            
            print("\n🎉 Bot startup test completed successfully!")
            await bot.close()
        
        # Start bot (will automatically call setup_hook and on_ready)
        print("🚀 Starting bot...")
        await bot.start(BOT_TOKEN)
        
    except Exception as e:
        print(f"❌ Bot startup failed: {e}")
        traceback.print_exc()
        return False
    finally:
        if not bot.is_closed():
            await bot.close()
    
    return True

async def test_context_menu_registration():
    """Test context menu command registration specifically"""
    print("\n🖱️ CONTEXT MENU REGISTRATION TEST")
    print("=" * 50)
    
    try:
        # Import the context menu cog
        from cogs.context_menu_cog import setup
        
        # Create a minimal bot for testing
        intents = discord.Intents.default()
        bot = OpureBot(command_prefix="!", intents=intents)
        
        # Manually run the setup function
        print("📦 Loading context menu cog...")
        await setup(bot)
        
        # Check what commands were added
        all_commands = bot.tree.get_commands()
        context_menus = [cmd for cmd in all_commands if isinstance(cmd, discord.app_commands.ContextMenu)]
        
        print(f"✅ Setup complete!")
        print(f"📋 Commands added to tree: {len(all_commands)}")
        print(f"🖱️ Context menus registered: {len(context_menus)}")
        
        if context_menus:
            print("\n🖱️ Registered context menus:")
            for i, cmd in enumerate(context_menus, 1):
                print(f"  {i}. {cmd.name} ({cmd.type.name})")
                print(f"     Callback: {cmd.callback.__name__ if cmd.callback else 'None'}")
        else:
            print("❌ NO CONTEXT MENUS REGISTERED!")
        
        await bot.close()
        return len(context_menus) > 0
        
    except Exception as e:
        print(f"❌ Context menu registration test failed: {e}")
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("🧪 RUNNING OPURE.EXE STARTUP TESTS")
    print("=" * 60)
    
    tests = [
        ("Context Menu Registration", test_context_menu_registration),
        ("Bot Startup", test_bot_startup),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n⏳ Running {test_name}...")
        try:
            result = await test_func()
            results[test_name] = result
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"📊 {test_name}: {status}")
        except Exception as e:
            print(f"💥 {test_name} crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"✅ Tests Passed: {passed}/{total}")
    print(f"❌ Tests Failed: {total - passed}/{total}")
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! The bot should work correctly.")
    else:
        print("\n⚠️ SOME TESTS FAILED! Check the errors above.")
    
    print("\n💡 Next steps:")
    print("1. If tests passed, start the bot with: python bot.py")
    print("2. Test context menus by right-clicking in Discord")
    print("3. Check bot logs for any additional issues")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
    except Exception as e:
        print(f"💥 Test suite crashed: {e}")
        traceback.print_exc()