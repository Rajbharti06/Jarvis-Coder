"""
Trae Cursor Blackbox AI Assistant API
Comprehensive AI assistant system with dual-mode operation and multi-model support
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, AsyncGenerator
from enum import Enum
import asyncio
import json
import logging
from datetime import datetime

from backend.services.trae_blackbox_service import TraeBlackboxService
from backend.services.security_service import SecurityService
from backend.models.conversation import Conversation, Message
from backend.core.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
trae_service = TraeBlackboxService()
security_service = SecurityService(db_path="./security.db")

class OperationMode(str, Enum):
    OFFLINE = "offline"
    ONLINE = "online"
    AUTO = "auto"

class AIProvider(str, Enum):
    GOOGLE_AI = "google_ai"
    PERPLEXITY = "perplexity"
    GROK = "grok"
    CHATGPT = "chatgpt"
    CLAUDE = "claude"
    OLLAMA = "ollama"
    LOCAL = "local"

class MessageType(str, Enum):
    TEXT = "text"
    CODE = "code"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    TECHNICAL = "technical"

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    mode: OperationMode = Field(OperationMode.AUTO, description="Operation mode")
    provider: Optional[AIProvider] = Field(None, description="Preferred AI provider")
    message_type: MessageType = Field(MessageType.TEXT, description="Type of message")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    stream: bool = Field(True, description="Stream response")
    temperature: Optional[float] = Field(0.7, description="Response creativity")
    max_tokens: Optional[int] = Field(None, description="Maximum response tokens")

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    provider_used: str
    mode_used: str
    tokens_used: Optional[int] = None
    processing_time: float
    confidence_score: Optional[float] = None

class SystemStatus(BaseModel):
    status: str
    mode: str
    available_providers: List[str]
    offline_models: List[str]
    system_health: Dict[str, Any]
    performance_metrics: Dict[str, Any]

class ModelInfo(BaseModel):
    name: str
    provider: str
    type: str
    capabilities: List[str]
    offline_available: bool
    size_mb: Optional[int] = None
    performance_score: Optional[float] = None

@router.get("/status", response_model=SystemStatus)
async def get_system_status():
    """Get current system status and available capabilities"""
    try:
        status = await trae_service.get_system_status()
        return SystemStatus(**status)
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system status")

@router.get("/models", response_model=List[ModelInfo])
async def get_available_models():
    """Get list of available AI models and their capabilities"""
    try:
        models = await trae_service.get_available_models()
        return [ModelInfo(**model) for model in models]
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        raise HTTPException(status_code=500, detail="Failed to get available models")

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Handle chat completion requests with intelligent routing"""
    try:
        # Security validation
        if not security_service.validate_request(request.message, current_user):
            raise HTTPException(status_code=403, detail="Request blocked by security policy")
        
        # Process the chat request
        start_time = datetime.now()
        
        if request.stream:
            # Return streaming response
            async def generate_stream():
                try:
                    async for chunk in trae_service.generate_response_stream(
                        message=request.message,
                        conversation_id=request.conversation_id,
                        mode=request.mode,
                        provider=request.provider,
                        message_type=request.message_type,
                        context=request.context,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        user_id=current_user
                    ):
                        yield f"data: {json.dumps(chunk)}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            # Return complete response
            response = await trae_service.generate_response(
                message=request.message,
                conversation_id=request.conversation_id,
                mode=request.mode,
                provider=request.provider,
                message_type=request.message_type,
                context=request.context,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                user_id=current_user
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Schedule background tasks for learning
            background_tasks.add_task(
                trae_service.learn_from_interaction,
                request.message,
                response["response"],
                response["metadata"]
            )
            
            return ChatResponse(
                response=response["response"],
                conversation_id=response["conversation_id"],
                provider_used=response["provider_used"],
                mode_used=response["mode_used"],
                tokens_used=response.get("tokens_used"),
                processing_time=processing_time,
                confidence_score=response.get("confidence_score")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat completion: {e}")
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")

@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Stream chat responses for real-time interaction"""
    try:
        # Security validation
        if not security_service.validate_request(request.message, current_user):
            raise HTTPException(status_code=403, detail="Request blocked by security policy")
        
        async def generate_stream():
            try:
                async for chunk in trae_service.generate_response_stream(
                    message=request.message,
                    conversation_id=request.conversation_id,
                    mode=request.mode,
                    provider=request.provider,
                    message_type=request.message_type,
                    context=request.context,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    user_id=current_user
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.01)  # Small delay to prevent overwhelming
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        raise HTTPException(status_code=500, detail=f"Chat stream failed: {str(e)}")

@router.post("/mode/switch")
async def switch_mode(
    mode: OperationMode,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Switch between offline and online modes"""
    try:
        result = await trae_service.switch_mode(mode, current_user)
        return {"status": "success", "mode": result["mode"], "message": result["message"]}
    except Exception as e:
        logger.error(f"Error switching mode: {e}")
        raise HTTPException(status_code=500, detail=f"Mode switch failed: {str(e)}")

@router.post("/provider/switch")
async def switch_provider(
    provider: AIProvider,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Switch AI provider"""
    try:
        result = await trae_service.switch_provider(provider, current_user)
        return {"status": "success", "provider": result["provider"], "message": result["message"]}
    except Exception as e:
        logger.error(f"Error switching provider: {e}")
        raise HTTPException(status_code=500, detail=f"Provider switch failed: {str(e)}")

@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Get conversation history"""
    try:
        conversation = await trae_service.get_conversation(conversation_id, current_user)
        return conversation
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Optional[str] = Depends(get_current_user)
):
    """Delete conversation"""
    try:
        result = await trae_service.delete_conversation(conversation_id, current_user)
        return {"status": "success", "message": "Conversation deleted"}
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

@router.post("/learn/feedback")
async def provide_feedback(
    conversation_id: str,
    message_id: str,
    feedback: Dict[str, Any],
    current_user: Optional[str] = Depends(get_current_user)
):
    """Provide feedback for self-improvement"""
    try:
        result = await trae_service.process_feedback(
            conversation_id, message_id, feedback, current_user
        )
        return {"status": "success", "message": "Feedback processed"}
    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process feedback: {str(e)}")

@router.get("/analytics/performance")
async def get_performance_analytics(
    current_user: Optional[str] = Depends(get_current_user)
):
    """Get performance analytics and metrics"""
    try:
        analytics = await trae_service.get_performance_analytics(current_user)
        return analytics
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@router.post("/system/upgrade")
async def trigger_system_upgrade(
    current_user: Optional[str] = Depends(get_current_user)
):
    """Trigger autonomous system upgrade"""
    try:
        result = await trae_service.trigger_upgrade(current_user)
        return {"status": "success", "message": result["message"], "version": result["version"]}
    except Exception as e:
        logger.error(f"Error triggering upgrade: {e}")
        raise HTTPException(status_code=500, detail=f"System upgrade failed: {str(e)}")