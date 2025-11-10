"""
Secure API key management with encryption for Jarvis Terminal.
Handles encryption, decryption, and secure storage of API keys.
"""

import os
import json
import base64
from typing import Dict, Optional, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class APIKeyManager:
    """Secure API key management with encryption."""
    
    def __init__(self, master_password: Optional[str] = None):
        """
        Initialize the API key manager.
        
        Args:
            master_password: Master password for encryption. If None, uses environment variable.
        """
        self.config_dir = os.path.expanduser("~/.jarvis-terminal")
        self.keys_file = os.path.join(self.config_dir, "encrypted_keys.json")
        self.salt_file = os.path.join(self.config_dir, "salt.key")
        
        # Ensure config directory exists
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Set master password
        self.master_password = master_password or os.getenv("JARVIS_MASTER_PASSWORD", "jarvis-default-key")
        
        # Initialize encryption
        self._cipher = self._get_cipher()
        
    def _get_cipher(self) -> Fernet:
        """Get or create encryption cipher."""
        try:
            # Try to load existing salt
            if os.path.exists(self.salt_file):
                with open(self.salt_file, 'rb') as f:
                    salt = f.read()
            else:
                # Generate new salt
                salt = os.urandom(16)
                with open(self.salt_file, 'wb') as f:
                    f.write(salt)
            
            # Derive key from password
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.master_password.encode()))
            return Fernet(key)
            
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            # Fallback to simple key
            key = base64.urlsafe_b64encode(b"jarvis-fallback-key-32-chars!!")
            return Fernet(key)
    
    def _load_encrypted_keys(self) -> Dict[str, str]:
        """Load encrypted keys from file."""
        if not os.path.exists(self.keys_file):
            return {}
        
        try:
            with open(self.keys_file, 'r') as f:
                encrypted_data = json.load(f)
            
            decrypted_keys = {}
            for provider, encrypted_key in encrypted_data.items():
                try:
                    decrypted_key = self._cipher.decrypt(encrypted_key.encode()).decode()
                    decrypted_keys[provider] = decrypted_key
                except Exception as e:
                    logger.warning(f"Failed to decrypt key for {provider}: {e}")
            
            return decrypted_keys
            
        except Exception as e:
            logger.error(f"Failed to load encrypted keys: {e}")
            return {}
    
    def _save_encrypted_keys(self, keys: Dict[str, str]) -> bool:
        """Save encrypted keys to file."""
        try:
            encrypted_data = {}
            for provider, key in keys.items():
                encrypted_key = self._cipher.encrypt(key.encode()).decode()
                encrypted_data[provider] = encrypted_key
            
            with open(self.keys_file, 'w') as f:
                json.dump(encrypted_data, f, indent=2)
            
            # Set restrictive permissions
            os.chmod(self.keys_file, 0o600)
            return True
            
        except Exception as e:
            logger.error(f"Failed to save encrypted keys: {e}")
            return False
    
    def set_api_key(self, provider: str, api_key: str) -> bool:
        """
        Set API key for a provider.
        
        Args:
            provider: Provider name (e.g., 'openai', 'anthropic', 'google')
            api_key: API key to store
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            keys = self._load_encrypted_keys()
            keys[provider.lower()] = api_key
            return self._save_encrypted_keys(keys)
        except Exception as e:
            logger.error(f"Failed to set API key for {provider}: {e}")
            return False
    
    def get_api_key(self, provider: str) -> Optional[str]:
        """
        Get API key for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            str: API key if found, None otherwise
        """
        try:
            keys = self._load_encrypted_keys()
            return keys.get(provider.lower())
        except Exception as e:
            logger.error(f"Failed to get API key for {provider}: {e}")
            return None
    
    def remove_api_key(self, provider: str) -> bool:
        """
        Remove API key for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            keys = self._load_encrypted_keys()
            if provider.lower() in keys:
                del keys[provider.lower()]
                return self._save_encrypted_keys(keys)
            return True
        except Exception as e:
            logger.error(f"Failed to remove API key for {provider}: {e}")
            return False
    
    def list_providers(self) -> list[str]:
        """
        List all providers with stored API keys.
        
        Returns:
            list: List of provider names
        """
        try:
            keys = self._load_encrypted_keys()
            return list(keys.keys())
        except Exception as e:
            logger.error(f"Failed to list providers: {e}")
            return []
    
    def validate_api_key(self, provider: str, api_key: Optional[str] = None) -> bool:
        """
        Validate API key format for a provider.
        
        Args:
            provider: Provider name
            api_key: API key to validate (if None, uses stored key)
            
        Returns:
            bool: True if valid format, False otherwise
        """
        if api_key is None:
            api_key = self.get_api_key(provider)
        
        if not api_key:
            return False
        
        # Basic validation patterns
        validation_patterns = {
            'openai': lambda k: k.startswith('sk-') and len(k) > 20,
            'anthropic': lambda k: k.startswith('sk-ant-') and len(k) > 20,
            'google': lambda k: len(k) > 20,  # Google API keys vary
            'perplexity': lambda k: k.startswith('pplx-') and len(k) > 20,
            'groq': lambda k: k.startswith('gsk_') and len(k) > 20,
            'mistral': lambda k: len(k) > 20,  # Mistral keys vary
            'moonshot': lambda k: k.startswith('sk-') and len(k) > 20,
        }
        
        validator = validation_patterns.get(provider.lower())
        if validator:
            return validator(api_key)
        
        # Default validation: non-empty and reasonable length
        return len(api_key.strip()) > 10
    
    def get_provider_config(self, provider: str) -> Dict[str, Any]:
        """
        Get complete configuration for a provider.
        
        Args:
            provider: Provider name
            
        Returns:
            dict: Configuration including API key and metadata
        """
        api_key = self.get_api_key(provider)
        is_valid = self.validate_api_key(provider, api_key)
        
        return {
            'provider': provider,
            'api_key': api_key,
            'is_configured': api_key is not None,
            'is_valid': is_valid,
            'masked_key': self._mask_api_key(api_key) if api_key else None
        }
    
    def _mask_api_key(self, api_key: str) -> str:
        """Mask API key for display purposes."""
        if len(api_key) <= 8:
            return '*' * len(api_key)
        return api_key[:4] + '*' * (len(api_key) - 8) + api_key[-4:]
    
    def export_config(self, include_keys: bool = False) -> Dict[str, Any]:
        """
        Export configuration for backup or transfer.
        
        Args:
            include_keys: Whether to include actual API keys (dangerous!)
            
        Returns:
            dict: Configuration data
        """
        providers = self.list_providers()
        config = {
            'providers': [],
            'created_at': os.path.getctime(self.keys_file) if os.path.exists(self.keys_file) else None,
            'total_providers': len(providers)
        }
        
        for provider in providers:
            provider_config = self.get_provider_config(provider)
            if not include_keys:
                provider_config.pop('api_key', None)
            config['providers'].append(provider_config)
        
        return config
    
    def clear_all_keys(self) -> bool:
        """
        Clear all stored API keys.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if os.path.exists(self.keys_file):
                os.remove(self.keys_file)
            return True
        except Exception as e:
            logger.error(f"Failed to clear all keys: {e}")
            return False


# Global instance
_api_key_manager = None

def get_api_key_manager(master_password: Optional[str] = None) -> APIKeyManager:
    """Get global API key manager instance."""
    global _api_key_manager
    if _api_key_manager is None:
        _api_key_manager = APIKeyManager(master_password)
    return _api_key_manager


# Convenience functions
def set_api_key(provider: str, api_key: str) -> bool:
    """Set API key for a provider."""
    return get_api_key_manager().set_api_key(provider, api_key)

def get_api_key(provider: str) -> Optional[str]:
    """Get API key for a provider."""
    return get_api_key_manager().get_api_key(provider)

def validate_api_key(provider: str, api_key: Optional[str] = None) -> bool:
    """Validate API key for a provider."""
    return get_api_key_manager().validate_api_key(provider, api_key)