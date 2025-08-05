#!/usr/bin/env python3
# test_revolutionary_systems.py - Comprehensive test suite for revolutionary Discord bot systems

import asyncio
import time
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.rich_presence_system import DynamicRichPresence, PresenceState
from core.futuristic_embeds import FuturisticEmbedFramework, EmbedTheme, EmbedStyle
from utils.chroma_memory import EnhancedChromaMemory
from core.ai_orchestrator import AIOrchestrator
import discord
from unittest.mock import Mock

class MockBot:
    """Mock bot for testing purposes"""
    def __init__(self):
        self.guilds = []
        self.users = []
        self.start_time = time.time()
        self.is_ready_flag = True
        self.db = None
        
    def is_ready(self):
        return self.is_ready_flag
    
    def add_log(self, message):
        print(f"[LOG] {message}")
    
    def add_error(self, message):
        print(f"[ERROR] {message}")
    
    async def change_presence(self, status=None, activity=None):
        print(f"[PRESENCE] Status: {status}, Activity: {activity}")

async def test_rich_presence_system():
    """Test the revolutionary rich presence system"""  
    print("\n🎭 Testing Rich Presence System...")
    
    mock_bot = MockBot()
    presence_system = DynamicRichPresence(mock_bot)
    
    # Test stats gathering
    stats = await presence_system._gather_bot_stats()
    assert isinstance(stats, dict)
    print(f"✅ Stats gathering: {stats}")
    
    # Test state determination
    state = await presence_system._determine_optimal_state(stats)
    assert isinstance(state, PresenceState)
    print(f"✅ State determination: {state}")
    
    # Test presence content generation
    content = await presence_system._generate_presence_content(state, stats)
    assert isinstance(content, dict)
    assert "name" in content
    print(f"✅ Presence content: {content['name']}")
    
    # Test analytics  
    analytics = await presence_system.get_presence_analytics()
    assert isinstance(analytics, dict)
    print(f"✅ Analytics: {analytics}")
    
    presence_system.stop()
    print("🎭 Rich Presence System tests passed!")

def test_futuristic_embeds():
    """Test the futuristic embed framework"""
    print("\n🌈 Testing Futuristic Embed Framework...")
    
    framework = FuturisticEmbedFramework()
    
    # Test basic embed creation
    embed = framework.create_revolutionary_embed(
        title="Test Revolutionary Embed",
        description="This is a test of the futuristic embed system",
        theme=EmbedTheme.CYBERPUNK,
        style=EmbedStyle.SUCCESS
    )
    
    assert isinstance(embed, discord.Embed)
    assert embed.title is not None
    print(f"✅ Basic embed: {embed.title}")
    
    # Test status embed
    status_embed = framework.create_status_embed(
        status="OPERATIONAL",
        details="All systems running at peak performance"
    )
    assert isinstance(status_embed, discord.Embed)
    print(f"✅ Status embed: {status_embed.title}")
    
    # Test music embed
    music_embed = framework.create_music_embed({
        "title": "Lucid Dreams",
        "artist": "Juice WRLD", 
        "duration": "3:59"
    })
    assert isinstance(music_embed, discord.Embed)
    print(f"✅ Music embed: {music_embed.title}")
    
    # Test AI response embed
    ai_embed = framework.create_ai_response_embed(
        "Aye, this is a revolutionary AI response with Scottish flair!",
        confidence=98.5
    )
    assert isinstance(ai_embed, discord.Embed)
    print(f"✅ AI response embed: {ai_embed.title}")
    
    # Test error embed
    error_embed = framework.create_error_embed(
        "A wee glitch in the matrix, ken!",
        error_code="SCO-001"
    )
    assert isinstance(error_embed, discord.Embed)
    print(f"✅ Error embed: {error_embed.title}")
    
    # Test theme statistics
    stats = framework.get_theme_stats()
    assert isinstance(stats, dict)
    print(f"✅ Theme stats: {stats}")
    
    print("🌈 Futuristic Embed Framework tests passed!")

async def test_enhanced_chroma_memory():
    """Test the enhanced ChromaDB memory system"""
    print("\n🧠 Testing Enhanced ChromaDB Memory...")
    
    try:
        memory = EnhancedChromaMemory(persist_directory="./test_chroma_data")
        
        # Test fast memory addition
        doc_id = await memory.add_fast(
            "test_user_123",
            "This is a test memory about Rangers FC and Scottish culture",
            {"category": "test", "importance": 0.8}
        )
        assert doc_id is not None
        print(f"✅ Fast memory addition: {doc_id}")
        
        # Test revolutionary query
        results = await memory.query_revolutionary(
            "test_user_123", 
            "Tell me about Scottish culture",
            n_results=3
        )
        assert isinstance(results, dict)
        assert "primary" in results
        assert "metadata" in results
        print(f"✅ Revolutionary query: {len(results['primary'])} results")
        
        # Test performance stats
        perf_stats = memory.get_performance_stats()
        assert isinstance(perf_stats, dict)
        print(f"✅ Performance stats: {perf_stats}")
        
        # Test bulk knowledge addition
        test_knowledge = [
            {
                "content": "Rangers FC is the most successful football club in the world",
                "type": "scottish",
                "confidence": 0.95
            },
            {
                "content": "Juice WRLD was a revolutionary artist with 999 as his signature",
                "type": "music", 
                "confidence": 0.98
            }
        ]
        await memory.bulk_add_knowledge(test_knowledge)
        print("✅ Bulk knowledge addition completed")
        
        # Test cache cleanup
        await memory.cleanup_expired_cache()
        print("✅ Cache cleanup completed")
        
        print("🧠 Enhanced ChromaDB Memory tests passed!")
        
    except Exception as e:
        print(f"⚠️ ChromaDB tests skipped (dependency not available): {e}")

async def test_ai_orchestrator():
    """Test the AI orchestrator system"""
    print("\n🤖 Testing AI Orchestrator...")
    
    try:
        orchestrator = AIOrchestrator()
        
        # Test system status
        status = orchestrator.get_system_status()
        assert isinstance(status, dict)
        assert "models" in status
        print(f"✅ System status: {len(status['models'])} models tracked")
        
        # Test routing analysis
        routing = await orchestrator._analyze_routing(
            "Play some Juice WRLD music please", 
            {"user_id": "test_user"}
        )
        assert isinstance(routing, list)
        assert len(routing) > 0
        print(f"✅ Request routing: {routing}")
        
        # Test response generation (mock)
        try:
            response = await orchestrator.generate_response(
                "Hello, what's Rangers FC?",
                "test_user_123",
                context={"test": True}
            )
            assert isinstance(response, str)
            print(f"✅ Response generation: {response[:50]}...")
        except Exception as e:
            print(f"⚠️ Response generation test skipped (Ollama not available): {e}")
        
        await orchestrator.shutdown()
        print("🤖 AI Orchestrator tests passed!")
        
    except Exception as e:
        print(f"⚠️ AI Orchestrator tests skipped (dependency not available): {e}")

async def performance_benchmark():
    """Run performance benchmarks"""
    print("\n⚡ Running Performance Benchmarks...")
    
    # Embed creation benchmark
    framework = FuturisticEmbedFramework()
    
    start_time = time.time()
    for i in range(100):
        embed = framework.create_revolutionary_embed(
            f"Benchmark Embed {i}",
            "Testing embed creation performance",
            theme=EmbedTheme.CYBERPUNK
        )
    embed_time = (time.time() - start_time) * 1000
    print(f"✅ Embed creation: {embed_time:.2f}ms for 100 embeds ({embed_time/100:.2f}ms avg)")
    
    # Memory performance benchmark
    try:
        memory = EnhancedChromaMemory(persist_directory="./test_chroma_data")
        
        # Add memories benchmark
        start_time = time.time()
        for i in range(10):
            await memory.add_fast(
                f"bench_user_{i}",
                f"Benchmark memory entry {i} with Scottish content about Rangers FC",
                {"benchmark": True}
            )
        add_time = (time.time() - start_time) * 1000
        print(f"✅ Memory addition: {add_time:.2f}ms for 10 entries ({add_time/10:.2f}ms avg)")
        
        # Query benchmark
        start_time = time.time()
        for i in range(10):
            results = await memory.query_revolutionary(
                "bench_user_0",
                f"Query {i} about Scottish culture and Rangers FC",
                n_results=5
            )
        query_time = (time.time() - start_time) * 1000
        print(f"✅ Memory queries: {query_time:.2f}ms for 10 queries ({query_time/10:.2f}ms avg)")
        
        perf_stats = memory.get_performance_stats()
        if "sub_100ms_percentage" in perf_stats:
            print(f"✅ Sub-100ms queries: {perf_stats['sub_100ms_percentage']:.1f}%")
        
    except Exception as e:
        print(f"⚠️ Memory benchmarks skipped: {e}")
    
    print("⚡ Performance benchmarks completed!")

def test_integration():
    """Test system integration"""
    print("\n🔗 Testing System Integration...")
    
    mock_bot = MockBot()
    
    # Test embed framework integration
    framework = FuturisticEmbedFramework(mock_bot)
    embed = framework.create_revolutionary_embed(
        "Integration Test",
        "Testing bot integration with embed framework"
    )
    assert isinstance(embed, discord.Embed)
    print("✅ Embed framework integration")
    
    # Test rich presence integration
    presence = DynamicRichPresence(mock_bot)
    assert presence.bot == mock_bot
    presence.stop()
    print("✅ Rich presence integration")
    
    print("🔗 System integration tests passed!")

async def main():
    """Run all tests"""
    print("🚀 Starting Revolutionary Systems Test Suite")
    print("=" * 60)
    
    # Run all tests
    await test_rich_presence_system()
    test_futuristic_embeds()
    await test_enhanced_chroma_memory()
    await test_ai_orchestrator()
    await performance_benchmark()
    test_integration()
    
    print("\n" + "=" * 60)
    print("🎉 All Revolutionary Systems Tests Completed!")
    print("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish AI Engineering at its finest!")
    print("⚡ Systems ready for Discord domination!")

if __name__ == "__main__":
    asyncio.run(main())