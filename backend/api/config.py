from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import os

from backend.config import Config, load_config, settings

router = APIRouter()

class SetModelRequest(BaseModel):
    model: str

class SetApiKeyRequest(BaseModel):
    provider: str
    key: str

def get_config_path() -> str:
    """Helper to get the absolute path to the config.json file."""
    # This assumes this file is in backend/api/
    # So we go up two directories to get to the backend root
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(backend_dir, "config.json")

@router.get("/config", response_model=Config)
async def get_config():
    """Retrieve the current application configuration."""
    return settings.app_config

@router.put("/config")
async def update_config(new_config: Config):
    """Update the entire configuration."""
    try:
        config_path = get_config_path()
        with open(config_path, "w") as f:
            json.dump(new_config.dict(), f, indent=2)
        settings.app_config = load_config()
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config/default_model")
async def set_default_model(request: SetModelRequest):
    """Set the default model."""
    try:
        config_path = get_config_path()
        current_config = settings.app_config.dict()
        current_config['default_model'] = request.model
        
        with open(config_path, "w") as f:
            json.dump(current_config, f, indent=2)
        
        settings.app_config = load_config()
        return {"message": f"Default model set to {request.model}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config/api_key")
async def set_api_key(request: SetApiKeyRequest):
    """Add or update an API key for a provider."""
    try:
        config_path = get_config_path()
        current_config = settings.app_config.dict()
        current_config['api_keys'][request.provider] = request.key
        
        with open(config_path, "w") as f:
            json.dump(current_config, f, indent=2)
            
        settings.app_config = load_config()
        return {"message": f"API key for {request.provider} updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
