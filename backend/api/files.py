from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import os
import shutil
from typing import List, Dict, Any

router = APIRouter()

# Define the absolute path to the workspace directory
# Dynamically resolve to the repository's workspace folder to avoid machine-specific paths
BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()

class FileContent(BaseModel):
    content: str

class NewItem(BaseModel):
    name: str

@router.get("/content/{project_id}/{file_path:path}", response_model=dict)
async def get_file_content(project_id: str, file_path: str):
    """
    Retrieves the content of a specific file within a project's workspace.
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

@router.post("/content/{project_id}/{file_path:path}")
async def save_file_content(project_id: str, file_path: str, file_content: FileContent):
    """
    Saves content to a specific file within a project's workspace.
    """
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        full_file_path = (project_dir / file_path).resolve()

        if not str(full_file_path).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="File access forbidden.")

        full_file_path.parent.mkdir(parents=True, exist_ok=True)
        full_file_path.write_text(file_content.content, encoding="utf-8")
        return {"message": f"File saved successfully: {file_path}"}

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

@router.post("/create_file/{project_id}/{parent_path:path}")
async def create_file(project_id: str, parent_path: str, item: NewItem):
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        target_dir = (project_dir / parent_path).resolve()
        if not str(target_dir).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")
        
        new_file = target_dir / item.name
        if new_file.exists():
            raise HTTPException(status_code=400, detail="File already exists.")
        
        new_file.touch()
        return {"message": f"File created: {item.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create_folder/{project_id}/{parent_path:path}")
async def create_folder(project_id: str, parent_path: str, item: NewItem):
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        target_dir = (project_dir / parent_path).resolve()
        if not str(target_dir).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")

        new_folder = target_dir / item.name
        if new_folder.exists():
            raise HTTPException(status_code=400, detail="Folder already exists.")
        
        new_folder.mkdir()
        return {"message": f"Folder created: {item.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete_file/{project_id}/{file_path:path}")
async def delete_file(project_id: str, file_path: str):
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        full_path = (project_dir / file_path).resolve()
        if not str(full_path).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")

        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found.")

        full_path.unlink()
        return {"message": f"File deleted: {file_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete_folder/{project_id}/{folder_path:path}")
async def delete_folder(project_id: str, folder_path: str):
    try:
        project_dir = (WORKSPACE_DIR / project_id).resolve()
        full_path = (project_dir / folder_path).resolve()
        if not str(full_path).startswith(str(project_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")

        if not full_path.is_dir():
            raise HTTPException(status_code=404, detail="Folder not found.")

        shutil.rmtree(full_path)
        return {"message": f"Folder deleted: {folder_path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
