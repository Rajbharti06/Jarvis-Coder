import os
from fastapi import HTTPException

# Get the directory of the current script (backend/services)
script_dir = os.path.dirname(os.path.abspath(__file__))
# Go up two levels to reach the project root (jarvis-coder)
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
# Construct the absolute path to the workspace directory
WORKSPACE_DIR = os.path.join(project_root, "workspace")

print(f"DEBUG: WORKSPACE_DIR resolved to: {WORKSPACE_DIR}") # Moved for immediate print

def get_files():
    if not os.path.exists(WORKSPACE_DIR):
        os.makedirs(WORKSPACE_DIR)
    
    files = []
    for item in os.listdir(WORKSPACE_DIR):
        path = os.path.join(WORKSPACE_DIR, item)
        files.append({
            "name": item,
            "path": path,
            "type": "directory" if os.path.isdir(path) else "file"
        })
    return files

def get_file_content(file_path: str):
    full_path = os.path.join(WORKSPACE_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    with open(full_path, "r") as f:
        return {"content": f.read()}

def save_file_content(file_path: str, content: str):
    try:
        full_path = os.path.join(WORKSPACE_DIR, file_path)
        with open(full_path, "w") as f:
            f.write(content)
        return {"message": "File saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))