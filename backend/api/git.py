import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter()

# Determine project root (two levels up from this file)
PROJECT_ROOT = Path(__file__).resolve().parents[2]

def _run_git_command(args: List[str], capture_output: bool = True):
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=PROJECT_ROOT,
            capture_output=capture_output,
            text=True,
            check=True,
        )
        return result.stdout if capture_output else ""
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=e.stderr or str(e))

@router.get("/status")
def git_status():
    """Return `git status` output."""
    output = _run_git_command(["status", "--porcelain", "-b"])
    return {"status": output}

@router.post("/add")
def git_add(paths: List[str]):
    """Stage files for commit. If empty list, stage all changes."""
    if not paths:
        _run_git_command(["add", "."], capture_output=False)
        return {"added": "all"}
    _run_git_command(["add", *paths], capture_output=False)
    return {"added": paths}

@router.post("/commit")
def git_commit(message: str):
    """Create a commit with the given message."""
    if not message:
        raise HTTPException(status_code=400, detail="Commit message required")
    _run_git_command(["commit", "-m", message], capture_output=False)
    return {"committed": message}

@router.get("/diff")
def git_diff(file: Optional[str] = None):
    """Return diff for a specific file or the whole repository."""
    args = ["diff"]
    if file:
        args.append(file)
    output = _run_git_command(args)
    return {"diff": output}

@router.post("/branch")
def git_branch(name: str, switch: bool = False):
    """Create a new branch. Optionally switch to it."""
    if not name:
        raise HTTPException(status_code=400, detail="Branch name required")
    # Create branch
    _run_git_command(["branch", name], capture_output=False)
    if switch:
        _run_git_command(["checkout", name], capture_output=False)
        return {"branch": name, "switched": True}
    return {"branch": name, "switched": False}
