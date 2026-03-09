"""
Dashboard endpoints: statistics and alerts.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.services.case_service import get_case_stats
from app.services.agreement_service import get_agreement_stats
from app.services.audit_service import get_audit_logs
from app.middleware.rbac import get_current_user
from app.models.user import User
from app.models.agreement import Agreement
from app.models.legal_case import LegalCase

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    case_stats = get_case_stats(db)
    agreement_stats = get_agreement_stats(db)

    return {
        "cases": case_stats,
        "agreements": agreement_stats,
        "user": {
            "id": current_user.id,
            "name": current_user.full_name,
            "role": current_user.role,
        }
    }


@router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active alerts: expiring agreements, aging cases, high risk items."""
    alerts = []

    # Expiring agreements (within 30 days)
    thirty_days = datetime.utcnow() + timedelta(days=30)
    expiring = db.query(Agreement).filter(
        Agreement.expiry_date <= thirty_days,
        Agreement.expiry_date >= datetime.utcnow(),
        Agreement.status == "ACTIVE"
    ).all()
    for a in expiring:
        days_left = (a.expiry_date - datetime.utcnow()).days
        alerts.append({
            "type": "expiry_warning",
            "severity": "high" if days_left <= 7 else "medium",
            "message": f"Agreement {a.agreement_number} expires in {days_left} days",
            "entity_type": "agreement",
            "entity_id": a.id,
        })

    # High-risk cases
    high_risk_cases = db.query(LegalCase).filter(LegalCase.risk_score >= 70).all()
    for c in high_risk_cases:
        alerts.append({
            "type": "high_risk",
            "severity": "high",
            "message": f"Case {c.case_number} has high risk score: {c.risk_score}",
            "entity_type": "case",
            "entity_id": c.id,
        })

    # Aging cases (open > 90 days)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    aging = db.query(LegalCase).filter(
        LegalCase.created_at <= ninety_days_ago,
        LegalCase.status.in_(["NEW", "ACTIVE", "IN_PROGRESS"])
    ).all()
    for c in aging:
        age = (datetime.utcnow() - c.created_at).days
        alerts.append({
            "type": "aging_case",
            "severity": "medium",
            "message": f"Case {c.case_number} has been open for {age} days",
            "entity_type": "case",
            "entity_id": c.id,
        })

    return {"alerts": alerts, "total": len(alerts)}


@router.get("/audit")
def get_audit(
    entity_type: str = None,
    entity_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get audit logs (admin/supervisor only)."""
    if current_user.role not in ["admin", "supervisor"]:
        return {"logs": [], "message": "Access denied"}

    logs = get_audit_logs(db, entity_type=entity_type, entity_id=entity_id, skip=skip, limit=limit)
    return {"logs": [{"id": l.id, "user_id": l.user_id, "action": l.action,
                      "entity_type": l.entity_type, "entity_id": l.entity_id,
                      "details": l.details, "created_at": str(l.created_at)} for l in logs]}
