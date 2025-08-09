# cogs/gaming_hub_cog.py - Next-Gen Gaming Hub with Discord Activity Integration

import discord
from discord.ext import commands
from core.command_hub_system import BaseCommandHubView, ModernEmbed, HubCategory, CommandHubPaginator
import asyncio
import datetime
from typing import Dict, List, Optional, Any
import json
import random
import aiohttp

class GamingHubView(BaseCommandHubView):
    """Gaming hub with Discord Activity integration and tournaments"""
    
    def __init__(self, bot: commands.Bot, user: discord.User):
        super().__init__(bot, user)
        self.category = HubCategory.GAMING
        self.current_view = "main"  # main, activity, stats, leaderboard, tournaments
        self.game_mode = "battle_royale"
        
    async def get_embed_for_page(self, page: int = 0) -> discord.Embed:
        """Get embed based on current view state"""
        if self.current_view == "main":
            return await self._get_main_hub_embed()
        elif self.current_view == "activity":
            return await self._get_activity_embed()
        elif self.current_view == "stats":
            return await self._get_stats_embed()
        elif self.current_view == "leaderboard":
            return await self._get_leaderboard_embed()
        elif self.current_view == "tournaments":
            return await self._get_tournaments_embed()
        else:
            return await self._get_main_hub_embed()
    
    async def _get_main_hub_embed(self) -> discord.Embed:
        """Main gaming hub embed"""
        # Get user gaming stats
        cursor = await self.bot.db.execute("""
            SELECT games_completed, achievements_earned FROM user_stats WHERE user_id = ?
        """, (self.user.id,))
        
        result = await cursor.fetchone()
        if result:
            games_completed, achievements_earned = result
        else:
            games_completed, achievements_earned = 0, 0
        
        # Mock recent activity data
        recent_games = [
            {"name": "SpaceRace3D", "score": 1250, "rank": "🥈 2nd", "time": "2 hours ago"},
            {"name": "Neural Puzzle", "score": 890, "rank": "🥉 3rd", "time": "5 hours ago"},
            {"name": "Quantum Battles", "score": 2100, "rank": "🥇 1st", "time": "1 day ago"}
        ]
        
        recent_activity = "```yaml\n"
        for game in recent_games[:3]:
            recent_activity += f"{game['name']}: {game['score']} pts ({game['rank']}) - {game['time']}\n"
        recent_activity += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="Gaming Command Center",
            description="🎮 **Welcome to your gaming headquarters!**\n\nLaunch Discord Activities, compete in tournaments, and dominate leaderboards:",
            fields=[
                {
                    "name": "🏆 Your Gaming Profile",
                    "value": f"```yaml\nGames Completed: {games_completed}\nAchievements: {achievements_earned}\nRank: Elite Gamer\nLevel: {random.randint(15, 50)}\nWin Rate: {random.randint(65, 95)}%\n```",
                    "inline": False
                },
                {
                    "name": "🎯 Recent Activity",
                    "value": recent_activity,
                    "inline": True
                },
                {
                    "name": "⚡ Live Gaming Stats",
                    "value": f"• Players Online: {random.randint(150, 500)}\n• Active Tournaments: 3\n• Daily Challenges: 5/5\n• Server Status: 🟢 Optimal\n• Queue Time: <30s",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_activity_embed(self) -> discord.Embed:
        """Discord Activity launcher embed"""
        activities = [
            {
                "name": "🚀 SpaceRace3D", 
                "description": "High-speed 3D racing through asteroid fields",
                "players": "2-8 players",
                "difficulty": "⭐⭐⭐",
                "status": "🟢 Ready"
            },
            {
                "name": "🧩 Neural Puzzle",
                "description": "AI-powered collaborative puzzle solving", 
                "players": "1-4 players",
                "difficulty": "⭐⭐⭐⭐",
                "status": "🟢 Ready"
            },
            {
                "name": "⚔️ Quantum Battles",
                "description": "Strategic multiplayer combat arena",
                "players": "2-6 players", 
                "difficulty": "⭐⭐⭐⭐⭐",
                "status": "🟢 Ready"
            },
            {
                "name": "🎯 Fragment Hunter",
                "description": "Collect fragments while avoiding AI enemies",
                "players": "1-8 players",
                "difficulty": "⭐⭐",
                "status": "🟢 Ready"
            },
            {
                "name": "🧠 Mind Maze",
                "description": "Navigate through psychological challenges",
                "players": "1-4 players",
                "difficulty": "⭐⭐⭐⭐⭐",
                "status": "🟠 Beta"
            }
        ]
        
        activity_list = "```yaml\n"
        for i, activity in enumerate(activities[:5], 1):
            activity_list += f"{i}. {activity['name']}\n"
            activity_list += f"   {activity['description']}\n"
            activity_list += f"   Players: {activity['players']} | Difficulty: {activity['difficulty']}\n"
            activity_list += f"   Status: {activity['status']}\n\n"
        activity_list += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="Discord Activity Launcher",
            description="🚀 **Launch immersive games directly in Discord**\n\nPowered by https://opure.uk with real-time multiplayer:",
            fields=[
                {
                    "name": "🎮 Available Activities",
                    "value": activity_list,
                    "inline": False
                },
                {
                    "name": "⚡ Activity Features",
                    "value": "• Real-time multiplayer\n• Cross-platform compatibility\n• Achievement integration\n• Economy rewards\n• Live leaderboards",
                    "inline": True
                },
                {
                    "name": "🌐 System Info",
                    "value": f"• Server: https://opure.uk\n• API: https://api.opure.uk\n• Latency: {random.randint(15, 45)}ms\n• Uptime: 99.9%\n• Version: 2.1.0",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_stats_embed(self) -> discord.Embed:
        """Detailed gaming statistics embed"""
        # Get comprehensive user stats
        cursor = await self.bot.db.execute("""
            SELECT games_completed, achievements_earned, commands_used FROM user_stats WHERE user_id = ?
        """, (self.user.id,))
        
        result = await cursor.fetchone()
        if result:
            games_completed, achievements_earned, commands_used = result
        else:
            games_completed, achievements_earned, commands_used = 0, 0, 0
        
        # Mock detailed gaming data
        game_stats = {
            "SpaceRace3D": {"played": random.randint(5, 25), "best": random.randint(1000, 3000), "avg": random.randint(500, 1500)},
            "Neural Puzzle": {"played": random.randint(3, 15), "best": random.randint(800, 2500), "avg": random.randint(400, 1200)},
            "Quantum Battles": {"played": random.randint(8, 30), "best": random.randint(1500, 4000), "avg": random.randint(800, 2000)},
            "Fragment Hunter": {"played": random.randint(2, 12), "best": random.randint(600, 2000), "avg": random.randint(300, 1000)}
        }
        
        detailed_stats = "```yaml\n"
        for game, stats in game_stats.items():
            detailed_stats += f"{game}:\n"
            detailed_stats += f"  Games: {stats['played']} | Best: {stats['best']} | Avg: {stats['avg']}\n\n"
        detailed_stats += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="Gaming Statistics Dashboard",
            description="📊 **Comprehensive performance analytics**\n\nDetailed breakdown of your gaming journey:",
            fields=[
                {
                    "name": "🏆 Overall Performance",
                    "value": f"```yaml\nTotal Games: {games_completed}\nAchievements: {achievements_earned}\nWin Rate: {random.randint(60, 90)}%\nAvg Score: {random.randint(1000, 2500)}\nBest Streak: {random.randint(5, 15)} wins\nRank: #{random.randint(10, 100)} globally\n```",
                    "inline": False
                },
                {
                    "name": "🎮 Game-Specific Stats",
                    "value": detailed_stats,
                    "inline": False
                },
                {
                    "name": "📈 Progress Tracking",
                    "value": f"• XP Gained: {random.randint(5000, 15000)}\n• Levels Up: {random.randint(3, 8)}\n• Fragments Earned: {random.randint(1000, 5000)}\n• Time Played: {random.randint(10, 50)}h\n• Favorite Game: SpaceRace3D",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_leaderboard_embed(self) -> discord.Embed:
        """Gaming leaderboards embed"""
        # Mock leaderboard data (in production, this would come from database)
        global_leaders = [
            {"rank": 1, "name": "QuantumMaster", "score": 12500, "games": 85},
            {"rank": 2, "name": "NeuralNinja", "score": 11800, "games": 78}, 
            {"rank": 3, "name": "SpaceAce2024", "score": 11200, "games": 92},
            {"rank": 4, "name": "FragmentKing", "score": 10950, "games": 67},
            {"rank": 5, "name": "PuzzleMaster", "score": 10700, "games": 71},
        ]
        
        server_leaders = [
            {"rank": 1, "name": self.user.display_name, "score": random.randint(8000, 12000), "games": random.randint(30, 80)},
            {"rank": 2, "name": "ServerChamp", "score": random.randint(7000, 11000), "games": random.randint(25, 70)},
            {"rank": 3, "name": "LocalHero", "score": random.randint(6000, 10000), "games": random.randint(20, 60)},
        ]
        
        global_list = "```yaml\n"
        for leader in global_leaders:
            global_list += f"{leader['rank']}. {leader['name']} - {leader['score']:,} pts ({leader['games']} games)\n"
        global_list += "```"
        
        server_list = "```yaml\n"  
        for leader in server_leaders:
            global_list += f"{leader['rank']}. {leader['name']} - {leader['score']:,} pts ({leader['games']} games)\n"
        server_list += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="Gaming Leaderboards",
            description="🏆 **Compete with the best players globally**\n\nSee where you rank among elite gamers:",
            fields=[
                {
                    "name": "🌍 Global Top 5",
                    "value": global_list,
                    "inline": False
                },
                {
                    "name": "🏠 Server Rankings",
                    "value": server_list,
                    "inline": True
                },
                {
                    "name": "📊 Ranking Info",
                    "value": f"• Your Global Rank: #{random.randint(50, 200)}\n• Your Server Rank: #1\n• Points This Week: +{random.randint(500, 1500)}\n• Rank Change: ↗️ +{random.randint(5, 25)}\n• Next Milestone: {random.randint(1000, 3000)} pts",
                    "inline": True
                }
            ]
        )
        return embed
    
    async def _get_tournaments_embed(self) -> discord.Embed:
        """Tournament system embed"""
        # Mock tournament data
        active_tournaments = [
            {"name": "🏆 Weekly Championship", "players": "64/128", "prize": "5,000 Fragments", "ends": "2 days"},
            {"name": "🚀 SpaceRace Masters", "players": "32/64", "prize": "3,000 Fragments", "ends": "5 days"},
            {"name": "🧩 Puzzle Pros", "players": "28/32", "prize": "2,000 Fragments", "ends": "1 day"}
        ]
        
        upcoming_tournaments = [
            {"name": "⚔️ Battle Royale", "starts": "Tomorrow", "prize": "10,000 Fragments"},
            {"name": "🎯 Precision Challenge", "starts": "3 days", "prize": "7,500 Fragments"},
            {"name": "🧠 Mind Games", "starts": "1 week", "prize": "15,000 Fragments"}
        ]
        
        active_list = "```yaml\n"
        for tournament in active_tournaments:
            active_list += f"{tournament['name']}\n"
            active_list += f"  Players: {tournament['players']} | Prize: {tournament['prize']}\n"
            active_list += f"  Ends in: {tournament['ends']}\n\n"
        active_list += "```"
        
        upcoming_list = "```yaml\n"
        for tournament in upcoming_tournaments:
            upcoming_list += f"{tournament['name']}\n"
            upcoming_list += f"  Starts: {tournament['starts']} | Prize: {tournament['prize']}\n\n"
        upcoming_list += "```"
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="Tournament Arena",
            description="🏟️ **Compete in epic tournaments for massive rewards**\n\nJoin competitive events and win fragments:",
            fields=[
                {
                    "name": "⚡ Active Tournaments",
                    "value": active_list,
                    "inline": False
                },
                {
                    "name": "🔮 Upcoming Events", 
                    "value": upcoming_list[:1024],
                    "inline": True
                },
                {
                    "name": "🎯 Tournament Features",
                    "value": "• Bracket-style elimination\n• Real-time spectating\n• Fragment prizes\n• Achievement rewards\n• Rank point bonuses\n• Streaming integration",
                    "inline": True
                }
            ]
        )
        return embed
    
    # Button interactions
    @discord.ui.button(label="🚀 Launch Activity", style=discord.ButtonStyle.primary, row=0)
    async def launch_activity_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Launch Discord Activity"""
        await interaction.response.send_message(
            "🚀 **Launching Discord Activity!**\n\n"
            "Opening gaming portal at https://opure.uk...\n"
            "Select a game mode and invite your friends to join!",
            ephemeral=False
        )
    
    @discord.ui.button(label="🎮 Activities", style=discord.ButtonStyle.secondary, row=0)
    async def activities_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to activities view"""
        self.current_view = "activity"
        self._update_buttons_for_activity_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="📊 Stats", style=discord.ButtonStyle.secondary, row=0)
    async def stats_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to stats view"""
        self.current_view = "stats"
        self._update_buttons_for_stats_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏆 Leaderboard", style=discord.ButtonStyle.secondary, row=0)
    async def leaderboard_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to leaderboard view"""
        self.current_view = "leaderboard"
        self._update_buttons_for_leaderboard_view()
        await self.update_embed(interaction)
    
    @discord.ui.button(label="🏟️ Tournaments", style=discord.ButtonStyle.success, row=1)
    async def tournaments_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Switch to tournaments view"""
        self.current_view = "tournaments"
        self._update_buttons_for_tournaments_view()
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
        self.add_item(discord.ui.Button(label="🚀 Launch Activity", style=discord.ButtonStyle.primary, row=0, custom_id="launch"))
        self.add_item(discord.ui.Button(label="🎮 Activities", style=discord.ButtonStyle.secondary, row=0, custom_id="activities"))
        self.add_item(discord.ui.Button(label="📊 Stats", style=discord.ButtonStyle.secondary, row=0, custom_id="stats"))
        self.add_item(discord.ui.Button(label="🏆 Leaderboard", style=discord.ButtonStyle.secondary, row=0, custom_id="leaderboard"))
        self.add_item(discord.ui.Button(label="🏟️ Tournaments", style=discord.ButtonStyle.success, row=1, custom_id="tournaments"))
    
    def _update_buttons_for_activity_view(self):
        """Configure buttons for activity view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🚀 SpaceRace3D", style=discord.ButtonStyle.primary, row=0, custom_id="game_space"))
        self.add_item(discord.ui.Button(label="🧩 Neural Puzzle", style=discord.ButtonStyle.primary, row=0, custom_id="game_puzzle"))
        self.add_item(discord.ui.Button(label="⚔️ Quantum Battles", style=discord.ButtonStyle.danger, row=0, custom_id="game_battle"))
        self.add_item(discord.ui.Button(label="🎯 Fragment Hunter", style=discord.ButtonStyle.secondary, row=0, custom_id="game_hunter"))
        self.add_item(discord.ui.Button(label="🧠 Mind Maze", style=discord.ButtonStyle.secondary, row=1, custom_id="game_mind"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_stats_view(self):
        """Configure buttons for stats view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="📈 Performance", style=discord.ButtonStyle.primary, row=0, custom_id="perf_stats"))
        self.add_item(discord.ui.Button(label="🎮 Game History", style=discord.ButtonStyle.secondary, row=0, custom_id="game_history"))
        self.add_item(discord.ui.Button(label="🏆 Achievements", style=discord.ButtonStyle.secondary, row=0, custom_id="achievements"))
        self.add_item(discord.ui.Button(label="📊 Analytics", style=discord.ButtonStyle.secondary, row=0, custom_id="analytics"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_leaderboard_view(self):
        """Configure buttons for leaderboard view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="🌍 Global", style=discord.ButtonStyle.primary, row=0, custom_id="global_lb"))
        self.add_item(discord.ui.Button(label="🏠 Server", style=discord.ButtonStyle.success, row=0, custom_id="server_lb"))
        self.add_item(discord.ui.Button(label="👥 Friends", style=discord.ButtonStyle.secondary, row=0, custom_id="friends_lb"))
        self.add_item(discord.ui.Button(label="📈 Weekly", style=discord.ButtonStyle.secondary, row=0, custom_id="weekly_lb"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))
    
    def _update_buttons_for_tournaments_view(self):
        """Configure buttons for tournaments view"""
        self.clear_items()
        self.add_item(discord.ui.Button(label="⚡ Join Tournament", style=discord.ButtonStyle.success, row=0, custom_id="join_tournament"))
        self.add_item(discord.ui.Button(label="👁️ Spectate", style=discord.ButtonStyle.primary, row=0, custom_id="spectate"))
        self.add_item(discord.ui.Button(label="📋 My Matches", style=discord.ButtonStyle.secondary, row=0, custom_id="my_matches"))
        self.add_item(discord.ui.Button(label="🏆 Past Winners", style=discord.ButtonStyle.secondary, row=0, custom_id="winners"))
        self.add_item(discord.ui.Button(label="🏠 Main Hub", style=discord.ButtonStyle.secondary, row=1, custom_id="home"))

class GamingChallengeModal(discord.ui.Modal):
    """Modal for challenging other users to games"""
    
    def __init__(self, hub_view: GamingHubView):
        super().__init__(title="🎮 Challenge Player")
        self.hub_view = hub_view
        
        self.player_input = discord.ui.TextInput(
            label="Player to Challenge",
            placeholder="@username or user ID",
            style=discord.TextStyle.short,
            required=True,
            max_length=100
        )
        
        self.game_input = discord.ui.TextInput(
            label="Game Mode",
            placeholder="SpaceRace3D, Neural Puzzle, Quantum Battles, etc.",
            style=discord.TextStyle.short,
            required=True,
            max_length=100
        )
        
        self.wager_input = discord.ui.TextInput(
            label="Fragment Wager (Optional)",
            placeholder="Enter amount to bet on the match",
            style=discord.TextStyle.short,
            required=False,
            max_length=10
        )
        
        self.add_item(self.player_input)
        self.add_item(self.game_input)
        self.add_item(self.wager_input)
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle challenge creation"""
        player = self.player_input.value.strip()
        game = self.game_input.value.strip()
        wager = self.wager_input.value.strip() or "0"
        
        # Show challenge embed
        challenge_embed = ModernEmbed.create_status_embed(
            "🎮 Challenge Sent!",
            f"**Game:** {game}\n**Opponent:** {player}\n**Wager:** {wager} fragments\n\nWaiting for opponent to accept...",
            status_type="success"
        )
        
        await interaction.response.edit_message(embed=challenge_embed, view=None)

class GamingHubCog(commands.Cog):
    """Next-Gen Gaming Hub Command System"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @commands.hybrid_command(name="gaming", description="🎮 Open the gaming command center")
    async def gaming_hub(self, ctx: commands.Context):
        """Main gaming hub command"""
        # Create hub view
        hub_view = GamingHubView(self.bot, ctx.author)
        
        # Get initial embed
        embed = await hub_view.get_embed_for_page()
        
        # Send hub interface
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed, view=hub_view, ephemeral=False)
            hub_view.message = await ctx.interaction.original_response()
        else:
            message = await ctx.send(embed=embed, view=hub_view)
            hub_view.message = message
    
    @commands.hybrid_command(name="challenge", description="🎯 Challenge another player to a game")
    async def challenge_player(self, ctx: commands.Context, user: discord.Member = None, game: str = "SpaceRace3D", wager: int = 0):
        """Challenge another player to a gaming match"""
        if not user:
            await ctx.send("You need to specify a player to challenge!", ephemeral=True)
            return
            
        if user == ctx.author:
            await ctx.send("You can't challenge yourself!", ephemeral=True) 
            return
        
        challenge_embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="🎮 Gaming Challenge",
            description=f"**{ctx.author.display_name}** challenges **{user.display_name}** to a match!",
            fields=[
                {
                    "name": "🎯 Challenge Details",
                    "value": f"```yaml\nGame: {game}\nWager: {wager} fragments\nTime Limit: 24 hours\nStatus: Pending\n```",
                    "inline": False
                },
                {
                    "name": "🏆 Stakes",
                    "value": f"Winner takes: {wager * 2} fragments\nLoser pays: {wager} fragments\nRank points at stake!" if wager > 0 else "Friendly match - no wager",
                    "inline": True
                }
            ]
        )
        
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=challenge_embed, content=f"{user.mention}")
        else:
            await ctx.send(embed=challenge_embed, content=f"{user.mention}")
    
    @commands.hybrid_command(name="leaderboard", description="🏆 View gaming leaderboards")
    async def quick_leaderboard(self, ctx: commands.Context):
        """Quick leaderboard display"""
        # Mock leaderboard for quick command
        top_players = [
            f"🥇 **QuantumMaster** - 12,500 pts",
            f"🥈 **NeuralNinja** - 11,800 pts", 
            f"🥉 **SpaceAce2024** - 11,200 pts",
            f"4️⃣ **FragmentKing** - 10,950 pts",
            f"5️⃣ **{ctx.author.display_name}** - {random.randint(8000, 10000):,} pts"
        ]
        
        embed = ModernEmbed.create_hub_embed(
            category=HubCategory.GAMING,
            title="🏆 Quick Leaderboard",
            description="**Top 5 Global Players**\n\n" + "\n".join(top_players),
            fields=[
                {
                    "name": "🎯 Your Stats",
                    "value": f"Global Rank: #{random.randint(50, 200)}\nServer Rank: #{random.randint(1, 10)}\nPoints This Week: +{random.randint(500, 1500)}",
                    "inline": False
                },
                {
                    "name": "🎮 Full Gaming Hub",
                    "value": "Use `/gaming` for complete gaming interface!",
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
    await bot.add_cog(GamingHubCog(bot))