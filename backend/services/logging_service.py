import logging
import json
from typing import Dict, Any
from pathlib import Path
from ..config import settings

class SecureLogger:
    """Secure logging service that prevents code leaks"""
    
    def __init__(self):
        self.logger = logging.getLogger("jarvis-coder")
        self.setup_logging()
    
    def setup_logging(self):
        """Setup secure logging configuration"""
        # Create logs directory
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(logs_dir / "jarvis-coder.log"),
                logging.StreamHandler()
            ]
        )
    
    def sanitize_message(self, message: str) -> str:
        """Sanitize message to prevent code leaks in logs"""
        if not message:
            return "[EMPTY_MESSAGE]"
        
        # Check if message contains code blocks
        if '```' in message:
            # Replace code blocks with placeholders
            sanitized = message
            # Simple sanitization - replace code blocks with placeholders
            sanitized = sanitized.replace('```', '[CODE_BLOCK]')
            return f"[CONTAINS_CODE] {sanitized[:200]}..." if len(sanitized) > 200 else sanitized
        
        # For very long messages, truncate
        if len(message) > 500:
            return f"{message[:500]}...[TRUNCATED]"
        
        return message
    
    def log_chat(self, user_message: str, ai_response: str, provider: str):
        """Log chat interaction securely"""
        sanitized_user = self.sanitize_message(user_message)
        sanitized_ai = self.sanitize_message(ai_response)
        
        self.logger.info(
            f"Chat - User: {sanitized_user} | "
            f"Provider: {provider} | "
            f"Response: {sanitized_ai}"
        )
    
    def log_code_generation(self, prompt: str, filename: str, success: bool):
        """Log code generation events"""
        sanitized_prompt = self.sanitize_message(prompt)
        
        self.logger.info(
            f"CodeGen - Prompt: {sanitized_prompt} | "
            f"File: {filename} | "
            f"Success: {success}"
        )
    
    def log_file_operation(self, operation: str, filepath: str, success: bool, error: str = None):
        """Log file operations"""
        log_msg = f"FileOp - {operation}: {filepath} | Success: {success}"
        if error:
            log_msg += f" | Error: {error}"
        
        self.logger.info(log_msg)
    
    def log_system_event(self, event: str, details: Dict[str, Any] = None):
        """Log system events"""
        if details:
            details_str = json.dumps(details, default=str)
            self.logger.info(f"System - {event}: {details_str}")
        else:
            self.logger.info(f"System - {event}")
    
    def log_error(self, error_type: str, error_message: str, context: Dict[str, Any] = None):
        """Log errors with context"""
        if context:
            context_str = json.dumps(context, default=str)
            self.logger.error(f"Error - {error_type}: {error_message} | Context: {context_str}")
        else:
            self.logger.error(f"Error - {error_type}: {error_message}")

# Global logging service instance
logger = SecureLogger()
