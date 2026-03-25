from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
import ollama
from pydantic import BaseModel
from backend.services.ai_service import ai_service
from backend.config import settings

router = APIRouter()

class ModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    details: Optional[Dict[str, Any]] = None

class PullModelRequest(BaseModel):
    name: str

@router.get("/list")
async def list_models():
    """List available local models in Ollama."""
    try:
        response = ollama.list()
        models = []
        for m in response.get('models', []):
            models.append({
                "name": m['name'],
                "size": m.get('size'),
                "details": m.get('details')
            })
        return models
    except Exception as e:
        # If Ollama is not running, return an empty list or error
        return []

@router.post("/pull")
async def pull_model(request: PullModelRequest, background_tasks: BackgroundTasks):
    """Pull a model from Ollama library."""
    try:
        # Pulling can be a long process, run it in background or stream progress?
        # For now, let's just trigger it.
        background_tasks.add_task(ollama.pull, request.name)
        return {"message": f"Pulling model {request.name} started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current")
async def get_current_model():
    """Get the currently configured model."""
    return {"model": settings.ollama_model}

@router.post("/switch")
async def switch_model(request: PullModelRequest):
    """Switch the active Ollama model."""
    try:
        # Verify model exists
        available = ollama.list()
        model_names = [m['name'] for m in available.get('models', [])]
        
        # Check if exact match or with tag
        if request.name not in model_names and f"{request.name}:latest" not in model_names:
             # Just a warning, let them set it anyway?
             pass
             
        settings.ollama_model = request.name
        return {"message": f"Switched to model: {request.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
