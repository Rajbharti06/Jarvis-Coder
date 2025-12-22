from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from backend.core.config import settings
from cryptography.fernet import Fernet
import base64
import hashlib
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def _get_fernet() -> Fernet:
    secret = settings.encryption_secret.encode()
    key = hashlib.sha256(secret).digest()
    fkey = base64.urlsafe_b64encode(key)
    return Fernet(fkey)


def encrypt_api_key(api_key: str) -> str:
    f = _get_fernet()
    token = f.encrypt(api_key.encode())
    return token.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    f = _get_fernet()
    plain = f.decrypt(encrypted_key.encode())
    return plain.decode()
