"""
Legal Case model with court events and case notes.
Implements full lifecycle: NEW → ACTIVE → IN_PROGRESS → RESOLVED → CLOSED
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# Many-to-many: agreements linked to cases
case_agreement_link = Table(
    "case_agreement_link",
    Base.metadata,
    Column("case_id", Integer, ForeignKey("legal_cases.id"), primary_key=True),
    Column("agreement_id", Integer, ForeignKey("agreements.id"), primary_key=True),
)


class LegalCase(Base):
    __tablename__ = "legal_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    case_type = Column(String(50), nullable=False)  # money_recovery, damages_recovery, appeals, land_cases, criminal_cases, other
    reference_number = Column(String(50), unique=True, nullable=True, index=True)  # Auto-generated reference
    status = Column(String(30), nullable=False, default="NEW")  # NEW, PENDING_REVIEW, REVISION_REQUIRED, ACTIVE, ON_HOLD, CLOSED, ARCHIVED
    priority = Column(String(20), default="medium")  # legacy field, kept for backward compatibility
    currency = Column(String(10), default="LKR")  # LKR or USD
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    parties = Column(Text)  # JSON string of parties involved
    court_authority = Column(String(200))
    jurisdiction = Column(String(100))
    financial_exposure = Column(Float, default=0.0)
    nature_of_case = Column(Text)
    description = Column(Text)
    case_details = Column(Text)  # JSON: specific fields based on case_type
    ai_summary = Column(Text)  # AI-generated case brief
    ai_classification = Column(Text)  # AI auto-classification result
    risk_score = Column(Integer, default=0)
    claim_amount = Column(Float, default=0.0)
    recovered_amount = Column(Float, default=0.0)
    outstanding_amount = Column(Float, default=0.0)
    filed_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_officer = relationship("User", back_populates="assigned_cases", foreign_keys=[assigned_officer_id])
    supervisor = relationship("User", back_populates="supervised_cases", foreign_keys=[supervisor_id])
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    court_events = relationship("CourtEvent", back_populates="case", cascade="all, delete-orphan")
    case_notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    linked_agreements = relationship("Agreement", secondary=case_agreement_link, back_populates="linked_cases")


class CourtEvent(Base):
    __tablename__ = "court_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # hearing, filing, judgment, mediation, appeal
    title = Column(String(200), nullable=False)
    event_date = Column(DateTime, nullable=False)
    location = Column(String(200))
    notes = Column(Text)
    status = Column(String(30), default="scheduled")  # scheduled, completed, postponed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("LegalCase", back_populates="court_events")


class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(30), default="general")  # general, legal_opinion, action_item, evidence
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("LegalCase", back_populates="case_notes")
    author = relationship("User")
