from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from backend.services.plugin_service import PluginService

router = APIRouter()
service = PluginService()

class PluginManifest(BaseModel):
    id: str
    name: str
    version: str
    description: str | None = None
    author: str | None = None
    homepage: str | None = None
    enabled: bool | None = None

@router.get("/", response_model=List[Dict[str, Any]])
async def list_plugins():
    try:
        return service.list_plugins()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Dict[str, Any])
async def register_plugin(manifest: PluginManifest):
    try:
        return service.register_plugin(manifest.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{plugin_id}/enable", response_model=Dict[str, Any])
async def enable_plugin(plugin_id: str):
    try:
        return service.set_enabled(plugin_id, True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{plugin_id}/disable", response_model=Dict[str, Any])
async def disable_plugin(plugin_id: str):
    try:
        return service.set_enabled(plugin_id, False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

