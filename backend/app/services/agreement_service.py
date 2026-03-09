"""
Agreement service: CRUD operations, approval workflow, and business logic.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.agreement import Agreement, AgreementVersion, ApprovalStep
from app.models.user import User
from app.services.notification_service import create_notification


def generate_agreement_number() -> str:
    """Generate a unique agreement number."""
    ts = datetime.utcnow().strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:6].upper()
    return f"AGR-{ts}-{uid}"


def create_agreement(db: Session, data: dict, created_by_id: int) -> Agreement:
    """Create a new agreement in DRAFT status."""
    agreement = Agreement(
        agreement_number=generate_agreement_number(),
        title=data.get("title"),
        agreement_type=data.get("agreement_type"),
        parties=data.get("parties"),
        value=data.get("value", 0.0),
        effective_date=data.get("effective_date"),
        expiry_date=data.get("expiry_date"),
        duration_months=data.get("duration_months"),
        description=data.get("description"),
        currency=data.get("currency", "LKR"),
        created_by=created_by_id,
        status="DRAFT",
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    # Link document if provided
    document_id = data.get("document_id")
    if document_id:
        from app.models.document import Document
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.agreement_id = agreement.id
            db.commit()

    return agreement


def get_agreements(db: Session, user: User, status: Optional[str] = None,
                   agreement_type: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Agreement]:
    """Get agreements filtered by user role."""
    query = db.query(Agreement)

    if user.role in ["admin", "supervisor", "legal_officer"]:
        pass # See all
    elif user.role == "manager":
        # Managers only see agreements that have been reviewed by legal/reviewers
        query = query.filter(Agreement.status.in_(["REVIEWED", "APPROVED", "SIGNED", "ACTIVE", "EXPIRED"]))
    elif user.role == "reviewer":
        # Reviewers see all agreements they are involved with
        query = query.filter(Agreement.status.in_(["UNDER_REVIEW", "REVIEWED", "APPROVED", "SIGNED", "REJECTED", "REVISION"]))

    if status:
        query = query.filter(Agreement.status == status)
    if agreement_type:
        query = query.filter(Agreement.agreement_type == agreement_type)

    return query.order_by(Agreement.updated_at.desc()).offset(skip).limit(limit).all()


def get_agreement_by_id(db: Session, agreement_id: int, user: User) -> Optional[Agreement]:
    """Get an agreement by ID with RBAC."""
    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agreement:
        return None

    # RBAC — manager, admin, supervisor, legal_officer can access any agreement
    if user.role in ["admin", "supervisor", "legal_officer", "manager", "reviewer"]:
        return agreement

    return agreement


def update_agreement(db: Session, agreement_id: int, data: dict, user: User) -> Optional[Agreement]:
    """Update an agreement (only in DRAFT or REVISION status)."""
    agreement = get_agreement_by_id(db, agreement_id, user)
    if not agreement or agreement.status not in ["DRAFT", "REVISION"]:
        return None

    changes = {}
    for key, value in data.items():
        if value is not None and hasattr(agreement, key):
            old_val = getattr(agreement, key)
            if value != old_val:
                changes[key] = {"old": str(old_val), "new": str(value)}
                setattr(agreement, key, value)

    if changes:
        agreement.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(agreement)
        
        # Log the changes
        from app.services.audit_service import log_action
        from app.utils.audit_helper import get_human_changes
        import json
        
        human_changes = get_human_changes(db, changes)
        log_action(
            db, user.id, "update_fields", "agreement", agreement.id,
            details=json.dumps(human_changes)
        )
    
    return agreement


def submit_for_review(db: Session, agreement_id: int, reviewer_ids: List[int], user: User, comments: Optional[str] = None) -> Optional[Agreement]:
    """Submit an agreement for review, creating approval steps."""
    agreement = get_agreement_by_id(db, agreement_id, user)
    if not agreement or agreement.status not in ["DRAFT", "REVISION"]:
        return None

    # Clear existing pending approval steps
    db.query(ApprovalStep).filter(
        ApprovalStep.agreement_id == agreement_id,
        ApprovalStep.status == "pending"
    ).delete()

    # Step 1: Reviewers
    for reviewer_id in reviewer_ids:
        step = ApprovalStep(
            agreement_id=agreement_id,
            reviewer_id=reviewer_id,
            step_order=1,
            status="pending",
        )
        db.add(step)

    # Step 2: Manager Approval
    manager = db.query(User).filter(User.role == "manager").first()
    if manager:
        db.add(ApprovalStep(
            agreement_id=agreement_id,
            reviewer_id=manager.id,
            step_order=2,
            status="pending",
        ))

    # Send notifications to all assigned reviewers
    for reviewer_id in reviewer_ids:
        create_notification(
            db, reviewer_id, "agreement_submitted",
            f"Agreement {agreement.agreement_number} has been submitted for your review.",
            "agreement", agreement.id
        )

    agreement.status = "UNDER_REVIEW"
    agreement.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(agreement)
    return agreement




def approve_agreement(db: Session, agreement_id: int, reviewer_id: int, comments: str = None, user: User = None, signature_data: str = None) -> Optional[Agreement]:
    """Approve an agreement step. Stage 1: Reviewer feedback. Stage 2: Manager approval with signature."""
    if user and user.role == "manager":
        step = db.query(ApprovalStep).filter(
            ApprovalStep.agreement_id == agreement_id,
            ApprovalStep.status == "pending"
        ).order_by(ApprovalStep.step_order).first()
    else:
        step = db.query(ApprovalStep).filter(
            ApprovalStep.agreement_id == agreement_id,
            ApprovalStep.reviewer_id == reviewer_id,
            ApprovalStep.status == "pending"
        ).first()

    if not step:
        return None

    step.status = "approved"
    step.comments = comments
    step.reviewed_at = datetime.utcnow()
    
    db.flush()

    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    if step.step_order == 1:
        # Check if Stage 1 is complete
        pending_s1 = db.query(ApprovalStep).filter(
            ApprovalStep.agreement_id == agreement_id,
            ApprovalStep.step_order == 1,
            ApprovalStep.status == "pending"
        ).count()

        if pending_s1 == 0:
            agreement.status = "REVIEWED"
            agreement.updated_at = datetime.utcnow()
            
            # Notify Managers
            managers = db.query(User).filter(User.role == "manager").all()
            for m in managers:
                create_notification(
                    db, m.id, "agreement_reviewed",
                    f"Agreement {agreement.agreement_number} has been reviewed and is ready for your signature.",
                    "agreement", agreement.id
                )
    elif step.step_order == 2:
        # Stage 2: Manager approval
        agreement.status = "APPROVED"
        agreement.updated_at = datetime.utcnow()
        
        if signature_data:
            agreement.signature_data = signature_data
            agreement.signed_at = datetime.utcnow()
            agreement.status = "SIGNED"

        # Final Notification
        managers = db.query(User).filter(User.role == "manager").all()
        notify_ids = {m.id for m in managers}
        if agreement.created_by:
            notify_ids.add(agreement.created_by)
            
        for uid in notify_ids:
            msg = f"Agreement {agreement.agreement_number} is fully approved and ready for signature."
            if agreement.status == "SIGNED":
                msg = f"Agreement {agreement.agreement_number} has been signed and approved by {user.full_name if user else 'a manager'}."
            create_notification(db, uid, "agreement_approved", msg, "agreement", agreement.id)

    db.commit()
    db.refresh(agreement)
    return agreement


def reject_agreement(db: Session, agreement_id: int, reviewer_id: int, comments: str = None, user: User = None) -> Optional[Agreement]:
    """Reject an agreement. Status moves to REVISION."""
    if user and user.role == "manager":
        step = db.query(ApprovalStep).filter(
            ApprovalStep.agreement_id == agreement_id,
            ApprovalStep.status == "pending"
        ).order_by(ApprovalStep.step_order).first()
    else:
        step = db.query(ApprovalStep).filter(
            ApprovalStep.agreement_id == agreement_id,
            ApprovalStep.reviewer_id == reviewer_id,
            ApprovalStep.status == "pending"
        ).first()

    if not step:
        return None

    step.status = "rejected"
    step.comments = comments
    step.reviewed_at = datetime.utcnow()

    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if user and user.role == "manager":
        agreement.status = "REJECTED"
    else:
        agreement.status = "REVISION"
    agreement.updated_at = datetime.utcnow()

    # Determine rejection source
    source = f"Reviewer ({user.full_name})" if user and user.role != "manager" else f"Manager ({user.full_name if user else 'System'})"

    # Notify creator and all Supervisors
    notify_ids = set()
    if agreement.created_by:
        notify_ids.add(agreement.created_by)
    
    supervisors = db.query(User).filter(User.role == "supervisor").all()
    for sup in supervisors:
        notify_ids.add(sup.id)
        
    for uid in notify_ids:
        create_notification(
            db, uid, "agreement_rejected",
            f"Agreement {agreement.agreement_number} was rejected by {source}. Notes: {comments if comments else 'No notes provided'}",
            "agreement", agreement.id
        )

    db.commit()
    db.refresh(agreement)
    return agreement


def sign_agreement(db: Session, agreement_id: int, signature_data: str) -> Optional[Agreement]:
    """Record digital signature and move status to SIGNED."""
    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()
    if not agreement or agreement.status != "APPROVED":
        return None
    
    agreement.signature_data = signature_data
    agreement.signed_at = datetime.utcnow()
    agreement.status = "SIGNED"
    agreement.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(agreement)
    return agreement


def get_agreement_stats(db: Session) -> dict:
    """Get aggregate agreement statistics for dashboard."""
    total = db.query(Agreement).count()
    by_status = {}
    for status in ["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "SIGNED", "ACTIVE", "EXPIRED", "REVISION"]:
        by_status[status] = db.query(Agreement).filter(Agreement.status == status).count()

    # Breakdown by type
    by_type = {}
    agr_types = ["procurement", "service_level", "non_disclosure", "employment", "partnership", "license", "other"]
    for at in agr_types:
        by_type[at] = db.query(Agreement).filter(Agreement.agreement_type == at).count()

    high_risk = db.query(Agreement).filter(Agreement.risk_score >= 70).count()
    expiring_soon = db.query(Agreement).filter(
        Agreement.expiry_date >= datetime.utcnow(),
        Agreement.expiry_date <= datetime.utcnow() + timedelta(days=30), # Proper expiring soon (within 30 days)
        Agreement.status == "ACTIVE"
    ).count()

    return {
        "total_agreements": total,
        "by_status": by_status,
        "by_type": by_type,
        "high_risk_agreements": high_risk,
        "expiring_soon": expiring_soon,
    }
