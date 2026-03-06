from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any
from backend.services.vulnerability_scanner import VulnerabilityScanner

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()

class ScanResponse(BaseModel):
    success: bool
    findings: list | None = None
    summary: Dict[str, Any] | None = None
    error: str | None = None

@router.get("/scan/{project_id}", response_model=ScanResponse)
async def scan_project_security(project_id: str):
    try:
        scanner = VulnerabilityScanner()
        result = scanner.scan_project(WORKSPACE_DIR, project_id)
        if not result.get("success"):
            raise HTTPException(status_code=404, detail=result.get("error", "Scan failed"))
        return result  # Pydantic will validate/serialize
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Security scan error: {str(e)}")

