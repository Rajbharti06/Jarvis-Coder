"""
Conversation and Message models for AI assistant
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, Dict, Any
import json

Base = declarative_base()

class Conversation(Base):
    """Conversation model for AI assistant chat sessions"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    meta_data = Column(Text, nullable=True)  # JSON string for additional data
    
    # Relationship to messages
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert conversation to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active,
            "metadata": json.loads(self.meta_data) if self.meta_data else {},
            "message_count": len(self.messages) if self.messages else 0
        }

class Message(Base):
    """Message model for individual chat messages"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), index=True)
    role = Column(String, nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # 'text', 'code', 'analysis', etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    tokens_used = Column(Integer, nullable=True)
    provider_used = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    meta_data = Column(Text, nullable=True)  # JSON string for additional data
    
    # Relationship to conversation
    conversation = relationship("Conversation", back_populates="messages")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "message_type": self.message_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "tokens_used": self.tokens_used,
            "provider_used": self.provider_used,
            "confidence_score": self.confidence_score,
            "metadata": json.loads(self.meta_data) if self.meta_data else {}
        }