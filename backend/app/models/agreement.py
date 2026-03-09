"""
Agreement model with version control and approval workflow.
Status lifecycle: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED → SIGNED → ACTIVE → EXPIRED
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.legal_case import case_agreement_link


class Agreement(Base):
    __tablename__ = "agreements"

    id = Column(Integer, primary_key=True, index=True)
    agreement_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    agreement_type = Column(String(50), nullable=False)  # NDA, SLA, vendor, lease, employment, partnership
    status = Column(String(30), nullable=False, default="DRAFT")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    parties = Column(Text)  # JSON string: list of party names
    currency = Column(String(10), default="LKR")  # LKR or USD
    value = Column(Float, default=0.0)
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    duration_months = Column(Integer)
    risk_score = Column(Integer, default=0)
    risk_details = Column(Text)  # JSON: categorized risk breakdown
    ai_summary = Column(Text)  # AI-generated key terms summary
    ai_extracted_data = Column(Text)  # JSON: auto-extracted structured data
    ai_clauses = Column(Text)  # JSON: extracted clause categories
    description = Column(Text)
    signature_data = Column(Text)  # Base64 signature image
    signed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_agreements")
    documents = relationship("Document", back_populates="agreement", cascade="all, delete-orphan")
    versions = relationship("AgreementVersion", back_populates="agreement", cascade="all, delete-orphan")
    approval_steps = relationship("ApprovalStep", back_populates="agreement", cascade="all, delete-orphan")
    linked_cases = relationship("LegalCase", secondary=case_agreement_link, back_populates="linked_agreements")


class AgreementVersion(Base):
    __tablename__ = "agreement_versions"

    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    change_summary = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    agreement = relationship("Agreement", back_populates="versions")
    document = relationship("Document")
    author = relationship("User")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, index=True)
    agreement_id = Column(Integer, ForeignKey("agreements.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    comments = Column(Text)
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    agreement = relationship("Agreement", back_populates="approval_steps")
    reviewer = relationship("User", back_populates="approval_steps")
