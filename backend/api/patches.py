from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator

from backend.services.ai_service import ai_service


router = APIRouter(tags=["patches"])


BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = (BASE_DIR / "workspace").resolve()


class LineRange(BaseModel):
  start_line: int = Field(..., ge=1, description="1-based start line (inclusive)")
  end_line: int = Field(..., ge=1, description="1-based end line (inclusive)")

  @validator("end_line")
  def validate_range(cls, v: int, values: Dict[str, Any]) -> int:  # type: ignore[override]
    start = values.get("start_line", 1)
    if v < start:
      raise ValueError("end_line must be >= start_line")
    return v


class PatchOperation(BaseModel):
  type: str = Field(..., description="Operation type, e.g. 'replace', 'insert', 'delete'")
  range: Optional[LineRange] = Field(
    None,
    description="Affected line range for replace/delete operations",
  )
  new_text: Optional[str] = Field(
    None,
    description="Replacement text for replace/insert operations",
  )


class FilePatch(BaseModel):
  file_path: str = Field(..., description="Path relative to the project root")
  description: Optional[str] = Field(
    None,
    description="Human-readable explanation of the change",
  )
  operations: List[PatchOperation] = Field(
    ...,
    description="List of non-destructive patch operations (proposal only)",
  )


class PatchProposalRequest(BaseModel):
  instruction: str = Field(
    ...,
    description="Natural language description of the desired change",
  )
  project_id: Optional[str] = Field(
    None,
    description="Optional project/workspace identifier under the workspace directory",
  )
  target_files: Optional[List[str]] = Field(
    None,
    description="Optional list of file paths (relative to project root) to focus on",
  )
  model: Optional[str] = Field(
    None,
    description="Optional preferred model id; falls back to default routing",
  )


class PatchProposalResponse(BaseModel):
  patches: List[FilePatch]
  raw_response: str = Field(
    ...,
    description="Raw model response for debugging / inspection",
  )


def _resolve_project_root(project_id: Optional[str]) -> Path:
  """
  Resolve the project root within the workspace. If no project_id is provided,
  use the workspace directory itself as the root.
  """
  if not project_id:
    return WORKSPACE_DIR
  root = (WORKSPACE_DIR / project_id).resolve()
  if not str(root).startswith(str(WORKSPACE_DIR)):
    raise HTTPException(status_code=403, detail="Project access forbidden")
  if not root.exists():
    raise HTTPException(status_code=404, detail="Project not found")
  return root


async def _build_prompt(
  project_root: Path,
  instruction: str,
  target_files: Optional[List[str]],
) -> str:
  """
  Build a concise prompt for the LLM that includes the user instruction and
  limited context from relevant files, and that clearly specifies the JSON
  patch format to return.
  """
  context_snippets: List[str] = []

  files_to_read: List[Path] = []
  if target_files:
    for rel in target_files:
      candidate = (project_root / rel).resolve()
      if str(candidate).startswith(str(project_root)) and candidate.is_file():
        files_to_read.append(candidate)
  else:
    # If no explicit targets, provide very lightweight context (file list only)
    try:
      for p in sorted(project_root.rglob("*")):
        if p.is_file() and len(context_snippets) < 20:
          rel = p.relative_to(project_root)
          context_snippets.append(f"- {rel}")
    except Exception:
      # Best-effort; do not fail proposal generation on context enumeration
      pass

  # If we have explicit files, include their first ~80 lines as context
  for path in files_to_read[:5]:
    try:
      rel = path.relative_to(project_root)
      content = path.read_text(encoding="utf-8", errors="ignore").splitlines()
      head = "\n".join(content[:80])
      context_snippets.append(f"=== FILE: {rel} ===\n{head}")
    except Exception:
      continue

  context_block = "\n\n".join(context_snippets) if context_snippets else "(no additional context provided)"

  spec_block = """
You are an expert refactoring assistant embedded in a secure IDE.
You MUST NOT apply changes yourself. You ONLY PROPOSE patches as JSON.

Return a STRICT JSON object with this shape and NOTHING else:
{
  "patches": [
    {
      "file_path": "relative/path/from/project/root.ext",
      "description": "short human explanation of the change",
      "operations": [
        {
          "type": "replace" | "insert" | "delete",
          "range": { "start_line": 10, "end_line": 20 }, // required for replace/delete
          "new_text": "string with the new code (for replace/insert only)"
        }
      ]
    }
  ]
}

Rules:
- Line numbers are 1-based and refer to the CURRENT file contents.
- Prefer a small number of focused operations over rewriting entire files.
- Never include comments about the patch outside the JSON.
- If no meaningful change is needed, return { "patches": [] }.
"""

  prompt = (
    f"{spec_block}\n\n"
    f"User instruction:\n{instruction}\n\n"
    f"Project root: {project_root}\n"
    f"Context snippets:\n{context_block}\n"
  )
  return prompt


def _extract_json_object(text: str) -> Dict[str, Any]:
  """
  Attempt to extract a top-level JSON object from model output.
  We expect either a clean JSON object or JSON fenced in markdown.
  """
  stripped = text.strip()

  # Handle ```json ... ``` wrappers
  if stripped.startswith("```"):
    # Remove leading/trailing fences
    parts = stripped.split("```")
    # parts like ["", "json\n{...}", ""]
    for part in parts:
      part = part.strip()
      if part.startswith("{") or part.startswith("["):
        stripped = part
        break

  # Try direct parse
  try:
    data = json.loads(stripped)
    if isinstance(data, dict):
      return data
    return {"patches": data}
  except json.JSONDecodeError:
    pass

  # Fallback: try to locate first '{' and parse from there
  first_brace = stripped.find("{")
  if first_brace != -1:
    candidate = stripped[first_brace:]
    last_brace = candidate.rfind("}")
    if last_brace != -1:
      candidate = candidate[: last_brace + 1]
      try:
        data = json.loads(candidate)
        if isinstance(data, dict):
          return data
        return {"patches": data}
      except json.JSONDecodeError:
        pass

  raise ValueError("Could not parse JSON patch object from model response")


@router.post("/patches/propose", response_model=PatchProposalResponse)
async def propose_patches(request: PatchProposalRequest) -> PatchProposalResponse:
  """
  Ask the AI to propose code patches for a project, without applying them.

  This endpoint NEVER writes to disk and is designed to be used together
  with a client-side confirmation & apply mechanism (diff viewer, etc.).
  """
  if not request.instruction.strip():
    raise HTTPException(status_code=400, detail="instruction is required")

  project_root = _resolve_project_root(request.project_id)
  prompt = await _build_prompt(project_root, request.instruction, request.target_files)

  # Use the generic AIService router; streaming disabled for easier parsing
  raw_text = ""
  try:
    async for chunk in ai_service.generate_response(prompt, model=request.model, stream=False):
      raw_text += chunk
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"AI provider error: {e}")

  if not raw_text.strip():
    raise HTTPException(status_code=502, detail="AI returned empty response while proposing patches")

  try:
    json_obj = _extract_json_object(raw_text)
  except Exception as e:
    # Surface raw text for inspection but mark parsing failure
    raise HTTPException(
      status_code=502,
      detail=f"Failed to parse patch JSON from AI response: {e}",
    )

  patches_data = json_obj.get("patches", [])
  if not isinstance(patches_data, list):
    raise HTTPException(status_code=502, detail="AI response did not contain a 'patches' array")

  try:
    patches: List[FilePatch] = [FilePatch(**item) for item in patches_data]
  except Exception as e:
    raise HTTPException(status_code=502, detail=f"Invalid patch structure from AI: {e}")

  return PatchProposalResponse(patches=patches, raw_response=raw_text)

