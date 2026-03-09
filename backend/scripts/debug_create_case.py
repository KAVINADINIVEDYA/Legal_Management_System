from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.case_service import create_case
from app.models.legal_case import LegalCase

def debug_create():
    db = SessionLocal()
    try:
        data = {
            "title": "Debug Case",
            "case_type": "other",
            "parties": "A vs B"
        }
        case = create_case(db, data, 1) # admin id 1
        print(f"Success: {case.case_number} assigned to {case.assigned_officer_id}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_create()
