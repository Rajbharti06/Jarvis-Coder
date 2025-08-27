from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess

router = APIRouter()

class CodeExecutionRequest(BaseModel):
    code: str
    language: str

@router.post("/execute")
async def execute_code(request: CodeExecutionRequest):
    try:
        if request.language == 'python':
            result = subprocess.run(["python", "-c", request.code], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return {"success": True, "output": result.stdout}
            else:
                return {"success": False, "error": result.stderr}
        else:
            # For other languages, we can add support here
            return {"success": False, "error": f"Language '{request.language}' is not supported."}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Code execution timed out."}
    except Exception as e:
        return {"success": False, "error": str(e)}