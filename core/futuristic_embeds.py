# core/futuristic_embeds.py - Revolutionary Holographic Embed System

import discord
import random
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import json

class EmbedTheme(Enum):
    CYBERPUNK = "cyberpunk"
    HOLOGRAPHIC = "holographic"  
    NEON = "neon"
    MATRIX = "matrix"
    GLITCH = "glitch"
    AURORA = "aurora"
    QUANTUM = "quantum"
    NEURAL = "neural"

class EmbedStyle(Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    MUSIC = "music"
    GAMING = "gaming"
    AI = "ai"
    ECONOMY = "economy"
    SOCIAL = "social"

@dataclass
class FuturisticColor:
    """Cyberpunk color schemes"""
    primary: int
    secondary: int
    accent: int
    text: str
    glow: str

class FuturisticEmbedFramework:
    """Revolutionary holographic embed system with cyberpunk aesthetics"""
    
    # Cyberpunk color palettes
    COLOR_SCHEMES = {
        EmbedTheme.CYBERPUNK: FuturisticColor(
            primary=0xFF0080,  # Hot Pink
            secondary=0x00FFFF,  # Cyan
            accent=0xFFFF00,  # Electric Yellow
            text="```ansi\n[2;35m",  # Purple text
            glow="[2;36m"  # Cyan glow
        ),
        EmbedTheme.HOLOGRAPHIC: FuturisticColor(
            primary=0x9D4EDD,  # Purple
            secondary=0x00D4FF,  # Sky Blue
            accent=0xFF6B9D,  # Pink
            text="```ansi\n[2;34m",  # Blue text
            glow="[2;95m"  # Bright magenta
        ),
        EmbedTheme.NEON: FuturisticColor(
            primary=0x39FF14,  # Neon Green
            secondary=0xFF073A,  # Neon Red
            accent=0x1F51FF,  # Neon Blue
            text="```ansi\n[2;32m",  # Green text
            glow="[1;92m"  # Bright green
        ),
        EmbedTheme.MATRIX: FuturisticColor(
            primary=0x00FF41,  # Matrix Green
            secondary=0x008F11,  # Dark Green
            accent=0x65FF8F,  # Light Green
            text="```ansi\n[2;32m",  # Green text
            glow="[1;32m"  # Bright green
        ),
        EmbedTheme.GLITCH: FuturisticColor(
            primary=0xFF073A,  # Glitch Red
            secondary=0x00FFFF,  # Cyan
            accent=0xFFFFFF,  # White
            text="```ansi\n[2;31m",  # Red text
            glow="[5;31m"  # Blinking red
        ),
        EmbedTheme.QUANTUM: FuturisticColor(
            primary=0x8A2BE2,  # Blue Violet
            secondary=0x4B0082,  # Indigo
            accent=0xDA70D6,  # Orchid
            text="```ansi\n[2;35m",  # Purple text
            glow="[1;95m"  # Bright magenta
        )
    }
    
    # Animation frames for different effects
    ANIMATION_FRAMES = {
        "loading": ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
        "pulse": ["◯", "◉", "●", "◉"],
        "wave": ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"],
        "matrix": ["╔", "╗", "╚", "╝", "║", "═"],
        "glitch": ["█", "▓", "▒", "░", " ", "░", "▒", "▓"],
        "neural": ["🧠", "⚡", "🔬", "💫", "🌐", "🔮", "💎", "⚙️"]
    }
    
    # ASCII art borders and decorations
    ASCII_BORDERS = {
        "cyberpunk": {
            "top": "═══════════════════════════════════════",
            "bottom": "═══════════════════════════════════════",
            "corner": "╬",
            "side": "║"
        },
        "matrix": {
            "top": "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀",
            "bottom": "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
            "corner": "█",
            "side": "█"
        },
        "holographic": {
            "top": "◦•●◉✧◉●•◦◦•●◉✧◉●•◦◦•●◉✧◉●•◦",
            "bottom": "◦•●◉✧◉●•◦◦•●◉✧◉●•◦◦•●◉✧◉●•◦",
            "corner": "✧",
            "side": "│"
        }
    }
    
    def __init__(self, bot=None):
        self.bot = bot
        self.animation_cache = {}
        self.theme_usage_stats = {}
        
    def create_revolutionary_embed(
        self,
        title: str,
        description: str = None,
        theme: EmbedTheme = EmbedTheme.CYBERPUNK,
        style: EmbedStyle = EmbedStyle.INFO,
        animated: bool = True,
        glitch_effect: bool = False,
        author_name: str = None,
        footer_text: str = None,
        thumbnail_url: str = None,
        image_url: str = None,
        fields: List[Dict[str, Any]] = None,
        timestamp: bool = True
    ) -> discord.Embed:
        """Create a revolutionary futuristic embed with cyberpunk aesthetics"""
        
        # Get color scheme
        colors = self.COLOR_SCHEMES.get(theme, self.COLOR_SCHEMES[EmbedTheme.CYBERPUNK])
        
        # Determine primary color based on style
        if style == EmbedStyle.SUCCESS:
            primary_color = 0x00FF41  # Matrix green
        elif style == EmbedStyle.ERROR:
            primary_color = 0xFF073A  # Glitch red
        elif style == EmbedStyle.WARNING:
            primary_color = 0xFFFF00  # Electric yellow
        elif style == EmbedStyle.MUSIC:
            primary_color = 0xFF0080  # Hot pink
        elif style == EmbedStyle.GAMING:
            primary_color = 0x39FF14  # Neon green
        elif style == EmbedStyle.AI:
            primary_color = 0x9D4EDD  # Purple
        elif style == EmbedStyle.ECONOMY:
            primary_color = 0xFFD700  # Gold
        else:
            primary_color = colors.primary
            
        # Create base embed
        embed = discord.Embed(
            title=self._enhance_title(title, theme, animated, glitch_effect),
            description=self._enhance_description(description, theme, colors) if description else None,
            color=primary_color,
            timestamp=datetime.now() if timestamp else None
        )
        
        # Add futuristic author
        if author_name:
            embed.set_author(
                name=self._enhance_text(author_name, theme),
                icon_url="https://cdn.discordapp.com/emojis/1234567890123456789.gif"  # Animated icon
            )
        
        # Add enhanced footer
        if footer_text or self.bot:
            footer_base = footer_text or "Opure.exe • Revolutionary AI System"
            footer_enhanced = self._create_footer_with_stats(footer_base, style)
            embed.set_footer(text=footer_enhanced)
            
        # Add thumbnail
        if thumbnail_url:
            embed.set_thumbnail(url=thumbnail_url)
            
        # Add image
        if image_url:
            embed.set_image(url=image_url)
            
        # Add enhanced fields
        if fields:
            for field in fields:
                embed.add_field(
                    name=self._enhance_field_name(field.get("name", ""), theme),
                    value=self._enhance_field_value(field.get("value", ""), theme, colors),
                    inline=field.get("inline", False)
                )
                
        # Track usage stats
        theme_key = theme.value
        self.theme_usage_stats[theme_key] = self.theme_usage_stats.get(theme_key, 0) + 1
        
        return embed
        
    def _enhance_title(self, title: str, theme: EmbedTheme, animated: bool, glitch_effect: bool) -> str:
        """Enhance title with futuristic effects"""
        enhanced_title = title
        
        # Add theme-specific prefixes
        if theme == EmbedTheme.CYBERPUNK:
            enhanced_title = f"《◈》 {title} 《◈》"
        elif theme == EmbedTheme.HOLOGRAPHIC:
            enhanced_title = f"◦•◉ {title} ◉•◦"
        elif theme == EmbedTheme.MATRIX:
            enhanced_title = f"[█▓▒░ {title} ░▒▓█]"
        elif theme == EmbedTheme.NEON:
            enhanced_title = f"✧☾ {title} ☽✧"
        elif theme == EmbedTheme.GLITCH:
            enhanced_title = f"║▌│█║▌│ {title} │▌║█│▌║"
        elif theme == EmbedTheme.QUANTUM:
            enhanced_title = f"⟨ψ| {title} |ψ⟩"
            
        # Add glitch effect
        if glitch_effect and random.random() < 0.3:
            glitch_chars = "░▒▓█▌▐║▄▀"
            enhanced_title = self._add_glitch_artifacts(enhanced_title, glitch_chars)
            
        return enhanced_title
        
    def _enhance_description(self, description: str, theme: EmbedTheme, colors: FuturisticColor) -> str:
        """Enhance description with ANSI colors and effects"""
        if not description:
            return None
            
        # Wrap in ANSI color codes
        enhanced = f"{colors.text}{description}[0m\n```"
        
        # Add theme-specific enhancements
        if theme == EmbedTheme.MATRIX:
            enhanced = f"```ansi\n[2;32m▌▌▌ MATRIX INTERFACE ACTIVATED ▌▌▌[0m\n[2;32m{description}[0m\n```"
        elif theme == EmbedTheme.GLITCH:
            enhanced = f"```ansi\n[5;31m███ GLITCH DETECTED ███[0m\n[2;31m{description}[0m\n```"
        elif theme == EmbedTheme.HOLOGRAPHIC:
            enhanced = f"```ansi\n[2;95m◈◈◈ HOLOGRAPHIC PROJECTION ◈◈◈[0m\n[2;34m{description}[0m\n```"
            
        return enhanced
        
    def _enhance_field_name(self, name: str, theme: EmbedTheme) -> str:
        """Enhance field names with theme-appropriate styling"""
        if theme == EmbedTheme.CYBERPUNK:
            return f"《 {name} 》"
        elif theme == EmbedTheme.MATRIX:
            return f"[{name}]"
        elif theme == EmbedTheme.HOLOGRAPHIC:
            return f"◈ {name} ◈"
        elif theme == EmbedTheme.NEON:
            return f"⟦ {name} ⟧"
        elif theme == EmbedTheme.GLITCH:
            return f"║ {name} ║"
        else:
            return f"▶ {name}"
            
    def _enhance_field_value(self, value: str, theme: EmbedTheme, colors: FuturisticColor) -> str:
        """Enhance field values with colors and formatting"""
        if theme == EmbedTheme.MATRIX:
            return f"```ansi\n[2;32m{value}[0m\n```"
        elif theme == EmbedTheme.CYBERPUNK:
            return f"```ansi\n[2;35m{value}[0m\n```"
        elif theme == EmbedTheme.HOLOGRAPHIC:
            return f"```ansi\n[2;34m{value}[0m\n```"
        elif theme == EmbedTheme.NEON:
            return f"```ansi\n[1;92m{value}[0m\n```"
        else:
            return f"```yaml\n{value}\n```"
            
    def _enhance_text(self, text: str, theme: EmbedTheme) -> str:
        """General text enhancement based on theme"""
        if theme == EmbedTheme.CYBERPUNK:
            return f"◈ {text} ◈"
        elif theme == EmbedTheme.MATRIX:
            return f"▓ {text} ▓"
        elif theme == EmbedTheme.HOLOGRAPHIC:
            return f"◦ {text} ◦"
        else:
            return text
            
    def _create_footer_with_stats(self, base_footer: str, style: EmbedStyle) -> str:
        """Create enhanced footer with real-time stats"""
        try:
            # Get current time
            current_time = datetime.now().strftime("%H:%M:%S UTC")
            
            # Add style-specific indicators
            style_indicators = {
                EmbedStyle.SUCCESS: "✅",
                EmbedStyle.ERROR: "❌",
                EmbedStyle.WARNING: "⚠️",
                EmbedStyle.INFO: "ℹ️",
                EmbedStyle.MUSIC: "🎵",
                EmbedStyle.GAMING: "🎮",
                EmbedStyle.AI: "🧠",
                EmbedStyle.ECONOMY: "💎",
                EmbedStyle.SOCIAL: "👥"
            }
            
            indicator = style_indicators.get(style, "◈")
            
            # Enhanced footer with time and style
            enhanced_footer = f"{indicator} {base_footer} • {current_time}"
            
            # Add system stats if bot is available
            if self.bot and hasattr(self.bot, 'guilds'):
                server_count = len(self.bot.guilds)
                enhanced_footer += f" • {server_count} Servers"
                
            return enhanced_footer
            
        except Exception:
            return base_footer
            
    def _add_glitch_artifacts(self, text: str, glitch_chars: str) -> str:
        """Add subtle glitch artifacts to text"""
        if random.random() < 0.5:
            # Insert random glitch character
            pos = random.randint(0, len(text))
            glitch_char = random.choice(glitch_chars)
            return text[:pos] + glitch_char + text[pos:]
        return text
        
    def create_status_embed(self, status: str, details: str = None, theme: EmbedTheme = EmbedTheme.CYBERPUNK) -> discord.Embed:
        """Create a status embed with dynamic animations"""
        animation_frame = random.choice(self.ANIMATION_FRAMES["pulse"])
        
        embed = self.create_revolutionary_embed(
            title=f"{animation_frame} System Status Update",
            description=f"**Status:** {status}\n{f'**Details:** {details}' if details else ''}",
            theme=theme,
            style=EmbedStyle.INFO,
            fields=[
                {
                    "name": "🔄 Processing State",
                    "value": f"```ansi\n[2;32m{status.upper()}[0m\n```",
                    "inline": True
                },
                {
                    "name": "⚡ System Metrics",
                    "value": "```yaml\nResponse Time: <100ms\nUptime: 99.9%\nPerformance: OPTIMAL\n```",
                    "inline": True
                }
            ]
        )
        
        return embed
        
    def create_music_embed(self, track_info: Dict[str, Any], theme: EmbedTheme = EmbedTheme.NEON) -> discord.Embed:
        """Create a music-themed embed with Scottish flair"""
        embed = self.create_revolutionary_embed(
            title="🎵 Now Playing • Scottish Beats Active",
            description=f"```ansi\n[1;92m♪ {track_info.get('title', 'Unknown Track')} ♪[0m\n```",
            theme=theme,
            style=EmbedStyle.MUSIC,
            fields=[
                {
                    "name": "🎤 Artist",
                    "value": f"```ansi\n[2;35m{track_info.get('artist', 'Unknown Artist')}[0m\n```",
                    "inline": True
                },
                {
                    "name": "⏱️ Duration",
                    "value": f"```ansi\n[2;36m{track_info.get('duration', '0:00')}[0m\n```",
                    "inline": True
                },
                {
                    "name": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish AI Commentary",
                    "value": "```ansi\n[2;33mAye, this track's got proper vibes! Rangers FC would approve of these beats, ken![0m\n```",
                    "inline": False
                }
            ],
            thumbnail_url=track_info.get('thumbnail'),
            footer_text="Opure.exe • Music Revolutionary • Juice WRLD Forever"
        )
        
        return embed
        
    def create_ai_response_embed(self, response: str, confidence: float = 95.0, theme: EmbedTheme = EmbedTheme.QUANTUM) -> discord.Embed:
        """Create an AI response embed with neural network aesthetics"""
        neural_icon = random.choice(self.ANIMATION_FRAMES["neural"])
        
        embed = self.create_revolutionary_embed(
            title=f"{neural_icon} AI Neural Response",
            description=f"```ansi\n[2;35m{response}[0m\n```",
            theme=theme,
            style=EmbedStyle.AI,
            fields=[
                {
                    "name": "🧠 Confidence Level", 
                    "value": f"```ansi\n[1;32m{confidence:.1f}%[0m\n```",
                    "inline": True
                },
                {
                    "name": "⚡ Processing Time",
                    "value": "```ansi\n[1;36m<100ms[0m\n```", 
                    "inline": True
                },
                {
                    "name": "🔮 AI Personality",
                    "value": "```ansi\n[2;33mScottish • Rangers FC • Juice WRLD Knowledge Active[0m\n```",
                    "inline": False
                }
            ],
            footer_text="Opure.exe • Revolutionary AI • Neural Network Active"
        )
        
        return embed
        
    def create_error_embed(self, error_message: str, error_code: str = None, theme: EmbedTheme = EmbedTheme.GLITCH) -> discord.Embed:
        """Create a glitchy error embed"""
        glitch_frame = random.choice(self.ANIMATION_FRAMES["glitch"])
        
        embed = self.create_revolutionary_embed(
            title=f"{glitch_frame} System Anomaly Detected",
            description=f"```ansi\n[5;31m⚠️ ERROR OCCURRED ⚠️[0m\n[2;31m{error_message}[0m\n```",
            theme=theme,
            style=EmbedStyle.ERROR,
            glitch_effect=True,
            fields=[
                {
                    "name": "🔥 Error Code",
                    "value": f"```ansi\n[1;31m{error_code or 'UNKNOWN'}[0m\n```",
                    "inline": True
                },
                {
                    "name": "🛠️ Recovery Status",
                    "value": "```ansi\n[2;33mAttempting auto-recovery...[0m\n```",
                    "inline": True
                }
            ],
            footer_text="Opure.exe • Error Recovery System • Scottish Resilience Active"
        )
        
        return embed
        
    def get_theme_stats(self) -> Dict[str, Any]:
        """Get usage statistics for different themes"""
        total_usage = sum(self.theme_usage_stats.values())
        if total_usage == 0:
            return {"message": "No theme usage data available"}
            
        stats = {}
        for theme, count in self.theme_usage_stats.items():
            stats[theme] = {
                "usage_count": count,
                "percentage": (count / total_usage) * 100
            }
            
        return {
            "total_embeds_created": total_usage,
            "theme_breakdown": stats,
            "most_popular_theme": max(self.theme_usage_stats.items(), key=lambda x: x[1])[0]
        }

# Global embed framework instance
embed_framework = FuturisticEmbedFramework()

def get_embed_framework(bot=None):
    """Get the global embed framework instance"""
    global embed_framework
    if bot and not embed_framework.bot:
        embed_framework.bot = bot
    return embed_framework