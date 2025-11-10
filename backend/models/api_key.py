from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.base import Base

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True, nullable=False)
    key = Column(String, nullable=False) # This will store the encrypted key
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="api_keys")