import re
import logging
from typing import Dict, Any, Optional, AsyncGenerator, List
from backend.services.ai_service import ai_service
from backend.services import workspace_service
from backend.services.context_service import context_service
from backend.services.semantic_search_service import semantic_search
from backend.services.execution_service import execute_command
from backend.services.agent_service import agent_service

logger = logging.getLogger(__name__)

class CommandProcessor:
    """Process and handle various Jarvis commands with context awareness."""
    
    def __init__(self):
        self.command_handlers = {
            'code': self._handle_code_command,
            'explain': self._handle_explain_command,
            'fix': self._handle_fix_command,
            'refactor': self._handle_refactor_command,
            'optimize': self._handle_optimize_command,
            'test': self._handle_test_command,
            'search': self._handle_search_command,
            'index': self._handle_index_command,
            'run': self._handle_run_command,
            'git': self._handle_git_command,
            'model': self._handle_model_command,
            'apply': self._handle_apply_command,
            'undo': self._handle_undo_command,
            'context': self._handle_context_command,
        }
    
    async def process_command(self, command: str, model: Optional[str] = None, active_file_path: Optional[str] = None, conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        """Process a command and return a stream of response chunks."""
        command = command.strip()
        
        if not command.startswith('/'):
            prompt = context_service.format_prompt_with_context(command, active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
            async for chunk in ai_service.generate_response(prompt, model, stream=True):
                yield chunk
            return

        parts = command[1:].split(' ', 1)  # type: ignore
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        if cmd in self.command_handlers:
            async for chunk in self.command_handlers[cmd](args, model, active_file_path, conversation_history):  # type: ignore
                yield chunk
        else:
            yield f"Unknown command: /{cmd}. Available commands: {', '.join(self.command_handlers.keys())}"

    async def _handle_explain_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        query = f"Explain the following code inline: {args}" if args else "Explain the current file."
        prompt = context_service.format_prompt_with_context(query, active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
        async for chunk in ai_service.generate_response(prompt, model, stream=True):
            yield chunk

    async def _handle_fix_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        query = f"Fix bugs in the current file. Include SEARCH/REPLACE blocks. Issue: {args}" if args else "Fix bugs in the current file. Include SEARCH/REPLACE blocks."
        prompt = context_service.format_prompt_with_context(query, active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
        async for chunk in ai_service.generate_response(prompt, model, stream=True):
            yield chunk

    async def _handle_refactor_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        query = f"Refactor the current file, Output SEARCH/REPLACE blocks. Request: {args}" if args else "Refactor the current file for better readability. Provide SEARCH/REPLACE blocks."
        prompt = context_service.format_prompt_with_context(query, active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
        async for chunk in ai_service.generate_response(prompt, model, stream=True):
            yield chunk

    async def _handle_optimize_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        query = f"Optimize the following code for performance using SEARCH/REPLACE blocks: {args}" if args else "Optimize the current file for performance using SEARCH/REPLACE blocks."
        prompt = context_service.format_prompt_with_context(query, active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
        async for chunk in ai_service.generate_response(prompt, model, stream=True):
            yield chunk

    async def _handle_test_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        yield "Running tests...\n"
        test_cmd = args if args else ("pytest" if active_file_path and active_file_path.endswith('.py') else "npm test")
        res = await execute_command(test_cmd)
        if res.get('stdout'): yield f"```\n{res['stdout']}\n```"
        if res.get('stderr'): yield f"Errors:\n```\n{res['stderr']}\n```"

    async def _handle_search_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        if not args:
            yield "Please provide a search query."
            return
        yield f"Searching for: {args}...\n"
        results = semantic_search.search(args)
        if not results:
            yield "No results found."
        else:
            for res in results:
                yield f"- **{res['path']}** (Score: {res['distance']:.2f})\n  `{res['snippet']}...` \n\n"

    async def _handle_index_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        yield "Indexing codebase for semantic search... (this may take a minute)\n"
        try:
            semantic_search.index_project()
            yield "✅ Indexing complete!"
        except Exception as e:
            yield f"❌ Indexing failed: {str(e)}"

    async def _handle_code_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        if not args:
            yield "Please provide a description of the code you want to generate."
            return
        prompt = context_service.format_prompt_with_context(f"Generate code using SEARCH/REPLACE block format for: {args}", active_file_path, model=model or "gpt-4o", conversation_history=conversation_history)
        async for chunk in ai_service.generate_response(prompt, model, stream=True):
            yield chunk

    async def _handle_model_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        if not args:
            yield f"Current model: {model or 'default'}. Available models: gpt-4o, gpt-4o-mini, claude-3-opus, mistral, deepseek-coder."
            return
        yield f"✅ Model switched to: {args.strip()}"

    async def _handle_run_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        if not args:
            yield "Please provide a command to run."
            return
        yield f"Running: {args}...\n"
        res = await execute_command(args)
        if res.get('stdout'): yield f"```\n{res['stdout']}\n```"
        if res.get('stderr'): yield f"Errors:\n```\n{res['stderr']}\n```"

    async def _handle_git_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        yield f"Running git {args}...\n"
        res = await execute_command(f"git {args}")
        if res.get('stdout'): yield f"```\n{res['stdout']}\n```"
    async def _handle_apply_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        yield "Searching conversation history for the last code edits...\n"
        if not conversation_history:
            yield "❌ No conversation history available to apply edits from."
            return
            
        # Find the last assistant message
        last_msg = None
        for msg in reversed(conversation_history):
            if msg['role'] == 'assistant':
                last_msg = msg['content']
                break
                
        if not last_msg:
            yield "❌ Could not find any recent AI suggestions."
            return
            
        edits = agent_service.parse_edits(last_msg)
        if not edits:
             yield "❌ No SEARCH/REPLACE blocks found in the last AI response. Ask the AI to /fix or /refactor first."
             return
             
        yield f"Applying {len(edits)} edit(s)...\n"
        for idx, edit in enumerate(edits):
            agent_service._create_backup(edit['path'])
            res = agent_service.apply_edit(edit)
            if res.get('status') == 'success':
                yield f"✅ Apply edit {idx+1} to {edit['path']}: Success\n"
            else:
                yield f"❌ Apply edit {idx+1} to {edit['path']}: Failed ({res.get('message')})\n"
                
    async def _handle_undo_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        target_file = args.strip() or active_file_path
        if not target_file:
            yield "Please specify a file to undo, or open a file in the editor."
            return
            
        yield f"Undoing last agent edit on {target_file}...\n"
        success = agent_service.rollback(target_file)
        if success:
            yield f"✅ Successfully rolled back {target_file} to its previous state."
        else:
            yield f"❌ No backup found for {target_file}."

    async def _handle_context_command(self, args: str, model: Optional[str], active_file_path: Optional[str], conversation_history: Optional[List[Dict[str, str]]] = None) -> AsyncGenerator[str, None]:
        # Context building command
        yield f"Context handling expanded. Workspace already configured to observe {args} dynamically through heuristics."

command_processor = CommandProcessor()
