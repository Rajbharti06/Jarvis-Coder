import os
import re
import logging
from typing import List, Dict, Any, Optional
from backend.services import workspace_service
from backend.services.semantic_search_service import semantic_search
from backend.services.token_service import token_service
from pathlib import Path

logger = logging.getLogger(__name__)

class ContextService:
    """Service to gather context for LLM prompts with smart selection and token budgeting."""
    
    @staticmethod
    def get_full_context(active_file_path: Optional[str] = None, query: Optional[str] = None, model: str = "gpt-4o") -> str:
        """Gathers project structure and relevant file content into a formatted string within token budget."""
        
        budget = token_service.get_available_context_tokens(model)
        current_tokens = 0
        context_parts = []
        
        # 1. Active File (Highest Priority)
        if active_file_path:
            try:
                content = workspace_service.get_file_content(active_file_path)
                file_context = f"### Current File: {active_file_path}\n```\n{content}\n```"
                tokens = token_service.count_tokens(file_context, model)
                
                if current_tokens + tokens <= budget:
                    context_parts.append(file_context)
                    current_tokens += tokens
                else:
                    # Truncate active file if it's too large (very rare for budget)
                    truncated = content[:budget*3] # Rough truncation
                    context_parts.append(f"### Current File (Truncated): {active_file_path}\n```\n{truncated}\n```")
                    return "\n\n".join(context_parts)
            except Exception as e:
                logger.error(f"Error reading active file {active_file_path}: {e}")

        # 2. Semantic Search Results (Second Priority)
        if query:
            try:
                search_results = semantic_search.search(query, n_results=5)
                for res in search_results:
                    # Skip if it's the active file (already included)
                    if res['path'] == active_file_path:
                        continue
                        
                    file_context = f"### Related File: {res['path']}\n```\n{res['snippet']}\n```"
                    tokens = token_service.count_tokens(file_context, model)
                    
                    if current_tokens + tokens <= budget:
                        context_parts.append(file_context)
                        current_tokens += tokens
                    else:
                        break # Out of budget
            except Exception as e:
                logger.error(f"Error during semantic search for context: {e}")

        # 3. Project Structure (Third Priority)
        structure = workspace_service.get_project_structure()
        structure_str = "### Project Structure:\n" + "\n".join([f"- {p}" for p in structure])
        tokens = token_service.count_tokens(structure_str, model)
        
        if current_tokens + tokens <= budget:
            context_parts.append(structure_str)
            current_tokens += tokens
        else:
            # Truncate structure if needed
            truncated_structure = "### Project Structure (Partial):\n" + "\n".join([f"- {p}" for p in structure[:50]])
            context_parts.append(truncated_structure)

        return "\n\n".join(context_parts)

    @staticmethod
    def format_prompt_with_context(user_query: str, active_file_path: Optional[str] = None, model: str = "gpt-4o") -> str:
        """Wraps user query with workspace context."""
        context = ContextService.get_full_context(active_file_path, query=user_query, model=model)
        
        full_prompt = f"""You are Jarvis Coder, an advanced AI development assistant. 
Use the following context about the user's workspace to help them with their request.

{context}

### User Request:
{user_query}

Provide a clear and concise response. If you suggest code changes, explain them briefly."""
        
        return full_prompt

context_service = ContextService()
