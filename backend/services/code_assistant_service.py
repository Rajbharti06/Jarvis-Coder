import asyncio
import logging
from typing import List, Optional, Dict, Any

from backend.services.llm_router import llm_router

logger = logging.getLogger(__name__)


class CodeAssistantService:
    """
    Code Assistant Service
    Provides code suggestions and usage stats with intelligent routing.
    Falls back to lightweight heuristics when no models are available.
    """

    def __init__(self):
        self.router = llm_router

    async def generate_suggestions(
        self,
        code: str,
        language: Optional[str] = None,
        context: Optional[str] = None,
        preferred_model: Optional[str] = None,
    ) -> List[str]:
        """
        Generate code suggestions. Uses LLM when available; otherwise
        returns heuristic suggestions derived from the input code.
        """
        try:
            status = self.router.get_system_status()
            has_models = status.get("available_models", 0) > 0

            # Compose prompt for LLM suggestions
            prompt = self._build_suggestion_prompt(code, language, context)

            if has_models:
                # Collect non-streamed response for simplicity
                suggestions_text = await self._collect_response(
                    message=prompt,
                    task_type="code_generation",
                    preferred_model=preferred_model,
                    context_length=len(code),
                    stream=False,
                )
                return self._parse_suggestions(suggestions_text)
            else:
                return self._heuristic_suggestions(code, language)

        except Exception as e:
            logger.error(f"generate_suggestions error: {e}")
            # Ensure we always return something useful
            return self._heuristic_suggestions(code, language)

    async def get_usage(self) -> Dict[str, Any]:
        """Return system usage/status from the router."""
        try:
            return self.router.get_system_status()
        except Exception as e:
            logger.error(f"get_usage error: {e}")
            return {
                "mode": "unknown",
                "available_providers": [],
                "total_models": 0,
                "available_models": 0,
                "performance_metrics": {},
            }

    async def _collect_response(
        self,
        message: str,
        task_type: str,
        preferred_model: Optional[str],
        context_length: int,
        stream: bool,
    ) -> str:
        """Collect response from the LLM router into a single string."""
        content_parts: List[str] = []
        async for chunk in self.router.route_request(
            message=message,
            task_type=task_type,
            preferred_model=preferred_model,
            context_length=context_length,
            stream=stream,
        ):
            content_parts.append(chunk)
        return "".join(content_parts)

    def _build_suggestion_prompt(
        self, code: str, language: Optional[str], context: Optional[str]
    ) -> str:
        lang = language or "code"
        ctx = context or "general"
        return (
            f"You are an expert {lang} assistant. Given the following code, "
            f"suggest practical next steps for completion, refactoring, and error handling. "
            f"Respond ONLY with 3-7 succinct suggestions. Use the format: \n"
            f"- SUGGESTION: <one-line actionable suggestion>\n"
            f"If providing code, keep it short and focused.\n\n"
            f"Context: {ctx}\n\n"
            f"{lang} code:\n" +
            f"```{lang}\n{code}\n```\n"
        )

    def _parse_suggestions(self, text: str) -> List[str]:
        suggestions: List[str] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("- "):
                line = line[2:].strip()
            if line.upper().startswith("SUGGESTION:"):
                suggestions.append(line.split(":", 1)[1].strip())
            elif line.lower().startswith("suggestion:"):
                suggestions.append(line.split(":", 1)[1].strip())
            else:
                # Accept short plain lines as suggestions when formatted differently
                if len(line) < 300:
                    suggestions.append(line)
        # Deduplicate and cap
        deduped = []
        for s in suggestions:
            if s not in deduped:
                deduped.append(s)
        return deduped[:7]

    def _heuristic_suggestions(self, code: str, language: Optional[str]) -> List[str]:
        lang = (language or "code").lower()
        base: List[str] = [
            "Add basic error handling and input validation",
            "Extract repeated logic into helper functions",
            "Write unit tests for core functions",
            "Add inline comments for complex blocks",
            "Refactor long functions into smaller ones",
            "Check edge cases and null/undefined inputs",
        ]

        text = code.lower()

        if lang in ("python", "py"):
            if "try:" not in text and "except" not in text:
                base.insert(0, "Wrap risky operations in try/except blocks")
            if "def " in text and "return" not in text:
                base.insert(1, "Ensure functions return meaningful values")
            if "todo" in text:
                base.append("Resolve TODOs and document decisions")
        elif lang in ("javascript", "typescript", "js", "ts"):
            if "catch(" not in text and "try{" not in text:
                base.insert(0, "Add try/catch around asynchronous calls")
            if "console.log(" in text:
                base.append("Replace console.log with structured logging")
            if "any" in text and lang == "typescript":
                base.append("Replace 'any' with precise types")

        return base[:7]


code_assistant_service = CodeAssistantService()