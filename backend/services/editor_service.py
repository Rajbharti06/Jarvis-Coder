import os
import re
from typing import List, Dict, Any, Optional
from backend.services.ai_service import ai_service
from backend.services.workspace_service import get_file_content

class EditorService:
    """Service for advanced editor intelligence (LSP-like features, inline generation)."""
    
    @staticmethod
    async def get_hover_info(file_path: str, line: int, column: int, model: Optional[str] = None) -> str:
        """Get hover information using AI as a fallback for missing LSP."""
        content = get_file_content(file_path)
        lines = content.splitlines()
        if line > len(lines):
             return "No info"
             
        context_line = lines[line-1]
        
        prompt = f"""Explain the following symbol at line {line}, column {column} in {file_path}.
Context:
{content}

Symbol: {context_line[column-5:column+5]}
"""
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, stream=False):
            response += chunk
        return response

    @staticmethod
    async def generate_inline_code(file_path: str, selection: str, instruction: str, model: Optional[str] = None) -> str:
        """Generates inline code changes based on instruction and selection."""
        content = get_file_content(file_path)
        
        prompt = f"""You are an AI code editor (Cursor-style). 
Modify the selected code in {file_path} based on the user's instruction.

File Content:
{content}

Selected Code:
{selection}

Instruction: {instruction}

Provide ONLY the replacement code for the selected block. Do not include any explanations or markdown blocks."""
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, stream=False):
            response += chunk
        return response.strip()

    @staticmethod
    async def analyze_errors(file_path: str, content: str, model: Optional[str] = None) -> List[Dict[str, Any]]:
        """Perform real-time AI error detection."""
        prompt = f"""Analyze the following code for errors, bugs, or performance issues.
File: {file_path}
Content:
{content}

Respond with a JSON list of objects: [{{"line": number, "message": "string", "severity": "error" | "warning"}}]
ONLY respond with the JSON."""
        
        response = ""
        async for chunk in ai_service.generate_response(prompt, model, stream=False):
            response += chunk
            
        try:
            # Simple JSON extraction from text
            match = re.search(r'\[.*\]', response, re.DOTALL)
            if match:
                import json
                return json.loads(match.group())
            return []
        except Exception:
            return []

editor_service = EditorService()
