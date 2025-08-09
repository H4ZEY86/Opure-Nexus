# utils/ai_model_manager.py - Centralized AI model management for gpt-oss:20b transition

import asyncio
import logging
from typing import Dict, Any, Optional
import datetime

class AIModelManager:
    """Centralized AI model management with fallback support"""
    
    def __init__(self, bot):
        self.bot = bot
        self.primary_model = "gpt-oss:20b"
        self.fallback_models = ["opure", "mistral"]  # Fallback during transition
        self.model_stats = {}
        self.logger = logging.getLogger(__name__)
    
    async def generate_response(
        self, 
        prompt: str, 
        context: str = None,
        temperature: float = 0.7,
        max_tokens: int = 500,
        personality_mode: str = "Scottish",
        use_gpu: bool = True
    ) -> str:
        """
        Generate AI response using the new gpt-oss:20b system with fallbacks
        """
        try:
            # Build full prompt with context
            full_prompt = self._build_prompt(prompt, context, personality_mode)
            
            # Try GPU AI engine first if available
            if use_gpu and hasattr(self.bot, 'gpu_engine') and self.bot.gpu_engine:
                try:
                    response = await self.bot.gpu_engine.generate_response(
                        prompt=full_prompt,
                        model=self.primary_model,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                    
                    if response and response.strip():
                        await self._track_successful_generation(self.primary_model, "gpu")
                        return response.strip()
                        
                except Exception as gpu_error:
                    self.logger.warning(f"GPU AI engine failed: {gpu_error}")
                    # Continue to fallback
            
            # Fallback to Ollama with new model
            try:
                response = await self.bot.ollama_client.generate(
                    model=self.primary_model,
                    prompt=full_prompt,
                    options={
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                )
                
                ai_response = response.get('response', '').strip()
                if ai_response:
                    await self._track_successful_generation(self.primary_model, "ollama")
                    return ai_response
                    
            except Exception as primary_error:
                self.logger.warning(f"Primary model {self.primary_model} failed: {primary_error}")
                
                # Try fallback models
                for fallback_model in self.fallback_models:
                    try:
                        response = await self.bot.ollama_client.generate(
                            model=fallback_model,
                            prompt=full_prompt,
                            options={
                                "temperature": temperature,
                                "num_predict": max_tokens
                            }
                        )
                        
                        ai_response = response.get('response', '').strip()
                        if ai_response:
                            await self._track_successful_generation(fallback_model, "ollama_fallback")
                            self.logger.info(f"Used fallback model {fallback_model}")
                            return ai_response
                            
                    except Exception as fallback_error:
                        self.logger.warning(f"Fallback model {fallback_model} failed: {fallback_error}")
                        continue
            
            # If all models fail, return error message
            await self._track_failed_generation()
            return "AI system temporarily unavailable. All models are experiencing issues."
            
        except Exception as e:
            self.logger.error(f"Critical error in AI generation: {e}")
            return "AI processing encountered an unexpected error. Please try again."
    
    def _build_prompt(self, prompt: str, context: str = None, personality_mode: str = "Scottish") -> str:
        """Build the full prompt with personality and context"""
        
        # Base personality context
        personality_contexts = {
            "Scottish": """You are Opure.exe, a Scottish AI with a passion for Rangers FC and Juice WRLD's music. 
                         You're witty, helpful, and always maintain your Scottish personality. You occasionally reference 
                         football and hip-hop culture. Stay in character while being genuinely helpful.""",
            
            "Professional": """You are Opure.exe, a professional AI assistant. Provide clear, concise, and 
                              helpful responses while maintaining a professional tone.""",
            
            "Creative": """You are Opure.exe, a creative AI assistant. Think outside the box and provide 
                          imaginative, innovative responses while staying helpful.""",
            
            "Technical": """You are Opure.exe, a technical AI assistant. Focus on accuracy, detail, and 
                           technical precision in your responses.""",
            
            "Casual": """You are Opure.exe, a casual and friendly AI assistant. Keep things relaxed and 
                        conversational while being helpful."""
        }
        
        personality_context = personality_contexts.get(personality_mode, personality_contexts["Scottish"])
        
        # Build full prompt
        full_prompt_parts = [personality_context]
        
        if context:
            full_prompt_parts.append(f"Additional context: {context}")
        
        full_prompt_parts.append(f"User: {prompt}")
        full_prompt_parts.append("Opure.exe:")
        
        return "\n\n".join(full_prompt_parts)
    
    async def _track_successful_generation(self, model: str, method: str):
        """Track successful AI generation for monitoring"""
        try:
            timestamp = datetime.datetime.now().isoformat()
            if model not in self.model_stats:
                self.model_stats[model] = {"successes": 0, "failures": 0, "last_used": None}
            
            self.model_stats[model]["successes"] += 1
            self.model_stats[model]["last_used"] = timestamp
            
            # Log to bot for monitoring
            if hasattr(self.bot, 'add_log'):
                self.bot.add_log(f"✅ AI generation successful: {model} via {method}")
                
        except Exception as e:
            self.logger.error(f"Failed to track successful generation: {e}")
    
    async def _track_failed_generation(self):
        """Track failed AI generation attempts"""
        try:
            # Log failure
            if hasattr(self.bot, 'add_error'):
                self.bot.add_error("❌ All AI models failed to generate response")
                
        except Exception as e:
            self.logger.error(f"Failed to track failed generation: {e}")
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of all available AI models"""
        try:
            status = {
                "primary_model": self.primary_model,
                "fallback_models": self.fallback_models,
                "gpu_available": hasattr(self.bot, 'gpu_engine') and self.bot.gpu_engine is not None,
                "stats": self.model_stats.copy()
            }
            
            # Test primary model availability
            try:
                test_response = await self.bot.ollama_client.generate(
                    model=self.primary_model,
                    prompt="Test",
                    options={"num_predict": 1}
                )
                status["primary_model_available"] = True
            except:
                status["primary_model_available"] = False
            
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to get model status: {e}")
            return {"error": str(e)}
    
    async def switch_primary_model(self, new_model: str) -> bool:
        """Switch the primary AI model"""
        try:
            # Test the new model
            test_response = await self.bot.ollama_client.generate(
                model=new_model,
                prompt="Test",
                options={"num_predict": 1}
            )
            
            if test_response.get('response'):
                old_model = self.primary_model
                self.primary_model = new_model
                
                if hasattr(self.bot, 'add_log'):
                    self.bot.add_log(f"🔄 Switched primary AI model: {old_model} → {new_model}")
                
                return True
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to switch primary model: {e}")
            return False

# Global instance to be used throughout the codebase
ai_model_manager = None

def get_ai_model_manager(bot):
    """Get or create the global AI model manager instance"""
    global ai_model_manager
    if ai_model_manager is None:
        ai_model_manager = AIModelManager(bot)
    return ai_model_manager

# Convenience function for backward compatibility
async def generate_ai_response(
    bot,
    prompt: str,
    context: str = None,
    personality_mode: str = "Scottish",
    **kwargs
) -> str:
    """Convenience function for generating AI responses"""
    manager = get_ai_model_manager(bot)
    return await manager.generate_response(
        prompt=prompt,
        context=context,
        personality_mode=personality_mode,
        **kwargs
    )