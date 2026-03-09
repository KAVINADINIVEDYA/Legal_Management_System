"""
Audit service: log every user action for compliance and traceability.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_action(db: Session, user_id: int, action: str,
               entity_type: str = None, entity_id: int = None,
               details: str = None, ip_address: str = None,
               user_agent: str = None) -> Optional[AuditLog]:
    """Log an audit action. Deduplicates 'read' actions."""
    
    # Prevent duplicate 'read' logs for the same user and entity
    if action == "read" and entity_type and entity_id:
        existing = db.query(AuditLog).filter(
            AuditLog.user_id == user_id,
            AuditLog.action == "read",
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id
        ).first()
        if existing:
            return existing

    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.commit()
    return entry


def get_audit_logs(db: Session, entity_type: Optional[str] = None,
                   entity_id: Optional[int] = None,
                   user_id: Optional[int] = None,
                   skip: int = 0, limit: int = 100):
    """Get audit logs with optional filters."""
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
