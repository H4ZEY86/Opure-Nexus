#!/usr/bin/env python3
"""
Context Menu Commands Test Script for Opure.exe Bot
Tests if context menu commands are properly registered and accessible
"""

import discord
from discord.ext import commands
import asyncio
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
GUILD_ID = int(os.getenv("GUILD_ID", "0"))

class ContextMenuTester:
    def __init__(self):
        self.intents = discord.Intents.default()
        self.intents.message_content = True
        self.intents.members = True
        
        self.bot = commands.Bot(command_prefix="!", intents=self.intents)
        self.setup_events()
        
    def setup_events(self):
        @self.bot.event
        async def on_ready():
            print(f"\n🤖 {self.bot.user} is connected and ready!")
            print(f"📊 Connected to {len(self.bot.guilds)} guilds")
            
            await self.run_context_menu_tests()
            
        @self.bot.event
        async def on_error(event, *args, **kwargs):
            print(f"❌ Error in {event}: {args}, {kwargs}")

    async def run_context_menu_tests(self):
        """Run comprehensive context menu tests"""
        print("\n" + "="*60)
        print("🔍 CONTEXT MENU COMMAND VERIFICATION")
        print("="*60)
        
        try:
            # Test 1: Check all commands in tree
            await self.test_command_tree()
            
            # Test 2: Check guild-specific commands
            await self.test_guild_commands()
            
            # Test 3: Check global commands
            await self.test_global_commands()
            
            # Test 4: Try to fetch from Discord API
            await self.test_api_fetch()
            
            print("\n✅ All context menu tests completed!")
            
        except Exception as e:
            print(f"❌ Context menu tests failed: {e}")
        
        # Keep bot running for manual testing
        print("\n🔄 Bot will stay online for manual testing...")
        print("Right-click on messages/users in Discord to test context menus")
        print("Press Ctrl+C to stop")

    async def test_command_tree(self):
        """Test 1: Verify commands in the command tree"""
        print("\n1️⃣ Testing Command Tree...")
        
        all_commands = self.bot.tree.get_commands()
        context_menus = [cmd for cmd in all_commands if isinstance(cmd, discord.app_commands.ContextMenu)]
        slash_commands = [cmd for cmd in all_commands if isinstance(cmd, discord.app_commands.Command)]
        
        print(f"📋 Total commands in tree: {len(all_commands)}")
        print(f"🖱️ Context menu commands: {len(context_menus)}")
        print(f"⚡ Slash commands: {len(slash_commands)}")
        
        if context_menus:
            print("\n🖱️ Context Menu Commands Found:")
            for i, cmd in enumerate(context_menus, 1):
                print(f"  {i}. {cmd.name} ({cmd.type.name})")
                print(f"     Callback: {cmd.callback.__name__ if cmd.callback else 'None'}")
        else:
            print("❌ NO CONTEXT MENU COMMANDS FOUND IN TREE!")
            
        return len(context_menus) > 0

    async def test_guild_commands(self):
        """Test 2: Check guild-specific commands"""
        print(f"\n2️⃣ Testing Guild Commands (Guild ID: {GUILD_ID})...")
        
        if GUILD_ID == 0:
            print("⚠️ No GUILD_ID set in environment - skipping guild test")
            return False
            
        try:
            guild = self.bot.get_guild(GUILD_ID)
            if not guild:
                print(f"❌ Guild {GUILD_ID} not found or bot not in guild")
                return False
                
            print(f"🏰 Testing guild: {guild.name}")
            
            # Fetch guild commands
            guild_commands = await self.bot.tree.fetch_commands(guild=guild)
            guild_context_menus = [cmd for cmd in guild_commands if cmd.type in [discord.AppCommandType.message, discord.AppCommandType.user]]
            
            print(f"📋 Guild commands found: {len(guild_commands)}")
            print(f"🖱️ Guild context menus: {len(guild_context_menus)}")
            
            if guild_context_menus:
                print("\n🖱️ Guild Context Menus:")
                for i, cmd in enumerate(guild_context_menus, 1):
                    print(f"  {i}. {cmd.name} ({cmd.type.name}) - ID: {cmd.id}")
            else:
                print("❌ NO GUILD CONTEXT MENUS FOUND!")
                
            return len(guild_context_menus) > 0
            
        except discord.Forbidden:
            print("❌ No permission to fetch guild commands")
            return False
        except Exception as e:
            print(f"❌ Guild command test failed: {e}")
            return False

    async def test_global_commands(self):
        """Test 3: Check global commands"""
        print("\n3️⃣ Testing Global Commands...")
        
        try:
            global_commands = await self.bot.tree.fetch_commands()
            global_context_menus = [cmd for cmd in global_commands if cmd.type in [discord.AppCommandType.message, discord.AppCommandType.user]]
            
            print(f"🌐 Global commands found: {len(global_commands)}")
            print(f"🖱️ Global context menus: {len(global_context_menus)}")
            
            if global_context_menus:
                print("\n🖱️ Global Context Menus:")
                for i, cmd in enumerate(global_context_menus, 1):
                    print(f"  {i}. {cmd.name} ({cmd.type.name}) - ID: {cmd.id}")
            else:
                print("ℹ️ No global context menus (this is expected for guild-only bots)")
                
            return len(global_context_menus) > 0
            
        except Exception as e:
            print(f"❌ Global command test failed: {e}")
            return False

    async def test_api_fetch(self):
        """Test 4: Direct API fetch test"""
        print("\n4️⃣ Testing Direct API Fetch...")
        
        try:
            # Use bot's HTTP session to fetch commands directly
            if GUILD_ID != 0:
                url = f"/applications/{self.bot.user.id}/guilds/{GUILD_ID}/commands"
            else:
                url = f"/applications/{self.bot.user.id}/commands"
                
            print(f"🌐 Fetching from API endpoint: {url}")
            
            # This is an internal test - in practice, commands should be visible in Discord
            commands_data = await self.bot.http.get_guild_commands(self.bot.user.id, GUILD_ID) if GUILD_ID != 0 else await self.bot.http.get_global_commands(self.bot.user.id)
            
            context_menu_apis = [cmd for cmd in commands_data if cmd.get('type') in [2, 3]]  # 2=USER, 3=MESSAGE
            
            print(f"📡 API commands found: {len(commands_data)}")
            print(f"🖱️ API context menus: {len(context_menu_apis)}")
            
            if context_menu_apis:
                print("\n🖱️ API Context Menus:")
                for i, cmd in enumerate(context_menu_apis, 1):
                    cmd_type = "USER" if cmd.get('type') == 2 else "MESSAGE"
                    print(f"  {i}. {cmd.get('name')} ({cmd_type}) - ID: {cmd.get('id')}")
            
            return len(context_menu_apis) > 0
            
        except Exception as e:
            print(f"❌ API fetch test failed: {e}")
            return False

    def generate_test_report(self, results):
        """Generate a test report"""
        print("\n" + "="*60)
        print("📊 CONTEXT MENU TEST REPORT")
        print("="*60)
        
        total_tests = len(results)
        passed_tests = sum(results.values())
        
        print(f"✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"❌ Tests Failed: {total_tests - passed_tests}/{total_tests}")
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name}: {status}")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! Context menus should be working.")
        else:
            print("\n⚠️ SOME TESTS FAILED! Check the issues above.")
            
        print("\n💡 TROUBLESHOOTING TIPS:")
        print("1. Make sure the bot has 'applications.commands' scope")
        print("2. Verify the bot is in the correct guild")
        print("3. Check that commands are synced properly")
        print("4. Ensure proper permissions in Discord Developer Portal")
        print("5. Try re-syncing commands or restarting the bot")

    async def run(self):
        """Run the context menu tester"""
        if not BOT_TOKEN:
            print("❌ BOT_TOKEN not found in environment variables!")
            return
            
        print("🚀 Starting Context Menu Tester...")
        print(f"🤖 Bot Token: {'*' * 20}{BOT_TOKEN[-5:] if BOT_TOKEN else 'NOT_SET'}")
        print(f"🏰 Guild ID: {GUILD_ID}")
        
        try:
            await self.bot.start(BOT_TOKEN)
        except KeyboardInterrupt:
            print("\n👋 Context Menu Tester stopped by user")
        except Exception as e:
            print(f"❌ Bot failed to start: {e}")
        finally:
            await self.bot.close()

async def main():
    """Main function to run the tester"""
    tester = ContextMenuTester()
    await tester.run()

if __name__ == "__main__":
    print("🔍 OPURE.EXE CONTEXT MENU COMMAND TESTER")
    print("=" * 50)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Tester failed: {e}")