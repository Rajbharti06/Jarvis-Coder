from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.services.semantic_search_service import semantic_search

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5

@router.post("/query")
async def query_codebase(request: SearchRequest):
    """Semantic search over the codebase."""
    try:
        results = semantic_search.search(request.query, request.n_results)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reindex")
async def reindex_project(background_tasks: BackgroundTasks):
    """Reindex the project for semantic search."""
    try:
        background_tasks.add_task(semantic_search.index_project)
        return {"message": "Reindexing started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
