import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.services.agreement_service import approve_agreement, create_agreement, submit_for_review
from app.models.user import User

def debug_approval():
    db = SessionLocal()
    try:
        # 1. Get/Create a reviewer and admin
        admin = db.query(User).filter(User.role == "admin").first()
        reviewer = db.query(User).filter(User.role == "reviewer").first()
        
        if not admin or not reviewer:
            print("Admin or Reviewer not found.")
            return

        # 2. Create a test agreement
        print("Creating test agreement...")
        agreement = create_agreement(db, {"title": "Debug Agreement", "agreement_type": "NDA"}, admin.id)
        
        # 3. Submit for review
        print("Submitting for review...")
        submit_for_review(db, agreement.id, [reviewer.id], admin)
        db.refresh(agreement)

        # 4. Try to approve
        print("Attempting to approve...")
        try:
            res = approve_agreement(db, agreement.id, reviewer.id, "Debug approval", reviewer)
            print("Approval successful!")
        except Exception as e:
            print(f"Approval failed with error: {e}")
            import traceback
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    debug_approval()
