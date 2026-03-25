from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.services.ai_service import ai_service
from backend.config import settings
import ollama

router = APIRouter()

class AutocompleteRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    max_tokens: int = 50

@router.post("/")
async def autocomplete(request: AutocompleteRequest):
    """Generate code completion suggestions."""
    model_to_use = request.model or settings.ollama_model
    
    # Use a code-specific prompt format if using Ollama
    # Ollama's generate API is often better for raw code completion than chat
    try:
        response = ollama.generate(
            model=model_to_use,
            prompt=request.prompt,
            options={
                "num_predict": request.max_tokens,
                "stop": ["\n", "```", ";"] # Stop at common delimiters for short completions
            }
        )
        return {"suggestion": response.get('response', '')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
