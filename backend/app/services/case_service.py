"""
Case service: CRUD operations and business logic for legal cases.
"""
import json
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.legal_case import LegalCase, CourtEvent, CaseNote
from app.models.document import Document
from app.models.user import User
from app.services.notification_service import create_notification


def generate_case_number() -> str:
    """Generate a unique case number."""
    ts = datetime.utcnow().strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:6].upper()
    return f"LC-{ts}-{uid}"


def generate_reference_number() -> str:
    """Generate a unique reference number for a case."""
    ts = datetime.utcnow().strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:4].upper()
    return f"REF-{ts}-{uid}"


def create_case(db: Session, data: dict, created_by_id: int) -> LegalCase:
    """Create a new legal case with auto-generated numbers (manual officer assignment later)."""
    
    assigned_id = None

    case = LegalCase(
        case_number=generate_case_number(),
        reference_number=generate_reference_number(),
        title=data.get("title"),
        case_type=data.get("case_type"),
        parties=data.get("parties"),
        court_authority=data.get("court_authority"),
        financial_exposure=data.get("financial_exposure", 0.0),
        currency=data.get("currency", "LKR"),
        nature_of_case=data.get("nature_of_case"),
        description=data.get("description"),
        filed_date=data.get("filed_date"),
        assigned_officer_id=assigned_id,  # System assigned
        supervisor_id=data.get("supervisor_id"),
        created_by_id=created_by_id,
        claim_amount=data.get("claim_amount", 0.0),
        recovered_amount=data.get("recovered_amount", 0.0),
        outstanding_amount=data.get("outstanding_amount", 0.0),
        status="NEW",
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    # Handle document linking or generation
    document_id = data.get("document_id")
    if document_id:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.case_id = case.id
            doc.doc_type = "case_document"
            db.commit()
    else:
        # Manual entry: Generate a summary PDF and save it as a document
        from app.utils.pdf_generator import generate_case_summary_pdf
        import os
        
        file_path, filename = generate_case_summary_pdf(data)
        
        # Create a Document record for the generated PDF
        new_doc = Document(
            filename=filename,
            original_filename="Case_Summary.pdf",
            file_path=file_path,
            file_type="application/pdf",
            doc_type="case_document",
            case_id=case.id,
            version=1,
            uploaded_by_id=created_by_id
        )
        db.add(new_doc)
        db.commit()

    return case


def get_cases(db: Session, user: User, status: Optional[str] = None,
              case_type: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[LegalCase]:
    """Get cases filtered by user role and optional filters."""
    query = db.query(LegalCase)

    # RBAC: Legal Officers only see their assigned cases
    # Supervisors, Admins, and Reviewers see all cases
    if user.role == "legal_officer":
        query = query.filter(LegalCase.assigned_officer_id == user.id)
    elif user.role in ["supervisor", "reviewer", "admin"]:
        pass # All visibility
    else:
        # Default or other roles see nothing or can be restricted further
        query = query.filter(LegalCase.created_by_id == user.id)

    if status:
        query = query.filter(LegalCase.status == status)
    if case_type:
        query = query.filter(LegalCase.case_type == case_type)

    return query.order_by(LegalCase.updated_at.desc()).offset(skip).limit(limit).all()


def get_case_by_id(db: Session, case_id: int, user: User) -> Optional[LegalCase]:
    """Get a case by ID with RBAC check."""
    case = db.query(LegalCase).filter(LegalCase.id == case_id).first()
    if not case:
        return None

    # RBAC check
    if user.role == "legal_officer" and case.assigned_officer_id != user.id:
        return None

    return case


def update_case(db: Session, case_id: int, data: dict, user: User, check_time_limit: bool = True) -> Optional[LegalCase]:
    """Update a legal case with optional 24-hour time limit check."""
    case = get_case_by_id(db, case_id, user)
    if not case:
        return None

    # Check if 24 hours have passed since creation
    # Skip this check if the case is in REVISION_REQUIRED status (it needs fixing!)
    if check_time_limit and case.status != "REVISION_REQUIRED":
        time_diff = datetime.utcnow() - case.created_at
        if time_diff.total_seconds() > 86400:  # 24 hours in seconds
            raise ValueError("Case cannot be edited after 24 hours of submission.")

    changes = {}
    for key, value in data.items():
        if hasattr(case, key):
            old_val = getattr(case, key)
            if value != old_val:
                changes[key] = {"old": str(old_val), "new": str(value)}
                setattr(case, key, value)

    if changes:
        case.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(case)
        # Log the changes
        from app.services.audit_service import log_action
        from app.utils.audit_helper import get_human_changes
        
        # Convert to human-readable format
        human_changes = get_human_changes(db, changes)
        
        log_action(
            db, user.id, "update_fields", "case", case.id,
            details=json.dumps(human_changes)
        )
    return case


def update_case_status(db: Session, case_id: int, new_status: str, user: User) -> Optional[LegalCase]:
    """Change case status with validation and RBAC."""
    valid_transitions = {
        "NEW": ["PENDING_REVIEW"],
        "PENDING_REVIEW": ["ACTIVE", "REVISION_REQUIRED"],
        "REVISION_REQUIRED": ["PENDING_REVIEW"],
        "ACTIVE": ["ON_HOLD", "CLOSED"],
        "ON_HOLD": ["ACTIVE", "CLOSED"],
        "CLOSED": ["ARCHIVED"],
    }

    case = get_case_by_id(db, case_id, user)
    if not case:
        # If get_case_by_id failed because of assigned_officer check, 
        # we still want to allow higher roles to change status
        case = db.query(LegalCase).filter(LegalCase.id == case_id).first()
        if not case:
            return None
        
        # RBAC for status change from high roles
        if user.role not in ["admin", "legal_officer", "supervisor"]:
            return None

    # RBAC for specific transitions
    if new_status == "ACTIVE" and user.role != "legal_officer":
        raise ValueError("Only the assigned Legal Officer can activate a case.")
        
    if new_status == "REVISION_REQUIRED" and user.role != "legal_officer":
        raise ValueError("Only the assigned Legal Officer can send the case back for correction.")

    if new_status == "PENDING_REVIEW" and user.role != "admin":
        raise ValueError("Only an Admin can submit a case for review.")

    allowed = valid_transitions.get(case.status, [])
    if new_status not in allowed:
        raise ValueError(f"Cannot transition from {case.status} to {new_status}. Allowed: {allowed}")

    case.status = new_status
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)

    # Notifications
    if new_status == "PENDING_REVIEW":
        # Notify all Legal Officers
        officers = db.query(User).filter(User.role == "legal_officer").all()
        for off in officers:
            create_notification(
                db, off.id, "case_submission",
                f"New case {case.case_number} submitted for review by {user.full_name}",
                "case", case.id
            )
    elif new_status in ["ACTIVE", "REVISION_REQUIRED"]:
        # Notify the creator
        if case.created_by_id:
            action_label = "Active (Activated)" if new_status == "ACTIVE" else "Send Back (Revision Requested)"
            msg = f"Case {case.case_number} has been moved to {action_label} by Legal Officer {user.full_name}"
            create_notification(
                db, case.created_by_id, "case_workflow",
                msg, "case", case.id
            )

    return case


def add_court_event(db: Session, case_id: int, data: dict) -> CourtEvent:
    """Add a court event to a case."""
    event = CourtEvent(
        case_id=case_id,
        event_type=data.get("event_type"),
        title=data.get("title"),
        event_date=data.get("event_date"),
        location=data.get("location"),
        notes=data.get("notes"),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def add_case_note(db: Session, case_id: int, author_id: int, content: str, note_type: str = "general") -> CaseNote:
    """Add a note to a case."""
    note = CaseNote(
        case_id=case_id,
        author_id=author_id,
        content=content,
        note_type=note_type,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def get_case_stats(db: Session) -> dict:
    """Get aggregate case statistics for dashboard."""
    total = db.query(LegalCase).count()
    by_status = {}
    for status in ["NEW", "PENDING_REVIEW", "ACTIVE", "ON_HOLD", "CLOSED", "ARCHIVED"]:
        by_status[status] = db.query(LegalCase).filter(LegalCase.status == status).count()

    # Breakdown by type
    by_type = {}
    case_types = ["money_recovery", "damages_recovery", "appeals", "land_cases", "criminal_cases", "inquiries", "other"]
    for ct in case_types:
        by_type[ct] = db.query(LegalCase).filter(LegalCase.case_type == ct).count()

    high_risk = db.query(LegalCase).filter(LegalCase.risk_score >= 70).count()

    return {
        "total_cases": total,
        "by_status": by_status,
        "by_type": by_type,
        "high_risk_cases": high_risk,
    }
