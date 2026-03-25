from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.services.plugin_service import plugin_manager

router = APIRouter()

@router.get("/list")
async def list_plugins():
    """List all loaded plugins."""
    return list(plugin_manager.plugins.keys())

@router.post("/reload")
async def reload_plugins():
    """Reload all plugins from the plugins directory."""
    try:
        plugin_manager.load_plugins()
        return {"message": "Plugins reloaded successfully", "count": len(plugin_manager.plugins)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
