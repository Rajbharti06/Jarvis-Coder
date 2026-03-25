from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from backend.services import workspace_service
from pydantic import BaseModel

router = APIRouter()

class FileSaveRequest(BaseModel):
    path: str
    content: str

@router.get("/list")
async def list_files():
    """List all files in the workspace recursively."""
    try:
        return workspace_service.get_workspace_files()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/read")
async def read_file(path: str):
    """Read file content."""
    try:
        content = workspace_service.get_file_content(path)
        return {"path": path, "content": content}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_file(request: FileSaveRequest):
    """Save file content."""
    try:
        return workspace_service.save_file_content(request.path, request.content)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/structure")
async def get_structure():
    """Get flat project structure for AI context."""
    try:
        return workspace_service.get_project_structure()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
