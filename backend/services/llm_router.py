"""
LLM Router Service
Intelligent routing system for multiple AI providers with automatic fallback,
performance optimization, and unified interface for Jarvis Terminal
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncGenerator, Union
from enum import Enum
from dataclasses import dataclass, asdict
import aiohttp
import openai
from anthropic import AsyncAnthropic
import google.generativeai as genai
import ollama

from backend.config import settings

logger = logging.getLogger(__name__)

class ProviderType(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    PERPLEXITY = "perplexity"
    GROQ = "groq"
    MISTRAL = "mistral"
    OLLAMA = "ollama"
    CUSTOM = "custom"

class ModelCapability(Enum):
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    CODE_ANALYSIS = "code_analysis"
    REASONING = "reasoning"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    FAST_RESPONSE = "fast_response"
    LONG_CONTEXT = "long_context"

@dataclass
class ModelInfo:
    id: str
    name: str
    provider: ProviderType
    capabilities: List[ModelCapability]
    max_tokens: int
    cost_per_token: float
    avg_response_time: float
    supports_streaming: bool
    context_window: int
    status: str = "available"

@dataclass
class ProviderConfig:
    api_key: str
    api_base: Optional[str] = None
    model_mapping: Dict[str, str] = None
    rate_limit: int = 60
    timeout: int = 30
    custom_headers: Dict[str, str] = None

class LLMRouter:
    """
    Intelligent LLM Router with automatic provider selection,
    fallback mechanisms, and performance optimization
    """
    
    def __init__(self):
        self.providers: Dict[ProviderType, Any] = {}
        self.provider_configs: Dict[ProviderType, ProviderConfig] = {}
        self.models: Dict[str, ModelInfo] = {}
        self.performance_metrics: Dict[str, Dict] = {}
        self.fallback_chains: Dict[str, List[str]] = {}
        self.current_mode = "auto"  # auto, offline, online
        
        # Performance tracking
        self.response_times: Dict[str, List[float]] = {}
        self.error_rates: Dict[str, float] = {}
        self.usage_stats: Dict[str, int] = {}
        
        self._init_providers()
        self._init_models()
        self._setup_fallback_chains()
    
    def _init_providers(self):
        """Initialize all available AI providers"""
        try:
            # OpenAI
            if hasattr(settings, 'openai_api_key') and settings.openai_api_key:
                self.providers[ProviderType.OPENAI] = openai.AsyncOpenAI(
                    api_key=settings.openai_api_key
                )
                self.provider_configs[ProviderType.OPENAI] = ProviderConfig(
                    api_key=settings.openai_api_key,
                    rate_limit=60,
                    timeout=30
                )
            
            # Anthropic Claude
            if hasattr(settings, 'anthropic_api_key') and settings.anthropic_api_key:
                self.providers[ProviderType.ANTHROPIC] = AsyncAnthropic(
                    api_key=settings.anthropic_api_key
                )
                self.provider_configs[ProviderType.ANTHROPIC] = ProviderConfig(
                    api_key=settings.anthropic_api_key,
                    rate_limit=50,
                    timeout=60
                )
            
            # Google Gemini
            if hasattr(settings, 'google_ai_key') and settings.google_ai_key:
                genai.configure(api_key=settings.google_ai_key)
                self.providers[ProviderType.GOOGLE] = genai
                self.provider_configs[ProviderType.GOOGLE] = ProviderConfig(
                    api_key=settings.google_ai_key,
                    rate_limit=60,
                    timeout=30
                )
            
            # Perplexity
            if hasattr(settings, 'perplexity_api_key') and settings.perplexity_api_key:
                self.provider_configs[ProviderType.PERPLEXITY] = ProviderConfig(
                    api_key=settings.perplexity_api_key,
                    api_base="https://api.perplexity.ai",
                    rate_limit=20,
                    timeout=30
                )
            
            # Groq
            if hasattr(settings, 'groq_api_key') and settings.groq_api_key:
                self.provider_configs[ProviderType.GROQ] = ProviderConfig(
                    api_key=settings.groq_api_key,
                    api_base="https://api.groq.com/openai/v1",
                    rate_limit=30,
                    timeout=15
                )
            
            # Mistral
            if hasattr(settings, 'mistral_api_key') and settings.mistral_api_key:
                self.provider_configs[ProviderType.MISTRAL] = ProviderConfig(
                    api_key=settings.mistral_api_key,
                    api_base="https://api.mistral.ai/v1",
                    rate_limit=30,
                    timeout=30
                )
            
            # Ollama (Local)
            try:
                # Test Ollama connection
                ollama.list()
                self.providers[ProviderType.OLLAMA] = ollama
                self.provider_configs[ProviderType.OLLAMA] = ProviderConfig(
                    api_key="",
                    api_base="http://localhost:11434",
                    rate_limit=1000,
                    timeout=60
                )
            except Exception as e:
                logger.warning(f"Ollama not available: {e}")
                
        except Exception as e:
            logger.error(f"Error initializing providers: {e}")
    
    def _init_models(self):
        """Initialize model configurations"""
        # OpenAI Models
        if ProviderType.OPENAI in self.providers:
            self.models.update({
                "gpt-4o": ModelInfo(
                    id="gpt-4o",
                    name="GPT-4o",
                    provider=ProviderType.OPENAI,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.REASONING, ModelCapability.FUNCTION_CALLING, ModelCapability.VISION],
                    max_tokens=128000,
                    cost_per_token=0.00003,
                    avg_response_time=2.5,
                    supports_streaming=True,
                    context_window=128000
                ),
                "gpt-4o-mini": ModelInfo(
                    id="gpt-4o-mini",
                    name="GPT-4o Mini",
                    provider=ProviderType.OPENAI,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.FAST_RESPONSE],
                    max_tokens=128000,
                    cost_per_token=0.000015,
                    avg_response_time=1.2,
                    supports_streaming=True,
                    context_window=128000
                ),
                "gpt-3.5-turbo": ModelInfo(
                    id="gpt-3.5-turbo",
                    name="GPT-3.5 Turbo",
                    provider=ProviderType.OPENAI,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.FAST_RESPONSE],
                    max_tokens=16385,
                    cost_per_token=0.000001,
                    avg_response_time=0.8,
                    supports_streaming=True,
                    context_window=16385
                )
            })
        
        # Anthropic Models
        if ProviderType.ANTHROPIC in self.providers:
            self.models.update({
                "claude-3-5-sonnet-20241022": ModelInfo(
                    id="claude-3-5-sonnet-20241022",
                    name="Claude 3.5 Sonnet",
                    provider=ProviderType.ANTHROPIC,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.CODE_ANALYSIS, ModelCapability.REASONING, ModelCapability.LONG_CONTEXT],
                    max_tokens=200000,
                    cost_per_token=0.000015,
                    avg_response_time=3.0,
                    supports_streaming=True,
                    context_window=200000
                ),
                "claude-3-haiku-20240307": ModelInfo(
                    id="claude-3-haiku-20240307",
                    name="Claude 3 Haiku",
                    provider=ProviderType.ANTHROPIC,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.FAST_RESPONSE],
                    max_tokens=200000,
                    cost_per_token=0.00000025,
                    avg_response_time=1.0,
                    supports_streaming=True,
                    context_window=200000
                )
            })
        
        # Google Models
        if ProviderType.GOOGLE in self.providers:
            self.models.update({
                "gemini-1.5-pro": ModelInfo(
                    id="gemini-1.5-pro",
                    name="Gemini 1.5 Pro",
                    provider=ProviderType.GOOGLE,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.REASONING, ModelCapability.VISION, ModelCapability.LONG_CONTEXT],
                    max_tokens=2000000,
                    cost_per_token=0.0000035,
                    avg_response_time=2.8,
                    supports_streaming=True,
                    context_window=2000000
                ),
                "gemini-1.5-flash": ModelInfo(
                    id="gemini-1.5-flash",
                    name="Gemini 1.5 Flash",
                    provider=ProviderType.GOOGLE,
                    capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION, 
                                ModelCapability.FAST_RESPONSE],
                    max_tokens=1000000,
                    cost_per_token=0.00000075,
                    avg_response_time=1.5,
                    supports_streaming=True,
                    context_window=1000000
                )
            })
        
        # Ollama Models (Local)
        if ProviderType.OLLAMA in self.providers:
            try:
                local_models = ollama.list()
                for model in local_models.get('models', []):
                    model_name = model['name']
                    self.models[f"ollama:{model_name}"] = ModelInfo(
                        id=f"ollama:{model_name}",
                        name=f"Local {model_name}",
                        provider=ProviderType.OLLAMA,
                        capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_GENERATION],
                        max_tokens=32768,
                        cost_per_token=0.0,  # Local models are free
                        avg_response_time=5.0,
                        supports_streaming=True,
                        context_window=32768
                    )
            except Exception as e:
                logger.warning(f"Could not load Ollama models: {e}")
    
    def _setup_fallback_chains(self):
        """Setup fallback chains for different use cases"""
        self.fallback_chains = {
            "code_generation": ["gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-pro", "ollama:deepseek-coder"],
            "fast_response": ["gpt-4o-mini", "claude-3-haiku-20240307", "gemini-1.5-flash", "gpt-3.5-turbo"],
            "reasoning": ["gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-pro"],
            "long_context": ["gemini-1.5-pro", "claude-3-5-sonnet-20241022", "gpt-4o"],
            "offline": ["ollama:deepseek-coder", "ollama:codellama", "ollama:mistral"]
        }
    
    async def route_request(self, 
                          message: str, 
                          task_type: str = "general",
                          preferred_model: Optional[str] = None,
                          context_length: int = 0,
                          stream: bool = True) -> AsyncGenerator[str, None]:
        """
        Intelligently route request to best available model
        """
        try:
            # Determine best model for the task
            selected_model = await self._select_model(
                task_type=task_type,
                preferred_model=preferred_model,
                context_length=context_length
            )
            
            if not selected_model:
                yield "Error: No available models for this request"
                return
            
            # Generate response with fallback
            async for chunk in self._generate_with_fallback(
                model_id=selected_model,
                message=message,
                stream=stream
            ):
                yield chunk
                
        except Exception as e:
            logger.error(f"Error in route_request: {e}")
            yield f"Error: {str(e)}"
    
    async def _select_model(self, 
                           task_type: str,
                           preferred_model: Optional[str] = None,
                           context_length: int = 0) -> Optional[str]:
        """Select the best model for the given task"""
        
        # If preferred model is specified and available, use it
        if preferred_model and preferred_model in self.models:
            model_info = self.models[preferred_model]
            if await self._is_model_available(preferred_model):
                return preferred_model
        
        # Get fallback chain for task type
        candidates = self.fallback_chains.get(task_type, self.fallback_chains["fast_response"])
        
        # Filter by context length requirement
        if context_length > 0:
            candidates = [
                model_id for model_id in candidates 
                if model_id in self.models and self.models[model_id].context_window >= context_length
            ]
        
        # Filter by availability and current mode
        available_candidates = []
        for model_id in candidates:
            if model_id in self.models and await self._is_model_available(model_id):
                if self.current_mode == "offline":
                    if self.models[model_id].provider == ProviderType.OLLAMA:
                        available_candidates.append(model_id)
                elif self.current_mode == "online":
                    if self.models[model_id].provider != ProviderType.OLLAMA:
                        available_candidates.append(model_id)
                else:  # auto mode
                    available_candidates.append(model_id)
        
        # Return best available candidate
        return available_candidates[0] if available_candidates else None
    
    async def _is_model_available(self, model_id: str) -> bool:
        """Check if a model is currently available"""
        if model_id not in self.models:
            return False
        
        model_info = self.models[model_id]
        provider = model_info.provider
        
        # Check if provider is configured
        if provider not in self.provider_configs:
            return False
        
        # For Ollama, check if model is actually loaded
        if provider == ProviderType.OLLAMA:
            try:
                models = ollama.list()
                model_name = model_id.replace("ollama:", "")
                return any(m['name'] == model_name for m in models.get('models', []))
            except:
                return False
        
        return True
    
    async def _generate_with_fallback(self, 
                                    model_id: str, 
                                    message: str, 
                                    stream: bool = True) -> AsyncGenerator[str, None]:
        """Generate response with automatic fallback on failure"""
        
        model_info = self.models.get(model_id)
        if not model_info:
            yield "Error: Model not found"
            return
        
        start_time = time.time()
        
        try:
            # Route to appropriate provider
            if model_info.provider == ProviderType.OPENAI:
                async for chunk in self._generate_openai(model_id, message, stream):
                    yield chunk
            elif model_info.provider == ProviderType.ANTHROPIC:
                async for chunk in self._generate_anthropic(model_id, message, stream):
                    yield chunk
            elif model_info.provider == ProviderType.GOOGLE:
                async for chunk in self._generate_google(model_id, message, stream):
                    yield chunk
            elif model_info.provider == ProviderType.OLLAMA:
                async for chunk in self._generate_ollama(model_id, message, stream):
                    yield chunk
            else:
                async for chunk in self._generate_generic(model_id, message, stream):
                    yield chunk
            
            # Track performance
            response_time = time.time() - start_time
            self._update_performance_metrics(model_id, response_time, success=True)
            
        except Exception as e:
            logger.error(f"Error generating with {model_id}: {e}")
            self._update_performance_metrics(model_id, time.time() - start_time, success=False)
            
            # Try fallback
            fallback_model = await self._get_fallback_model(model_id)
            if fallback_model and fallback_model != model_id:
                logger.info(f"Falling back to {fallback_model}")
                async for chunk in self._generate_with_fallback(fallback_model, message, stream):
                    yield chunk
            else:
                yield f"Error: All models failed. {str(e)}"
    
    async def _generate_openai(self, model_id: str, message: str, stream: bool) -> AsyncGenerator[str, None]:
        """Generate response using OpenAI"""
        client = self.providers[ProviderType.OPENAI]
        
        response = await client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": message}],
            stream=stream,
            max_tokens=4000
        )
        
        if stream:
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            yield response.choices[0].message.content
    
    async def _generate_anthropic(self, model_id: str, message: str, stream: bool) -> AsyncGenerator[str, None]:
        """Generate response using Anthropic"""
        client = self.providers[ProviderType.ANTHROPIC]
        
        if stream:
            async with client.messages.stream(
                model=model_id,
                max_tokens=4000,
                messages=[{"role": "user", "content": message}]
            ) as stream_response:
                async for text in stream_response.text_stream:
                    yield text
        else:
            response = await client.messages.create(
                model=model_id,
                max_tokens=4000,
                messages=[{"role": "user", "content": message}]
            )
            yield response.content[0].text
    
    async def _generate_google(self, model_id: str, message: str, stream: bool) -> AsyncGenerator[str, None]:
        """Generate response using Google Gemini"""
        model = genai.GenerativeModel(model_id)
        
        if stream:
            response = await model.generate_content_async(message, stream=True)
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        else:
            response = await model.generate_content_async(message)
            yield response.text
    
    async def _generate_ollama(self, model_id: str, message: str, stream: bool) -> AsyncGenerator[str, None]:
        """Generate response using Ollama"""
        model_name = model_id.replace("ollama:", "")
        
        if stream:
            response = ollama.chat(
                model=model_name,
                messages=[{"role": "user", "content": message}],
                stream=True
            )
            for chunk in response:
                if chunk['message']['content']:
                    yield chunk['message']['content']
        else:
            response = ollama.chat(
                model=model_name,
                messages=[{"role": "user", "content": message}]
            )
            yield response['message']['content']
    
    async def _generate_generic(self, model_id: str, message: str, stream: bool) -> AsyncGenerator[str, None]:
        """Generate response using generic OpenAI-compatible API"""
        model_info = self.models[model_id]
        config = self.provider_configs[model_info.provider]
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            }
            
            if config.custom_headers:
                headers.update(config.custom_headers)
            
            payload = {
                "model": model_id,
                "messages": [{"role": "user", "content": message}],
                "stream": stream,
                "max_tokens": 4000
            }
            
            async with session.post(
                f"{config.api_base}/chat/completions",
                headers=headers,
                json=payload,
                timeout=config.timeout
            ) as response:
                if stream:
                    async for line in response.content:
                        if line.startswith(b"data: "):
                            try:
                                data = json.loads(line[6:].decode())
                                if data.get("choices") and data["choices"][0].get("delta", {}).get("content"):
                                    yield data["choices"][0]["delta"]["content"]
                            except:
                                continue
                else:
                    data = await response.json()
                    yield data["choices"][0]["message"]["content"]
    
    async def _get_fallback_model(self, failed_model: str) -> Optional[str]:
        """Get fallback model for a failed model"""
        model_info = self.models.get(failed_model)
        if not model_info:
            return None
        
        # Find appropriate fallback chain
        for task_type, chain in self.fallback_chains.items():
            if failed_model in chain:
                # Get next model in chain
                try:
                    current_index = chain.index(failed_model)
                    if current_index + 1 < len(chain):
                        fallback = chain[current_index + 1]
                        if await self._is_model_available(fallback):
                            return fallback
                except ValueError:
                    continue
        
        return None
    
    def _update_performance_metrics(self, model_id: str, response_time: float, success: bool):
        """Update performance metrics for a model"""
        if model_id not in self.response_times:
            self.response_times[model_id] = []
        
        self.response_times[model_id].append(response_time)
        
        # Keep only last 100 response times
        if len(self.response_times[model_id]) > 100:
            self.response_times[model_id] = self.response_times[model_id][-100:]
        
        # Update error rates
        if model_id not in self.error_rates:
            self.error_rates[model_id] = 0.0
        
        # Simple exponential moving average for error rate
        if success:
            self.error_rates[model_id] = self.error_rates[model_id] * 0.95
        else:
            self.error_rates[model_id] = self.error_rates[model_id] * 0.95 + 0.05
        
        # Update usage stats
        self.usage_stats[model_id] = self.usage_stats.get(model_id, 0) + 1
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models with their info"""
        available_models = []
        
        for model_id, model_info in self.models.items():
            if asyncio.run(self._is_model_available(model_id)):
                model_dict = asdict(model_info)
                model_dict['avg_response_time'] = self._get_avg_response_time(model_id)
                model_dict['error_rate'] = self.error_rates.get(model_id, 0.0)
                model_dict['usage_count'] = self.usage_stats.get(model_id, 0)
                available_models.append(model_dict)
        
        return available_models
    
    def _get_avg_response_time(self, model_id: str) -> float:
        """Get average response time for a model"""
        times = self.response_times.get(model_id, [])
        return sum(times) / len(times) if times else 0.0
    
    def set_mode(self, mode: str):
        """Set operation mode: auto, offline, online"""
        if mode in ["auto", "offline", "online"]:
            self.current_mode = mode
            logger.info(f"LLM Router mode set to: {mode}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status"""
        return {
            "mode": self.current_mode,
            "available_providers": list(self.providers.keys()),
            "total_models": len(self.models),
            "available_models": len([m for m in self.models.keys() if asyncio.run(self._is_model_available(m))]),
            "performance_metrics": {
                "avg_response_times": {k: self._get_avg_response_time(k) for k in self.models.keys()},
                "error_rates": self.error_rates,
                "usage_stats": self.usage_stats
            }
        }

# Global instance
llm_router = LLMRouter()