from fastapi import APIRouter, HTTPException, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.services.editor_service import editor_service

router = APIRouter()

class HoverRequest(BaseModel):
    file_path: str
    line: int
    column: int
    model: Optional[str] = None

class InlineGenRequest(BaseModel):
    file_path: str
    selection: str
    instruction: str
    model: Optional[str] = None

class AnalyzeRequest(BaseModel):
    file_path: str
    content: str
    model: Optional[str] = None

@router.post("/hover")
async def get_hover(request: HoverRequest):
    """Get hover info using AI-assisted analysis."""
    try:
        info = await editor_service.get_hover_info(request.file_path, request.line, request.column, request.model)
        return {"info": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-inline")
async def generate_inline(request: InlineGenRequest):
    """Generate inline code changes based on user instruction."""
    try:
        code = await editor_service.generate_inline_code(request.file_path, request.selection, request.instruction, request.model)
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_code(request: AnalyzeRequest):
    """Analyze code for errors and warnings."""
    try:
        diagnostics = await editor_service.analyze_errors(request.file_path, request.content, request.model)
        return diagnostics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
