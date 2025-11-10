from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from backend.services.code_assistant_service import code_assistant_service


router = APIRouter()


class SuggestionRequest(BaseModel):
    code: str
    language: Optional[str] = None
    context: Optional[str] = None
    model: Optional[str] = None


class SuggestionResponse(BaseModel):
    suggestions: List[str]


@router.post("/code-suggestions", response_model=SuggestionResponse)
async def code_suggestions(payload: SuggestionRequest):
    try:
        suggestions = await code_assistant_service.generate_suggestions(
            code=payload.code,
            language=payload.language,
            context=payload.context,
            preferred_model=payload.model,
        )
        return SuggestionResponse(suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
async def usage() -> Dict[str, Any]:
    return await code_assistant_service.get_usage()