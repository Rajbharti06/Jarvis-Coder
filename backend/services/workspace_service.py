import asyncio
from pathlib import Path
from typing import Dict, Any, List
import aiofiles
from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()

class WorkspaceService:
    def __init__(self, workspace_dir: Path) -> None:
        self.workspace_dir = workspace_dir
        self.workspace_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, file_path: str) -> Path:
        target = Path(file_path)
        full = target.resolve() if target.is_absolute() else (self.workspace_dir / file_path).resolve()
        if not str(full).startswith(str(self.workspace_dir)):
            raise HTTPException(status_code=403, detail="File access forbidden")
        return full

    async def read_file(self, file_path: str) -> str:
        full = self._resolve_path(file_path)
        if not full.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        async with aiofiles.open(full, "r", encoding="utf-8") as f:
            return await f.read()

    async def save_code(self, code: str, filename: str, language: str) -> Dict[str, Any]:
        try:
            full = self._resolve_path(filename)
            full.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(full, "w", encoding="utf-8") as f:
                await f.write(code)
            return {"success": True, "message": f"Saved to {full.relative_to(self.workspace_dir)}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def create_project_structure(self, project_type: str, project_name: str) -> Dict[str, Any]:
        try:
            project_dir = (self.workspace_dir / project_name).resolve()
            if not str(project_dir).startswith(str(self.workspace_dir)):
                raise HTTPException(status_code=403, detail="Directory access forbidden")
            project_dir.mkdir(parents=True, exist_ok=True)
            (project_dir / "src").mkdir(exist_ok=True)
            (project_dir / "tests").mkdir(exist_ok=True)
            readme = project_dir / "README.txt"
            async with aiofiles.open(readme, "w", encoding="utf-8") as f:
                await f.write(f"{project_type} project: {project_name}\n")
            return {"success": True, "message": f"Project created at {project_dir.relative_to(self.workspace_dir)}"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def list_files(self) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        for item in sorted(self.workspace_dir.iterdir(), key=lambda p: p.name.lower()):
            items.append({
                "name": item.name,
                "path": str(item.relative_to(self.workspace_dir)),
                "type": "directory" if item.is_dir() else "file"
            })
        return items

workspace_service = WorkspaceService(WORKSPACE_DIR)