from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from backend.services.code_assistant_service import code_assistant_service
from backend.services.command_processor import command_processor
from backend.services.ai_service import ai_service
from backend.services.workspace_service import workspace_service


router = APIRouter()

class CommandSuggestRequest(BaseModel):
    partial: str
    model: Optional[str] = None

class DocsLookupRequest(BaseModel):
    query: str
    model: Optional[str] = None
    language: Optional[str] = None
    context: Optional[str] = None


class SuggestionRequest(BaseModel):
    code: str
    language: Optional[str] = None
    context: Optional[str] = None
    model: Optional[str] = None


class SuggestionResponse(BaseModel):
    suggestions: List[str]


@router.post("/code-suggestions", response_model=SuggestionResponse)
async def code_suggestions(payload: SuggestionRequest):
    try:
        suggestions = await code_assistant_service.generate_suggestions(
            code=payload.code,
            language=payload.language,
            context=payload.context,
            preferred_model=payload.model,
        )
        return SuggestionResponse(suggestions=suggestions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/command-suggestions")
async def command_suggestions(payload: CommandSuggestRequest) -> Dict[str, Any]:
    try:
        prompt = f"Suggest 5 likely shell commands for: '{payload.partial}'. Include concise one-line descriptions."
        text = ""
        async for chunk in ai_service.generate_response(prompt, payload.model, False):
            text += chunk
        return {"result": text}
    except Exception as e:
        # Fallback: heuristic suggestions
        base = {
            "git commit -m \"msg\"": "Create a commit with message",
            "git checkout -b feature": "Create and switch to new branch",
            "git push origin HEAD": "Push current branch to origin",
            "git status": "Show working tree status",
            "git log --oneline": "Compact commit history view"
        }
        partial = (payload.partial or "").lower()
        filtered = {k: v for k, v in base.items() if any(w in k for w in partial.split())} or base
        lines = [f"{cmd}  # {desc}" for cmd, desc in filtered.items()]
        return {"result": "\n".join(lines)}

@router.post("/docs")
async def docs_lookup(payload: DocsLookupRequest) -> Dict[str, Any]:
    try:
        base = "Provide authoritative, concise documentation-style guidance. Include short examples when helpful."
        scope = f"Language: {payload.language}." if payload.language else ""
        ctx = f"Context:\n{payload.context}\n" if payload.context else ""
        message = f"{ctx}{scope}\nQuery:\n{payload.query}\n\n{base}"
        text = ""
        async for chunk in ai_service.generate_response(message, payload.model, False):
            text += chunk
        return {"result": text}
    except Exception as e:
        # Fallback: minimal docs snippets
        q = (payload.query or "").lower()
        if "venv" in q or "virtualenv" in q:
            snippet = (
                "Python venv quick guide:\n"
                "- Create: `python -m venv .venv`\n"
                "- Activate (Windows): `.venv\\Scripts\\activate`\n"
                "- Activate (macOS/Linux): `source .venv/bin/activate`\n"
                "- Deactivate: `deactivate`\n"
                "- Install deps: `pip install -r requirements.txt`\n"
            )
            return {"result": snippet}
        return {"result": "No provider available. Please configure API keys or start offline models. Provide specific query for better fallback."}


@router.post("/refactor")
async def refactor_code(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        code = request.get("code", "")
        file_path = request.get("file_path", "")
        model = request.get("model")
        args = file_path or code
        if not args:
            raise HTTPException(status_code=400, detail="code or file_path is required")
        result = await command_processor._handle_refactor_command(args, model)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix")
async def fix_code(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        code = request.get("code", "")
        model = request.get("model")
        if not code:
            raise HTTPException(status_code=400, detail="code is required")
        result = await command_processor._handle_fix_command(code, model)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tests")
async def generate_tests(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        code = request.get("code", "")
        file_path = request.get("file_path", "")
        model = request.get("model")
        args = file_path or code
        if not args:
            raise HTTPException(status_code=400, detail="code or file_path is required")
        result = await command_processor._handle_test_command(args, model)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/productionize")
async def productionize_code(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        code = request.get("code", "")
        file_path = request.get("file_path", "")
        model = request.get("model")
        args = file_path or code
        if not args:
            raise HTTPException(status_code=400, detail="code or file_path is required")
        result = await command_processor._handle_production_command(args, model)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain")
async def explain_code(request: Dict[str, Any]) -> Dict[str, Any]:
    try:
        code = request.get("code", "")
        file_path = request.get("file_path", "")
        model = request.get("model")
        if file_path:
            try:
                code = await workspace_service.read_file(file_path)
            except Exception:
                pass
        if not code:
            raise HTTPException(status_code=400, detail="code or file_path is required")
        result = await command_processor._handle_explain_command(code, model)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DebugRequest(BaseModel):
    code: Optional[str] = None
    error: Optional[str] = None
    file_path: Optional[str] = None
    model: Optional[str] = None


@router.post("/debug")
async def debug_code(payload: DebugRequest) -> Dict[str, Any]:
    try:
        code_content = payload.code or ""
        if payload.file_path and not code_content:
            try:
                code_content = await workspace_service.read_file(payload.file_path)
            except Exception:
                code_content = ""
        message = "Analyze and fix the issue. Provide step-by-step reasoning, root cause, and corrected code."
        if payload.error:
            message = f"Error:\n{payload.error}\n\n{message}"
        if code_content:
            message = f"Code:\n{code_content}\n\n{message}"
        response_text = ""
        async for chunk in ai_service.generate_response(message, payload.model, False):
            response_text += chunk
        return {"result": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
async def usage() -> Dict[str, Any]:
    return await code_assistant_service.get_usage()
