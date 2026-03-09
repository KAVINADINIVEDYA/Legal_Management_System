from sqlalchemy.orm import Session
from app.models.user import User
import json

def humanize_field_name(field: str) -> str:
    """Convert technical field names to uppercase human-readable labels."""
    mapping = {
        "assigned_officer_id": "ASSIGNED OFFICER",
        "supervisor_id": "SUPERVISOR",
        "created_by_id": "CREATED BY",
        "uploaded_by_id": "UPLOADED BY",
        "case_type": "CASE TYPE",
        "nature_of_case": "NATURE OF CASE",
        "court_authority": "COURT/AUTHORITY",
        "financial_exposure": "FINANCIAL EXPOSURE",
        "claim_amount": "CLAIM AMOUNT",
        "recovered_amount": "RECOVERED AMOUNT",
        "outstanding_amount": "OUTSTANDING AMOUNT",
        "effective_date": "EFFECTIVE DATE",
        "expiry_date": "EXPIRY DATE",
        "agreement_type": "AGREEMENT TYPE",
    }
    return mapping.get(field, field.replace("_", " ").upper())

def resolve_id_to_name(db: Session, field: str, value) -> str:
    """Resolve ID values to human-readable names. Returns ONLY the name for users."""
    if not value or value == "None" or value == "null":
        return "None"
    
    try:
        val_id = int(value)
    except (ValueError, TypeError):
        return str(value)

    # List of fields that refer to a User ID
    user_fields = [
        "assigned_officer_id", "supervisor_id", "created_by_id", 
        "uploaded_by_id", "reviewer_id", "author_id"
    ]
    
    if field in user_fields:
        user = db.query(User).filter(User.id == val_id).first()
        if user:
            return user.full_name
    
    return str(value)

def get_human_changes(db: Session, changes: dict) -> dict:
    """Generate human-readable field changes."""
    humanized = {}
    for field, vals in changes.items():
        label = humanize_field_name(field)
        old_val = resolve_id_to_name(db, field, vals.get("old"))
        new_val = resolve_id_to_name(db, field, vals.get("new"))
        humanized[label] = {"old": old_val, "new": new_val}
    return humanized
