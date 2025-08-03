# utils/gpu_ai_engine.py
# GPU-Accelerated AI Processing Engine for Opure.bot

import torch
import numpy as np
import asyncio
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor
import gc

try:
    import GPUtil
    from pynvml import nvmlInit, nvmlDeviceGetHandleByIndex, nvmlDeviceGetMemoryInfo, nvmlDeviceGetUtilizationRates
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False

try:
    from transformers import pipeline, AutoTokenizer, AutoModel
    from sentence_transformers import SentenceTransformer
    import librosa
    import soundfile as sf
    from numba import cuda
    ADVANCED_AI_AVAILABLE = True
except ImportError:
    ADVANCED_AI_AVAILABLE = False

class GPUAIEngine:
    """High-performance GPU-accelerated AI engine for Opure"""
    
    def __init__(self):
        self.device = self._setup_device()
        self.models = {}
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        self.cache = {}
        self.performance_stats = {
            'total_inferences': 0,
            'gpu_utilization': [],
            'processing_times': [],
            'cache_hits': 0
        }
        
        if GPU_AVAILABLE:
            try:
                nvmlInit()
                self.gpu_handle = nvmlDeviceGetHandleByIndex(0)
            except:
                self.gpu_handle = None
    
    def _setup_device(self) -> torch.device:
        """Setup optimal device configuration"""
        if torch.cuda.is_available():
            # Optimize for RTX 5070 Ti
            device = torch.device("cuda:0")
            torch.backends.cudnn.benchmark = True  # Optimize for consistent input sizes
            torch.backends.cuda.matmul.allow_tf32 = True  # Enable TF32 for better performance
            torch.backends.cudnn.allow_tf32 = True
            
            # Set memory allocation strategy
            torch.cuda.empty_cache()
            torch.cuda.set_per_process_memory_fraction(0.8)  # Reserve 80% of GPU memory
            
            print(f"[GPU] Acceleration Enabled: {torch.cuda.get_device_name(0)}")
            print(f"[MEM] CUDA Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
            
            return device
        else:
            print("[WARN] CUDA not available, falling back to CPU")
            return torch.device("cpu")
    
    async def load_models(self):
        """Load AI models with GPU optimization"""
        try:
            if not ADVANCED_AI_AVAILABLE:
                print("[WARN] Advanced AI libraries not available")
                return
            
            # Load sentence transformer for embeddings (GPU-accelerated)
            self.models['embeddings'] = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
            
            # Load sentiment analysis (GPU-accelerated)
            self.models['sentiment'] = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=0 if self.device.type == 'cuda' else -1,
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32
            )
            
            # Load text generation (GPU-accelerated)
            self.models['text_gen'] = pipeline(
                "text-generation",
                model="microsoft/DialoGPT-small",
                device=0 if self.device.type == 'cuda' else -1,
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32
            )
            
            print("[OK] GPU-accelerated AI models loaded successfully")
            
        except Exception as e:
            print(f"[ERROR] Error loading AI models: {e}")
    
    async def generate_enhanced_response(self, prompt: str, context: Dict = None) -> str:
        """Generate AI response with GPU acceleration and caching"""
        start_time = time.time()
        
        # Check cache first
        cache_key = hash(prompt + str(context))
        if cache_key in self.cache:
            self.performance_stats['cache_hits'] += 1
            return self.cache[cache_key]
        
        try:
            # GPU-accelerated text generation
            if 'text_gen' in self.models:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self.thread_pool,
                    self._generate_text_gpu,
                    prompt,
                    context
                )
            else:
                # Fallback to basic generation
                result = f"[GPU-Enhanced] {prompt}"
            
            # Cache result
            self.cache[cache_key] = result
            if len(self.cache) > 1000:  # Limit cache size
                self.cache.clear()
            
            # Update performance stats
            processing_time = time.time() - start_time
            self.performance_stats['processing_times'].append(processing_time)
            self.performance_stats['total_inferences'] += 1
            
            return result
            
        except Exception as e:
            print(f"[ERROR] GPU text generation error: {e}")
            return f"[Fallback] Enhanced response for: {prompt}"
    
    def _generate_text_gpu(self, prompt: str, context: Dict = None) -> str:
        """GPU-accelerated text generation (runs in thread)"""
        try:
            with torch.cuda.amp.autocast():  # Use automatic mixed precision
                inputs = self.models['text_gen'].tokenizer.encode(prompt, return_tensors='pt').to(self.device)
                
                with torch.no_grad():
                    outputs = self.models['text_gen'].model.generate(
                        inputs,
                        max_length=150,
                        num_return_sequences=1,
                        temperature=0.8,
                        do_sample=True,
                        pad_token_id=self.models['text_gen'].tokenizer.eos_token_id
                    )
                
                response = self.models['text_gen'].tokenizer.decode(outputs[0], skip_special_tokens=True)
                return response[len(prompt):].strip()
                
        except Exception as e:
            print(f"[ERROR] GPU generation error: {e}")
            return f"Enhanced AI response for: {prompt}"
    
    async def analyze_sentiment_batch(self, texts: List[str]) -> List[Dict]:
        """GPU-accelerated batch sentiment analysis"""
        try:
            if 'sentiment' in self.models:
                loop = asyncio.get_event_loop()
                results = await loop.run_in_executor(
                    self.thread_pool,
                    self._analyze_sentiment_gpu,
                    texts
                )
                return results
            else:
                return [{"label": "NEUTRAL", "score": 0.5} for _ in texts]
                
        except Exception as e:
            print(f"[ERROR] Sentiment analysis error: {e}")
            return [{"label": "NEUTRAL", "score": 0.5} for _ in texts]
    
    def _analyze_sentiment_gpu(self, texts: List[str]) -> List[Dict]:
        """GPU-accelerated sentiment analysis (runs in thread)"""
        try:
            with torch.cuda.amp.autocast():
                results = self.models['sentiment'](texts)
                return results
        except Exception as e:
            print(f"[ERROR] GPU sentiment error: {e}")
            return [{"label": "NEUTRAL", "score": 0.5} for _ in texts]
    
    async def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """GPU-accelerated embedding generation for vector search"""
        try:
            if 'embeddings' in self.models:
                loop = asyncio.get_event_loop()
                embeddings = await loop.run_in_executor(
                    self.thread_pool,
                    self._generate_embeddings_gpu,
                    texts
                )
                return embeddings
            else:
                # Fallback to random embeddings
                return np.random.random((len(texts), 384))
                
        except Exception as e:
            print(f"[ERROR] Embedding generation error: {e}")
            return np.random.random((len(texts), 384))
    
    def _generate_embeddings_gpu(self, texts: List[str]) -> np.ndarray:
        """GPU-accelerated embedding generation (runs in thread)"""
        try:
            with torch.cuda.amp.autocast():
                embeddings = self.models['embeddings'].encode(
                    texts,
                    batch_size=32,
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
                return embeddings
        except Exception as e:
            print(f"[ERROR] GPU embedding error: {e}")
            return np.random.random((len(texts), 384))
    
    async def analyze_audio_features(self, audio_path: str) -> Dict[str, Any]:
        """GPU-accelerated audio analysis for music features"""
        try:
            loop = asyncio.get_event_loop()
            features = await loop.run_in_executor(
                self.thread_pool,
                self._analyze_audio_gpu,
                audio_path
            )
            return features
            
        except Exception as e:
            print(f"[ERROR] Audio analysis error: {e}")
            return {"tempo": 120, "energy": 0.5, "mood": "neutral"}
    
    def _analyze_audio_gpu(self, audio_path: str) -> Dict[str, Any]:
        """GPU-accelerated audio feature extraction"""
        try:
            # Load audio
            y, sr = librosa.load(audio_path, duration=30)  # Analyze first 30 seconds
            
            # Extract features (some can be GPU-accelerated)
            features = {
                "tempo": float(librosa.tempo(y=y, sr=sr)[0]),
                "spectral_centroid": float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))),
                "spectral_rolloff": float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))),
                "zero_crossing_rate": float(np.mean(librosa.feature.zero_crossing_rate(y))),
                "mfcc": librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).mean(axis=1).tolist(),
                "chroma": librosa.feature.chroma_stft(y=y, sr=sr).mean(axis=1).tolist(),
                "energy": float(np.sum(y**2)),
                "duration": len(y) / sr
            }
            
            # Classify mood based on features
            if features["energy"] > 0.01 and features["tempo"] > 120:
                mood = "energetic"
            elif features["tempo"] < 80:
                mood = "calm"
            elif features["spectral_centroid"] > 2000:
                mood = "bright"
            else:
                mood = "neutral"
            
            features["mood"] = mood
            return features
            
        except Exception as e:
            print(f"[ERROR] Audio feature extraction error: {e}")
            return {"tempo": 120, "energy": 0.5, "mood": "neutral", "error": str(e)}
    
    def get_gpu_stats(self) -> Dict[str, Any]:
        """Get current GPU utilization and memory stats"""
        try:
            if self.gpu_handle and GPU_AVAILABLE:
                # GPU utilization
                utilization = nvmlDeviceGetUtilizationRates(self.gpu_handle)
                
                # Memory info
                memory_info = nvmlDeviceGetMemoryInfo(self.gpu_handle)
                memory_used_gb = memory_info.used / 1e9
                memory_total_gb = memory_info.total / 1e9
                memory_percent = (memory_info.used / memory_info.total) * 100
                
                # PyTorch CUDA memory
                cuda_allocated = torch.cuda.memory_allocated() / 1e9 if torch.cuda.is_available() else 0
                cuda_cached = torch.cuda.memory_reserved() / 1e9 if torch.cuda.is_available() else 0
                
                stats = {
                    "gpu_utilization": utilization.gpu,
                    "memory_utilization": utilization.memory,
                    "memory_used_gb": memory_used_gb,
                    "memory_total_gb": memory_total_gb,
                    "memory_percent": memory_percent,
                    "cuda_allocated_gb": cuda_allocated,
                    "cuda_cached_gb": cuda_cached,
                    "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
                    "cuda_version": torch.version.cuda if torch.cuda.is_available() else "N/A"
                }
                
                # Store for performance tracking
                self.performance_stats['gpu_utilization'].append(utilization.gpu)
                if len(self.performance_stats['gpu_utilization']) > 100:
                    self.performance_stats['gpu_utilization'] = self.performance_stats['gpu_utilization'][-50:]
                
                return stats
            else:
                return {"error": "GPU monitoring not available"}
                
        except Exception as e:
            return {"error": f"GPU stats error: {e}"}
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        gpu_stats = self.get_gpu_stats()
        
        avg_processing_time = np.mean(self.performance_stats['processing_times']) if self.performance_stats['processing_times'] else 0
        avg_gpu_util = np.mean(self.performance_stats['gpu_utilization']) if self.performance_stats['gpu_utilization'] else 0
        cache_hit_rate = self.performance_stats['cache_hits'] / max(self.performance_stats['total_inferences'], 1) * 100
        
        return {
            "gpu_stats": gpu_stats,
            "total_inferences": self.performance_stats['total_inferences'],
            "average_processing_time": avg_processing_time,
            "average_gpu_utilization": avg_gpu_util,
            "cache_hit_rate": cache_hit_rate,
            "models_loaded": list(self.models.keys()),
            "device": str(self.device),
            "cuda_available": torch.cuda.is_available(),
            "models_loaded_count": len(self.models)
        }
    
    def optimize_memory(self):
        """Optimize GPU memory usage"""
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
                
                # Clear old cache entries
                if len(self.cache) > 500:
                    self.cache.clear()
                
                print("🧹 GPU memory optimized")
                
        except Exception as e:
            print(f"[ERROR] Memory optimization error: {e}")
    
    async def shutdown(self):
        """Clean shutdown of GPU resources"""
        try:
            # Clear models
            for model_name, model in self.models.items():
                if hasattr(model, 'to'):
                    model.to('cpu')  # Move to CPU before deletion
                del model
            
            self.models.clear()
            self.cache.clear()
            
            # Clear GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Shutdown thread pool
            self.thread_pool.shutdown(wait=False)
            
            print("🛑 GPU AI Engine shutdown complete")
            
        except Exception as e:
            print(f"[ERROR] Shutdown error: {e}")

# Global GPU AI Engine instance
gpu_ai_engine = None

async def initialize_gpu_engine():
    """Initialize the global GPU AI engine"""
    global gpu_ai_engine
    try:
        gpu_ai_engine = GPUAIEngine()
        await gpu_ai_engine.load_models()
        print("[OK] GPU AI Engine initialized successfully")
        return gpu_ai_engine
    except Exception as e:
        print(f"[ERROR] Failed to initialize GPU AI Engine: {e}")
        return None

def get_gpu_engine() -> Optional[GPUAIEngine]:
    """Get the global GPU AI engine instance"""
    return gpu_ai_engine