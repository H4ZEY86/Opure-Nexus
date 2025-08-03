# cogs/achievements_cog.py
# ENHANCED ACHIEVEMENTS & BOUNTY COG V3.0
# Comprehensive Discord bot integration for viral gamification system

import discord
from discord import app_commands
from discord.ext import commands, tasks
import datetime
import json
import asyncio
from typing import Optional, List, Dict, Any
import logging

class AchievementsPaginatorView(discord.ui.View):
    """Paginated view for displaying achievements"""
    
    def __init__(self, achievements: list, user: discord.User, current_page: int = 0):
        super().__init__(timeout=300)
        self.achievements = achievements
        self.user = user
        self.current_page = current_page
        self.achievements_per_page = 6
        self.max_pages = max(1, (len(achievements) + self.achievements_per_page - 1) // self.achievements_per_page)
        
        self.update_buttons()
    
    def update_buttons(self):
        self.previous_page.disabled = self.current_page == 0
        self.next_page.disabled = self.current_page >= self.max_pages - 1
        self.first_page.disabled = self.current_page == 0
        self.last_page.disabled = self.current_page >= self.max_pages - 1
    
    def create_achievement_embed(self) -> discord.Embed:
        start_idx = self.current_page * self.achievements_per_page
        end_idx = start_idx + self.achievements_per_page
        page_achievements = self.achievements[start_idx:end_idx]
        
        # Rarity colors
        rarity_colors = {
            "COMMON": 0x95a5a6, "RARE": 0x3498db, "EPIC": 0x9b59b6,
            "LEGENDARY": 0xf39c12, "MYTHIC": 0xe74c3c
        }
        
        embed = discord.Embed(
            title=f"🏆 {self.user.display_name}'s Achievement Collection",
            description=f"```ansi\n[2;36m> TOTAL ACHIEVEMENTS: {len(self.achievements)}\n[2;32m> PAGE: {self.current_page + 1}/{self.max_pages}\n[2;33m> DIGITAL LEGACY UNLOCKED[0m\n```",
            color=0xf39c12,
            timestamp=datetime.datetime.now()
        )
        
        if not page_achievements:
            embed.add_field(
                name="📭 No Achievements Yet",
                value="Start using Opure's features to unlock achievements!\n• Queue songs with `/play`\n• Complete missions with `/opure`\n• Use commands and explore features",
                inline=False
            )
        else:
            for achievement in page_achievements:
                rarity = achievement[5]  # rarity column
                color_code = {
                    "COMMON": "🥉", "RARE": "🥈", "EPIC": "🥇", 
                    "LEGENDARY": "🏆", "MYTHIC": "💎"
                }.get(rarity, "🏅")
                
                unlocked_date = datetime.datetime.fromisoformat(achievement[7]).strftime("%b %d, %Y")
                
                embed.add_field(
                    name=f"{color_code} {achievement[2]}",  # achievement_name
                    value=f"**{achievement[3]}**\n"  # description
                          f"```yaml\nCategory: {achievement[4]}\nRarity: {rarity}\nReward: {achievement[6]} fragments\nUnlocked: {unlocked_date}\n```",
                    inline=True
                )
        
        embed.set_footer(
            text=f"Opure Achievement System • {len(self.achievements)} total achievements",
            icon_url=self.user.display_avatar.url
        )
        
        return embed
    
    @discord.ui.button(label="⏪", style=discord.ButtonStyle.secondary)
    async def first_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.current_page = 0
        self.update_buttons()
        await interaction.response.edit_message(embed=self.create_achievement_embed(), view=self)
    
    @discord.ui.button(label="◀", style=discord.ButtonStyle.primary)
    async def previous_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_achievement_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="▶", style=discord.ButtonStyle.primary)
    async def next_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page < self.max_pages - 1:
            self.current_page += 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_achievement_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="⏩", style=discord.ButtonStyle.secondary)
    async def last_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.current_page = self.max_pages - 1
        self.update_buttons()
        await interaction.response.edit_message(embed=self.create_achievement_embed(), view=self)

class BountyPaginatorView(discord.ui.View):
    """Paginated view for displaying bounties"""
    
    def __init__(self, bounties: list, user: discord.User, current_page: int = 0):
        super().__init__(timeout=300)
        self.bounties = bounties
        self.user = user
        self.current_page = current_page
        self.bounties_per_page = 4
        self.max_pages = max(1, (len(bounties) + self.bounties_per_page - 1) // self.bounties_per_page)
        
        self.update_buttons()
    
    def update_buttons(self):
        self.previous_page.disabled = self.current_page == 0
        self.next_page.disabled = self.current_page >= self.max_pages - 1
        self.first_page.disabled = self.current_page == 0
        self.last_page.disabled = self.current_page >= self.max_pages - 1
    
    def create_bounty_embed(self) -> discord.Embed:
        start_idx = self.current_page * self.bounties_per_page
        end_idx = start_idx + self.bounties_per_page
        page_bounties = self.bounties[start_idx:end_idx]
        
        embed = discord.Embed(
            title=f"🎯 Active Bounties",
            description=f"```ansi\n[2;36m> TOTAL BOUNTIES: {len(self.bounties)}\n[2;32m> PAGE: {self.current_page + 1}/{self.max_pages}\n[2;33m> DIGITAL CHALLENGES AWAIT[0m\n```",
            color=0x3498db,
            timestamp=datetime.datetime.now()
        )
        
        if not page_bounties:
            embed.add_field(
                name="📭 No Bounties Available",
                value="Check back later for new challenges!\n• Daily bounties refresh automatically\n• Create your own with `/bounty create`\n• Join trending challenges",
                inline=False
            )
        else:
            for bounty in page_bounties:
                difficulty_stars = "⭐" * min(bounty.get('difficulty_level', 1), 5)
                status_emoji = {
                    'active': '🟢',
                    'ending_soon': '🟡', 
                    'full': '🔴'
                }.get(bounty.get('status', 'active'), '🟢')
                
                time_left = ""
                if bounty.get('ends_at'):
                    end_time = datetime.datetime.fromisoformat(bounty['ends_at'])
                    time_left = f"\n⏰ Ends: {end_time.strftime('%b %d, %H:%M')}"
                
                embed.add_field(
                    name=f"{status_emoji} {bounty['title']}",
                    value=f"**{bounty['description'][:100]}{'...' if len(bounty['description']) > 100 else ''}**\n"
                          f"```yaml\nReward: {bounty['token_pool']} tokens\nDifficulty: {difficulty_stars}\nParticipants: {bounty['current_participants']}/{bounty.get('max_participants', '∞')}\n```{time_left}",
                    inline=True
                )
        
        embed.set_footer(
            text=f"Opure Bounty System • Use /bounty join <id> to participate",
            icon_url=self.user.display_avatar.url
        )
        
        return embed
    
    @discord.ui.button(label="⏪", style=discord.ButtonStyle.secondary)
    async def first_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.current_page = 0
        self.update_buttons()
        await interaction.response.edit_message(embed=self.create_bounty_embed(), view=self)
    
    @discord.ui.button(label="◀", style=discord.ButtonStyle.primary)
    async def previous_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_bounty_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="▶", style=discord.ButtonStyle.primary)
    async def next_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page < self.max_pages - 1:
            self.current_page += 1
            self.update_buttons()
            await interaction.response.edit_message(embed=self.create_bounty_embed(), view=self)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="⏩", style=discord.ButtonStyle.secondary)
    async def last_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.current_page = self.max_pages - 1
        self.update_buttons()
        await interaction.response.edit_message(embed=self.create_bounty_embed(), view=self)


class AchievementsCog(commands.Cog):
    """Enhanced Achievement & Bounty system for viral gamification"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.logger = logging.getLogger(__name__)
        
        # Start background tasks
        self.daily_bounty_generation.start()
        self.trending_update.start()
    
    @app_commands.command(name="achievements", description="🏆 View your unlocked achievements and progress")
    @app_commands.describe(user="View someone else's achievements")
    async def achievements(self, interaction: discord.Interaction, user: Optional[discord.User] = None):
        """Display user achievements in a beautiful paginated interface"""
        await interaction.response.defer()
        
        target_user = user or interaction.user
        
        try:
            # Get user's achievements
            cursor = await self.bot.db.execute("""
                SELECT * FROM achievements 
                WHERE user_id = ? 
                ORDER BY unlocked_at DESC
            """, (target_user.id,))
            achievements = await cursor.fetchall()
            
            # Get user stats
            cursor = await self.bot.db.execute("""
                SELECT * FROM user_stats WHERE user_id = ?
            """, (target_user.id,))
            stats = await cursor.fetchone()
            
            # Create paginated view
            view = AchievementsPaginatorView(achievements, target_user)
            embed = view.create_achievement_embed()
            
            # Add stats overview
            if stats:
                embed.add_field(
                    name="📊 Activity Summary",
                    value=f"```yaml\nMusic Time: {stats[1]}min\nSongs Queued: {stats[2]}\nGames Completed: {stats[3]}\nCommands Used: {stats[4]}\nAchievements: {stats[7]}\n```",
                    inline=False
                )
            
            await interaction.followup.send(embed=embed, view=view)
            
        except Exception as e:
            self.bot.add_error(f"Achievements command error: {e}")
            await interaction.followup.send("❌ Failed to load achievements. Please try again.", ephemeral=True)
    
    
    @app_commands.command(name="quests", description="🎯 View your daily quests and progress")
    async def daily_quests(self, interaction: discord.Interaction):
        """Display user's daily quests"""
        await interaction.response.defer()
        
        try:
            today = datetime.datetime.now().strftime('%Y-%m-%d')
            
            # Get today's quests
            cursor = await self.bot.db.execute("""
                SELECT * FROM daily_quests 
                WHERE user_id = ? AND created_date = ?
                ORDER BY is_completed ASC, quest_type
            """, (interaction.user.id, today))
            quests = await cursor.fetchall()
            
            embed = discord.Embed(
                title="🎯 Daily Quest Log",
                description="```ansi\n[2;36m> OPURE DIGITAL OBJECTIVES\n[2;33m> DAILY PROGRESS TRACKING\n[2;32m> FRAGMENT REWARDS AVAILABLE[0m\n```",
                color=0x3498db,
                timestamp=datetime.datetime.now()
            )
            
            if not quests:
                # Generate quests if none exist
                await self.bot.generate_daily_quests_for_user(interaction.user.id)
                
                # Re-fetch after generation
                cursor = await self.bot.db.execute("""
                    SELECT * FROM daily_quests 
                    WHERE user_id = ? AND created_date = ?
                    ORDER BY is_completed ASC, quest_type
                """, (interaction.user.id, today))
                quests = await cursor.fetchall()
            
            if not quests:
                embed.add_field(
                    name="⚙️ Quest Generation",
                    value="Opure is generating personalized quests for you...\nTry again in a moment!",
                    inline=False
                )
            else:
                total_reward = 0
                completed_count = 0
                
                for quest in quests:
                    quest_id, _, quest_type, quest_name, description, target, progress, reward, _, completed_at, is_completed = quest
                    
                    # Status indicators
                    if is_completed:
                        status_emoji = "✅"
                        progress_bar = "████████████"
                        completed_count += 1
                    else:
                        status_emoji = "🔄"
                        completion_percent = min(progress / target, 1.0)
                        filled_blocks = int(completion_percent * 12)
                        progress_bar = "█" * filled_blocks + "░" * (12 - filled_blocks)
                    
                    total_reward += reward if not is_completed else 0
                    
                    embed.add_field(
                        name=f"{status_emoji} {quest_name}",
                        value=f"**{description}**\n"
                              f"```yaml\nProgress: {progress}/{target}\nReward: {reward} fragments\nType: {quest_type}\n```"
                              f"`{progress_bar}` {int((progress/target)*100) if target > 0 else 0}%",
                        inline=True
                    )
                
                # Summary
                embed.add_field(
                    name="📊 Daily Summary",
                    value=f"```yaml\nCompleted: {completed_count}/{len(quests)}\nPending Rewards: {total_reward} fragments\nRefresh: Tomorrow\n```",
                    inline=False
                )
            
            embed.set_footer(
                text=f"Opure Quest System • {interaction.user.display_name}",
                icon_url=interaction.user.display_avatar.url
            )
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Daily quests command error: {e}")
            await interaction.followup.send("❌ Failed to load daily quests. Please try again.", ephemeral=True)
    
    # ============================================================================
    # BOUNTY SYSTEM COMMANDS
    # ============================================================================
    
    bounty_group = app_commands.Group(name="bounty", description="🎯 Dynamic bounty system commands")
    
    @bounty_group.command(name="list", description="🎯 View available bounties")
    @app_commands.describe(
        category="Filter by bounty category",
        difficulty="Filter by difficulty level (1-10)",
        status="Filter by bounty status"
    )
    async def bounty_list(
        self, 
        interaction: discord.Interaction, 
        category: Optional[str] = None,
        difficulty: Optional[int] = None,
        status: Optional[str] = None
    ):
        """Display available bounties with filtering options"""
        await interaction.response.defer()
        
        try:
            # Build filter conditions
            conditions = ["status = 'active'"]
            params = []
            
            if category:
                conditions.append("category_id = ?")
                params.append(category)
            
            if difficulty:
                conditions.append("difficulty_level = ?")
                params.append(difficulty)
            
            if status and status != 'active':
                conditions[-1] = "status = ?"  # Replace active filter
                params[-1] = status
            
            where_clause = " AND ".join(conditions)
            
            # Get bounties
            cursor = await self.bot.db.execute(f"""
                SELECT b.*, bc.name as category_name
                FROM bounties b
                LEFT JOIN bounty_categories bc ON b.category_id = bc.category_id
                WHERE {where_clause}
                ORDER BY b.is_featured DESC, b.is_trending DESC, b.created_at DESC
                LIMIT 20
            """, params)
            bounties = await cursor.fetchall()
            
            # Convert to dict format for easier handling
            bounties_list = [dict(bounty) for bounty in bounties]
            
            # Create paginated view
            view = BountyPaginatorView(bounties_list, interaction.user)
            embed = view.create_bounty_embed()
            
            await interaction.followup.send(embed=embed, view=view)
            
        except Exception as e:
            self.bot.add_error(f"Bounty list command error: {e}")
            await interaction.followup.send("❌ Failed to load bounties. Please try again.", ephemeral=True)
    
    @bounty_group.command(name="join", description="🎯 Join an active bounty")
    @app_commands.describe(bounty_id="The ID of the bounty to join")
    async def bounty_join(self, interaction: discord.Interaction, bounty_id: str):
        """Join an active bounty challenge"""
        await interaction.response.defer()
        
        try:
            # Check if bounty exists and is active
            cursor = await self.bot.db.execute("""
                SELECT * FROM bounties WHERE bounty_id = ? AND status = 'active'
            """, (bounty_id,))
            bounty = await cursor.fetchone()
            
            if not bounty:
                await interaction.followup.send("❌ Bounty not found or not active.", ephemeral=True)
                return
            
            # Check if user already participating
            cursor = await self.bot.db.execute("""
                SELECT * FROM user_bounty_participation 
                WHERE user_id = ? AND bounty_id = ?
            """, (interaction.user.id, bounty_id))
            existing = await cursor.fetchone()
            
            if existing:
                await interaction.followup.send("❌ You're already participating in this bounty!", ephemeral=True)
                return
            
            # Check participant limits
            if bounty['max_participants'] and bounty['current_participants'] >= bounty['max_participants']:
                await interaction.followup.send("❌ This bounty is full!", ephemeral=True)
                return
            
            # Check requirements (simplified)
            requirements = json.loads(bounty['requirements']) if bounty['requirements'] else []
            for req in requirements:
                if req['req_type'] == 'min_level':
                    # Would check user level here
                    pass
                elif req['req_type'] == 'min_tokens':
                    # Would check user token balance here
                    pass
            
            # Create participation record
            participation_id = f"part_{bounty_id}_{interaction.user.id}_{int(datetime.datetime.now().timestamp())}"
            
            await self.bot.db.execute("""
                INSERT INTO user_bounty_participation (
                    participation_id, user_id, bounty_id, joined_at, status, 
                    progress_data, completion_percentage
                ) VALUES (?, ?, ?, ?, 'active', '{}', 0.0)
            """, (participation_id, interaction.user.id, bounty_id, datetime.datetime.now()))
            
            # Update bounty participant count
            await self.bot.db.execute("""
                UPDATE bounties SET current_participants = current_participants + 1
                WHERE bounty_id = ?
            """, (bounty_id,))
            
            await self.bot.db.commit()
            
            # Create success embed
            embed = discord.Embed(
                title="🎯 Bounty Joined Successfully!",
                description=f"```ansi\n[2;32m> CHALLENGE ACCEPTED\n[2;36m> BOUNTY: {bounty['title']}\n[2;33m> REWARD: {bounty['token_pool']} tokens[0m\n```",
                color=0x00ff00,
                timestamp=datetime.datetime.now()
            )
            
            embed.add_field(
                name="📋 Bounty Details",
                value=f"**{bounty['description']}**\n"
                      f"```yaml\nDifficulty: {'⭐' * bounty['difficulty_level']}\nTime Limit: {bounty.get('duration_hours', 'No limit')} hours\nParticipants: {bounty['current_participants'] + 1}/{bounty.get('max_participants', '∞')}\n```",
                inline=False
            )
            
            embed.add_field(
                name="🚀 Next Steps",
                value="• Check objectives with `/bounty progress`\n• Submit when complete with `/bounty submit`\n• Get help with `/bounty help`",
                inline=False
            )
            
            embed.set_footer(text="Good luck with your challenge!", icon_url=interaction.user.display_avatar.url)
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Bounty join command error: {e}")
            await interaction.followup.send("❌ Failed to join bounty. Please try again.", ephemeral=True)
    
    @bounty_group.command(name="progress", description="📊 View your bounty progress")
    @app_commands.describe(bounty_id="Optional: Check progress on specific bounty")
    async def bounty_progress(self, interaction: discord.Interaction, bounty_id: Optional[str] = None):
        """View progress on active bounties"""
        await interaction.response.defer()
        
        try:
            if bounty_id:
                # Show progress for specific bounty
                cursor = await self.bot.db.execute("""
                    SELECT p.*, b.title, b.description, b.token_pool, b.objectives
                    FROM user_bounty_participation p
                    JOIN bounties b ON p.bounty_id = b.bounty_id
                    WHERE p.user_id = ? AND p.bounty_id = ?
                """, (interaction.user.id, bounty_id))
                participation = await cursor.fetchone()
                
                if not participation:
                    await interaction.followup.send("❌ You're not participating in this bounty.", ephemeral=True)
                    return
                
                # Create detailed progress embed
                embed = discord.Embed(
                    title=f"📊 Bounty Progress: {participation['title']}",
                    description=f"```ansi\n[2;36m> COMPLETION: {participation['completion_percentage']:.1f}%\n[2;32m> STATUS: {participation['status'].upper()}\n[2;33m> POTENTIAL REWARD: {participation['token_pool']} tokens[0m\n```",
                    color=0x3498db,
                    timestamp=datetime.datetime.now()
                )
                
                # Parse and display objectives
                objectives = json.loads(participation['objectives']) if participation['objectives'] else []
                progress_data = json.loads(participation['progress_data']) if participation['progress_data'] else {}
                
                for i, objective in enumerate(objectives[:5], 1):  # Show up to 5 objectives
                    current_value = progress_data.get(objective['objective_id'], 0)
                    target_value = objective['target_value']
                    progress_percent = min(current_value / target_value * 100, 100) if target_value > 0 else 0
                    
                    status_emoji = "✅" if progress_percent >= 100 else "🔄"
                    progress_bar = "█" * int(progress_percent / 10) + "░" * (10 - int(progress_percent / 10))
                    
                    embed.add_field(
                        name=f"{status_emoji} {objective['title']}",
                        value=f"**{objective['description']}**\n"
                              f"`{progress_bar}` {progress_percent:.1f}%\n"
                              f"Progress: {current_value}/{target_value}",
                        inline=True
                    )
            
            else:
                # Show all active bounties
                cursor = await self.bot.db.execute("""
                    SELECT p.*, b.title, b.token_pool
                    FROM user_bounty_participation p
                    JOIN bounties b ON p.bounty_id = b.bounty_id
                    WHERE p.user_id = ? AND p.status IN ('active', 'submitted')
                    ORDER BY p.joined_at DESC
                """, (interaction.user.id,))
                participations = await cursor.fetchall()
                
                if not participations:
                    embed = discord.Embed(
                        title="📊 Your Bounty Progress",
                        description="```ansi\n[2;33m> NO ACTIVE BOUNTIES\n[2;36m> JOIN CHALLENGES TO START EARNING\n[2;32m> USE /bounty list TO BROWSE[0m\n```",
                        color=0x95a5a6
                    )
                else:
                    embed = discord.Embed(
                        title="📊 Your Active Bounties",
                        description=f"```ansi\n[2;36m> ACTIVE BOUNTIES: {len(participations)}\n[2;32m> TOTAL POTENTIAL: {sum(p['token_pool'] for p in participations)} tokens\n[2;33m> KEEP PUSHING FORWARD![0m\n```",
                        color=0x3498db,
                        timestamp=datetime.datetime.now()
                    )
                    
                    for participation in participations[:8]:  # Show up to 8 bounties
                        status_emoji = {
                            'active': '🔄',
                            'submitted': '⏳',
                            'completed': '✅'
                        }.get(participation['status'], '❓')
                        
                        embed.add_field(
                            name=f"{status_emoji} {participation['title']}",
                            value=f"Progress: {participation['completion_percentage']:.1f}%\n"
                                  f"Reward: {participation['token_pool']} tokens\n"
                                  f"Status: {participation['status'].title()}",
                            inline=True
                        )
            
            embed.set_footer(
                text="Use /bounty progress <id> for detailed objective tracking",
                icon_url=interaction.user.display_avatar.url
            )
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Bounty progress command error: {e}")
            await interaction.followup.send("❌ Failed to load bounty progress. Please try again.", ephemeral=True)
    
    @bounty_group.command(name="submit", description="📝 Submit bounty completion")
    @app_commands.describe(
        bounty_id="The bounty ID to submit",
        evidence="Description of completion evidence"
    )
    async def bounty_submit(self, interaction: discord.Interaction, bounty_id: str, evidence: str):
        """Submit bounty completion for validation"""
        await interaction.response.defer()
        
        try:
            # Check participation
            cursor = await self.bot.db.execute("""
                SELECT p.*, b.title, b.validation_method
                FROM user_bounty_participation p
                JOIN bounties b ON p.bounty_id = b.bounty_id
                WHERE p.user_id = ? AND p.bounty_id = ? AND p.status = 'active'
            """, (interaction.user.id, bounty_id))
            participation = await cursor.fetchone()
            
            if not participation:
                await interaction.followup.send("❌ No active participation found for this bounty.", ephemeral=True)
                return
            
            # Update submission
            submission_data = {
                'evidence': evidence,
                'submitted_at': datetime.datetime.now().isoformat(),
                'quality_score': 0.8  # Placeholder
            }
            
            await self.bot.db.execute("""
                UPDATE user_bounty_participation 
                SET status = 'submitted', submitted_at = ?, submission_data = ?
                WHERE participation_id = ?
            """, (datetime.datetime.now(), json.dumps(submission_data), participation['participation_id']))
            
            await self.bot.db.commit()
            
            # Create submission confirmation
            embed = discord.Embed(
                title="📝 Bounty Submission Received!",
                description=f"```ansi\n[2;32m> SUBMISSION CONFIRMED\n[2;36m> BOUNTY: {participation['title']}\n[2;33m> AWAITING VALIDATION[0m\n```",
                color=0xf39c12,
                timestamp=datetime.datetime.now()
            )
            
            embed.add_field(
                name="📋 Submission Details",
                value=f"**Evidence:** {evidence[:200]}{'...' if len(evidence) > 200 else ''}\n"
                      f"**Validation Method:** {participation['validation_method'].title()}\n"
                      f"**Estimated Processing:** 1-24 hours",
                inline=False
            )
            
            embed.add_field(
                name="⏭️ What's Next?",
                value="• Your submission will be reviewed\n• You'll be notified of the result\n• Check status with `/bounty progress`",
                inline=False
            )
            
            embed.set_footer(text="Thank you for your submission!", icon_url=interaction.user.display_avatar.url)
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Bounty submit command error: {e}")
            await interaction.followup.send("❌ Failed to submit bounty. Please try again.", ephemeral=True)
    
    @bounty_group.command(name="leaderboard", description="🏆 View bounty leaderboards")
    @app_commands.describe(
        bounty_id="Show leaderboard for specific bounty",
        timeframe="Global leaderboard timeframe"
    )
    async def bounty_leaderboard(
        self, 
        interaction: discord.Interaction, 
        bounty_id: Optional[str] = None,
        timeframe: Optional[str] = None
    ):
        """Display bounty leaderboards"""
        await interaction.response.defer()
        
        try:
            if bounty_id:
                # Specific bounty leaderboard
                cursor = await self.bot.db.execute("""
                    SELECT p.*, u.discord_username
                    FROM user_bounty_participation p
                    JOIN users u ON p.user_id = u.user_id
                    WHERE p.bounty_id = ?
                    ORDER BY p.completion_percentage DESC, p.quality_rating DESC, p.joined_at ASC
                    LIMIT 10
                """, (bounty_id,))
                entries = await cursor.fetchall()
                
                # Get bounty title
                cursor = await self.bot.db.execute("SELECT title FROM bounties WHERE bounty_id = ?", (bounty_id,))
                bounty_title = (await cursor.fetchone())['title'] if await cursor.fetchone() else "Unknown Bounty"
                
                embed = discord.Embed(
                    title=f"🏆 Bounty Leaderboard: {bounty_title}",
                    color=0xf39c12,
                    timestamp=datetime.datetime.now()
                )
                
            else:
                # Global bounty leaderboard
                timeframe_filter = ""
                if timeframe == "weekly":
                    timeframe_filter = "AND p.joined_at >= datetime('now', '-7 days')"
                elif timeframe == "monthly":
                    timeframe_filter = "AND p.joined_at >= datetime('now', '-30 days')"
                
                cursor = await self.bot.db.execute(f"""
                    SELECT u.discord_username, 
                           COUNT(p.participation_id) as total_bounties,
                           COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed,
                           SUM(p.tokens_earned) as total_tokens,
                           AVG(p.quality_rating) as avg_quality
                    FROM user_bounty_participation p
                    JOIN users u ON p.user_id = u.user_id
                    WHERE 1=1 {timeframe_filter}
                    GROUP BY p.user_id
                    ORDER BY completed DESC, total_tokens DESC
                    LIMIT 10
                """)
                entries = await cursor.fetchall()
                
                embed = discord.Embed(
                    title=f"🏆 Global Bounty Leaderboard",
                    description=f"Top performers {timeframe or 'all time'}",
                    color=0xf39c12,
                    timestamp=datetime.datetime.now()
                )
            
            if not entries:
                embed.add_field(
                    name="📭 No Data Available",
                    value="No bounty activity found for the selected criteria.",
                    inline=False
                )
            else:
                # Add leaderboard entries
                medal_emojis = ["🥇", "🥈", "🥉"] + ["🏅"] * 7
                
                for i, entry in enumerate(entries, 1):
                    if bounty_id:
                        # Specific bounty format
                        value = f"Progress: {entry['completion_percentage']:.1f}%\n"
                        value += f"Quality: {entry['quality_rating']:.2f}\n"
                        value += f"Status: {entry['status'].title()}"
                    else:
                        # Global format
                        value = f"Completed: {entry['completed']}/{entry['total_bounties']}\n"
                        value += f"Tokens: {entry['total_tokens']:,}\n"
                        value += f"Quality: {entry['avg_quality']:.2f}"
                    
                    embed.add_field(
                        name=f"{medal_emojis[i-1]} #{i} {entry['discord_username']}",
                        value=value,
                        inline=True
                    )
            
            embed.set_footer(text="Rankings update in real-time")
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            self.bot.add_error(f"Bounty leaderboard command error: {e}")
            await interaction.followup.send("❌ Failed to load leaderboard. Please try again.", ephemeral=True)
    
    # ============================================================================
    # BACKGROUND TASKS
    # ============================================================================
    
    @tasks.loop(hours=24)
    async def daily_bounty_generation(self):
        """Generate daily bounties automatically"""
        try:
            # This would integrate with the AI bounty generation system
            self.logger.info("🤖 Generating daily bounties...")
            
            # Placeholder for AI-generated bounties
            daily_bounties = [
                {
                    'title': 'Digital Dedication',
                    'description': 'Complete 5 activities in the Opure ecosystem',
                    'category_id': 'daily',
                    'difficulty_level': 2,
                    'token_pool': 100,
                    'objectives': [
                        {
                            'objective_id': 'daily_activities',
                            'title': 'Complete Activities',
                            'description': 'Complete any 5 activities',
                            'type': 'activity_completion',
                            'target_value': 5,
                            'weight': 1.0,
                            'is_optional': False
                        }
                    ]
                }
            ]
            
            for bounty_data in daily_bounties:
                # Create bounty in database
                bounty_id = f"daily_{datetime.date.today().isoformat()}_{len(daily_bounties)}"
                
                await self.bot.db.execute("""
                    INSERT INTO bounties (
                        bounty_id, title, description, category_id, creator_type,
                        bounty_type, difficulty_level, token_pool, objectives,
                        starts_at, ends_at, status, ai_generated
                    ) VALUES (?, ?, ?, ?, 'system', 'daily', ?, ?, ?, ?, ?, 'active', true)
                """, (
                    bounty_id, bounty_data['title'], bounty_data['description'],
                    bounty_data['category_id'], bounty_data['difficulty_level'],
                    bounty_data['token_pool'], json.dumps(bounty_data['objectives']),
                    datetime.datetime.now(),
                    datetime.datetime.now() + datetime.timedelta(hours=24)
                ))
            
            await self.bot.db.commit()
            self.logger.info(f"✅ Generated {len(daily_bounties)} daily bounties")
            
        except Exception as e:
            self.logger.error(f"Failed to generate daily bounties: {e}")
    
    @tasks.loop(minutes=30)
    async def trending_update(self):
        """Update trending bounties"""
        try:
            # Calculate trending scores based on activity
            cursor = await self.bot.db.execute("""
                UPDATE bounties SET is_trending = false
            """)
            
            cursor = await self.bot.db.execute("""
                SELECT bounty_id, 
                       (current_participants * 2 + view_count + like_count + share_count) as trend_score
                FROM bounties 
                WHERE status = 'active' AND created_at >= datetime('now', '-7 days')
                ORDER BY trend_score DESC
                LIMIT 5
            """)
            trending_bounties = await cursor.fetchall()
            
            # Mark top bounties as trending
            for bounty in trending_bounties:
                await self.bot.db.execute("""
                    UPDATE bounties SET is_trending = true WHERE bounty_id = ?
                """, (bounty['bounty_id'],))
            
            await self.bot.db.commit()
            
        except Exception as e:
            self.logger.error(f"Failed to update trending bounties: {e}")
    
    @daily_bounty_generation.before_loop
    async def before_daily_generation(self):
        await self.bot.wait_until_ready()
    
    @trending_update.before_loop  
    async def before_trending_update(self):
        await self.bot.wait_until_ready()
    
    def cog_unload(self):
        """Clean up tasks when cog is unloaded"""
        self.daily_bounty_generation.cancel()
        self.trending_update.cancel()

async def setup(bot: commands.Bot):
    """Setup function for the achievements cog"""
    import os
    GUILD_ID_STR = os.getenv("GUILD_ID", "")
    GUILD_IDS = [int(gid.strip()) for gid in GUILD_ID_STR.split(',') if gid.strip()]
    
    if GUILD_IDS:
        await bot.add_cog(AchievementsCog(bot), guilds=[discord.Object(id=gid) for gid in GUILD_IDS])
        bot.add_log(f"✓ AchievementsCog loaded for Guild IDs: {GUILD_IDS}")
    else:
        await bot.add_cog(AchievementsCog(bot))
        bot.add_log("✓ AchievementsCog loaded globally (no guild IDs found)")