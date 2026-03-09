"""
Audit log for tracking every user action in the system.
Provides complete traceability for compliance and security.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # create, read, update, delete, login, logout, upload, download, ai_query
    entity_type = Column(String(50))  # user, case, agreement, document
    entity_id = Column(Integer)
    details = Column(Text)  # JSON: additional context
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
