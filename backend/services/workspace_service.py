import os
import logging
from fastapi import HTTPException
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Get the directory of the current script (backend/services)
script_dir = os.path.dirname(os.path.abspath(__file__))
# Go up two levels to reach the project root (jarvis-coder)
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
# Construct the absolute path to the workspace directory
WORKSPACE_DIR = Path(os.path.join(project_root, "workspace"))

# Ensure workspace exists
if not WORKSPACE_DIR.exists():
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def get_workspace_files(directory: Path = WORKSPACE_DIR):
    """Recursively list files and directories in the workspace."""
    items = []
    try:
        for entry in os.scandir(directory):
            relative_path = Path(entry.path).relative_to(WORKSPACE_DIR)
            if entry.is_dir():
                # Skip common ignored directories
                if entry.name in {".git", "__pycache__", "node_modules", "venv", ".env"}:
                    continue
                items.append({
                    "name": entry.name,
                    "path": str(relative_path),
                    "type": "directory",
                    "children": get_workspace_files(Path(entry.path))
                })
            else:
                items.append({
                    "name": entry.name,
                    "path": str(relative_path),
                    "type": "file"
                })
    except Exception as e:
        logger.error(f"Error listing files in {directory}: {e}")
    
    # Sort: directories first, then files, both alphabetically
    return sorted(items, key=lambda x: (x["type"] != "directory", x["name"].lower()))

def get_file_content(file_path: str):
    """Read content of a file relative to workspace root."""
    full_path = WORKSPACE_DIR / file_path
    
    # Security check: ensure path is within WORKSPACE_DIR
    if not os.path.abspath(full_path).startswith(os.path.abspath(WORKSPACE_DIR)):
         raise HTTPException(status_code=403, detail="Access denied: outside workspace")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Path is a directory, not a file")

    if os.path.getsize(full_path) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB limit for 8GB RAM optimization)")

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def save_file_content(file_path: str, content: str):
    """Save content to a file relative to workspace root."""
    full_path = WORKSPACE_DIR / file_path
    
    # Security check: ensure path is within WORKSPACE_DIR
    if not os.path.abspath(full_path).startswith(os.path.abspath(WORKSPACE_DIR)):
         raise HTTPException(status_code=403, detail="Access denied: outside workspace")

    try:
        # Create parent directories if they don't exist
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"message": "File saved successfully", "path": file_path}
    except Exception as e:
        logger.error(f"Error saving file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_project_structure():
    """Returns a flat list of all file paths for AI context."""
    all_files = []
    for root, dirs, files in os.walk(WORKSPACE_DIR):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in {".git", "__pycache__", "node_modules", "venv", ".env"}]
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), WORKSPACE_DIR)
            all_files.append(rel_path)
    return all_files
