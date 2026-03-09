"""
User model with role-based access control.
Roles: admin, supervisor, legal_officer, reviewer, manager
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    role = Column(String(20), nullable=False, default="legal_officer")  # admin, supervisor, legal_officer, reviewer, manager
    department = Column(String(50), default="Legal")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_cases = relationship("LegalCase", back_populates="assigned_officer", foreign_keys="LegalCase.assigned_officer_id")
    supervised_cases = relationship("LegalCase", back_populates="supervisor", foreign_keys="LegalCase.supervisor_id")
    created_agreements = relationship("Agreement", back_populates="creator")
    approval_steps = relationship("ApprovalStep", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="user")
    uploaded_documents = relationship("Document", back_populates="uploader")
