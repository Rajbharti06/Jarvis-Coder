import os
import ollama
import openai
import httpx
import json
from typing import AsyncGenerator, Dict, Optional, Any
from backend.config import settings

class AIService:
    """AI Service that supports multiple providers with dynamic routing"""
    
    def __init__(self):
        self.providers = {
            'openai': self._openai_generate,
            'anthropic': self._anthropic_generate,
            'mistral': self._mistral_generate,
            'groq': self._groq_generate,
            'ollama': self._ollama_generate,
            'custom': self._custom_generate,
            'moonshotai': self._moonshotai_generate
        }
        
        # Model to provider mapping
        self.model_provider_map = {
            # OpenAI models
            'gpt-4': 'openai',
            'gpt-4-turbo': 'openai',
            'gpt-4o': 'openai',
            'gpt-4o-mini': 'openai',
            'gpt-3.5-turbo': 'openai',
            
            # Anthropic models
            'claude-3-opus': 'anthropic',
            'claude-3-sonnet': 'anthropic',
            'claude-3-haiku': 'anthropic',
            'claude-2': 'anthropic',
            
            # Mistral models
            'mistral-large': 'mistral',
            'mistral-medium': 'mistral',
            'mistral-small': 'mistral',
            'codestral': 'mistral',
            
            # Groq models
            'llama3-70b': 'groq',
            'llama3-8b': 'groq',
            'mixtral-8x7b': 'groq',
            'gemma-7b': 'groq',
            
            # Local models (Ollama)
            'kimi-k2-instruct': 'moonshotai',
            'mistral': 'ollama',
            'gpt-oss:20b': 'ollama',
            'deepseek-coder': 'ollama',
            'codellama': 'ollama',
            'llama2': 'ollama',
            'phi3': 'ollama'
        }
    
    def _get_provider_for_model(self, model: str) -> str:
        """Determine which provider to use based on model name"""
        if model in self.model_provider_map:
            return self.model_provider_map[model]
        
        for local_model in self.model_provider_map:
            if local_model in model and self.model_provider_map[local_model] == 'ollama':
                return 'ollama'
        
        return 'openai'
    
    async def generate_response(self, message: str, model: Optional[str] = None, stream: bool = True) -> AsyncGenerator[str, None]:
        """Generate AI response using the appropriate provider"""
        model_to_use = model or settings.app_config.default_model
        provider = self._get_provider_for_model(model_to_use)

        if settings.jarvis_mode == "offline":
            provider = 'ollama'
            if model_to_use not in settings.app_config.local_models:
                model_to_use = settings.ollama_model

        elif provider == 'ollama' and not self._is_ollama_running():
            online_models = [m for m, p in self.model_provider_map.items() if p != 'ollama']
            if online_models:
                model_to_use = online_models[0]
                provider = self._get_provider_for_model(model_to_use)
            else:
                raise ValueError("Ollama is not running and no online models are configured for fallback.")

        api_key = settings.app_config.api_keys.__root__.get(provider)
        provider_config = settings.app_config.llm_providers.get(provider)

        if provider == 'ollama':
            async for chunk in self._ollama_generate(message, model_to_use, stream):
                yield chunk
        elif provider in self.providers:
            if not api_key and provider != 'custom':
                raise ValueError(f"{provider.upper()} API key not found in config.json")
            
            async for chunk in self.providers[provider](message, model_to_use, api_key, stream, provider_config=provider_config):
                yield chunk
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _is_ollama_running(self) -> bool:
        """Checks if the Ollama service is running."""
        try:
            ollama.list()
            return True
        except Exception:
            return False
    
    async def _openai_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using OpenAI"""
        api_base = provider_config.get('api_base') if provider_config else None
        client = openai.AsyncOpenAI(api_key=api_key, base_url=api_base)
        
        if stream:
            stream_response = await client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': message}],
                stream=True
            )
            async for chunk in stream_response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            response = await client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': message}],
                stream=False
            )
            yield response.choices[0].message.content
    
    async def _anthropic_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using Anthropic Claude"""
        if not provider_config or 'api_base' not in provider_config:
            raise ValueError("Anthropic provider configuration with 'api_base' is missing.")
        
        url = f"{provider_config['api_base']}/messages"
        async with httpx.AsyncClient() as client:
            headers = {
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
            
            payload = {'model': model, 'messages': [{'role': 'user', 'content': message}], 'max_tokens': 4000, 'stream': stream}
            
            if stream:
                async with client.stream('POST', url, headers=headers, json=payload, timeout=30.0) as response:
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            if data['type'] == 'content_block_delta' and 'text' in data['delta']:
                                yield data['delta']['text']
            else:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                yield data['content'][0]['text']
    
    async def _mistral_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using Mistral AI"""
        if not provider_config or 'api_base' not in provider_config:
            raise ValueError("Mistral provider configuration with 'api_base' is missing.")

        url = f"{provider_config['api_base']}/chat/completions"
        async with httpx.AsyncClient() as client:
            headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
            payload = {'model': model, 'messages': [{'role': 'user', 'content': message}], 'stream': stream}
            
            if stream:
                async with client.stream('POST', url, headers=headers, json=payload, timeout=30.0) as response:
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            if data.get('choices') and data['choices'][0].get('delta', {}).get('content'):
                                yield data['choices'][0]['delta']['content']
            else:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                yield data['choices'][0]['message']['content']
    
    async def _groq_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using Groq"""
        if not provider_config or 'api_base' not in provider_config:
            raise ValueError("Groq provider configuration with 'api_base' is missing.")

        url = f"{provider_config['api_base']}/chat/completions"
        async with httpx.AsyncClient() as client:
            headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
            payload = {'model': model, 'messages': [{'role': 'user', 'content': message}], 'stream': stream}
            
            if stream:
                async with client.stream('POST', url, headers=headers, json=payload, timeout=30.0) as response:
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            if data.get('choices') and data['choices'][0].get('delta', {}).get('content'):
                                yield data['choices'][0]['delta']['content']
            else:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                yield data['choices'][0]['message']['content']

    async def _ollama_generate(self, message: str, model: str, stream: bool = True) -> AsyncGenerator[str, None]:
        """Generate response using Ollama"""
        if stream:
            async for chunk in await ollama.chat(model=model, messages=[{'role': 'user', 'content': message}], stream=True):
                yield chunk['message']['content']
        else:
            response = await ollama.chat(model=model, messages=[{'role': 'user', 'content': message}], stream=False)
            yield response['message']['content']

    async def _custom_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using a custom API endpoint"""
        if not provider_config or 'api_base' not in provider_config:
            raise ValueError("Custom provider configuration with 'api_base' is missing.")
            
        base_url = provider_config['api_base']
        client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)

        if stream:
            stream_response = await client.chat.completions.create(model=model, messages=[{'role': 'user', 'content': message}], stream=True)
            async for chunk in stream_response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            response = await client.chat.completions.create(model=model, messages=[{'role': 'user', 'content': message}], stream=False)
            yield response.choices[0].message.content

    async def _moonshotai_generate(self, message: str, model: str, api_key: str, stream: bool = True, provider_config: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """Generate response using Moonshot AI"""
        if not provider_config or 'api_base' not in provider_config:
            raise ValueError("MoonshotAI provider configuration with 'api_base' is missing.")

        url = f"{provider_config['api_base']}/chat/completions"
        async with httpx.AsyncClient() as client:
            headers = {'Authorization': f'Bearer {api_key}','Content-Type': 'application/json'}
            payload = {'model': model, 'messages': [{'role': 'user', 'content': message}], 'stream': stream}
            
            if stream:
                async with client.stream('POST', url, headers=headers, json=payload, timeout=30.0) as response:
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            if data.get('choices') and data['choices'][0].get('delta', {}).get('content'):
                                yield data['choices'][0]['delta']['content']
            else:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                yield data['choices'][0]['message']['content']

ai_service = AIService()
