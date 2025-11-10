"""
Models API Router
Provides endpoints for managing AI models and their configurations
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from backend.services.llm_router import llm_router
from backend.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def get_available_models():
    """Get list of available AI models with their configurations"""
    try:
        models = llm_router.get_available_models()
        return {
            "success": True,
            "models": models,
            "total": len(models)
        }
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{model_id}")
async def get_model_info(model_id: str):
    """Get detailed information about a specific model"""
    try:
        models = llm_router.get_available_models()
        model = next((m for m in models if m["id"] == model_id), None)
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {
            "success": True,
            "model": model
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{model_id}/test")
async def test_model(model_id: str, test_message: str = "Hello, this is a test message."):
    """Test a specific model with a simple message"""
    try:
        models = llm_router.get_available_models()
        model = next((m for m in models if m["id"] == model_id), None)
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        if model["status"] != "available":
            raise HTTPException(status_code=400, detail="Model is not available")
        
        # Test the model
        response_chunks = []
        async for chunk in llm_router.route_request(
            message=test_message,
            preferred_model=model_id,
            stream=True
        ):
            response_chunks.append(chunk)
        
        response_text = "".join(response_chunks)
        
        return {
            "success": True,
            "model_id": model_id,
            "test_message": test_message,
            "response": response_text,
            "response_length": len(response_text)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/providers/status")
async def get_providers_status():
    """Get status of all AI providers"""
    try:
        status = llm_router.get_system_status()
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        logger.error(f"Error getting providers status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mode")
async def set_operation_mode(mode: str):
    """Set the operation mode (auto, offline, online)"""
    try:
        if mode not in ["auto", "offline", "online"]:
            raise HTTPException(status_code=400, detail="Invalid mode. Must be 'auto', 'offline', or 'online'")
        
        llm_router.set_mode(mode)
        
        return {
            "success": True,
            "mode": mode,
            "message": f"Operation mode set to {mode}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting mode: {e}")
        raise HTTPException(status_code=500, detail=str(e))
