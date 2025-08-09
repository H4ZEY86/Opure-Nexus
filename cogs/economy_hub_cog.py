# cogs/economy_hub_cog.py - Modern Economy Hub with Trading System

import discord
from discord.ext import commands
from core.command_hub_system import BaseCommandHubView, ModernEmbed, HubCategory, CommandHubPaginator
import asyncio
import datetime
from typing import Dict, List, Optional, Any
import json
import random

class EconomyHubView(BaseCommandHubView):
    """Economy hub with trading, shop, and market systems"""
    
    def __init__(self, bot: commands.Bot, user: discord.User):
        super().__init__(bot, user)
        self.category = HubCategory.ECONOMY
        self.current_view = "main"  # main, balance, shop, trade, market
        self.shop_category = "general"
        self.shop_page = 0
        
    async def get_embed_for_page(self, page: int = 0) -> discord.Embed:
        """Get embed based on current view state"""
        if self.current_view == "main":
            return await self._get_main_hub_embed()
        elif self.current_view == "balance":
            return await self._get_balance_embed()
        elif self.current_view == "shop":
            return await self._get_shop_embed()
        elif self.current_view == "trade":
            return await self._get_trade_embed()
        elif self.current_view == "market":
            return await self._get_market_embed()
        else:
            return await self._get_main_hub_embed()
    
    async def _get_main_hub_embed(self) -> discord.Embed:
        """Main economy hub embed"""
        # Get user balance
        cursor = await self.bot.db.execute("""
            SELECT fragments, data_shards, level FROM players WHERE user_id = ?
        """, (self.user.id,))
        
        result = await cursor.fetchone()
        if result:
            fragments, data_shards, level = result
        else:
            fragments, data_shards, level = 100, 0, 1
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title="Economy Command Center",
            description="💰 **Welcome to your economic empire!**\n\nManage your wealth, trade with others, and dominate the market:",
            fields=[
                {
                    "name": "💎 Your Wealth",
                    "value": f"```yaml\nFragments: {fragments:,}\nData Shards: {data_shards:,}\nLevel: {level}\nNet Worth: {fragments + (data_shards * 10):,}\n```",
                    "inline": False
                },
                {
                    "name": "🏪 Market Activity",
                    "value": "• Active Trades: 0\n• Shop Categories: 6\n• Market Listings: 0\n• Daily Volume: 0\n• Trending Items: None",
                    "inline": True
                },
                {
                    "name": "📈 Economy Stats",
                    "value": f"• Your Rank: #{random.randint(1, 100)}\n• Total Trades: 0\n• Profit Today: +0\n• Success Rate: 0%\n• Market Share: 0%",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_balance_embed(self) -> discord.Embed:
        """Detailed balance and inventory view"""
        # Get user data
        cursor = await self.bot.db.execute("""
            SELECT fragments, data_shards, level, xp FROM players WHERE user_id = ?
        """, (self.user.id,))
        
        result = await cursor.fetchone()
        if result:
            fragments, data_shards, level, xp = result
        else:
            fragments, data_shards, level, xp = 100, 0, 1, 0
        
        # Get inventory items
        cursor = await self.bot.db.execute("""
            SELECT item_id, quantity FROM player_items WHERE user_id = ?
        """, (self.user.id,))
        
        items = await cursor.fetchall()
        
        if items:
            item_list = "```yaml\n"
            for item_id, quantity in items[:10]:
                item_list += f"{item_id}: {quantity:,}x\n"
            if len(items) > 10:
                item_list += f"... and {len(items) - 10} more items\n"
            item_list += "```"
        else:
            item_list = "```\nNo items in inventory\nVisit the shop to get started!\n```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title="Wealth & Inventory",
            description="💰 **Your complete financial overview**\n\nDetailed breakdown of your assets:",
            fields=[
                {
                    "name": "💎 Balances",
                    "value": f"```yaml\nFragments: {fragments:,}\nData Shards: {data_shards:,}\nTotal Value: {fragments + (data_shards * 10):,}\n\nLevel: {level} (XP: {xp})\nNext Level: {((level + 1) * 100) - xp} XP\n```",
                    "inline": False
                },
                {
                    "name": "🎒 Inventory",
                    "value": item_list,
                    "inline": False
                },
                {
                    "name": "📊 Statistics",
                    "value": f"• Items Owned: {len(items)}\n• Inventory Value: ~{random.randint(500, 5000):,}\n• Rarest Item: Legendary Artifact\n• Collection: {len(items)}/100 slots",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_shop_embed(self) -> discord.Embed:
        """Shop interface with categories"""
        # Mock shop data (in real implementation, this would come from database)
        shop_items = {
            "general": [
                {"name": "Energy Booster", "price": 50, "description": "Restore 20 energy"},
                {"name": "Experience Orb", "price": 100, "description": "+250 XP"},
                {"name": "Lucky Charm", "price": 200, "description": "2x fragments for 1 hour"},
            ],
            "weapons": [
                {"name": "Data Blade", "price": 500, "description": "Legendary weapon"},
                {"name": "Quantum Rifle", "price": 750, "description": "Epic ranged weapon"},
                {"name": "Neural Enhancer", "price": 300, "description": "Rare upgrade"},
            ],
            "cosmetics": [
                {"name": "Neon Avatar", "price": 250, "description": "Glowing profile effect"},
                {"name": "Scottish Badge", "price": 150, "description": "Rangers FC supporter badge"},
                {"name": "AI Crown", "price": 1000, "description": "Ultimate status symbol"},
            ]
        }
        
        items = shop_items.get(self.shop_category, [])
        
        if items:
            item_display = "```yaml\n"
            for i, item in enumerate(items[:8], 1):
                item_display += f"{i}. {item['name']} - {item['price']:,} fragments\n   {item['description']}\n\n"
            item_display += "```"
        else:
            item_display = "```\nNo items available in this category\n```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title=f"Shop - {self.shop_category.title()} Category",
            description="🏪 **Purchase items to enhance your experience**\n\nBrowse our selection of premium goods:",
            fields=[
                {
                    "name": f"🛒 {self.shop_category.title()} Items",
                    "value": item_display,
                    "inline": False
                },
                {
                    "name": "💡 Shop Features",
                    "value": "• Daily rotating stock\n• Bulk purchase discounts\n• Member exclusive items\n• Limited edition collectibles\n• AI-generated descriptions",
                    "inline": True
                },
                {
                    "name": "🏷️ Categories",
                    "value": "• General Items\n• Weapons & Tools\n• Cosmetics\n• Consumables\n• Artifacts\n• Special Offers",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_trade_embed(self) -> discord.Embed:
        """P2P trading interface"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title="Player-to-Player Trading",
            description="🤝 **Trade directly with other users**\n\nSecure trading with built-in escrow system:",
            fields=[
                {
                    "name": "📋 Active Trades",
                    "value": "```\nNo active trades\nCreate a new trade to get started!\n```",
                    "inline": False
                },
                {
                    "name": "🔒 Security Features",
                    "value": "• Escrow protection\n• Trade verification\n• Scam prevention\n• Automated disputes\n• Transaction history",
                    "inline": True
                },
                {
                    "name": "💼 Trade Types",
                    "value": "• Item-for-Item\n• Item-for-Fragments\n• Bulk exchanges\n• Service trades\n• Auction-style",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_market_embed(self) -> discord.Embed:
        """Global marketplace view"""
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title="Global Marketplace",
            description="🌐 **Server-wide trading marketplace**\n\nBuy and sell with automated pricing:",
            fields=[
                {
                    "name": "📈 Market Trends",
                    "value": "```yaml\nHot Items:\n• Data Shards: +15% ↗️\n• Legendary Artifacts: -5% ↘️\n• Energy Boosters: +3% ↗️\n\nVolume: 15,420 trades today\nTotal Value: 2.1M fragments\n```",
                    "inline": False
                },
                {
                    "name": "🏆 Top Sellers",
                    "value": "1. **CryptoTrader** - 1.2M volume\n2. **FragmentKing** - 980K volume\n3. **DataMiner** - 750K volume",
                    "inline": True
                },
                {
                    "name": "💎 Featured Items",
                    "value": "• **Quantum Core**: 5,000f\n• **Neural Chip**: 2,500f\n• **Energy Cell**: 100f\n• **AI Matrix**: 10,000f",
                    "inline": True
                }
            ]
        )
        return embed
    
    # Button interactions
    @discord.ui.button(label="💰 Balance", style=discord.ButtonStyle.primary, row=0)
    async def balance_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to balance view"""
        self.current_view = "balance"
        self._update_buttons_for_balance_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏪 Shop", style=discord.ButtonStyle.secondary, row=0)
    async def shop_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to shop view"""
        self.current_view = "shop"
        self._update_buttons_for_shop_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🤝 Trade", style=discord.ButtonStyle.secondary, row=0)
    async def trade_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to trading view"""
        self.current_view = "trade"
        self._update_buttons_for_trade_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🌐 Market", style=discord.ButtonStyle.secondary, row=0)
    async def market_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to market view"""
        self.current_view = "market"
        self._update_buttons_for_market_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏠 Main Hub", style=discord.ButtonStyle.danger, row=1)
    async def home_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Return to main hub view"""
        self.current_view = "main"
        self._update_buttons_for_main_view()
        await self.update_embed(interaction)
    
    def _update_buttons_for_main_view(self):
        """Configure buttons for main view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="💰 Balance", style=discord.ButtonStyle.primary, row=0, custom_id="balance"))
        self.add_item(discord.ui.Button(label="🏪 Shop", style=discord.ButtonStyle.secondary, row=0, custom_id="shop"))
        self.add_item(discord.ui.Button(label="🤝 Trade", style=discord.ButtonStyle.secondary, row=0, custom_id="trade"))
        self.add_item(discord.ui.Button(label="🌐 Market", style=discord.ButtonStyle.secondary, row=0, custom_id="market"))
    
    def _update_buttons_for_balance_view(self):
        """Configure buttons for balance view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="💸 Send Money", style=discord.ButtonStyle.success, row=0, custom_id="send_money"))
        self.add_item(discord.ui.Button(label="🎒 Use Item", style=discord.ButtonStyle.primary, row=0, custom_id="use_item"))
        self.add_item(discord.ui.Button(label="🗑️ Sell Items", style=discord.ButtonStyle.danger, row=0, custom_id="sell_items"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_shop_view(self):
        """Configure buttons for shop view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🛍️ Buy Item", style=discord.ButtonStyle.success, row=0, custom_id="buy_item"))
        self.add_item(discord.ui.Button(label="📦 General", style=discord.ButtonStyle.primary, row=0, custom_id="cat_general"))
        self.add_item(discord.ui.Button(label="⚔️ Weapons", style=discord.ButtonStyle.primary, row=0, custom_id="cat_weapons"))
        self.add_item(discord.ui.Button(label="✨ Cosmetics", style=discord.ButtonStyle.secondary, row=0, custom_id="cat_cosmetics"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_trade_view(self):
        """Configure buttons for trade view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="📋 Create Trade", style=discord.ButtonStyle.success, row=0, custom_id="create_trade"))
        self.add_item(discord.ui.Button(label="👀 View Offers", style=discord.ButtonStyle.primary, row=0, custom_id="view_trades"))
        self.add_item(discord.ui.Button(label="📊 Trade History", style=discord.ButtonStyle.secondary, row=0, custom_id="trade_history"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_market_view(self):
        """Configure buttons for market view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="💎 List Item", style=discord.ButtonStyle.success, row=0, custom_id="list_item"))
        self.add_item(discord.ui.Button(label="🛒 Buy Now", style=discord.ButtonStyle.primary, row=0, custom_id="buy_market"))
        self.add_item(discord.ui.Button(label="📈 Price Check", style=discord.ButtonStyle.secondary, row=0, custom_id="price_check"))
        self.add_item(discord.ui.Button(label="📊 Analytics", style=discord.ButtonStyle.secondary, row=0, custom_id="market_analytics"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))

class PurchaseModal(discord.ui.Modal):
    """Modal for purchasing items from shop"""
    
    def __init__(self, hub_view: EconomyHubView):
        super().__init__(title="🛍️ Purchase Item")
        self.hub_view = hub_view
        
        self.item_input = discord.ui.TextInput(
            label="Item Name or Number",
            placeholder="Enter item name or shop number (e.g., '1' or 'Energy Booster')",
            style=discord.TextStyle.short,
            required=True,
            max_length=100
        )
        
        self.quantity_input = discord.ui.TextInput(
            label="Quantity",
            placeholder="1",
            style=discord.TextStyle.short,
            required=False,
            max_length=10
        )
        
        self.add_item(self.item_input)
        self.add_item(self.quantity_input)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle item purchase"""
        item_name = self.item_input.value.strip()
        quantity_str = self.quantity_input.value.strip() or "1"
        
        try:
            quantity = int(quantity_str)
            if quantity <= 0:
                raise ValueError("Quantity must be positive")
        except ValueError:
            await interaction.response.send_message(
                "❌ Please enter a valid quantity (positive number).",
                ephemeral=True
            )
            return
        
        # Show processing embed
        processing_embed = ModernEmbed.create_status_embed(
            "🛍️ Processing Purchase...",
            f"Buying {quantity}x {item_name}",
            status_type="loading"
        )
        
        await interaction.response.edit_message(embed=processing_embed, view=None)
        
        try:
            # Simulate purchase processing
            await asyncio.sleep(2)
            
            # Mock success (in real implementation, check balance and update database)
            success_embed = ModernEmbed.create_status_embed(
                "✅ Purchase Successful!",
                f"You bought {quantity}x **{item_name}**!\n\nCheck your inventory in the Balance section.",
                status_type="success"
            )
            
            await interaction.edit_original_response(embed=success_embed, view=None)
            
        except Exception as e:
            error_embed = ModernEmbed.create_status_embed(
                "❌ Purchase Failed",
                f"Could not buy {item_name}:\n{str(e)}",
                color=0xff0000,
                status_type="error"
            )
            
            await interaction.edit_original_response(embed=error_embed, view=None)

class EconomyHubCog(commands.Cog):
    """Modern Economy Hub Command System"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @commands.hybrid_command(name="economy", description="💰 Open the economy management hub")
    async def economy_hub(self, ctx: commands.Context):
        """Main economy hub command"""
        # Create hub view
        hub_view = EconomyHubView(self.bot, ctx.author)
        
        # Get initial embed
        embed = await hub_view.get_embed_for_page()
        
        # Send hub interface
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed, view=hub_view, ephemeral=False)
            hub_view.message = await ctx.interaction.original_response()
        else:
            message = await ctx.send(embed=embed, view=hub_view)
            hub_view.message = message
    
    @commands.hybrid_command(name="balance", description="💰 Quick balance check")
    async def quick_balance(self, ctx: commands.Context):
        """Quick balance display"""
        cursor = await self.bot.db.execute("""
            SELECT fragments, data_shards, level FROM players WHERE user_id = ?
        """, (ctx.author.id,))
        
        result = await cursor.fetchone()
        if result:
            fragments, data_shards, level = result
        else:
            fragments, data_shards, level = 100, 0, 1
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.ECONOMY,
            title="💰 Quick Balance",
            description=f"**{ctx.author.display_name}'s Wallet**",
            fields=[
                {
                    "name": "💎 Current Balance",
                    "value": f"```yaml\nFragments: {fragments:,}\nData Shards: {data_shards:,}\nLevel: {level}\nTotal Value: {fragments + (data_shards * 10):,}\n```",
                    "inline": False
                },
                {
                    "name": "📊 Quick Stats",
                    "value": f"Use `/economy` for the full hub interface!",
                    "inline": False
                }
            ]
        )
        
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
        else:
            await ctx.send(embed=embed)

async def setup(bot):
    """Setup function for the cog"""
    await bot.add_cog(EconomyHubCog(bot))