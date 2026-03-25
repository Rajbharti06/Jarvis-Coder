from fastapi import APIRouter
from backend.services.memory_service import memory_service

router = APIRouter()

@router.get("/stats")
async def get_memory_stats():
    """Get system resource usage statistics."""
    return memory_service.get_stats()
