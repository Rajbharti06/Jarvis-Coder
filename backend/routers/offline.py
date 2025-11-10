"""
Offline Router for Jarvis Terminal
Provides endpoints for offline AI capabilities and local model management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.offline_service import offline_service


router = APIRouter(prefix="/offline", tags=["offline"])


class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = False


class GenerateRequest(BaseModel):
    model: str
    prompt: str
    system_prompt: Optional[str] = None
    stream: bool = False


@router.get("/status")
async def get_ollama_status():
    """Get Ollama installation and running status"""
    return await offline_service.check_ollama_status()


@router.post("/start")
async def start_ollama():
    """Attempt to start Ollama service"""
    return await offline_service.start_ollama_service()


@router.get("/models")
async def get_available_models():
    """Get list of installed local models"""
    return await offline_service.get_available_models()


@router.get("/models/recommended")
async def get_recommended_models():
    """Get list of recommended models for installation"""
    return await offline_service.get_recommended_models()


@router.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get detailed information about a specific model"""
    info = await offline_service.get_model_info(model_name)
    if not info:
        raise HTTPException(status_code=404, detail="Model not found")
    return info


@router.post("/models/{model_name}/install")
async def install_model(model_name: str):
    """Install a model via Ollama"""
    return await offline_service.install_model(model_name)


@router.delete("/models/{model_name}")
async def remove_model(model_name: str):
    """Remove a model from Ollama"""
    return await offline_service.remove_model(model_name)


@router.get("/models/{model_name}/progress")
async def get_download_progress(model_name: str):
    """Get download progress for a model"""
    progress = await offline_service.get_download_progress(model_name)
    if not progress:
        raise HTTPException(status_code=404, detail="No download progress found")
    return progress


@router.post("/generate")
async def generate_text(request: GenerateRequest):
    """Generate text using a local model"""
    if request.stream:
        async def generate_stream():
            async for chunk in offline_service.generate_response(
                model_name=request.model,
                prompt=request.prompt,
                system_prompt=request.system_prompt,
                stream=True
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache"}
        )
    else:
        response = ""
        async for chunk in offline_service.generate_response(
            model_name=request.model,
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            stream=False
        ):
            response += chunk
        
        return {"response": response}


@router.post("/chat")
async def chat_with_model(request: ChatRequest):
    """Chat with a local model"""
    # Convert Pydantic models to dicts
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    if request.stream:
        async def chat_stream():
            async for chunk in offline_service.chat_with_model(
                model_name=request.model,
                messages=messages,
                stream=True
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            chat_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache"}
        )
    else:
        response = ""
        async for chunk in offline_service.chat_with_model(
            model_name=request.model,
            messages=messages,
            stream=False
        ):
            response += chunk
        
        return {"response": response}


@router.get("/health")
async def health_check():
    """Health check for offline services"""
    status = await offline_service.check_ollama_status()
    models = await offline_service.get_available_models()
    
    return {
        "ollama_status": status,
        "models_available": len(models),
        "models": [model["name"] for model in models],
        "healthy": status["available"]
    }