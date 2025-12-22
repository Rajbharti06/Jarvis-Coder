from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import subprocess
import tempfile
import os
import json
from typing import AsyncGenerator
from pathlib import Path

from backend.services.generation_service import generation_service

router = APIRouter()

@router.post("/generate/snippet")
async def generate_snippet(request: dict):
    try:
        prompt = request.get("prompt", "")
        language = request.get("language", "typescript")
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        plan = await generation_service.build_plan("snippet", prompt)
        code_files = [f for f in plan.files if f[0].endswith(('.ts', '.tsx', '.js', '.py'))]
        content = code_files[0][1] if code_files else ""
        return {"language": language, "code": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating snippet: {str(e)}")


@router.post("/generate/project/stream")
async def generate_project_stream(request: dict):
    try:
        name = request.get("name", "generated-project")
        description = request.get("description", "")
        if not description:
            raise HTTPException(status_code=400, detail="Description is required")

        plan = await generation_service.build_plan(name, description)

        async def event_stream() -> AsyncGenerator[str, None]:
            async for event in generation_service.generate_project_stream(plan):
                yield f"data: {json.dumps(event)}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream", headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating project: {str(e)}")


@router.post("/generate/refine")
async def refine_project(request: dict):
    try:
        project_id = request.get("project_id")
        instruction = request.get("instruction", "")
        if not project_id or not instruction:
            raise HTTPException(status_code=400, detail="project_id and instruction are required")
        project_dir = generation_service.WORKSPACE_DIR / project_id if hasattr(generation_service, "WORKSPACE_DIR") else None
        if project_dir is None:
            project_dir = (Path(__file__).resolve().parents[2] / "workspace" / project_id).resolve()
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        refine_file = project_dir / "REFINE.md"
        existing = refine_file.read_text(encoding="utf-8") if refine_file.exists() else ""
        refine_file.write_text(existing + f"\n- {instruction}\n", encoding="utf-8")
        return {"status": "ok", "path": str(refine_file)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refining project: {str(e)}")

@router.post("/execute")
async def execute_code_endpoint(request: dict):
    """Execute code and return results"""
    try:
        code = request.get("code", "")
        language = request.get("language", "javascript")
        
        if not code:
            raise HTTPException(status_code=400, detail="Code is required")
        
        result = f"Execution result for {language} code:\n"
        result += "Execution is disabled in this environment."
        
        return {"result": result, "success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing code: {str(e)}")
