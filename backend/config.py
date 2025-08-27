import json
import os
from pydantic_settings import BaseSettings
from pydantic import BaseModel, RootModel
from typing import Dict, Optional, Any

class ApiKeys(RootModel):
    # Make API keys more flexible to support dynamic providers
    root: Dict[str, Optional[str]] = {}

class Config(BaseModel):
    default_model: str
    api_keys: ApiKeys
    local_models: Dict[str, str]
    llm_providers: Dict[str, Any] = {}
    prompt_templates: Dict[str, str] = {}
def load_config() -> Config:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, os.pardir, os.pardir))
    jarvis_config_path = os.path.join(project_root, ".jarvisconfig")
    
    if os.path.exists(jarvis_config_path):
        config_path = jarvis_config_path
    else:
        config_path = os.path.join(script_dir, "config.json")

    with open(config_path, encoding='utf-8') as f:
        config_data = json.load(f)
    return Config(**config_data)

class Settings(BaseSettings):
    jarvis_mode: str = "offline"
    ollama_model: str = "gpt-oss:20b"
    openai_model: str = "gpt-4o-mini"
    openai_api_key: str = ""
    
    app_config: Config = load_config()

    class Config:
        env_file = ".env"
        # Allow extra fields to support dynamic settings
        extra = "allow"

settings = Settings()
