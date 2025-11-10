"""
Offline AI Service
Handles local AI model processing for offline mode operation
Supports Ollama, local transformers, and other offline AI solutions
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from typing import Dict, List, Optional, Any, AsyncGenerator
from pathlib import Path
import aiohttp
import aiofiles

from backend.core.config import settings

logger = logging.getLogger(__name__)

class OfflineAIService:
    """
    Service for managing offline AI models and local processing
    Supports Ollama, Hugging Face Transformers, and other local solutions
    """
    
    def __init__(self):
        self.ollama_url = "http://localhost:11434"
        self.available_models = []
        self.model_cache = {}
        self.performance_metrics = {}
        self.models_dir = Path(settings.workspace_dir) / "models"
        self.models_dir.mkdir(exist_ok=True)
        
        # Initialize offline capabilities (will be called when needed)
        self._initialized = False
    
    async def _init_offline_models(self):
        """Initialize offline AI models and check availability"""
        try:
            # Check Ollama availability
            await self._check_ollama_availability()
            
            # Check for local model files
            await self._scan_local_models()
            
            # Initialize default models if none available
            if not self.available_models:
                await self._setup_default_models()
                
            logger.info(f"Initialized {len(self.available_models)} offline models")
            
        except Exception as e:
            logger.error(f"Error initializing offline models: {e}")
        finally:
            self._initialized = True
    
    async def ensure_initialized(self):
        """Ensure offline models are initialized"""
        if not self._initialized:
            await self._init_offline_models()
    
    async def _check_ollama_availability(self):
        """Check if Ollama is running and get available models"""
        try:
            async with aiohttp.ClientSession() as session:
                # Check if Ollama is running
                async with session.get(f"{self.ollama_url}/api/tags", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        for model in data.get('models', []):
                            self.available_models.append({
                                'name': model['name'],
                                'type': 'ollama',
                                'size_mb': model.get('size', 0) // (1024 * 1024),
                                'capabilities': ['text', 'code', 'reasoning'],
                                'performance_score': 0.8,
                                'status': 'available'
                            })
                        logger.info(f"Found {len(data.get('models', []))} Ollama models")
        except Exception as e:
            logger.debug(f"Ollama not available: {e}")
    
    async def _scan_local_models(self):
        """Scan for local model files"""
        try:
            # Look for common model formats
            model_extensions = ['.gguf', '.bin', '.safetensors', '.pt', '.pth']
            
            for ext in model_extensions:
                for model_file in self.models_dir.glob(f"**/*{ext}"):
                    model_info = await self._analyze_model_file(model_file)
                    if model_info:
                        self.available_models.append(model_info)
                        
        except Exception as e:
            logger.error(f"Error scanning local models: {e}")
    
    async def _analyze_model_file(self, model_path: Path) -> Optional[Dict[str, Any]]:
        """Analyze a model file to extract information"""
        try:
            file_size = model_path.stat().st_size
            size_mb = file_size // (1024 * 1024)
            
            # Basic model info based on filename and size
            model_name = model_path.stem
            model_type = "local"
            
            # Estimate capabilities based on size
            capabilities = ['text']
            if size_mb > 1000:  # Larger models typically have more capabilities
                capabilities.extend(['code', 'reasoning'])
            if size_mb > 5000:  # Very large models
                capabilities.append('advanced_reasoning')
            
            return {
                'name': model_name,
                'type': model_type,
                'path': str(model_path),
                'size_mb': size_mb,
                'capabilities': capabilities,
                'performance_score': min(0.9, size_mb / 10000),  # Rough estimate
                'status': 'available'
            }
        except Exception as e:
            logger.error(f"Error analyzing model file {model_path}: {e}")
            return None
    
    async def _setup_default_models(self):
        """Setup default offline models if none are available"""
        try:
            # Try to install a basic Ollama model
            if await self._is_ollama_running():
                await self._install_ollama_model("llama2:7b")
            else:
                # Add a placeholder for manual setup
                self.available_models.append({
                    'name': 'setup_required',
                    'type': 'placeholder',
                    'size_mb': 0,
                    'capabilities': [],
                    'performance_score': 0,
                    'status': 'setup_required',
                    'message': 'Please install Ollama or add local model files'
                })
        except Exception as e:
            logger.error(f"Error setting up default models: {e}")
    
    async def is_available(self) -> bool:
        """Check if offline AI capabilities are available"""
        try:
            return len([m for m in self.available_models if m['status'] == 'available']) > 0
        except Exception:
            return False
    
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available offline models"""
        return self.available_models
    
    async def generate_response(
        self,
        message: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        context: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Generate response using offline models"""
        try:
            # Select best available model
            selected_model = await self._select_best_model(model)
            if not selected_model:
                raise ValueError("No offline models available")
            
            # Route to appropriate generation method
            if selected_model['type'] == 'ollama':
                return await self._generate_ollama_response(
                    selected_model, message, temperature, max_tokens, system_prompt, context
                )
            elif selected_model['type'] == 'local':
                return await self._generate_local_response(
                    selected_model, message, temperature, max_tokens, system_prompt, context
                )
            else:
                raise ValueError(f"Unsupported model type: {selected_model['type']}")
                
        except Exception as e:
            logger.error(f"Error generating offline response: {e}")
            raise
    
    async def generate_response_stream(
        self,
        message: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
        context: Optional[List[Dict[str, str]]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using offline models"""
        try:
            # Select best available model
            selected_model = await self._select_best_model(model)
            if not selected_model:
                raise ValueError("No offline models available")
            
            # Route to appropriate streaming method
            if selected_model['type'] == 'ollama':
                async for chunk in self._generate_ollama_response_stream(
                    selected_model, message, temperature, max_tokens, system_prompt, context
                ):
                    yield chunk
            elif selected_model['type'] == 'local':
                async for chunk in self._generate_local_response_stream(
                    selected_model, message, temperature, max_tokens, system_prompt, context
                ):
                    yield chunk
            else:
                yield f"Error: Unsupported model type: {selected_model['type']}"
                
        except Exception as e:
            logger.error(f"Error in offline streaming response: {e}")
            yield f"Error: {str(e)}"
    
    async def _select_best_model(self, requested_model: Optional[str]) -> Optional[Dict[str, Any]]:
        """Select the best available offline model"""
        try:
            available = [m for m in self.available_models if m['status'] == 'available']
            if not available:
                return None
            
            # If specific model requested, try to find it
            if requested_model:
                for model in available:
                    if model['name'] == requested_model:
                        return model
            
            # Otherwise, select best performing model
            return max(available, key=lambda x: x['performance_score'])
            
        except Exception as e:
            logger.error(f"Error selecting model: {e}")
            return None
    
    async def _generate_ollama_response(
        self,
        model: Dict[str, Any],
        message: str,
        temperature: float,
        max_tokens: Optional[int],
        system_prompt: Optional[str],
        context: Optional[List[Dict[str, str]]]
    ) -> str:
        """Generate response using Ollama"""
        try:
            # Prepare the prompt
            full_prompt = ""
            if system_prompt:
                full_prompt += f"System: {system_prompt}\n\n"
            
            if context:
                for msg in context:
                    full_prompt += f"{msg['role']}: {msg['content']}\n"
            
            full_prompt += f"User: {message}\nAssistant:"
            
            # Make request to Ollama
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": model['name'],
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens or 2048
                        }
                    }
                ) as response:
                    data = await response.json()
                    return data.get('response', 'No response generated')
                    
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            raise
    
    async def _generate_ollama_response_stream(
        self,
        model: Dict[str, Any],
        message: str,
        temperature: float,
        max_tokens: Optional[int],
        system_prompt: Optional[str],
        context: Optional[List[Dict[str, str]]]
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using Ollama"""
        try:
            # Prepare the prompt
            full_prompt = ""
            if system_prompt:
                full_prompt += f"System: {system_prompt}\n\n"
            
            if context:
                for msg in context:
                    full_prompt += f"{msg['role']}: {msg['content']}\n"
            
            full_prompt += f"User: {message}\nAssistant:"
            
            # Make streaming request to Ollama
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": model['name'],
                        "prompt": full_prompt,
                        "stream": True,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens or 2048
                        }
                    }
                ) as response:
                    async for line in response.content:
                        if line:
                            try:
                                data = json.loads(line.decode('utf-8'))
                                if 'response' in data:
                                    yield data['response']
                                if data.get('done', False):
                                    break
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def _generate_local_response(
        self,
        model: Dict[str, Any],
        message: str,
        temperature: float,
        max_tokens: Optional[int],
        system_prompt: Optional[str],
        context: Optional[List[Dict[str, str]]]
    ) -> str:
        """Generate response using local model files"""
        try:
            # This is a placeholder for local model inference
            # In a real implementation, you would use libraries like:
            # - transformers (Hugging Face)
            # - llama.cpp Python bindings
            # - ONNX Runtime
            # - TensorFlow/PyTorch
            
            # For now, return a simulated response
            await asyncio.sleep(1)  # Simulate processing time
            
            response = f"[Offline Response from {model['name']}] "
            if system_prompt:
                response += f"Following system prompt: {system_prompt[:50]}... "
            
            response += f"Responding to: {message[:100]}..."
            
            return response
            
        except Exception as e:
            logger.error(f"Local model generation error: {e}")
            raise
    
    async def _generate_local_response_stream(
        self,
        model: Dict[str, Any],
        message: str,
        temperature: float,
        max_tokens: Optional[int],
        system_prompt: Optional[str],
        context: Optional[List[Dict[str, str]]]
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using local model files"""
        try:
            # Placeholder for local model streaming
            response = f"[Offline Streaming from {model['name']}] Responding to your message..."
            
            # Simulate streaming by yielding chunks
            words = response.split()
            for word in words:
                yield word + " "
                await asyncio.sleep(0.1)  # Simulate processing delay
                
        except Exception as e:
            logger.error(f"Local model streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def health_check(self) -> bool:
        """Check health of offline AI services"""
        try:
            available_count = len([m for m in self.available_models if m['status'] == 'available'])
            return available_count > 0
        except Exception:
            return False
    
    async def install_model(self, model_name: str, model_type: str = "ollama") -> Dict[str, Any]:
        """Install a new offline model"""
        try:
            if model_type == "ollama":
                return await self._install_ollama_model(model_name)
            else:
                return await self._download_model_file(model_name)
        except Exception as e:
            logger.error(f"Error installing model {model_name}: {e}")
            raise
    
    async def _install_ollama_model(self, model_name: str) -> Dict[str, Any]:
        """Install an Ollama model"""
        try:
            if not await self._is_ollama_running():
                raise ValueError("Ollama is not running")
            
            # Pull the model
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/pull",
                    json={"name": model_name}
                ) as response:
                    if response.status == 200:
                        # Refresh available models
                        await self._check_ollama_availability()
                        return {
                            "status": "success",
                            "message": f"Model {model_name} installed successfully"
                        }
                    else:
                        raise ValueError(f"Failed to install model: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error installing Ollama model {model_name}: {e}")
            raise
    
    async def _download_model_file(self, model_url: str) -> Dict[str, Any]:
        """Download a model file from URL"""
        try:
            # Extract filename from URL
            filename = model_url.split('/')[-1]
            model_path = self.models_dir / filename
            
            # Download the file
            async with aiohttp.ClientSession() as session:
                async with session.get(model_url) as response:
                    if response.status == 200:
                        async with aiofiles.open(model_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                await f.write(chunk)
                        
                        # Analyze the downloaded model
                        model_info = await self._analyze_model_file(model_path)
                        if model_info:
                            self.available_models.append(model_info)
                        
                        return {
                            "status": "success",
                            "message": f"Model downloaded to {model_path}"
                        }
                    else:
                        raise ValueError(f"Failed to download model: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error downloading model from {model_url}: {e}")
            raise
    
    async def remove_model(self, model_name: str) -> Dict[str, Any]:
        """Remove an offline model"""
        try:
            # Find the model
            model_to_remove = None
            for model in self.available_models:
                if model['name'] == model_name:
                    model_to_remove = model
                    break
            
            if not model_to_remove:
                raise ValueError(f"Model {model_name} not found")
            
            if model_to_remove['type'] == 'ollama':
                return await self._remove_ollama_model(model_name)
            elif model_to_remove['type'] == 'local':
                return await self._remove_local_model(model_to_remove)
            else:
                raise ValueError(f"Cannot remove model of type {model_to_remove['type']}")
                
        except Exception as e:
            logger.error(f"Error removing model {model_name}: {e}")
            raise
    
    async def _remove_ollama_model(self, model_name: str) -> Dict[str, Any]:
        """Remove an Ollama model"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.ollama_url}/api/delete",
                    json={"name": model_name}
                ) as response:
                    if response.status == 200:
                        # Remove from available models
                        self.available_models = [
                            m for m in self.available_models 
                            if not (m['name'] == model_name and m['type'] == 'ollama')
                        ]
                        return {
                            "status": "success",
                            "message": f"Model {model_name} removed successfully"
                        }
                    else:
                        raise ValueError(f"Failed to remove model: {response.status}")
        except Exception as e:
            logger.error(f"Error removing Ollama model {model_name}: {e}")
            raise
    
    async def _remove_local_model(self, model: Dict[str, Any]) -> Dict[str, Any]:
        """Remove a local model file"""
        try:
            model_path = Path(model['path'])
            if model_path.exists():
                model_path.unlink()
            
            # Remove from available models
            self.available_models = [m for m in self.available_models if m != model]
            
            return {
                "status": "success",
                "message": f"Model {model['name']} removed successfully"
            }
        except Exception as e:
            logger.error(f"Error removing local model {model['name']}: {e}")
            raise
    
    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific model"""
        try:
            for model in self.available_models:
                if model['name'] == model_name:
                    # Add runtime information
                    model_info = model.copy()
                    model_info['performance_metrics'] = self.performance_metrics.get(model_name, {})
                    return model_info
            return None
        except Exception as e:
            logger.error(f"Error getting model info for {model_name}: {e}")
            return None
    
    async def _is_ollama_running(self) -> bool:
        """Check if Ollama service is running"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_url}/api/tags", timeout=3) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def start_ollama(self) -> Dict[str, str]:
        """Start Ollama service"""
        try:
            # Try to start Ollama (this depends on the system)
            if os.name == 'nt':  # Windows
                subprocess.Popen(['ollama', 'serve'], shell=True)
            else:  # Unix-like
                subprocess.Popen(['ollama', 'serve'])
            
            # Wait a bit for startup
            await asyncio.sleep(3)
            
            if await self._is_ollama_running():
                return {"status": "success", "message": "Ollama started successfully"}
            else:
                return {"status": "error", "message": "Failed to start Ollama"}
                
        except Exception as e:
            logger.error(f"Error starting Ollama: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_system_resources(self) -> Dict[str, Any]:
        """Get system resource usage for offline models"""
        try:
            import psutil
            
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage(str(self.models_dir)).percent,
                "available_models": len(self.available_models),
                "models_size_mb": sum(m.get('size_mb', 0) for m in self.available_models)
            }
        except Exception as e:
            logger.error(f"Error getting system resources: {e}")
            return {}
    
    async def optimize_models(self) -> Dict[str, Any]:
        """Optimize offline models for better performance"""
        try:
            optimizations = []
            
            # Remove unused models
            for model in self.available_models[:]:
                if model.get('last_used'):
                    # Remove models not used in 30 days
                    last_used = time.time() - model['last_used']
                    if last_used > 30 * 24 * 3600:  # 30 days
                        await self.remove_model(model['name'])
                        optimizations.append(f"Removed unused model: {model['name']}")
            
            # Clear model cache
            self.model_cache.clear()
            optimizations.append("Cleared model cache")
            
            return {
                "status": "success",
                "optimizations": optimizations,
                "message": f"Applied {len(optimizations)} optimizations"
            }
        except Exception as e:
            logger.error(f"Error optimizing models: {e}")
            return {"status": "error", "message": str(e)}