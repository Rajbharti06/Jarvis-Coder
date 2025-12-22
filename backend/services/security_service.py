"""
Security Service
Implements privacy protection and security measures for Trae Cursor Blackbox
Handles data encryption, access control, and privacy compliance
"""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from collections import defaultdict
import sqlite3
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import jwt

from backend.core.config import settings

logger = logging.getLogger(__name__)

class SecurityService:
    """
    Service for implementing security and privacy protection
    Handles encryption, access control, audit logging, and compliance
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.encryption_key = None
        self.access_tokens = {}
        self.rate_limits = {}
        self.audit_log = []
        self.security_policies = {}
        self.blocked_ips = set()
        self.suspicious_activities = []
        
        # Security configuration
        self.max_requests_per_minute = 60
        self.max_requests_per_hour = 1000
        self.token_expiry_hours = 24
        self.max_failed_attempts = 5
        self.lockout_duration_minutes = 30
        
        # Initialize security components safely depending on event loop state
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self._init_security_db())
                loop.create_task(self._init_encryption())
                loop.create_task(self._load_security_policies())
                loop.create_task(self._security_monitoring_loop())
            else:
                loop.run_until_complete(self._init_security_db())
                loop.run_until_complete(self._init_encryption())
                loop.run_until_complete(self._load_security_policies())
                # Skip starting monitoring loop until an event loop is running
        except Exception:
            # Fallback to synchronous initialization if loop retrieval fails
            try:
                asyncio.run(self._init_security_db())
                asyncio.run(self._init_encryption())
                asyncio.run(self._load_security_policies())
            except Exception:
                pass
    
    async def _init_security_db(self):
        """Initialize security database tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Access tokens table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS access_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_hash TEXT UNIQUE,
                    user_id TEXT,
                    permissions TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    last_used DATETIME,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Audit log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    action TEXT,
                    resource TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN,
                    details TEXT
                )
            ''')
            
            # Security events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    severity TEXT,
                    source_ip TEXT,
                    user_id TEXT,
                    description TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT 0
                )
            ''')
            
            # Rate limiting table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rate_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT,
                    request_count INTEGER,
                    window_start DATETIME,
                    window_type TEXT,
                    UNIQUE(identifier, window_type, window_start)
                )
            ''')
            
            # Data encryption keys table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS encryption_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key_id TEXT UNIQUE,
                    encrypted_key TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Privacy settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS privacy_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    setting_name TEXT,
                    setting_value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, setting_name)
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Security database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing security database: {e}")
    
    async def _init_encryption(self):
        """Initialize encryption system"""
        try:
            # Generate or load encryption key
            key_file = Path(settings.workspace_dir) / ".security" / "master.key"
            key_file.parent.mkdir(exist_ok=True)
            
            if key_file.exists():
                # Load existing key
                with open(key_file, 'rb') as f:
                    self.encryption_key = f.read()
            else:
                # Generate new key
                password = settings.secret_key.encode()
                salt = secrets.token_bytes(16)
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=100000,
                )
                self.encryption_key = base64.urlsafe_b64encode(kdf.derive(password))
                
                # Save key securely
                with open(key_file, 'wb') as f:
                    f.write(self.encryption_key)
                
                # Set restrictive permissions
                key_file.chmod(0o600)
            
            logger.info("Encryption system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing encryption: {e}")
    
    async def _load_security_policies(self):
        """Load security policies from configuration"""
        try:
            # Default security policies
            self.security_policies = {
                'data_retention_days': 90,
                'require_encryption': True,
                'allow_data_export': True,
                'require_consent': True,
                'log_all_interactions': True,
                'anonymize_logs': True,
                'max_session_duration': 24 * 3600,  # 24 hours
                'require_2fa': False,
                'allowed_countries': [],  # Empty means all allowed
                'blocked_countries': [],
                'min_password_length': 8,
                'require_password_complexity': True
            }
            
            # Load custom policies from database if they exist
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT setting_name, setting_value
                FROM privacy_settings
                WHERE user_id = 'system'
            ''')
            
            for setting_name, setting_value in cursor.fetchall():
                try:
                    self.security_policies[setting_name] = json.loads(setting_value)
                except json.JSONDecodeError:
                    self.security_policies[setting_name] = setting_value
            
            conn.close()
            
            logger.info("Security policies loaded")
            
        except Exception as e:
            logger.error(f"Error loading security policies: {e}")
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        try:
            if not self.encryption_key:
                raise ValueError("Encryption key not initialized")
            
            fernet = Fernet(self.encryption_key)
            encrypted_data = fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Error encrypting data: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            if not self.encryption_key:
                raise ValueError("Encryption key not initialized")
            
            fernet = Fernet(self.encryption_key)
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = fernet.decrypt(decoded_data)
            return decrypted_data.decode()
            
        except Exception as e:
            logger.error(f"Error decrypting data: {e}")
            raise
    
    async def generate_access_token(
        self,
        user_id: str,
        permissions: List[str],
        expires_in_hours: int = 24
    ) -> str:
        """Generate a secure access token"""
        try:
            # Create token payload
            payload = {
                'user_id': user_id,
                'permissions': permissions,
                'issued_at': time.time(),
                'expires_at': time.time() + (expires_in_hours * 3600),
                'token_id': secrets.token_urlsafe(16)
            }
            
            # Generate JWT token
            token = jwt.encode(payload, settings.secret_key, algorithm='HS256')
            
            # Store token hash in database
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO access_tokens 
                (token_hash, user_id, permissions, expires_at)
                VALUES (?, ?, ?, ?)
            ''', (
                token_hash,
                user_id,
                json.dumps(permissions),
                datetime.fromtimestamp(payload['expires_at'])
            ))
            
            conn.commit()
            conn.close()
            
            # Store in memory for quick access
            self.access_tokens[token_hash] = {
                'user_id': user_id,
                'permissions': permissions,
                'expires_at': payload['expires_at']
            }
            
            await self._log_security_event(
                'token_generated',
                'info',
                user_id=user_id,
                description=f"Access token generated with permissions: {permissions}"
            )
            
            return token
            
        except Exception as e:
            logger.error(f"Error generating access token: {e}")
            raise
    
    async def validate_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate an access token"""
        try:
            # Decode JWT token
            payload = jwt.decode(token, settings.secret_key, algorithms=['HS256'])
            
            # Check expiration
            if time.time() > payload['expires_at']:
                await self._log_security_event(
                    'token_expired',
                    'warning',
                    user_id=payload.get('user_id'),
                    description="Expired token used"
                )
                return None
            
            # Verify token exists in database
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT user_id, permissions, is_active
                FROM access_tokens
                WHERE token_hash = ?
            ''', (token_hash,))
            
            result = cursor.fetchone()
            
            if not result or not result[2]:  # Token not found or inactive
                conn.close()
                await self._log_security_event(
                    'invalid_token',
                    'warning',
                    user_id=payload.get('user_id'),
                    description="Invalid or inactive token used"
                )
                return None
            
            # Update last used timestamp
            cursor.execute('''
                UPDATE access_tokens
                SET last_used = CURRENT_TIMESTAMP
                WHERE token_hash = ?
            ''', (token_hash,))
            
            conn.commit()
            conn.close()
            
            return {
                'user_id': result[0],
                'permissions': json.loads(result[1]),
                'token_id': payload['token_id']
            }
            
        except jwt.ExpiredSignatureError:
            await self._log_security_event(
                'token_expired',
                'warning',
                description="Expired JWT token"
            )
            return None
        except jwt.InvalidTokenError:
            await self._log_security_event(
                'invalid_token',
                'warning',
                description="Invalid JWT token"
            )
            return None
        except Exception as e:
            logger.error(f"Error validating access token: {e}")
            return None
    
    async def revoke_access_token(self, token: str) -> bool:
        """Revoke an access token"""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE access_tokens
                SET is_active = 0
                WHERE token_hash = ?
            ''', (token_hash,))
            
            revoked = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            # Remove from memory
            if token_hash in self.access_tokens:
                del self.access_tokens[token_hash]
            
            if revoked:
                await self._log_security_event(
                    'token_revoked',
                    'info',
                    description="Access token revoked"
                )
            
            return revoked
            
        except Exception as e:
            logger.error(f"Error revoking access token: {e}")
            return False
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit_type: str = 'minute'
    ) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is within rate limits"""
        try:
            current_time = datetime.now()
            
            # Determine window and limits
            if limit_type == 'minute':
                window_start = current_time.replace(second=0, microsecond=0)
                max_requests = self.max_requests_per_minute
            elif limit_type == 'hour':
                window_start = current_time.replace(minute=0, second=0, microsecond=0)
                max_requests = self.max_requests_per_hour
            else:
                raise ValueError(f"Invalid limit type: {limit_type}")
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current count for this window
            cursor.execute('''
                SELECT request_count FROM rate_limits
                WHERE identifier = ? AND window_type = ? AND window_start = ?
            ''', (identifier, limit_type, window_start))
            
            result = cursor.fetchone()
            current_count = result[0] if result else 0
            
            # Check if limit exceeded
            if current_count >= max_requests:
                conn.close()
                
                await self._log_security_event(
                    'rate_limit_exceeded',
                    'warning',
                    source_ip=identifier,
                    description=f"Rate limit exceeded: {current_count}/{max_requests} per {limit_type}"
                )
                
                return False, {
                    'allowed': False,
                    'current_count': current_count,
                    'limit': max_requests,
                    'window_type': limit_type,
                    'reset_time': window_start + timedelta(hours=1 if limit_type == 'hour' else 0, minutes=1 if limit_type == 'minute' else 0)
                }
            
            # Update count
            cursor.execute('''
                INSERT OR REPLACE INTO rate_limits
                (identifier, request_count, window_start, window_type)
                VALUES (?, ?, ?, ?)
            ''', (identifier, current_count + 1, window_start, limit_type))
            
            conn.commit()
            conn.close()
            
            return True, {
                'allowed': True,
                'current_count': current_count + 1,
                'limit': max_requests,
                'window_type': limit_type,
                'remaining': max_requests - (current_count + 1)
            }
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True, {'error': str(e)}  # Allow on error
    
    async def log_audit_event(
        self,
        user_id: str,
        action: str,
        resource: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log an audit event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO audit_log
                (user_id, action, resource, ip_address, user_agent, success, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                action,
                resource,
                ip_address,
                user_agent,
                success,
                json.dumps(details) if details else None
            ))
            
            conn.commit()
            conn.close()
            
            # Add to in-memory audit log (limited size)
            audit_entry = {
                'user_id': user_id,
                'action': action,
                'resource': resource,
                'ip_address': ip_address,
                'success': success,
                'timestamp': time.time(),
                'details': details
            }
            
            self.audit_log.append(audit_entry)
            
            # Keep only recent entries in memory
            if len(self.audit_log) > 1000:
                self.audit_log = self.audit_log[-500:]
            
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")
    
    async def _log_security_event(
        self,
        event_type: str,
        severity: str,
        source_ip: Optional[str] = None,
        user_id: Optional[str] = None,
        description: str = ""
    ):
        """Log a security event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events
                (event_type, severity, source_ip, user_id, description)
                VALUES (?, ?, ?, ?, ?)
            ''', (event_type, severity, source_ip, user_id, description))
            
            conn.commit()
            conn.close()
            
            # Add to in-memory tracking
            security_event = {
                'type': event_type,
                'severity': severity,
                'source_ip': source_ip,
                'user_id': user_id,
                'description': description,
                'timestamp': time.time()
            }
            
            self.suspicious_activities.append(security_event)
            
            # Keep only recent events in memory
            if len(self.suspicious_activities) > 500:
                self.suspicious_activities = self.suspicious_activities[-250:]
            
            # Auto-block on severe events
            if severity == 'critical' and source_ip:
                self.blocked_ips.add(source_ip)
                logger.warning(f"Auto-blocked IP {source_ip} due to critical security event")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    async def check_ip_blocked(self, ip_address: str) -> bool:
        """Check if an IP address is blocked"""
        return ip_address in self.blocked_ips
    
    async def block_ip(self, ip_address: str, reason: str = "Security violation"):
        """Block an IP address"""
        try:
            self.blocked_ips.add(ip_address)
            
            await self._log_security_event(
                'ip_blocked',
                'warning',
                source_ip=ip_address,
                description=f"IP blocked: {reason}"
            )
            
            logger.warning(f"Blocked IP {ip_address}: {reason}")
            
        except Exception as e:
            logger.error(f"Error blocking IP {ip_address}: {e}")
    
    async def unblock_ip(self, ip_address: str):
        """Unblock an IP address"""
        try:
            if ip_address in self.blocked_ips:
                self.blocked_ips.remove(ip_address)
                
                await self._log_security_event(
                    'ip_unblocked',
                    'info',
                    source_ip=ip_address,
                    description="IP unblocked"
                )
                
                logger.info(f"Unblocked IP {ip_address}")
                
        except Exception as e:
            logger.error(f"Error unblocking IP {ip_address}: {e}")
    
    async def anonymize_data(self, data: str, user_id: str) -> str:
        """Anonymize sensitive data for logging"""
        try:
            if not self.security_policies.get('anonymize_logs', True):
                return data
            
            # Create consistent hash for user ID
            user_hash = hashlib.sha256(f"{user_id}{settings.secret_key}".encode()).hexdigest()[:8]
            
            # Replace sensitive patterns
            anonymized = data
            
            # Replace email addresses
            import re
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            anonymized = re.sub(email_pattern, f'user_{user_hash}@example.com', anonymized)
            
            # Replace IP addresses
            ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
            anonymized = re.sub(ip_pattern, 'xxx.xxx.xxx.xxx', anonymized)
            
            # Replace phone numbers
            phone_pattern = r'\b\d{3}-\d{3}-\d{4}\b|\b\(\d{3}\)\s*\d{3}-\d{4}\b'
            anonymized = re.sub(phone_pattern, 'xxx-xxx-xxxx', anonymized)
            
            return anonymized
            
        except Exception as e:
            logger.error(f"Error anonymizing data: {e}")
            return "[ANONYMIZATION_ERROR]"
    
    async def get_user_privacy_settings(self, user_id: str) -> Dict[str, Any]:
        """Get user privacy settings"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT setting_name, setting_value
                FROM privacy_settings
                WHERE user_id = ?
            ''', (user_id,))
            
            settings_dict = {}
            for setting_name, setting_value in cursor.fetchall():
                try:
                    settings_dict[setting_name] = json.loads(setting_value)
                except json.JSONDecodeError:
                    settings_dict[setting_name] = setting_value
            
            conn.close()
            
            # Apply default settings for missing values
            default_settings = {
                'data_collection_consent': False,
                'analytics_consent': False,
                'marketing_consent': False,
                'data_retention_days': 30,
                'allow_data_export': True,
                'allow_data_deletion': True,
                'encrypt_stored_data': True
            }
            
            for key, default_value in default_settings.items():
                if key not in settings_dict:
                    settings_dict[key] = default_value
            
            return settings_dict
            
        except Exception as e:
            logger.error(f"Error getting user privacy settings: {e}")
            return {}
    
    async def update_user_privacy_settings(
        self,
        user_id: str,
        settings_dict: Dict[str, Any]
    ) -> bool:
        """Update user privacy settings"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for setting_name, setting_value in settings_dict.items():
                cursor.execute('''
                    INSERT OR REPLACE INTO privacy_settings
                    (user_id, setting_name, setting_value)
                    VALUES (?, ?, ?)
                ''', (user_id, setting_name, json.dumps(setting_value)))
            
            conn.commit()
            conn.close()
            
            await self.log_audit_event(
                user_id=user_id,
                action='privacy_settings_updated',
                resource='user_privacy',
                ip_address='system',
                user_agent='system',
                success=True,
                details={'updated_settings': list(settings_dict.keys())}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating user privacy settings: {e}")
            return False
    
    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """Export all user data for GDPR compliance"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            export_data = {
                'user_id': user_id,
                'export_timestamp': datetime.now().isoformat(),
                'data_categories': {}
            }
            
            # Export audit logs
            cursor.execute('''
                SELECT action, resource, timestamp, success, details
                FROM audit_log
                WHERE user_id = ?
                ORDER BY timestamp DESC
            ''', (user_id,))
            
            export_data['data_categories']['audit_logs'] = [
                {
                    'action': row[0],
                    'resource': row[1],
                    'timestamp': row[2],
                    'success': bool(row[3]),
                    'details': json.loads(row[4]) if row[4] else None
                }
                for row in cursor.fetchall()
            ]
            
            # Export privacy settings
            cursor.execute('''
                SELECT setting_name, setting_value, updated_at
                FROM privacy_settings
                WHERE user_id = ?
            ''', (user_id,))
            
            export_data['data_categories']['privacy_settings'] = [
                {
                    'setting': row[0],
                    'value': json.loads(row[1]),
                    'updated_at': row[2]
                }
                for row in cursor.fetchall()
            ]
            
            # Export access tokens (metadata only)
            cursor.execute('''
                SELECT permissions, created_at, last_used, is_active
                FROM access_tokens
                WHERE user_id = ?
            ''', (user_id,))
            
            export_data['data_categories']['access_tokens'] = [
                {
                    'permissions': json.loads(row[0]),
                    'created_at': row[1],
                    'last_used': row[2],
                    'is_active': bool(row[3])
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
            
            await self.log_audit_event(
                user_id=user_id,
                action='data_exported',
                resource='user_data',
                ip_address='system',
                user_agent='system',
                success=True,
                details={'export_categories': list(export_data['data_categories'].keys())}
            )
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return {'error': str(e)}
    
    async def delete_user_data(self, user_id: str, confirm: bool = False) -> Dict[str, str]:
        """Delete all user data for GDPR compliance"""
        if not confirm:
            return {
                'status': 'confirmation_required',
                'message': 'This will permanently delete all user data. Set confirm=True to proceed.'
            }
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete from all tables
            tables_to_clean = [
                'audit_log',
                'privacy_settings',
                'access_tokens'
            ]
            
            deleted_records = 0
            for table in tables_to_clean:
                cursor.execute(f'DELETE FROM {table} WHERE user_id = ?', (user_id,))
                deleted_records += cursor.rowcount
            
            conn.commit()
            conn.close()
            
            # Clean up in-memory data
            self.audit_log = [
                entry for entry in self.audit_log
                if entry.get('user_id') != user_id
            ]
            
            if user_id in self.access_tokens:
                del self.access_tokens[user_id]
            
            logger.info(f"Deleted {deleted_records} records for user {user_id}")
            
            return {
                'status': 'success',
                'message': f'Deleted {deleted_records} records for user {user_id}'
            }
            
        except Exception as e:
            logger.error(f"Error deleting user data: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def _security_monitoring_loop(self):
        """Background task for security monitoring"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                # Clean up expired tokens
                await self._cleanup_expired_tokens()
                
                # Analyze security events
                await self._analyze_security_patterns()
                
                # Clean up old rate limit data
                await self._cleanup_rate_limits()
                
                # Monitor for suspicious activities
                await self._monitor_suspicious_activities()
                
            except Exception as e:
                logger.error(f"Error in security monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def _cleanup_expired_tokens(self):
        """Clean up expired access tokens"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE access_tokens
                SET is_active = 0
                WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1
            ''')
            
            expired_count = cursor.rowcount
            
            # Delete very old tokens
            cursor.execute('''
                DELETE FROM access_tokens
                WHERE expires_at < datetime('now', '-30 days')
            ''')
            
            deleted_count = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            if expired_count > 0 or deleted_count > 0:
                logger.info(f"Cleaned up {expired_count} expired tokens, deleted {deleted_count} old tokens")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired tokens: {e}")
    
    async def _analyze_security_patterns(self):
        """Analyze security events for patterns"""
        try:
            # Look for repeated failed attempts from same IP
            ip_failures = defaultdict(int)
            recent_time = time.time() - 3600  # Last hour
            
            for event in self.suspicious_activities:
                if (event['timestamp'] > recent_time and 
                    event['type'] in ['invalid_token', 'rate_limit_exceeded'] and
                    event['source_ip']):
                    ip_failures[event['source_ip']] += 1
            
            # Block IPs with too many failures
            for ip, failure_count in ip_failures.items():
                if failure_count >= self.max_failed_attempts and ip not in self.blocked_ips:
                    await self.block_ip(ip, f"Too many security violations: {failure_count}")
            
        except Exception as e:
            logger.error(f"Error analyzing security patterns: {e}")
    
    async def _cleanup_rate_limits(self):
        """Clean up old rate limit data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete rate limit records older than 24 hours
            cursor.execute('''
                DELETE FROM rate_limits
                WHERE window_start < datetime('now', '-24 hours')
            ''')
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            if deleted_count > 0:
                logger.debug(f"Cleaned up {deleted_count} old rate limit records")
            
        except Exception as e:
            logger.error(f"Error cleaning up rate limits: {e}")
    
    async def _monitor_suspicious_activities(self):
        """Monitor for suspicious activity patterns"""
        try:
            recent_time = time.time() - 1800  # Last 30 minutes
            recent_events = [
                event for event in self.suspicious_activities
                if event['timestamp'] > recent_time
            ]
            
            # Check for unusual patterns
            if len(recent_events) > 50:  # High volume of security events
                await self._log_security_event(
                    'high_security_event_volume',
                    'warning',
                    description=f"High volume of security events: {len(recent_events)} in 30 minutes"
                )
            
            # Check for distributed attacks
            unique_ips = set(
                event['source_ip'] for event in recent_events
                if event['source_ip']
            )
            
            if len(unique_ips) > 20:  # Many different IPs
                await self._log_security_event(
                    'potential_distributed_attack',
                    'critical',
                    description=f"Potential distributed attack: {len(unique_ips)} unique IPs in 30 minutes"
                )
            
        except Exception as e:
            logger.error(f"Error monitoring suspicious activities: {e}")
    
    async def get_security_status(self) -> Dict[str, Any]:
        """Get current security status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get recent security events
            cursor.execute('''
                SELECT event_type, COUNT(*) as count
                FROM security_events
                WHERE timestamp > datetime('now', '-24 hours')
                GROUP BY event_type
            ''')
            
            recent_events = dict(cursor.fetchall())
            
            # Get active tokens
            cursor.execute('''
                SELECT COUNT(*) FROM access_tokens
                WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP
            ''')
            
            active_tokens = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'status': 'operational',
                'active_tokens': active_tokens,
                'blocked_ips': len(self.blocked_ips),
                'recent_security_events': recent_events,
                'security_policies_active': len(self.security_policies),
                'encryption_enabled': self.encryption_key is not None,
                'monitoring_active': True,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting security status: {e}")
            return {'status': 'error', 'message': str(e)}