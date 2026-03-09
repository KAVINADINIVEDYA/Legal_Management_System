"""
Administrative endpoints for system management.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models.user import User
from app.services.audit_service import get_audit_logs

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/audit")
def list_system_audit_logs(
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """List all system audit logs (Admin only)."""
    logs = get_audit_logs(db, entity_type=entity_type, user_id=user_id, skip=skip, limit=limit)
    return [{
        "id": l.id,
        "action": l.action,
        "entity_type": l.entity_type,
        "entity_id": l.entity_id,
        "details": l.details,
        "performed_by": l.user.full_name if l.user else "System",
        "ip_address": l.ip_address,
        "created_at": str(l.created_at)
    } for l in logs]
