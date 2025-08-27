from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Application
    jarvis_mode: str = "hybrid"
    default_model: str = "gpt-4o"
    encryption_secret: str

    # Database
    db_url: str = "sqlite:///./jarvis_coder.db"

    # JWT
    jwt_secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # API Keys (optional)
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    together_api_key: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
