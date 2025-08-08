# 🤖 Discord Bot Leaderboard Integration

Your bot can use your Supabase anon key to fetch and post leaderboards!

## 🔧 Bot Setup Code

Add this to your Discord bot (Python):

```python
import discord
from discord.ext import commands
import aiohttp
import json
from datetime import datetime

# Your Supabase credentials
SUPABASE_URL = "https://knxpejxnpaiqhritlzds.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtueHBlanhucGFpcWhyaXRsemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzYzNjQsImV4cCI6MjA3MDI1MjM2NH0.HsF34_sVcm-kmUzHu_QjbKzugxDZw-oKTnH6K3P0los"

class GameLeaderboard:
    @staticmethod
    async def get_top_scores(game_id=None, limit=10):
        """Fetch top scores from Supabase"""
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Build query
        url = f"{SUPABASE_URL}/rest/v1/leaderboard"
        params = {
            'select': '*',
            'order': 'score.desc',
            'limit': limit
        }
        
        if game_id:
            params['game_id'] = f'eq.{game_id}'
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                return []

# Bot Commands
class GamingCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.slash_command(name="leaderboard", description="Show gaming leaderboard")
    async def leaderboard(self, ctx, game: str = None):
        """Display top 10 scores"""
        
        # Game ID mapping
        game_ids = {
            'space': 'space_race',
            'cube': 'cube_dash', 
            'ball': 'ball_bouncer',
            'color': 'color_matcher'
        }
        
        game_id = game_ids.get(game.lower()) if game else None
        scores = await GameLeaderboard.get_top_scores(game_id, 10)
        
        if not scores:
            await ctx.respond("❌ No scores found!")
            return
        
        # Create embed
        embed = discord.Embed(
            title="🏆 Gaming Leaderboard" + (f" - {game.title()}" if game else ""),
            color=0x00ff88,
            timestamp=datetime.now()
        )
        
        leaderboard_text = ""
        for i, score in enumerate(scores[:10], 1):
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"#{i}"
            leaderboard_text += f"{medal} **{score['username']}** - {score['score']:,} pts\n"
            leaderboard_text += f"    _{score['game_name']}_\n\n"
        
        embed.description = leaderboard_text or "No scores yet!"
        embed.set_footer(text="🎮 Opure Gaming Hub", icon_url=self.bot.user.avatar.url)
        
        await ctx.respond(embed=embed)

    @commands.slash_command(name="top3", description="Auto-post top 3 to gaming channel")
    @commands.has_permissions(manage_messages=True)
    async def post_top3(self, ctx):
        """Post top 3 scores to gaming channel"""
        
        scores = await GameLeaderboard.get_top_scores(limit=3)
        
        if not scores:
            await ctx.respond("❌ No scores to post!", ephemeral=True)
            return
        
        embed = discord.Embed(
            title="🎮 TOP 3 GAMERS THIS WEEK! 🏆",
            color=0xff6b6b,
            timestamp=datetime.now()
        )
        
        medals = ["🥇", "🥈", "🥉"]
        for i, score in enumerate(scores):
            embed.add_field(
                name=f"{medals[i]} {score['username']}",
                value=f"**{score['score']:,} points**\n{score['game_name']}",
                inline=True
            )
        
        embed.set_footer(text="Play at https://www.opure.uk")
        
        # Post to current channel
        await ctx.send(embed=embed)
        await ctx.respond("✅ Leaderboard posted!", ephemeral=True)

# Add to your bot
def setup(bot):
    bot.add_cog(GamingCog(bot))
```

## 🎯 Bot Commands

Your bot will have these commands:

### `/leaderboard` 
Shows top 10 overall scores

### `/leaderboard space`
Shows top 10 Space Race scores  

### `/leaderboard cube`
Shows top 10 Cube Dash scores

### `/top3`
Posts top 3 players to current channel with fancy embed

## 🔄 Auto-Updates (Advanced)

For automatic posts when new high scores happen:

```python
# Webhook endpoint in your bot
@bot.route('/webhook/leaderboard-update', methods=['POST'])
async def leaderboard_webhook():
    """Called when Activity saves new score"""
    data = await request.get_json()
    game_id = data.get('game_id')
    
    # Get top 3 for this game
    scores = await GameLeaderboard.get_top_scores(game_id, 3)
    
    # Post to gaming channel
    channel = bot.get_channel(YOUR_GAMING_CHANNEL_ID)
    if channel and scores:
        embed = discord.Embed(title=f"🆕 New High Score in {scores[0]['game_name']}!")
        # ... create embed and send
        await channel.send(embed=embed)
    
    return {"status": "ok"}
```

## ✅ Setup Steps:

1. **Add the code above to your bot**
2. **Test with `/leaderboard`** 
3. **Set gaming channel ID for auto-posts**
4. **Your Activity will save scores to your Supabase**
5. **Bot reads from same database and posts updates**

Your bot can now read all the gaming data and post leaderboards! 🎮