"""
Context Router for Jarvis Terminal
Provides endpoints for codebase analysis and context-aware operations
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..services.context_service import context_service, FileInfo, ProjectContext


router = APIRouter(prefix="/context", tags=["context"])


class SearchRequest(BaseModel):
    query: str
    file_types: Optional[List[str]] = None
    max_results: Optional[int] = 50


class SearchResult(BaseModel):
    file: str
    line: int
    content: str
    context: List[str]


@router.get("/project", response_model=Dict[str, Any])
async def get_project_summary():
    """Get a high-level summary of the project"""
    try:
        summary = await context_service.get_project_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project summary: {e}")


@router.get("/project/full", response_model=ProjectContext)
async def get_full_project_context():
    """Get complete project analysis and context"""
    try:
        context = await context_service.analyze_project()
        return context
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze project: {e}")


@router.get("/file/{file_path:path}", response_model=Optional[FileInfo])
async def get_file_context(file_path: str):
    """Get detailed context for a specific file"""
    try:
        file_info = await context_service.get_file_context(file_path)
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        return file_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file context: {e}")


@router.get("/file/{file_path:path}/related", response_model=List[FileInfo])
async def get_related_files(
    file_path: str,
    max_files: int = Query(10, ge=1, le=50, description="Maximum number of related files to return")
):
    """Get files related to the specified file"""
    try:
        related_files = await context_service.get_related_files(file_path, max_files)
        return related_files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get related files: {e}")


@router.post("/search", response_model=List[SearchResult])
async def search_code(request: SearchRequest):
    """Search for code patterns across the codebase"""
    try:
        results = await context_service.search_code(
            query=request.query,
            file_types=request.file_types
        )
        
        # Limit results
        if request.max_results:
            results = results[:request.max_results]
        
        return [SearchResult(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


@router.get("/languages")
async def get_project_languages():
    """Get programming languages used in the project"""
    try:
        context = await context_service.analyze_project()
        return {
            "languages": context.languages,
            "frameworks": context.frameworks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get languages: {e}")


@router.get("/structure")
async def get_project_structure():
    """Get project directory structure"""
    try:
        context = await context_service.analyze_project()
        return {
            "structure": context.structure,
            "file_count": context.file_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get structure: {e}")


@router.get("/dependencies")
async def get_project_dependencies():
    """Get project dependencies"""
    try:
        context = await context_service.analyze_project()
        return {
            "dependencies": context.dependencies,
            "frameworks": context.frameworks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dependencies: {e}")


@router.post("/refresh")
async def refresh_project_context():
    """Force refresh of project context cache"""
    try:
        # Clear cache by removing cache files
        import shutil
        cache_dir = context_service.cache_dir
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
            cache_dir.mkdir(exist_ok=True)
        
        # Re-analyze project
        context = await context_service.analyze_project()
        return {
            "message": "Project context refreshed successfully",
            "file_count": context.file_count,
            "languages": context.languages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh context: {e}")


@router.get("/stats")
async def get_project_stats():
    """Get project statistics"""
    try:
        context = await context_service.analyze_project()
        
        # Calculate additional stats
        language_stats = {}
        complexity_stats = {}
        
        # This would require iterating through files, simplified for now
        return {
            "total_files": context.file_count,
            "total_lines": context.total_lines,
            "languages": context.languages,
            "frameworks": context.frameworks,
            "last_updated": context.last_updated.isoformat(),
            "language_distribution": language_stats,
            "complexity_distribution": complexity_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {e}")