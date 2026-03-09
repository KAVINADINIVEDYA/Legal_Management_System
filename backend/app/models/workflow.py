"""
Workflow action tracking for approval flows and status transitions.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class WorkflowAction(Base):
    __tablename__ = "workflow_actions"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(30), nullable=False)  # case, agreement
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # status_change, approval, rejection, assignment, escalation
    from_status = Column(String(30))
    to_status = Column(String(30))
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    performer = relationship("User")
