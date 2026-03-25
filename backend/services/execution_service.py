import subprocess
import os
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# Get project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
WORKSPACE_DIR = os.path.join(project_root, "workspace")

async def execute_command(command: str, cwd: Optional[str] = None) -> Dict[str, Any]:
    """Executes a shell command in the workspace."""
    try:
        # Basic safety
        forbidden_commands = ["rm -rf /", "format", "mkfs"]
        if any(cmd in command for cmd in forbidden_commands):
            return {"error": "Forbidden command detected", "exit_code": 1}

        # Ensure cwd is within workspace
        execution_cwd = os.path.join(WORKSPACE_DIR, cwd) if cwd else WORKSPACE_DIR
        if not os.path.abspath(execution_cwd).startswith(os.path.abspath(WORKSPACE_DIR)):
             return {"error": "Access denied: outside workspace", "exit_code": 1}

        # Run the command
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=execution_cwd
        )
        
        stdout, stderr = process.communicate(timeout=30)
        
        return {
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": process.returncode
        }
    except subprocess.TimeoutExpired:
        process.kill()
        return {"error": "Command timed out after 30 seconds", "exit_code": 124}
    except Exception as e:
        logger.error(f"Error running command: {e}")
        return {"error": str(e), "exit_code": 1}
