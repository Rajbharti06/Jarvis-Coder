import subprocess
import os
import shlex
import logging
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional

from backend.services.execution_service import execute_command

router = APIRouter()
logger = logging.getLogger(__name__)

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

from backend.services.agent_service import AgentService

agent_service = AgentService()

class AnalyzeErrorRequest(BaseModel):
    error_message: str
    context: Optional[str] = None

@router.post("/run")
async def run_command_api(request: CommandRequest):
    """Executes a shell command in the workspace."""
    try:
        res = await execute_command(request.command, request.cwd)
        return res
    except Exception as e:
        logger.error(f"Error running command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-error")
async def analyze_error(request: AnalyzeErrorRequest):
    """Analyze terminal error and suggest fixes."""
    try:
        suggestion = await agent_service.process_task(
            f"The following error occurred in the terminal:\n{request.error_message}\n\nSuggest a fix or provide more context.",
            active_file_path=request.context
        )
        return {"suggestion": suggestion}
    except Exception as e:
        logger.error(f"Error analyzing terminal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

