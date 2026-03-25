import difflib
from typing import List, Dict, Any

class DiffService:
    """Service for generating and managing code diffs."""
    
    @staticmethod
    def generate_diff(old_content: str, new_content: str, file_path: str) -> Dict[str, Any]:
        """Generates a structured diff between old and new content."""
        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        
        diff_lines = list(difflib.unified_diff(
            old_lines, 
            new_lines, 
            fromfile=f"a/{file_path}", 
            tofile=f"b/{file_path}"
        ))
        
        # Parse unified diff into hunks (simplified)
        hunks = []
        current_hunk: Dict[str, Any] | None = None
        
        for line in diff_lines:
            if line.startswith('@@'):
                if current_hunk:
                    hunks.append(current_hunk)
                # Parse hunk header: @@ -start,len +start,len @@
                current_hunk = {"header": line.strip(), "lines": []}
            elif current_hunk is not None:
                current_hunk["lines"].append(line)
                
        if current_hunk:
            hunks.append(current_hunk)
            
        return {
            "file": file_path,
            "hunks": hunks,
            "raw": "".join(diff_lines)
        }

    @staticmethod
    def apply_hunk(content: str, hunk: Dict[str, Any]) -> str:
        """Applies a specific hunk to the content (not implemented for MVP)."""
        # This is complex to implement correctly without full patch logic
        return content

diff_service = DiffService()
