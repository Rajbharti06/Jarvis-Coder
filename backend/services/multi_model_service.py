"""
Multi-Model AI Service
Handles integration with multiple AI providers: Google AI, Perplexity, Grok, ChatGPT, etc.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, AsyncGenerator
import aiohttp
import openai
from anthropic import AsyncAnthropic
import google.generativeai as genai

from backend.config import settings

logger = logging.getLogger(__name__)

class MultiModelService:
    """
    Service for managing multiple AI model providers
    Supports Google AI, Perplexity, Grok, ChatGPT, Anthropic, and others
    """
    
    def __init__(self):
        self.providers = {}
        self.provider_configs = {}
        self.performance_metrics = {}
        self._init_providers()
    
    def _init_providers(self):
        """Initialize all available AI providers"""
        try:
            # OpenAI/ChatGPT
            if hasattr(settings, 'openai_api_key') and settings.openai_api_key:
                self.providers['openai'] = {
                    'client': openai.AsyncOpenAI(api_key=settings.openai_api_key),
                    'models': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                    'capabilities': ['text', 'code', 'reasoning', 'function_calling'],
                    'max_tokens': 128000,
                    'supports_streaming': True
                }
            
            # Anthropic Claude
            if hasattr(settings, 'anthropic_api_key') and settings.anthropic_api_key:
                self.providers['anthropic'] = {
                    'client': AsyncAnthropic(api_key=settings.anthropic_api_key),
                    'models': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
                    'capabilities': ['text', 'code', 'reasoning', 'analysis'],
                    'max_tokens': 200000,
                    'supports_streaming': True
                }
            
            # Google AI (Gemini)
            if hasattr(settings, 'google_ai_key') and settings.google_ai_key:
                genai.configure(api_key=settings.google_ai_key)
                self.providers['google'] = {
                    'client': genai,
                    'models': ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
                    'capabilities': ['text', 'code', 'vision', 'multimodal'],
                    'max_tokens': 32000,
                    'supports_streaming': True
                }
            
            # Perplexity AI
            if hasattr(settings, 'perplexity_api_key') and settings.perplexity_api_key:
                self.providers['perplexity'] = {
                    'api_key': settings.perplexity_api_key,
                    'base_url': 'https://api.perplexity.ai',
                    'models': ['pplx-7b-online', 'pplx-70b-online', 'pplx-7b-chat', 'pplx-70b-chat'],
                    'capabilities': ['text', 'search', 'real_time', 'web_access'],
                    'max_tokens': 4096,
                    'supports_streaming': True
                }
            
            # Grok (xAI)
            if hasattr(settings, 'grok_api_key') and settings.grok_api_key:
                self.providers['grok'] = {
                    'api_key': settings.grok_api_key,
                    'base_url': 'https://api.x.ai/v1',
                    'models': ['grok-beta'],
                    'capabilities': ['text', 'reasoning', 'humor', 'real_time'],
                    'max_tokens': 131072,
                    'supports_streaming': True
                }
            
            # Mistral AI
            if hasattr(settings, 'mistral_api_key') and settings.mistral_api_key:
                self.providers['mistral'] = {
                    'api_key': settings.mistral_api_key,
                    'base_url': 'https://api.mistral.ai/v1',
                    'models': ['mistral-large', 'mistral-medium', 'mistral-small'],
                    'capabilities': ['text', 'code', 'multilingual'],
                    'max_tokens': 32000,
                    'supports_streaming': True
                }
            
            # Groq (Fast inference)
            if hasattr(settings, 'groq_api_key') and settings.groq_api_key:
                self.providers['groq'] = {
                    'api_key': settings.groq_api_key,
                    'base_url': 'https://api.groq.com/openai/v1',
                    'models': ['mixtral-8x7b-32768', 'llama2-70b-4096'],
                    'capabilities': ['text', 'code', 'fast_inference'],
                    'max_tokens': 32768,
                    'supports_streaming': True
                }
            
            logger.info(f"Initialized {len(self.providers)} AI providers")
            
        except Exception as e:
            logger.error(f"Error initializing providers: {e}")
    
    async def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        available = []
        for provider_name in self.providers.keys():
            if await self.is_provider_available(provider_name):
                available.append(provider_name)
        return available
    
    async def is_provider_available(self, provider: str) -> bool:
        """Check if a specific provider is available"""
        try:
            if provider not in self.providers:
                return False
            
            # Quick health check
            return await self._health_check_provider(provider)
        except Exception as e:
            logger.error(f"Error checking provider {provider}: {e}")
            return False
    
    async def get_models(self) -> List[Dict[str, Any]]:
        """Get all available models from all providers"""
        models = []
        
        for provider_name, provider_config in self.providers.items():
            if await self.is_provider_available(provider_name):
                for model_name in provider_config['models']:
                    models.append({
                        'name': model_name,
                        'provider': provider_name,
                        'capabilities': provider_config['capabilities'],
                        'max_tokens': provider_config['max_tokens'],
                        'supports_streaming': provider_config['supports_streaming'],
                        'performance_score': self.performance_metrics.get(f"{provider_name}_{model_name}", 0.8)
                    })
        
        return models
    
    async def generate_response(
        self,
        provider: str,
        message: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        context: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Generate response from specified provider"""
        try:
            if provider not in self.providers:
                raise ValueError(f"Provider {provider} not available")
            
            start_time = time.time()
            
            # Route to appropriate provider
            if provider == 'openai':
                result = await self._openai_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'anthropic':
                result = await self._anthropic_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'google':
                result = await self._google_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'perplexity':
                result = await self._perplexity_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'grok':
                result = await self._grok_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'mistral':
                result = await self._mistral_generate(message, model, temperature, max_tokens, system_prompt, context)
            elif provider == 'groq':
                result = await self._groq_generate(message, model, temperature, max_tokens, system_prompt, context)
            else:
                raise ValueError(f"Provider {provider} not implemented")
            
            processing_time = time.time() - start_time
            
            # Update performance metrics
            await self._update_performance_metrics(provider, model or 'default', processing_time, True)
            
            return {
                'response': result['response'],
                'tokens_used': result.get('tokens_used'),
                'confidence_score': result.get('confidence_score', 0.8),
                'processing_time': processing_time,
                'provider': provider,
                'model': model or result.get('model', 'default')
            }
            
        except Exception as e:
            logger.error(f"Error generating response with {provider}: {e}")
            await self._update_performance_metrics(provider, model or 'default', 0, False)
            raise
    
    async def generate_response_stream(
        self,
        provider: str,
        message: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        context: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from specified provider"""
        try:
            if provider not in self.providers:
                raise ValueError(f"Provider {provider} not available")
            
            # Route to appropriate provider streaming method
            if provider == 'openai':
                async for chunk in self._openai_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'anthropic':
                async for chunk in self._anthropic_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'google':
                async for chunk in self._google_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'perplexity':
                async for chunk in self._perplexity_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'grok':
                async for chunk in self._grok_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'mistral':
                async for chunk in self._mistral_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            elif provider == 'groq':
                async for chunk in self._groq_generate_stream(message, model, temperature, max_tokens, system_prompt, context):
                    yield chunk
            else:
                raise ValueError(f"Streaming not implemented for provider {provider}")
                
        except Exception as e:
            logger.error(f"Error in streaming response with {provider}: {e}")
            yield f"Error: {str(e)}"
    
    async def get_best_provider(self, message_type: str = "text") -> Optional[str]:
        """Get best provider based on message type and performance"""
        try:
            available_providers = await self.get_available_providers()
            if not available_providers:
                return None
            
            # Score providers based on capabilities and performance
            scores = {}
            for provider in available_providers:
                config = self.providers[provider]
                score = 0
                
                # Capability matching
                if message_type in config['capabilities']:
                    score += 10
                
                # Performance metrics
                perf_key = f"{provider}_default"
                if perf_key in self.performance_metrics:
                    score += self.performance_metrics[perf_key] * 5
                else:
                    score += 4  # Default score
                
                # Provider-specific bonuses
                if message_type == "search" and provider == "perplexity":
                    score += 5
                elif message_type == "code" and provider in ["openai", "anthropic"]:
                    score += 3
                elif message_type == "reasoning" and provider in ["anthropic", "grok"]:
                    score += 3
                elif message_type == "fast" and provider == "groq":
                    score += 5
                
                scores[provider] = score
            
            # Return provider with highest score
            return max(scores.items(), key=lambda x: x[1])[0]
            
        except Exception as e:
            logger.error(f"Error getting best provider: {e}")
            return available_providers[0] if available_providers else None
    
    async def health_check(self) -> bool:
        """Check health of all providers"""
        try:
            available_count = 0
            for provider in self.providers.keys():
                if await self.is_provider_available(provider):
                    available_count += 1
            
            return available_count > 0
        except Exception:
            return False
    
    # Provider-specific implementations
    async def _openai_generate(self, message: str, model: Optional[str], temperature: float, 
                              max_tokens: Optional[int], system_prompt: Optional[str], 
                              context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using OpenAI"""
        try:
            client = self.providers['openai']['client']
            model = model or 'gpt-4-turbo'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return {
                'response': response.choices[0].message.content,
                'tokens_used': response.usage.total_tokens,
                'model': model,
                'confidence_score': 0.9
            }
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise
    
    async def _openai_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                     max_tokens: Optional[int], system_prompt: Optional[str],
                                     context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using OpenAI"""
        try:
            client = self.providers['openai']['client']
            model = model or 'gpt-4-turbo'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _anthropic_generate(self, message: str, model: Optional[str], temperature: float,
                                 max_tokens: Optional[int], system_prompt: Optional[str],
                                 context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Anthropic Claude"""
        try:
            client = self.providers['anthropic']['client']
            model = model or 'claude-3-sonnet-20240229'
            
            messages = []
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens or 4096,
                temperature=temperature,
                system=system_prompt or "",
                messages=messages
            )
            
            return {
                'response': response.content[0].text,
                'tokens_used': response.usage.input_tokens + response.usage.output_tokens,
                'model': model,
                'confidence_score': 0.9
            }
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            raise
    
    async def _anthropic_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                        max_tokens: Optional[int], system_prompt: Optional[str],
                                        context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Anthropic Claude"""
        try:
            client = self.providers['anthropic']['client']
            model = model or 'claude-3-sonnet-20240229'
            
            messages = []
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with client.messages.stream(
                model=model,
                max_tokens=max_tokens or 4096,
                temperature=temperature,
                system=system_prompt or "",
                messages=messages
            ) as stream:
                async for text in stream.text_stream:
                    yield text
                    
        except Exception as e:
            logger.error(f"Anthropic streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _google_generate(self, message: str, model: Optional[str], temperature: float,
                              max_tokens: Optional[int], system_prompt: Optional[str],
                              context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Google Gemini"""
        try:
            model_name = model or 'gemini-pro'
            model = genai.GenerativeModel(model_name)
            
            # Prepare prompt
            full_prompt = ""
            if system_prompt:
                full_prompt += f"System: {system_prompt}\n\n"
            if context:
                for msg in context:
                    full_prompt += f"{msg['role']}: {msg['content']}\n"
            full_prompt += f"User: {message}\nAssistant:"
            
            response = await model.generate_content_async(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            
            return {
                'response': response.text,
                'tokens_used': response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else None,
                'model': model_name,
                'confidence_score': 0.85
            }
        except Exception as e:
            logger.error(f"Google generation error: {e}")
            raise
    
    async def _google_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                     max_tokens: Optional[int], system_prompt: Optional[str],
                                     context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Google Gemini"""
        try:
            model_name = model or 'gemini-pro'
            model = genai.GenerativeModel(model_name)
            
            # Prepare prompt
            full_prompt = ""
            if system_prompt:
                full_prompt += f"System: {system_prompt}\n\n"
            if context:
                for msg in context:
                    full_prompt += f"{msg['role']}: {msg['content']}\n"
            full_prompt += f"User: {message}\nAssistant:"
            
            response = await model.generate_content_async(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                ),
                stream=True
            )
            
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.error(f"Google streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _perplexity_generate(self, message: str, model: Optional[str], temperature: float,
                                  max_tokens: Optional[int], system_prompt: Optional[str],
                                  context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Perplexity AI"""
        try:
            config = self.providers['perplexity']
            model = model or 'pplx-70b-online'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                ) as response:
                    data = await response.json()
                    
                    return {
                        'response': data['choices'][0]['message']['content'],
                        'tokens_used': data.get('usage', {}).get('total_tokens'),
                        'model': model,
                        'confidence_score': 0.85
                    }
        except Exception as e:
            logger.error(f"Perplexity generation error: {e}")
            raise
    
    async def _perplexity_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                         max_tokens: Optional[int], system_prompt: Optional[str],
                                         context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Perplexity AI"""
        try:
            config = self.providers['perplexity']
            model = model or 'pplx-70b-online'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": True
                    }
                ) as response:
                    async for line in response.content:
                        if line:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data = line[6:]
                                if data != '[DONE]':
                                    try:
                                        chunk = json.loads(data)
                                        if chunk['choices'][0]['delta'].get('content'):
                                            yield chunk['choices'][0]['delta']['content']
                                    except json.JSONDecodeError:
                                        continue
        except Exception as e:
            logger.error(f"Perplexity streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _grok_generate(self, message: str, model: Optional[str], temperature: float,
                            max_tokens: Optional[int], system_prompt: Optional[str],
                            context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Grok (xAI)"""
        try:
            config = self.providers['grok']
            model = model or 'grok-beta'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                ) as response:
                    data = await response.json()
                    
                    return {
                        'response': data['choices'][0]['message']['content'],
                        'tokens_used': data.get('usage', {}).get('total_tokens'),
                        'model': model,
                        'confidence_score': 0.85
                    }
        except Exception as e:
            logger.error(f"Grok generation error: {e}")
            raise
    
    async def _grok_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                   max_tokens: Optional[int], system_prompt: Optional[str],
                                   context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Grok (xAI)"""
        try:
            config = self.providers['grok']
            model = model or 'grok-beta'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": True
                    }
                ) as response:
                    async for line in response.content:
                        if line:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data = line[6:]
                                if data != '[DONE]':
                                    try:
                                        chunk = json.loads(data)
                                        if chunk['choices'][0]['delta'].get('content'):
                                            yield chunk['choices'][0]['delta']['content']
                                    except json.JSONDecodeError:
                                        continue
        except Exception as e:
            logger.error(f"Grok streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _mistral_generate(self, message: str, model: Optional[str], temperature: float,
                               max_tokens: Optional[int], system_prompt: Optional[str],
                               context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Mistral AI"""
        try:
            config = self.providers['mistral']
            model = model or 'mistral-large-latest'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                ) as response:
                    data = await response.json()
                    
                    return {
                        'response': data['choices'][0]['message']['content'],
                        'tokens_used': data.get('usage', {}).get('total_tokens'),
                        'model': model,
                        'confidence_score': 0.85
                    }
        except Exception as e:
            logger.error(f"Mistral generation error: {e}")
            raise
    
    async def _mistral_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                      max_tokens: Optional[int], system_prompt: Optional[str],
                                      context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Mistral AI"""
        try:
            config = self.providers['mistral']
            model = model or 'mistral-large-latest'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": True
                    }
                ) as response:
                    async for line in response.content:
                        if line:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data = line[6:]
                                if data != '[DONE]':
                                    try:
                                        chunk = json.loads(data)
                                        if chunk['choices'][0]['delta'].get('content'):
                                            yield chunk['choices'][0]['delta']['content']
                                    except json.JSONDecodeError:
                                        continue
        except Exception as e:
            logger.error(f"Mistral streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _groq_generate(self, message: str, model: Optional[str], temperature: float,
                            max_tokens: Optional[int], system_prompt: Optional[str],
                            context: Optional[List[Dict[str, str]]]) -> Dict[str, Any]:
        """Generate response using Groq"""
        try:
            config = self.providers['groq']
            model = model or 'mixtral-8x7b-32768'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                ) as response:
                    data = await response.json()
                    
                    return {
                        'response': data['choices'][0]['message']['content'],
                        'tokens_used': data.get('usage', {}).get('total_tokens'),
                        'model': model,
                        'confidence_score': 0.85
                    }
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            raise
    
    async def _groq_generate_stream(self, message: str, model: Optional[str], temperature: float,
                                   max_tokens: Optional[int], system_prompt: Optional[str],
                                   context: Optional[List[Dict[str, str]]]) -> AsyncGenerator[str, None]:
        """Generate streaming response using Groq"""
        try:
            config = self.providers['groq']
            model = model or 'mixtral-8x7b-32768'
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            if context:
                messages.extend(context)
            messages.append({"role": "user", "content": message})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{config['base_url']}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config['api_key']}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "stream": True
                    }
                ) as response:
                    async for line in response.content:
                        if line:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data = line[6:]
                                if data != '[DONE]':
                                    try:
                                        chunk = json.loads(data)
                                        if chunk['choices'][0]['delta'].get('content'):
                                            yield chunk['choices'][0]['delta']['content']
                                    except json.JSONDecodeError:
                                        continue
        except Exception as e:
            logger.error(f"Groq streaming error: {e}")
            yield f"Error: {str(e)}"
    
    # Helper methods
    async def _health_check_provider(self, provider: str) -> bool:
        """Perform health check on specific provider"""
        try:
            if provider == 'openai':
                client = self.providers['openai']['client']
                await client.models.list()
                return True
            elif provider == 'anthropic':
                # Anthropic doesn't have a simple health check, assume available if configured
                return True
            elif provider == 'google':
                # Google AI doesn't have a simple health check, assume available if configured
                return True
            elif provider in ['perplexity', 'grok', 'mistral', 'groq']:
                # For HTTP-based providers, we could do a simple request
                return True
            else:
                return False
        except Exception as e:
            logger.error(f"Health check failed for {provider}: {e}")
            return False
    
    async def _update_performance_metrics(self, provider: str, model: str, processing_time: float, success: bool):
        """Update performance metrics for provider/model"""
        try:
            key = f"{provider}_{model}"
            if key not in self.performance_metrics:
                self.performance_metrics[key] = {
                    'avg_response_time': 0,
                    'success_rate': 0,
                    'total_requests': 0,
                    'successful_requests': 0
                }
            
            metrics = self.performance_metrics[key]
            metrics['total_requests'] += 1
            
            if success:
                metrics['successful_requests'] += 1
                # Update average response time (exponential moving average)
                alpha = 0.1
                metrics['avg_response_time'] = (
                    alpha * processing_time + (1 - alpha) * metrics['avg_response_time']
                )
            
            metrics['success_rate'] = metrics['successful_requests'] / metrics['total_requests']
            
        except Exception as e:
            logger.error(f"Error updating performance metrics: {e}")