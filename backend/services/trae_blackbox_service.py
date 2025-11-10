"""
Trae Cursor Blackbox Service
Core AI assistant service with dual-mode operation, multi-model support, and self-improvement
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncGenerator
from pathlib import Path
import sqlite3
import aiosqlite

from backend.services.ai_service import AIService
from backend.services.multi_model_service import MultiModelService
from backend.services.offline_ai_service import OfflineAIService
from backend.services.learning_service import LearningService
from backend.core.config import settings

logger = logging.getLogger(__name__)

class TraeBlackboxService:
    """
    Core service for Trae Cursor Blackbox AI Assistant
    Handles dual-mode operation, intelligent routing, and self-improvement
    """
    
    def __init__(self):
        self.ai_service = AIService()
        self.multi_model_service = MultiModelService()
        self.offline_service = OfflineAIService()
        self.learning_service = LearningService(db_path=str(Path(settings.workspace_dir) / "learning.db"))
        
        # System state
        self.current_mode = "auto"
        self.current_provider = None
        self.system_health = {}
        self.performance_metrics = {}
        
        # Database for conversations and learning
        self.db_path = Path(settings.workspace_dir) / "trae_blackbox.db"
        self._init_database()
        
        # Performance tracking
        self.response_times = []
        self.success_rates = {}
        self.user_satisfaction = {}
        
    def _init_database(self):
        """Initialize SQLite database for conversations and learning data"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.executescript("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT
                    );
                    
                    CREATE TABLE IF NOT EXISTS messages (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT,
                        role TEXT,
                        content TEXT,
                        provider TEXT,
                        mode TEXT,
                        tokens_used INTEGER,
                        processing_time REAL,
                        confidence_score REAL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
                    );
                    
                    CREATE TABLE IF NOT EXISTS feedback (
                        id TEXT PRIMARY KEY,
                        message_id TEXT,
                        feedback_type TEXT,
                        rating INTEGER,
                        comments TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (message_id) REFERENCES messages (id)
                    );
                    
                    CREATE TABLE IF NOT EXISTS learning_data (
                        id TEXT PRIMARY KEY,
                        input_pattern TEXT,
                        output_pattern TEXT,
                        success_rate REAL,
                        usage_count INTEGER DEFAULT 1,
                        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id TEXT PRIMARY KEY,
                        metric_name TEXT,
                        metric_value REAL,
                        provider TEXT,
                        mode TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        try:
            # Check provider availability
            available_providers = await self.multi_model_service.get_available_providers()
            offline_models = await self.offline_service.get_available_models()
            
            # System health checks
            health_checks = {
                "database": await self._check_database_health(),
                "providers": await self._check_providers_health(),
                "offline_models": await self._check_offline_models_health(),
                "memory_usage": await self._get_memory_usage(),
                "disk_space": await self._get_disk_space()
            }
            
            # Performance metrics
            metrics = await self._get_performance_metrics()
            
            return {
                "status": "healthy" if all(health_checks.values()) else "degraded",
                "mode": self.current_mode,
                "available_providers": available_providers,
                "offline_models": offline_models,
                "system_health": health_checks,
                "performance_metrics": metrics
            }
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {
                "status": "error",
                "mode": self.current_mode,
                "available_providers": [],
                "offline_models": [],
                "system_health": {},
                "performance_metrics": {}
            }
    
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get all available AI models with their capabilities"""
        try:
            models = []
            
            # Online models
            online_models = await self.multi_model_service.get_models()
            for model in online_models:
                models.append({
                    "name": model["name"],
                    "provider": model["provider"],
                    "type": "online",
                    "capabilities": model.get("capabilities", []),
                    "offline_available": False,
                    "performance_score": model.get("performance_score")
                })
            
            # Offline models
            offline_models = await self.offline_service.get_available_models()
            for model in offline_models:
                models.append({
                    "name": model["name"],
                    "provider": "local",
                    "type": "offline",
                    "capabilities": model.get("capabilities", []),
                    "offline_available": True,
                    "size_mb": model.get("size_mb"),
                    "performance_score": model.get("performance_score")
                })
            
            return models
        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return []
    
    async def generate_response(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        mode: str = "auto",
        provider: Optional[str] = None,
        message_type: str = "text",
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate AI response with intelligent routing"""
        start_time = time.time()
        
        try:
            # Create or get conversation
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                await self._create_conversation(conversation_id, user_id)
            
            # Determine optimal provider and mode
            optimal_config = await self._determine_optimal_config(
                message, mode, provider, message_type, context
            )
            
            # Generate response based on mode
            if optimal_config["mode"] == "offline":
                response_data = await self._generate_offline_response(
                    message, optimal_config, temperature, max_tokens
                )
            else:
                response_data = await self._generate_online_response(
                    message, optimal_config, temperature, max_tokens
                )
            
            processing_time = time.time() - start_time
            
            # Store message and response
            message_id = await self._store_message(
                conversation_id=conversation_id,
                role="user",
                content=message,
                provider=optimal_config["provider"],
                mode=optimal_config["mode"],
                processing_time=processing_time
            )
            
            response_id = await self._store_message(
                conversation_id=conversation_id,
                role="assistant",
                content=response_data["response"],
                provider=optimal_config["provider"],
                mode=optimal_config["mode"],
                tokens_used=response_data.get("tokens_used"),
                processing_time=processing_time,
                confidence_score=response_data.get("confidence_score")
            )
            
            # Update performance metrics
            await self._update_performance_metrics(
                optimal_config["provider"],
                optimal_config["mode"],
                processing_time,
                response_data.get("confidence_score", 0.8)
            )
            
            return {
                "response": response_data["response"],
                "conversation_id": conversation_id,
                "provider_used": optimal_config["provider"],
                "mode_used": optimal_config["mode"],
                "tokens_used": response_data.get("tokens_used"),
                "confidence_score": response_data.get("confidence_score"),
                "metadata": {
                    "message_id": message_id,
                    "response_id": response_id,
                    "processing_time": processing_time
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    async def generate_response_stream(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        mode: str = "auto",
        provider: Optional[str] = None,
        message_type: str = "text",
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        user_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming AI response"""
        start_time = time.time()
        
        try:
            # Create or get conversation
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                await self._create_conversation(conversation_id, user_id)
            
            # Determine optimal provider and mode
            optimal_config = await self._determine_optimal_config(
                message, mode, provider, message_type, context
            )
            
            # Yield initial metadata
            yield {
                "type": "metadata",
                "conversation_id": conversation_id,
                "provider": optimal_config["provider"],
                "mode": optimal_config["mode"]
            }
            
            # Generate streaming response
            full_response = ""
            if optimal_config["mode"] == "offline":
                async for chunk in self._generate_offline_response_stream(
                    message, optimal_config, temperature, max_tokens
                ):
                    full_response += chunk.get("content", "")
                    yield chunk
            else:
                async for chunk in self._generate_online_response_stream(
                    message, optimal_config, temperature, max_tokens
                ):
                    full_response += chunk.get("content", "")
                    yield chunk
            
            processing_time = time.time() - start_time
            
            # Store conversation data
            await self._store_message(
                conversation_id=conversation_id,
                role="user",
                content=message,
                provider=optimal_config["provider"],
                mode=optimal_config["mode"],
                processing_time=processing_time
            )
            
            await self._store_message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                provider=optimal_config["provider"],
                mode=optimal_config["mode"],
                processing_time=processing_time
            )
            
            # Yield completion metadata
            yield {
                "type": "complete",
                "processing_time": processing_time,
                "tokens_used": len(full_response.split()) * 1.3  # Rough estimate
            }
            
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            yield {"type": "error", "error": str(e)}
    
    async def _determine_optimal_config(
        self,
        message: str,
        mode: str,
        provider: Optional[str],
        message_type: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Determine optimal provider and mode based on various factors"""
        try:
            # If specific provider requested, use it
            if provider and mode != "offline":
                if await self.multi_model_service.is_provider_available(provider):
                    return {"provider": provider, "mode": "online"}
            
            # Auto mode - intelligent selection
            if mode == "auto":
                # Check system load and availability
                system_load = await self._get_system_load()
                
                # Prefer offline for simple tasks or high load
                if (message_type in ["text", "simple"] or 
                    system_load > 0.8 or 
                    not await self._is_internet_available()):
                    
                    if await self.offline_service.is_available():
                        return {"provider": "local", "mode": "offline"}
                
                # Use online for complex tasks
                best_provider = await self._get_best_online_provider(message_type)
                if best_provider:
                    return {"provider": best_provider, "mode": "online"}
                
                # Fallback to offline
                return {"provider": "local", "mode": "offline"}
            
            # Forced offline mode
            elif mode == "offline":
                return {"provider": "local", "mode": "offline"}
            
            # Forced online mode
            else:
                best_provider = await self._get_best_online_provider(message_type)
                return {"provider": best_provider or "openai", "mode": "online"}
                
        except Exception as e:
            logger.error(f"Error determining optimal config: {e}")
            return {"provider": "local", "mode": "offline"}
    
    async def _generate_offline_response(
        self, message: str, config: Dict[str, str], temperature: float, max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate response using offline models"""
        try:
            response = await self.offline_service.generate_response(
                message=message,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return {
                "response": response,
                "confidence_score": 0.8,  # Default for offline
                "tokens_used": len(response.split()) * 1.3
            }
        except Exception as e:
            logger.error(f"Offline response generation error: {e}")
            raise
    
    async def _generate_online_response(
        self, message: str, config: Dict[str, str], temperature: float, max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate response using online models"""
        try:
            response_data = await self.multi_model_service.generate_response(
                provider=config["provider"],
                message=message,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response_data
        except Exception as e:
            logger.error(f"Online response generation error: {e}")
            raise
    
    async def _generate_offline_response_stream(
        self, message: str, config: Dict[str, str], temperature: float, max_tokens: Optional[int]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming response using offline models"""
        try:
            async for chunk in self.offline_service.generate_response_stream(
                message=message,
                temperature=temperature,
                max_tokens=max_tokens
            ):
                yield {"type": "content", "content": chunk}
        except Exception as e:
            logger.error(f"Offline streaming error: {e}")
            yield {"type": "error", "error": str(e)}
    
    async def _generate_online_response_stream(
        self, message: str, config: Dict[str, str], temperature: float, max_tokens: Optional[int]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming response using online models"""
        try:
            async for chunk in self.multi_model_service.generate_response_stream(
                provider=config["provider"],
                message=message,
                temperature=temperature,
                max_tokens=max_tokens
            ):
                yield {"type": "content", "content": chunk}
        except Exception as e:
            logger.error(f"Online streaming error: {e}")
            yield {"type": "error", "error": str(e)}
    
    async def switch_mode(self, mode: str, user_id: Optional[str] = None) -> Dict[str, str]:
        """Switch operation mode"""
        try:
            if mode == "offline":
                if not await self.offline_service.is_available():
                    raise ValueError("Offline models not available")
            elif mode == "online":
                if not await self._is_internet_available():
                    raise ValueError("Internet connection not available")
            
            self.current_mode = mode
            return {
                "mode": mode,
                "message": f"Successfully switched to {mode} mode"
            }
        except Exception as e:
            logger.error(f"Mode switch error: {e}")
            raise
    
    async def switch_provider(self, provider: str, user_id: Optional[str] = None) -> Dict[str, str]:
        """Switch AI provider"""
        try:
            if not await self.multi_model_service.is_provider_available(provider):
                raise ValueError(f"Provider {provider} not available")
            
            self.current_provider = provider
            return {
                "provider": provider,
                "message": f"Successfully switched to {provider} provider"
            }
        except Exception as e:
            logger.error(f"Provider switch error: {e}")
            raise
    
    async def learn_from_interaction(
        self, user_message: str, ai_response: str, metadata: Dict[str, Any]
    ):
        """Learn from user interactions for self-improvement"""
        try:
            await self.learning_service.process_interaction(
                user_message, ai_response, metadata
            )
        except Exception as e:
            logger.error(f"Learning error: {e}")
    
    async def process_feedback(
        self, conversation_id: str, message_id: str, feedback: Dict[str, Any], user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """Process user feedback for improvement"""
        try:
            await self.learning_service.process_feedback(
                conversation_id, message_id, feedback, user_id
            )
            return {"status": "success", "message": "Feedback processed successfully"}
        except Exception as e:
            logger.error(f"Feedback processing error: {e}")
            raise
    
    async def get_performance_analytics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get performance analytics and metrics"""
        try:
            return await self.learning_service.get_analytics(user_id)
        except Exception as e:
            logger.error(f"Analytics error: {e}")
            return {}
    
    async def trigger_upgrade(self, user_id: Optional[str] = None) -> Dict[str, str]:
        """Trigger autonomous system upgrade"""
        try:
            upgrade_result = await self.learning_service.trigger_upgrade()
            return {
                "message": "System upgrade initiated",
                "version": upgrade_result.get("version", "unknown")
            }
        except Exception as e:
            logger.error(f"Upgrade error: {e}")
            raise
    
    # Helper methods
    async def _create_conversation(self, conversation_id: str, user_id: Optional[str]):
        """Create new conversation in database"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    "INSERT INTO conversations (id, user_id, metadata) VALUES (?, ?, ?)",
                    (conversation_id, user_id, json.dumps({}))
                )
                await db.commit()
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
    
    async def _store_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        provider: str,
        mode: str,
        tokens_used: Optional[int] = None,
        processing_time: Optional[float] = None,
        confidence_score: Optional[float] = None
    ) -> str:
        """Store message in database"""
        try:
            message_id = str(uuid.uuid4())
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """INSERT INTO messages 
                       (id, conversation_id, role, content, provider, mode, tokens_used, processing_time, confidence_score)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (message_id, conversation_id, role, content, provider, mode, 
                     tokens_used, processing_time, confidence_score)
                )
                await db.commit()
            return message_id
        except Exception as e:
            logger.error(f"Error storing message: {e}")
            return ""
    
    async def _check_database_health(self) -> bool:
        """Check database health"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("SELECT 1")
            return True
        except Exception:
            return False
    
    async def _check_providers_health(self) -> bool:
        """Check online providers health"""
        try:
            return await self.multi_model_service.health_check()
        except Exception:
            return False
    
    async def _check_offline_models_health(self) -> bool:
        """Check offline models health"""
        try:
            return await self.offline_service.health_check()
        except Exception:
            return False
    
    async def _get_memory_usage(self) -> float:
        """Get current memory usage percentage"""
        try:
            import psutil
            return psutil.virtual_memory().percent
        except Exception:
            return 0.0
    
    async def _get_disk_space(self) -> float:
        """Get available disk space percentage"""
        try:
            import psutil
            return psutil.disk_usage('/').free / psutil.disk_usage('/').total * 100
        except Exception:
            return 100.0
    
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        try:
            return {
                "avg_response_time": sum(self.response_times[-100:]) / len(self.response_times[-100:]) if self.response_times else 0,
                "success_rate": sum(self.success_rates.values()) / len(self.success_rates) if self.success_rates else 1.0,
                "user_satisfaction": sum(self.user_satisfaction.values()) / len(self.user_satisfaction) if self.user_satisfaction else 0.8
            }
        except Exception:
            return {}
    
    async def _get_system_load(self) -> float:
        """Get current system load"""
        try:
            import psutil
            return psutil.cpu_percent(interval=1) / 100.0
        except Exception:
            return 0.5
    
    async def _is_internet_available(self) -> bool:
        """Check if internet connection is available"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get('https://www.google.com', timeout=5) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _get_best_online_provider(self, message_type: str) -> Optional[str]:
        """Get best online provider for message type"""
        try:
            return await self.multi_model_service.get_best_provider(message_type)
        except Exception:
            return "openai"
    
    async def _update_performance_metrics(
        self, provider: str, mode: str, processing_time: float, confidence_score: float
    ):
        """Update performance metrics"""
        try:
            self.response_times.append(processing_time)
            if len(self.response_times) > 1000:
                self.response_times = self.response_times[-500:]
            
            key = f"{provider}_{mode}"
            if key not in self.success_rates:
                self.success_rates[key] = []
            self.success_rates[key].append(confidence_score)
            
            if len(self.success_rates[key]) > 100:
                self.success_rates[key] = self.success_rates[key][-50:]
                
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    async def get_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get conversation by ID"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Get conversation
                async with db.execute(
                    "SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR ? IS NULL)",
                    (conversation_id, user_id, user_id)
                ) as cursor:
                    conversation = await cursor.fetchone()
                
                if not conversation:
                    raise ValueError("Conversation not found")
                
                # Get messages
                async with db.execute(
                    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at",
                    (conversation_id,)
                ) as cursor:
                    messages = await cursor.fetchall()
                
                return {
                    "id": conversation[0],
                    "user_id": conversation[1],
                    "created_at": conversation[2],
                    "updated_at": conversation[3],
                    "messages": [
                        {
                            "id": msg[0],
                            "role": msg[2],
                            "content": msg[3],
                            "provider": msg[4],
                            "mode": msg[5],
                            "tokens_used": msg[6],
                            "processing_time": msg[7],
                            "confidence_score": msg[8],
                            "created_at": msg[9]
                        } for msg in messages
                    ]
                }
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            raise
    
    async def delete_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> bool:
        """Delete conversation"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Delete messages first
                await db.execute(
                    "DELETE FROM messages WHERE conversation_id = ?",
                    (conversation_id,)
                )
                
                # Delete conversation
                await db.execute(
                    "DELETE FROM conversations WHERE id = ? AND (user_id = ? OR ? IS NULL)",
                    (conversation_id, user_id, user_id)
                )
                
                await db.commit()
                return True
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            return False