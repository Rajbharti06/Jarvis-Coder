import re
import os
import json
import logging
import shutil
from typing import List, Dict, Any, Optional, Callable, AsyncGenerator
from backend.services import workspace_service
from backend.services.ai_service import AIService
from backend.services.context_service import context_service
from backend.services.execution_service import execute_command
from backend.services.diff_service import diff_service
from backend.services.memory_service import memory_service

logger = logging.getLogger(__name__)

class AgentService:
    """Service to handle AI agent loops: think -> edit -> test -> fix."""
    
    def __init__(self):
        self.ai_service = AIService()
        self.backups_dir = "./backups"
        if not os.path.exists(self.backups_dir):
            os.makedirs(self.backups_dir)

    async def solve_with_loop(
        self, 
        task: str, 
        active_file: Optional[str] = None, 
        max_iterations: int = 3,
        progress_callback: Optional[Callable[[str, Any], None]] = None
    ) -> Dict[str, Any]:
        """Runs a task in a loop: propose edits -> apply -> run tests -> fix if needed."""
        iteration = 0
        current_task = task
        applied_edits = []
        logs = []

        while iteration < max_iterations:
            # Resource Check
            if memory_service.check_resource_limit():
                msg = "⚠️ Low system resources detected. Pausing agent loop for safety."
                logs.append(msg)
                if progress_callback: await progress_callback("log", msg)
                break

            iteration += 1
            log_msg = f"--- Iteration {iteration} ---"
            logs.append(log_msg)
            if progress_callback: await progress_callback("log", log_msg)
            
            # 1. Propose Edits
            if progress_callback: await progress_callback("status", "Thinking...")
            edits = await self.process_task(current_task, active_file, progress_callback)
            if not edits:
                log_msg = "No more edits proposed."
                logs.append(log_msg)
                if progress_callback: await progress_callback("log", log_msg)
                break

            # 2. Generate Diffs for Approval
            if progress_callback:
                for edit in edits:
                    try:
                        old_content = workspace_service.get_file_content(edit['path'])
                        # This is a temporary apply to generate diff
                        # In a real app, we'd do this in memory
                        new_content = old_content.replace(edit['search'], edit['replace'], 1)
                        diff = diff_service.generate_diff(old_content, new_content, edit['path'])
                        await progress_callback("diff", diff)
                    except Exception:
                        pass # New file or error

            # 3. Apply Edits (Backup first)
            if progress_callback: await progress_callback("status", "Applying edits...")
            step_results = []
            for edit in edits:
                # Backup before apply
                self._create_backup(edit['path'])
                
                res = self.apply_edit(edit)
                step_results.append(res)
                applied_edits.append(edit)
                log_msg = f"Applied edit to {edit['path']}: {res['status']}"
                logs.append(log_msg)
                if progress_callback: await progress_callback("log", log_msg)

            # 4. Verify
            if "test" in task.lower() or iteration > 1:
                test_cmd = "pytest" if any(e['path'].endswith('.py') for e in edits) else "npm test"
                log_msg = f"Running verification: {test_cmd}"
                logs.append(log_msg)
                if progress_callback: 
                    await progress_callback("status", "Testing...")
                    await progress_callback("log", log_msg)
                
                try:
                    test_res = await execute_command(test_cmd)
                    if test_res.get('exit_code') == 0:
                        log_msg = "✅ Tests passed!"
                        logs.append(log_msg)
                        if progress_callback: await progress_callback("log", log_msg)
                        break
                    else:
                        log_msg = f"❌ Tests failed: {test_res.get('stderr')}"
                        logs.append(log_msg)
                        if progress_callback: await progress_callback("log", log_msg)
                        # Feed error back into the next iteration
                        current_task = f"The previous edits resulted in a test failure:\n{test_res.get('stderr')}\n\nPlease fix the errors."
                except Exception as e:
                    log_msg = f"Error running tests: {e}"
                    logs.append(log_msg)
                    if progress_callback: await progress_callback("log", log_msg)
                    break
            else:
                # If no test command, just stop after one iteration for now
                break

        if progress_callback: await progress_callback("status", "Completed")
        return {
            "status": "completed" if iteration < max_iterations else "max_iterations_reached",
            "edits": applied_edits,
            "logs": logs
        }

    async def process_task(self, task_description: str, active_file_path: Optional[str] = None, progress_callback: Optional[Callable[[str, Any], None]] = None) -> List[Dict[str, Any]]:
        """Processes a task by generating file edits with full streaming support."""
        context = context_service.get_full_context(active_file_path, query=task_description)
        
        system_prompt = f"""You are Jarvis Coder's Agent Mode. 
You can propose file edits to solve the user's task. 
Use the following format for your edits:

SEARCH/REPLACE format:
FILE: [path/to/file]
<<<<<<< SEARCH
[exact code to find]
=======
[new code to replace it with]
>>>>>>> REPLACE

You can include multiple such blocks. 
Always provide the FULL relative path to the file.
The SEARCH block must match EXACTLY (including indentation) what is in the file.
If you want to create a NEW file, use an empty SEARCH block.

### Workspace Context:
{context}
"""

        full_prompt = f"{system_prompt}\n\n### Task:\n{task_description}\n\nRespond only with the file edits in the format specified."
        
        response_content = ""
        # Stream output token by token immediately back to UI
        async for chunk in self.ai_service.generate_response(full_prompt, stream=True):
            response_content += chunk
            if progress_callback:
                await progress_callback("stream", chunk)
                
        # Send a newline after streaming finishes to separate cleanly
        if progress_callback:
            await progress_callback("stream", "\n")
            
        return self.parse_edits(response_content)

    def parse_edits(self, text: str) -> List[Dict[str, Any]]:
        """Parses SEARCH/REPLACE blocks from AI response."""
        edits = []
        pattern = r"FILE:\s*(.*?)\s*<<<<<<< SEARCH\s*(.*?)\s*=======\s*(.*?)\s*>>>>>>> REPLACE"
        matches = re.findall(pattern, text, re.DOTALL)
        
        for file_path, search_str, replace_str in matches:
            edits.append({
                "path": file_path.strip(),
                "search": search_str,
                "replace": replace_str
            })
        return edits

    def apply_edit(self, edit: Dict[str, Any]) -> Dict[str, Any]:
        """Applies a single edit to the workspace."""
        file_path = edit["path"]
        search_str = edit["search"]
        replace_str = edit["replace"]
        
        try:
            if not search_str.strip():
                workspace_service.save_file_content(file_path, replace_str)
                return {"status": "success", "message": f"Created new file: {file_path}"}
            
            current_content = workspace_service.get_file_content(file_path)
            
            if search_str in current_content:
                new_content = current_content.replace(search_str, replace_str, 1)
                workspace_service.save_file_content(file_path, new_content)
                return {"status": "success", "message": f"Applied edit to {file_path}"}
            else:
                return {"status": "error", "message": f"Search block not found in {file_path}"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _create_backup(self, file_path: str):
        """Creates a backup of a file before editing."""
        full_path = workspace_service.WORKSPACE_DIR / file_path
        if full_path.exists():
            backup_path = os.path.join(self.backups_dir, f"{file_path.replace(os.sep, '_')}.bak")
            shutil.copy2(full_path, backup_path)

    def rollback(self, file_path: str) -> bool:
        """Rolls back a file to its last backup."""
        backup_path = os.path.join(self.backups_dir, f"{file_path.replace(os.sep, '_')}.bak")
        if os.path.exists(backup_path):
            full_path = workspace_service.WORKSPACE_DIR / file_path
            shutil.copy2(backup_path, full_path)
            return True
        return False

agent_service = AgentService()
