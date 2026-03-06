from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import subprocess
from typing import List, Optional

router = APIRouter()

# Define the absolute path to the workspace directory
BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()

class CommitRequest(BaseModel):
    message: str
    files: Optional[List[str]] = None # If None, add all

class GitResponse(BaseModel):
    output: str
    error: Optional[str] = None
    success: bool

def run_git_command(project_id: str, command: List[str]) -> GitResponse:
    project_dir = (WORKSPACE_DIR / project_id).resolve()
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    try:
        # Check if it is a git repo
        if not (project_dir / ".git").exists() and command[0] != "init":
             raise HTTPException(status_code=400, detail="Not a git repository")

        result = subprocess.run(
            ["git"] + command,
            cwd=project_dir,
            capture_output=True,
            text=True,
            check=False
        )
        
        return GitResponse(
            output=result.stdout,
            error=result.stderr if result.returncode != 0 else None,
            success=result.returncode == 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{project_id}")
async def git_status(project_id: str):
    return run_git_command(project_id, ["status"])

@router.post("/init/{project_id}")
async def git_init(project_id: str):
    return run_git_command(project_id, ["init"])

@router.post("/add/{project_id}")
async def git_add(project_id: str, files: List[str] = ["."]):
    return run_git_command(project_id, ["add"] + files)

@router.post("/commit/{project_id}")
async def git_commit(project_id: str, req: CommitRequest):
    return run_git_command(project_id, ["commit", "-m", req.message])

@router.get("/log/{project_id}")
async def git_log(project_id: str):
    return run_git_command(project_id, ["log", "--oneline", "-n", "10"])
