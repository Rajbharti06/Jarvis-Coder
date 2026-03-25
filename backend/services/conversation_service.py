from sqlalchemy.orm import Session
from backend.models.conversation import Conversation, Message
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class ConversationService:
    """Service for managing chat history and persistence."""
    
    def create_conversation(self, db: Session, title: str = "New Conversation") -> Conversation:
        db_conv = Conversation(title=title)
        db.add(db_conv)
        db.commit()
        db.refresh(db_conv)
        return db_conv

    def get_conversation(self, db: Session, conversation_id: int) -> Optional[Conversation]:
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def get_all_conversations(self, db: Session) -> List[Conversation]:
        return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()

    def add_message(self, db: Session, conversation_id: int, role: str, content: str, model: Optional[str] = None, tokens: int = 0) -> Message:
        db_message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model=model,
            tokens=tokens
        )
        db.add(db_message)
        
        # Update conversation timestamp
        db_conv = self.get_conversation(db, conversation_id)
        if db_conv:
            from datetime import datetime
            db_conv.updated_at = datetime.utcnow()
            
        db.commit()
        db.refresh(db_message)
        return db_message

    def get_messages(self, db: Session, conversation_id: int, limit: int = 10) -> List[Message]:
        return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.desc()).limit(limit).all()[::-1]

    def delete_conversation(self, db: Session, conversation_id: int) -> bool:
        db_conv = self.get_conversation(db, conversation_id)
        if db_conv:
            db.delete(db_conv)
            db.commit()
            return True
        return False

conversation_service = ConversationService()
