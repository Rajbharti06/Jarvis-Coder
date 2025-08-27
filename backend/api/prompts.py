from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List

from backend.services.prompt_service import prompt_service

router = APIRouter()

class FormatRequest(BaseModel):
    template_name: str
    context: Dict[str, str]

@router.get("/prompts", response_model=List[str])
async def get_prompt_templates():
    """Get a list of available prompt template names."""
    return prompt_service.get_template_names()

@router.post("/prompts/format")
async def format_prompt(request: FormatRequest):
    """Format a prompt using a template and context."""
    try:
        formatted_prompt = prompt_service.format_prompt(request.template_name, request.context)
        return {"formatted_prompt": formatted_prompt}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
