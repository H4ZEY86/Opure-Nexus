"""
VIRAL GROWTH SYSTEM V1.0 - SOCIAL AMPLIFICATION ENGINE
Advanced viral mechanics for Discord Activity ecosystem growth
Features: Social sharing, referral systems, viral coefficient tracking, network effects
"""

import asyncio
import json
import logging
import time
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import requests
import base64

class SocialPlatform(Enum):
    DISCORD = "discord"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    REDDIT = "reddit"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"

class ShareType(Enum):
    ACHIEVEMENT = "achievement"
    BOUNTY = "bounty"
    MILESTONE = "milestone"
    LEADERBOARD = "leaderboard"
    CHALLENGE = "challenge"
    SUCCESS_STORY = "success_story"

class ViralMechanics(Enum):
    REFERRAL_CHAIN = "referral_chain"
    ACHIEVEMENT_SHOWCASE = "achievement_showcase"
    LEADERBOARD_CLIMB = "leaderboard_climb"
    MILESTONE_CELEBRATION = "milestone_celebration"
    COLLABORATIVE_SUCCESS = "collaborative_success"
    CHALLENGE_COMPLETION = "challenge_completion"

@dataclass
class ViralContent:
    """Viral content structure"""
    content_id: str
    creator_id: str
    content_type: ShareType
    target_id: str  # Achievement ID, bounty ID, etc.
    
    # Content data
    title: str
    description: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    hashtags: List[str] = field(default_factory=list)
    
    # Viral mechanics
    share_template: str = ""
    call_to_action: str = ""
    referral_code: Optional[str] = None
    viral_hooks: List[str] = field(default_factory=list)
    
    # Engagement tracking
    views: int = 0
    shares: int = 0
    clicks: int = 0
    conversions: int = 0
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

@dataclass
class ViralShare:
    """Individual share tracking"""
    share_id: str
    content_id: str
    user_id: str
    platform: SocialPlatform
    
    # Share details
    shared_at: datetime
    share_url: str
    share_text: str
    media_urls: List[str] = field(default_factory=list)
    
    # Performance metrics
    impressions: int = 0
    clicks: int = 0
    reactions: int = 0
    comments: int = 0
    reshares: int = 0
    
    # Viral tracking
    direct_referrals: int = 0
    indirect_referrals: int = 0
    conversion_value: float = 0.0
    viral_coefficient: float = 0.0
    
    # Attribution
    referral_chain: List[str] = field(default_factory=list)
    attribution_score: float = 0.0

@dataclass
class ReferralNode:
    """Node in referral network"""
    user_id: str
    referrer_id: Optional[str]
    
    # Network metrics
    direct_referrals: int = 0
    indirect_referrals: int = 0
    network_depth: int = 0
    network_size: int = 0
    
    # Performance
    conversion_rate: float = 0.0
    retention_rate: float = 0.0
    lifetime_value: float = 0.0
    
    # Rewards
    referral_tokens_earned: int = 0
    viral_bonuses: int = 0
    
    # Metadata
    joined_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)

class ViralGrowthSystem:
    """
    Advanced viral growth system with social amplification
    """
    
    def __init__(self, bot, database=None):
        self.bot = bot
        self.db = database or bot.db
        
        # Viral tracking
        self.viral_content: Dict[str, ViralContent] = {}
        self.active_shares: Dict[str, ViralShare] = {}
        self.referral_network: Dict[str, ReferralNode] = {}
        
        # Platform integrations
        self.platform_apis = {
            SocialPlatform.DISCORD: DiscordIntegration(bot),
            SocialPlatform.TWITTER: TwitterIntegration(),
            SocialPlatform.FACEBOOK: FacebookIntegration(),
            SocialPlatform.REDDIT: RedditIntegration()
        }
        
        # Content generators
        self.content_generator = ViralContentGenerator()
        self.share_optimizer = ShareOptimizer()
        self.viral_analyzer = ViralAnalyzer()
        
        # Configuration
        self.viral_config = {
            'referral_rewards': {
                'direct_referral': 50,  # Tokens for direct referral
                'indirect_bonus': 10,   # Bonus for indirect referrals
                'network_milestone': 100  # Bonus for network milestones
            },
            'share_rewards': {
                'achievement_share': 25,
                'bounty_share': 15,
                'milestone_share': 35,
                'viral_bonus_threshold': 10  # Shares needed for viral bonus
            },
            'viral_thresholds': {
                'viral_coefficient_target': 1.2,
                'trending_threshold': 100,  # Shares in 24h
                'viral_milestone': 1000  # Total shares
            }
        }
        
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the viral growth system"""
        try:
            await self._load_viral_content()
            await self._load_referral_network()
            await self._initialize_platform_apis()
            
            # Start background tasks
            asyncio.create_task(self._viral_tracking_loop())
            asyncio.create_task(self._content_optimization_loop())
            asyncio.create_task(self._network_analysis_loop())
            
            self.logger.info("🚀 Viral Growth System initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize viral growth system: {e}")
            raise
    
    async def create_viral_content(self, creator_id: str, content_type: ShareType, target_id: str, context: Dict[str, Any]) -> str:
        """
        Create optimized viral content for sharing
        """
        try:
            content_id = f"viral_{content_type.value}_{uuid.uuid4().hex[:8]}"
            
            # Generate content using AI
            content_data = await self.content_generator.generate_content(
                content_type, target_id, context
            )
            
            # Optimize for virality
            optimized_content = await self.share_optimizer.optimize_content(
                content_data, creator_id
            )
            
            # Create viral content object
            viral_content = ViralContent(
                content_id=content_id,
                creator_id=creator_id,
                content_type=content_type,
                target_id=target_id,
                title=optimized_content['title'],
                description=optimized_content['description'],
                image_url=optimized_content.get('image_url'),
                video_url=optimized_content.get('video_url'),
                hashtags=optimized_content.get('hashtags', []),
                share_template=optimized_content['share_template'],
                call_to_action=optimized_content['call_to_action'],
                referral_code=self._generate_referral_code(creator_id),
                viral_hooks=optimized_content.get('viral_hooks', [])
            )
            
            # Store content
            self.viral_content[content_id] = viral_content
            await self._store_viral_content(viral_content)
            
            self.logger.info(f"🎯 Created viral content: {content_id}")
            return content_id
            
        except Exception as e:
            self.logger.error(f"Failed to create viral content: {e}")
            raise
    
    async def share_content(self, user_id: str, content_id: str, platform: SocialPlatform, custom_text: str = "") -> str:
        """
        Share viral content on specified platform
        """
        try:
            viral_content = self.viral_content.get(content_id)
            if not viral_content:
                raise ValueError("Viral content not found")
            
            # Generate share ID
            share_id = f"share_{uuid.uuid4().hex[:8]}"
            
            # Prepare share content
            share_text = custom_text or viral_content.share_template
            if viral_content.referral_code:
                share_text += f"\n\nJoin with code: {viral_content.referral_code}"
            
            # Add hashtags
            if viral_content.hashtags:
                share_text += f"\n\n{' '.join(f'#{tag}' for tag in viral_content.hashtags)}"
            
            # Get platform API
            platform_api = self.platform_apis.get(platform)
            if not platform_api:
                raise ValueError(f"Platform {platform.value} not supported")
            
            # Execute share
            share_result = await platform_api.share_content({
                'text': share_text,
                'image_url': viral_content.image_url,
                'video_url': viral_content.video_url,
                'call_to_action': viral_content.call_to_action
            })
            
            # Create share record
            viral_share = ViralShare(
                share_id=share_id,
                content_id=content_id,
                user_id=user_id,
                platform=platform,
                shared_at=datetime.now(),
                share_url=share_result['url'],
                share_text=share_text,
                media_urls=share_result.get('media_urls', [])
            )
            
            # Store share
            self.active_shares[share_id] = viral_share
            await self._store_viral_share(viral_share)
            
            # Update content metrics
            viral_content.shares += 1
            await self._update_content_metrics(content_id)
            
            # Award sharing tokens
            share_reward = self.viral_config['share_rewards'].get(
                viral_content.content_type.value + '_share', 15
            )
            await self._award_tokens(user_id, share_reward, f"Shared {viral_content.content_type.value}")
            
            # Track viral metrics
            await self._track_viral_share(viral_share)
            
            self.logger.info(f"📤 Content shared: {share_id} by {user_id}")
            return share_id
            
        except Exception as e:
            self.logger.error(f"Failed to share content: {e}")
            raise
    
    async def track_referral(self, referrer_id: str, referred_id: str, source: str) -> bool:
        """
        Track referral and build network
        """
        try:
            # Check if referral already exists
            if referred_id in self.referral_network:
                existing_node = self.referral_network[referred_id]
                if existing_node.referrer_id:
                    return False  # Already referred
            
            # Create or update referrer node
            if referrer_id not in self.referral_network:
                self.referral_network[referrer_id] = ReferralNode(
                    user_id=referrer_id,
                    referrer_id=None
                )
            
            referrer_node = self.referral_network[referrer_id]
            
            # Create referred node
            referred_node = ReferralNode(
                user_id=referred_id,
                referrer_id=referrer_id,
                network_depth=referrer_node.network_depth + 1
            )
            
            self.referral_network[referred_id] = referred_node
            
            # Update referrer metrics
            referrer_node.direct_referrals += 1
            referrer_node.last_activity = datetime.now()
            
            # Update network metrics up the chain
            await self._update_referral_chain(referrer_id)
            
            # Award referral rewards
            direct_reward = self.viral_config['referral_rewards']['direct_referral']
            await self._award_tokens(referrer_id, direct_reward, f"Referred user: {referred_id}")
            
            # Award indirect bonuses up the chain
            await self._award_indirect_bonuses(referrer_id, referred_id)
            
            # Store in database
            await self._store_referral(referrer_id, referred_id, source)
            
            self.logger.info(f"👥 Referral tracked: {referrer_id} -> {referred_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to track referral: {e}")
            return False
    
    async def calculate_viral_coefficient(self, user_id: str, timeframe_days: int = 30) -> float:
        """
        Calculate viral coefficient for user
        """
        try:
            # Get user's shares in timeframe
            start_date = datetime.now() - timedelta(days=timeframe_days)
            
            user_shares = [
                share for share in self.active_shares.values()
                if share.user_id == user_id and share.shared_at >= start_date
            ]
            
            if not user_shares:
                return 0.0
            
            # Calculate metrics
            total_shares = len(user_shares)
            total_clicks = sum(share.clicks for share in user_shares)
            total_conversions = sum(share.direct_referrals for share in user_shares)
            
            # Viral coefficient = (Conversions / Shares) * Network multiplier
            base_coefficient = total_conversions / total_shares if total_shares > 0 else 0
            
            # Apply network effect multiplier
            user_node = self.referral_network.get(user_id)
            network_multiplier = 1.0
            if user_node:
                network_multiplier = 1 + (user_node.network_size / 100)  # 1% bonus per network member
            
            viral_coefficient = base_coefficient * network_multiplier
            
            return min(viral_coefficient, 10.0)  # Cap at 10x
            
        except Exception as e:
            self.logger.error(f"Failed to calculate viral coefficient: {e}")
            return 0.0
    
    async def get_trending_content(self, limit: int = 10) -> List[ViralContent]:
        """
        Get currently trending viral content
        """
        try:
            # Calculate trending scores
            now = datetime.now()
            twenty_four_hours_ago = now - timedelta(hours=24)
            
            trending_scores = {}
            
            for content_id, content in self.viral_content.items():
                if content.created_at < twenty_four_hours_ago:
                    continue
                
                # Recent shares
                recent_shares = [
                    share for share in self.active_shares.values()
                    if share.content_id == content_id and share.shared_at >= twenty_four_hours_ago
                ]
                
                # Calculate trending score
                shares_score = len(recent_shares) * 2
                engagement_score = sum(share.clicks + share.reactions for share in recent_shares)
                viral_score = sum(share.viral_coefficient for share in recent_shares)
                
                trending_score = shares_score + engagement_score + viral_score * 10
                trending_scores[content_id] = trending_score
            
            # Sort by trending score
            trending_content_ids = sorted(
                trending_scores.keys(),
                key=lambda x: trending_scores[x],
                reverse=True
            )[:limit]
            
            trending_content = [
                self.viral_content[content_id] 
                for content_id in trending_content_ids
            ]
            
            return trending_content
            
        except Exception as e:
            self.logger.error(f"Failed to get trending content: {e}")
            return []
    
    async def get_user_viral_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive viral statistics for user
        """
        try:
            user_shares = [
                share for share in self.active_shares.values()
                if share.user_id == user_id
            ]
            
            user_content = [
                content for content in self.viral_content.values()
                if content.creator_id == user_id
            ]
            
            user_node = self.referral_network.get(user_id, ReferralNode(user_id=user_id))
            
            # Calculate stats
            total_shares = len(user_shares)
            total_views = sum(share.impressions for share in user_shares)
            total_clicks = sum(share.clicks for share in user_shares)
            total_conversions = sum(share.direct_referrals for share in user_shares)
            
            click_through_rate = (total_clicks / total_views) if total_views > 0 else 0
            conversion_rate = (total_conversions / total_clicks) if total_clicks > 0 else 0
            
            viral_coefficient = await self.calculate_viral_coefficient(user_id)
            
            return {
                'user_id': user_id,
                'content_created': len(user_content),
                'total_shares': total_shares,
                'total_views': total_views,
                'total_clicks': total_clicks,
                'total_conversions': total_conversions,
                'click_through_rate': click_through_rate,
                'conversion_rate': conversion_rate,
                'viral_coefficient': viral_coefficient,
                'direct_referrals': user_node.direct_referrals,
                'indirect_referrals': user_node.indirect_referrals,
                'network_size': user_node.network_size,
                'referral_tokens_earned': user_node.referral_tokens_earned,
                'viral_bonuses': user_node.viral_bonuses
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get viral stats: {e}")
            return {}
    
    # Private helper methods
    def _generate_referral_code(self, user_id: str) -> str:
        """Generate unique referral code"""
        timestamp = int(time.time())
        hash_input = f"{user_id}_{timestamp}"
        hash_obj = hashlib.md5(hash_input.encode())
        return hash_obj.hexdigest()[:8].upper()
    
    async def _update_referral_chain(self, user_id: str):
        """Update referral chain metrics"""
        current_node = self.referral_network.get(user_id)
        if not current_node or not current_node.referrer_id:
            return
        
        # Update indirect referrals up the chain
        referrer_id = current_node.referrer_id
        while referrer_id and referrer_id in self.referral_network:
            referrer_node = self.referral_network[referrer_id]
            referrer_node.indirect_referrals += 1
            referrer_node.network_size = referrer_node.direct_referrals + referrer_node.indirect_referrals
            
            referrer_id = referrer_node.referrer_id
    
    async def _award_indirect_bonuses(self, referrer_id: str, referred_id: str):
        """Award bonuses to referral chain"""
        bonus_amount = self.viral_config['referral_rewards']['indirect_bonus']
        depth = 0
        current_referrer = referrer_id
        
        while current_referrer and depth < 3:  # Max 3 levels deep
            if current_referrer in self.referral_network:
                referrer_node = self.referral_network[current_referrer]
                bonus = bonus_amount // (depth + 1)  # Decreasing bonus
                
                if bonus > 0:
                    await self._award_tokens(
                        current_referrer, 
                        bonus, 
                        f"Indirect referral bonus (Level {depth + 1})"
                    )
                    referrer_node.viral_bonuses += bonus
                
                current_referrer = referrer_node.referrer_id
                depth += 1
            else:
                break
    
    # Background task loops
    async def _viral_tracking_loop(self):
        """Background task for viral metrics tracking"""
        while True:
            try:
                await self._update_viral_metrics()
                await self._calculate_viral_coefficients()
                await self._detect_viral_content()
                
                await asyncio.sleep(300)  # Every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Viral tracking loop error: {e}")
                await asyncio.sleep(300)


# Supporting classes for viral functionality
class ViralContentGenerator:
    """Generates optimized viral content"""
    
    async def generate_content(self, content_type: ShareType, target_id: str, context: Dict) -> Dict[str, Any]:
        """Generate viral content for sharing"""
        templates = {
            ShareType.ACHIEVEMENT: {
                'title': "🏆 Achievement Unlocked!",
                'description': "Just unlocked an amazing achievement in Opure!",
                'share_template': "I just achieved something incredible in @OpureApp! 🎯 Check out what I accomplished!",
                'call_to_action': "Join me and start your own achievement journey!",
                'hashtags': ['Achievement', 'Gaming', 'Discord', 'Success'],
                'viral_hooks': ['exclusive', 'limited_time', 'join_challenge']
            },
            ShareType.BOUNTY: {
                'title': "🎯 Bounty Completed!",
                'description': "Successfully completed a challenging bounty!",
                'share_template': "Just crushed a bounty challenge in @OpureApp! 💪 Who's next?",
                'call_to_action': "Take on the challenge yourself!",
                'hashtags': ['Bounty', 'Challenge', 'Victory', 'Gaming'],
                'viral_hooks': ['challenge_others', 'competition', 'rewards']
            }
        }
        
        return templates.get(content_type, templates[ShareType.ACHIEVEMENT])


class ShareOptimizer:
    """Optimizes content for maximum viral potential"""
    
    async def optimize_content(self, content_data: Dict, creator_id: str) -> Dict[str, Any]:
        """Optimize content for virality"""
        # Add personalization and optimization logic
        return content_data


class ViralAnalyzer:
    """Analyzes viral performance and trends"""
    
    async def analyze_viral_performance(self, content_id: str) -> Dict[str, float]:
        """Analyze viral performance metrics"""
        return {
            'reach_score': 0.8,
            'engagement_score': 0.7,
            'conversion_score': 0.6,
            'viral_potential': 0.75
        }


# Platform integrations
class DiscordIntegration:
    """Discord platform integration"""
    
    def __init__(self, bot):
        self.bot = bot
    
    async def share_content(self, content: Dict) -> Dict[str, Any]:
        """Share content on Discord"""
        # Implementation for Discord sharing
        return {
            'url': 'https://discord.com/share/123',
            'media_urls': []
        }


class TwitterIntegration:
    """Twitter platform integration"""
    
    async def share_content(self, content: Dict) -> Dict[str, Any]:
        """Share content on Twitter"""
        # Implementation for Twitter API
        return {
            'url': 'https://twitter.com/share/123',
            'media_urls': []
        }


class FacebookIntegration:
    """Facebook platform integration"""
    
    async def share_content(self, content: Dict) -> Dict[str, Any]:
        """Share content on Facebook"""
        # Implementation for Facebook API
        return {
            'url': 'https://facebook.com/share/123',
            'media_urls': []
        }


class RedditIntegration:
    """Reddit platform integration"""
    
    async def share_content(self, content: Dict) -> Dict[str, Any]:
        """Share content on Reddit"""
        # Implementation for Reddit API
        return {
            'url': 'https://reddit.com/r/gaming/123',
            'media_urls': []
        }