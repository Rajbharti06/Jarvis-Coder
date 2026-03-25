import tiktoken
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class TokenService:
    """Service for counting tokens and managing context budgets."""
    
    def __init__(self):
        # Default budgets for common models
        self.budgets = {
            "gpt-4o": 128000,
            "gpt-4o-mini": 128000,
            "gpt-4-turbo": 128000,
            "claude-3-opus": 200000,
            "claude-3-sonnet": 200000,
            "claude-3-haiku": 200000,
            "deepseek-coder": 16384,
            "codellama": 4096,
            "phi3": 4096,
            "mistral": 8192,
            "llama3-70b": 8192,
            "llama3-8b": 8192,
        }
        
        # Reserved tokens for different parts of the prompt
        self.reserved = {
            "system_prompt": 500,
            "user_message": 500,
            "response": 1500,
        }

    def count_tokens(self, text: str, model: str = "gpt-4o") -> int:
        """Counts tokens in a text string using tiktoken for OpenAI models, 
        or a rough estimate for others.
        """
        try:
            # tiktoken only works for OpenAI models
            if any(m in model.lower() for m in ["gpt-4", "gpt-3.5"]):
                encoding = tiktoken.encoding_for_model(model)
                return len(encoding.encode(text))
            else:
                # Fallback: Rough estimate (approx 4 chars per token)
                return len(text) // 4
        except Exception as e:
            logger.warning(f"Error counting tokens for model {model}: {e}")
            return len(text) // 4

    def get_budget(self, model: str) -> int:
        """Returns the total context budget for a given model."""
        for key, budget in self.budgets.items():
            if key in model.lower():
                return budget
        return 4096  # Default fallback

    def get_available_context_tokens(self, model: str) -> int:
        """Calculates how many tokens are left for file context after reservations."""
        total = self.get_budget(model)
        reserved_total = sum(self.reserved.values())
        return max(0, total - reserved_total)

token_service = TokenService()
