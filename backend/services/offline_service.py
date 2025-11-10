"""
Offline Service for Jarvis Terminal
Handles local LLM integration and offline mode operations
"""

import asyncio
import json
import subprocess
import aiohttp
from typing import Dict, List, Optional, Any, AsyncGenerator
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime

from fastapi import HTTPException


@dataclass
class LocalModel:
    """Information about a local model"""
    name: str
    size: str
    modified: datetime
    digest: str
    family: str
    format: str
    families: List[str]
    parameter_size: str
    quantization_level: str


@dataclass
class ModelDownloadProgress:
    """Progress information for model downloads"""
    model_name: str
    status: str  # downloading, completed, error
    progress: float  # 0.0 to 1.0
    downloaded_bytes: int
    total_bytes: int
    speed: str
    eta: str


class OfflineService:
    """Service for managing offline AI capabilities"""
    
    def __init__(self):
        self.ollama_base_url = "http://localhost:11434"
        self.ollama_api_url = f"{self.ollama_base_url}/api"
        self.is_ollama_available = False
        self.available_models: List[LocalModel] = []
        self.download_progress: Dict[str, ModelDownloadProgress] = {}
        
        # Popular models for easy installation
        self.recommended_models = {
            "llama2:7b": {
                "name": "Llama 2 7B",
                "description": "Meta's Llama 2 model, good for general chat",
                "size": "3.8GB",
                "capabilities": ["chat", "completion"]
            },
            "codellama:7b": {
                "name": "Code Llama 7B", 
                "description": "Specialized for code generation and understanding",
                "size": "3.8GB",
                "capabilities": ["code", "completion"]
            },
            "mistral:7b": {
                "name": "Mistral 7B",
                "description": "Efficient and capable model from Mistral AI",
                "size": "4.1GB",
                "capabilities": ["chat", "completion"]
            },
            "phi:2.7b": {
                "name": "Phi 2.7B",
                "description": "Microsoft's small but capable model",
                "size": "1.7GB",
                "capabilities": ["chat", "completion"]
            },
            "gemma:2b": {
                "name": "Gemma 2B",
                "description": "Google's lightweight model",
                "size": "1.4GB",
                "capabilities": ["chat", "completion"]
            },
            "qwen:4b": {
                "name": "Qwen 4B",
                "description": "Alibaba's multilingual model",
                "size": "2.3GB",
                "capabilities": ["chat", "completion", "multilingual"]
            }
        }

    async def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is installed and running"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_base_url}/api/tags", timeout=5) as response:
                    if response.status == 200:
                        self.is_ollama_available = True
                        data = await response.json()
                        await self._update_available_models(data.get("models", []))
                        return {
                            "status": "running",
                            "available": True,
                            "models_count": len(self.available_models),
                            "url": self.ollama_base_url
                        }
        except Exception as e:
            self.is_ollama_available = False
            
        # Check if Ollama is installed but not running
        try:
            result = subprocess.run(["ollama", "--version"], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return {
                    "status": "installed_not_running",
                    "available": False,
                    "message": "Ollama is installed but not running. Please start it with 'ollama serve'",
                    "version": result.stdout.strip()
                }
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return {
            "status": "not_installed",
            "available": False,
            "message": "Ollama is not installed. Please install it from https://ollama.ai"
        }

    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available local models"""
        if not self.is_ollama_available:
            await self.check_ollama_status()
        
        if not self.is_ollama_available:
            return []
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_api_url}/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        models = []
                        for model_data in data.get("models", []):
                            models.append({
                                "name": model_data["name"],
                                "size": model_data.get("size", 0),
                                "modified": model_data.get("modified_at", ""),
                                "digest": model_data.get("digest", ""),
                                "details": model_data.get("details", {})
                            })
                        return models
        except Exception as e:
            print(f"Error fetching models: {e}")
            return []

    async def get_recommended_models(self) -> Dict[str, Any]:
        """Get list of recommended models for installation"""
        installed_models = await self.get_available_models()
        installed_names = {model["name"] for model in installed_models}
        
        recommendations = {}
        for model_id, info in self.recommended_models.items():
            recommendations[model_id] = {
                **info,
                "installed": model_id in installed_names,
                "model_id": model_id
            }
        
        return recommendations

    async def install_model(self, model_name: str) -> Dict[str, Any]:
        """Install a model via Ollama"""
        if not self.is_ollama_available:
            raise HTTPException(status_code=503, detail="Ollama is not available")
        
        try:
            # Start the download process
            self.download_progress[model_name] = ModelDownloadProgress(
                model_name=model_name,
                status="downloading",
                progress=0.0,
                downloaded_bytes=0,
                total_bytes=0,
                speed="",
                eta=""
            )
            
            # Use subprocess to run ollama pull command
            process = await asyncio.create_subprocess_exec(
                "ollama", "pull", model_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                self.download_progress[model_name].status = "completed"
                self.download_progress[model_name].progress = 1.0
                
                # Refresh available models
                await self.check_ollama_status()
                
                return {
                    "success": True,
                    "message": f"Model {model_name} installed successfully",
                    "model_name": model_name
                }
            else:
                self.download_progress[model_name].status = "error"
                error_msg = stderr.decode() if stderr else "Unknown error"
                return {
                    "success": False,
                    "message": f"Failed to install {model_name}: {error_msg}",
                    "model_name": model_name
                }
                
        except Exception as e:
            if model_name in self.download_progress:
                self.download_progress[model_name].status = "error"
            raise HTTPException(status_code=500, detail=f"Installation failed: {e}")

    async def remove_model(self, model_name: str) -> Dict[str, Any]:
        """Remove a model from Ollama"""
        if not self.is_ollama_available:
            raise HTTPException(status_code=503, detail="Ollama is not available")
        
        try:
            process = await asyncio.create_subprocess_exec(
                "ollama", "rm", model_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                # Refresh available models
                await self.check_ollama_status()
                
                return {
                    "success": True,
                    "message": f"Model {model_name} removed successfully",
                    "model_name": model_name
                }
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                return {
                    "success": False,
                    "message": f"Failed to remove {model_name}: {error_msg}",
                    "model_name": model_name
                }
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Removal failed: {e}")

    async def get_download_progress(self, model_name: str) -> Optional[ModelDownloadProgress]:
        """Get download progress for a model"""
        return self.download_progress.get(model_name)

    async def generate_response(self, model_name: str, prompt: str, 
                              system_prompt: Optional[str] = None,
                              stream: bool = False) -> AsyncGenerator[str, None]:
        """Generate response using local model"""
        if not self.is_ollama_available:
            raise HTTPException(status_code=503, detail="Ollama is not available")
        
        try:
            payload = {
                "model": model_name,
                "prompt": prompt,
                "stream": stream
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_api_url}/generate",
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(status_code=response.status, 
                                          detail=f"Ollama API error: {error_text}")
                    
                    if stream:
                        async for line in response.content:
                            if line:
                                try:
                                    data = json.loads(line.decode())
                                    if "response" in data:
                                        yield data["response"]
                                    if data.get("done", False):
                                        break
                                except json.JSONDecodeError:
                                    continue
                    else:
                        data = await response.json()
                        yield data.get("response", "")
                        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    async def chat_with_model(self, model_name: str, messages: List[Dict[str, str]], 
                             stream: bool = False) -> AsyncGenerator[str, None]:
        """Chat with local model using conversation format"""
        if not self.is_ollama_available:
            raise HTTPException(status_code=503, detail="Ollama is not available")
        
        try:
            payload = {
                "model": model_name,
                "messages": messages,
                "stream": stream
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_api_url}/chat",
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(status_code=response.status, 
                                          detail=f"Ollama API error: {error_text}")
                    
                    if stream:
                        async for line in response.content:
                            if line:
                                try:
                                    data = json.loads(line.decode())
                                    if "message" in data and "content" in data["message"]:
                                        yield data["message"]["content"]
                                    if data.get("done", False):
                                        break
                                except json.JSONDecodeError:
                                    continue
                    else:
                        data = await response.json()
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Chat failed: {e}")

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific model"""
        if not self.is_ollama_available:
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_api_url}/show",
                    json={"name": model_name}
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return None
        except Exception:
            return None

    async def start_ollama_service(self) -> Dict[str, Any]:
        """Attempt to start Ollama service"""
        try:
            # Try to start Ollama in the background
            process = await asyncio.create_subprocess_exec(
                "ollama", "serve",
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            
            # Wait a moment for the service to start
            await asyncio.sleep(2)
            
            # Check if it's now available
            status = await self.check_ollama_status()
            
            if status["available"]:
                return {
                    "success": True,
                    "message": "Ollama service started successfully",
                    "status": status
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to start Ollama service",
                    "status": status
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to start Ollama: {e}",
                "status": await self.check_ollama_status()
            }

    # Private methods
    
    async def _update_available_models(self, models_data: List[Dict[str, Any]]):
        """Update the list of available models"""
        self.available_models = []
        for model_data in models_data:
            try:
                model = LocalModel(
                    name=model_data["name"],
                    size=str(model_data.get("size", 0)),
                    modified=datetime.fromisoformat(model_data.get("modified_at", "").replace("Z", "+00:00")),
                    digest=model_data.get("digest", ""),
                    family=model_data.get("details", {}).get("family", ""),
                    format=model_data.get("details", {}).get("format", ""),
                    families=model_data.get("details", {}).get("families", []),
                    parameter_size=model_data.get("details", {}).get("parameter_size", ""),
                    quantization_level=model_data.get("details", {}).get("quantization_level", "")
                )
                self.available_models.append(model)
            except Exception as e:
                print(f"Error parsing model data: {e}")
                continue


# Global instance
offline_service = OfflineService()