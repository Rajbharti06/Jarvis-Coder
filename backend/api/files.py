from fastapi import APIRouter, HTTPException
from pathlib import Path
import os
from typing import List, Dict, Any

router = APIRouter()

# Define the absolute path to the workspace directory
WORKSPACE_DIR = Path("C:/Learnings/PROJECTS-I/jarvis-coder/workspace").resolve()

@router.get("/content/{project_id}/{file_path:path}", response_model=dict)
async def get_file_content(project_id: str, file_path: str):
    """
    Retrieves the content of a specific file within a project's workspace.
    Includes security checks to prevent directory traversal.
    """
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        full_file_path = (project_dir / file_path).resolve()

        if not str(full_file_path).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="File access forbidden.")

        if not full_file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found.")

        content = full_file_path.read_text(encoding="utf-8")
        return {"content": content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@router.get("/list/{project_id}", response_model=List[Dict[str, Any]])
@router.get("/list/{project_id}/{dir_path:path}", response_model=List[Dict[str, Any]])
async def list_directory_contents(project_id: str, dir_path: str = '.'):
    """
    Lists the contents of a directory within a project's workspace.
    """
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        target_dir = (project_dir / dir_path).resolve()

        if not str(target_dir).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="Directory access forbidden.")

        if not target_dir.is_dir():
            raise HTTPException(status_code=404, detail="Directory not found.")

        contents = []
        for item in sorted(target_dir.iterdir(), key=lambda e: (e.is_file(), e.name.lower())):
            contents.append({
                "name": item.name,
                "path": str(item.relative_to(project_dir)),
                "type": 'file' if item.is_file() else 'directory'
            })
        
        return contents

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")
