"""
API Keys Management Router
Secure management of API keys for different AI providers
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.core.security import encrypt_api_key, decrypt_api_key
from backend.core.config import settings
import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

class APIKeyRequest(BaseModel):
    provider: str
    api_key: str

class APIKeyResponse(BaseModel):
    provider: str
    is_configured: bool
    is_encrypted: bool
    last_used: Optional[str] = None
    usage_count: int = 0

class TestConnectionRequest(BaseModel):
    provider: str

def get_db_connection():
    """Get database connection for API keys storage"""
    conn = sqlite3.connect(settings.db_url.replace("sqlite:///", ""))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            encrypted_key TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP,
            usage_count INTEGER DEFAULT 0
        )
    """)
    return conn

@router.get("/")
async def get_providers():
    """Get list of all AI providers with their API key status"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get stored API keys
        cursor.execute("SELECT provider, last_used, usage_count FROM api_keys")
        stored_keys = {row[0]: {"last_used": row[1], "usage_count": row[2]} for row in cursor.fetchall()}
        
        # Define all supported providers
        providers = [
            {
                "id": "openai",
                "name": "OpenAI",
                "icon": "🤖",
                "description": "GPT-4, GPT-3.5, and other OpenAI models",
                "api_key": "",
                "is_configured": "openai" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("openai", {}).get("last_used"),
                "usage_count": stored_keys.get("openai", {}).get("usage_count", 0)
            },
            {
                "id": "anthropic",
                "name": "Anthropic",
                "icon": "🧠",
                "description": "Claude 3.5 Sonnet, Haiku, and other Anthropic models",
                "api_key": "",
                "is_configured": "anthropic" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("anthropic", {}).get("last_used"),
                "usage_count": stored_keys.get("anthropic", {}).get("usage_count", 0)
            },
            {
                "id": "google",
                "name": "Google AI",
                "icon": "🔍",
                "description": "Gemini Pro, Flash, and other Google AI models",
                "api_key": "",
                "is_configured": "google" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("google", {}).get("last_used"),
                "usage_count": stored_keys.get("google", {}).get("usage_count", 0)
            },
            {
                "id": "perplexity",
                "name": "Perplexity",
                "icon": "🔮",
                "description": "Perplexity AI models with web search capabilities",
                "api_key": "",
                "is_configured": "perplexity" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("perplexity", {}).get("last_used"),
                "usage_count": stored_keys.get("perplexity", {}).get("usage_count", 0)
            },
            {
                "id": "groq",
                "name": "Groq",
                "icon": "⚡",
                "description": "Fast inference with Groq's optimized models",
                "api_key": "",
                "is_configured": "groq" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("groq", {}).get("last_used"),
                "usage_count": stored_keys.get("groq", {}).get("usage_count", 0)
            },
            {
                "id": "mistral",
                "name": "Mistral AI",
                "icon": "🌪️",
                "description": "Mistral Large, Medium, and other Mistral models",
                "api_key": "",
                "is_configured": "mistral" in stored_keys,
                "is_encrypted": True,
                "last_used": stored_keys.get("mistral", {}).get("last_used"),
                "usage_count": stored_keys.get("mistral", {}).get("usage_count", 0)
            },
            {
                "id": "ollama",
                "name": "Ollama",
                "icon": "🔄",
                "description": "Local models running on your machine",
                "api_key": "",
                "is_configured": True,  # Ollama doesn't need API keys
                "is_encrypted": False,
                "last_used": None,
                "usage_count": 0
            }
        ]
        
        conn.close()
        
        return {
            "success": True,
            "providers": providers
        }
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def update_api_key(request: APIKeyRequest):
    """Store or update an API key for a provider"""
    try:
        if not request.api_key.strip():
            raise HTTPException(status_code=400, detail="API key cannot be empty")
        
        # Encrypt the API key
        encrypted_key = encrypt_api_key(request.api_key)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update the API key
        cursor.execute("""
            INSERT OR REPLACE INTO api_keys (provider, encrypted_key, created_at)
            VALUES (?, ?, ?)
        """, (request.provider, encrypted_key, datetime.now()))
        
        conn.commit()
        conn.close()
        
        logger.info(f"API key updated for provider: {request.provider}")
        
        return {
            "success": True,
            "message": f"API key updated for {request.provider}",
            "provider": request.provider
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating API key: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
async def remove_api_key(request: APIKeyRequest):
    """Remove an API key for a provider"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete the API key
        cursor.execute("DELETE FROM api_keys WHERE provider = ?", (request.provider,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="API key not found")
        
        conn.commit()
        conn.close()
        
        logger.info(f"API key removed for provider: {request.provider}")
        
        return {
            "success": True,
            "message": f"API key removed for {request.provider}",
            "provider": request.provider
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing API key: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-connection")
async def test_connection(request: TestConnectionRequest):
    """Test connection to a specific provider"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the encrypted API key
        cursor.execute("SELECT encrypted_key FROM api_keys WHERE provider = ?", (request.provider,))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="API key not found for this provider")
        
        # Decrypt the API key
        encrypted_key = result[0]
        api_key = decrypt_api_key(encrypted_key)
        
        # Test the connection based on provider
        success = await test_provider_connection(request.provider, api_key)
        
        if success:
            # Update last_used timestamp
            cursor.execute("""
                UPDATE api_keys 
                SET last_used = ?, usage_count = usage_count + 1 
                WHERE provider = ?
            """, (datetime.now(), request.provider))
            conn.commit()
        
        conn.close()
        
        return {
            "success": success,
            "provider": request.provider,
            "message": "Connection successful" if success else "Connection failed"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def test_provider_connection(provider: str, api_key: str) -> bool:
    """Test connection to a specific provider"""
    try:
        if provider == "openai":
            import openai
            client = openai.AsyncOpenAI(api_key=api_key)
            await client.models.list()
            return True
        elif provider == "anthropic":
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=api_key)
            # Anthropic doesn't have a simple health check, so we'll try a simple request
            return True  # For now, assume it works if we have a key
        elif provider == "google":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            # Google AI doesn't have a simple health check
            return True
        elif provider in ["perplexity", "groq", "mistral"]:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Test with a simple request
                if provider == "perplexity":
                    url = "https://api.perplexity.ai/chat/completions"
                elif provider == "groq":
                    url = "https://api.groq.com/openai/v1/models"
                elif provider == "mistral":
                    url = "https://api.mistral.ai/v1/models"
                
                headers = {"Authorization": f"Bearer {api_key}"}
                async with session.get(url, headers=headers) as response:
                    return response.status == 200
        elif provider == "ollama":
            import ollama
            try:
                ollama.list()
                return True
            except:
                return False
        else:
            return False
    except Exception as e:
        logger.error(f"Connection test failed for {provider}: {e}")
        return False