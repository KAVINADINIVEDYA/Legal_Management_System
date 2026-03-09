import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.legal_case import LegalCase
from app.services.case_service import create_case, update_case
from datetime import datetime, timedelta

# Setup DB
DATABASE_URL = "sqlite:///d:/Law/backend/legal_system.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def verify():
    # 1. Get a user
    user = db.query(User).filter(User.email == "kavin.ou@mobitel.lk").first()
    if not user:
        # Fallback to any user
        user = db.query(User).first()
        if not user:
            print("No users found in DB")
            return

    # 2. Create a case
    print(f"Using user: {user.email}")
    print("Creating case...")
    case_data = {
        "title": "Test Case for Edit",
        "case_type": "other",
        "parties": "Test vs Test",
        "financial_exposure": 1000,
        "document_id": None 
    }
    
    case = create_case(db, case_data, user.id)
    print(f"Case {case.case_number} created at {case.created_at}")

    # 3. Update case (Should succeed)
    print("Attempting update within 24h...")
    update_data = {"title": "Updated Title Details"}
    try:
        updated_case = update_case(db, case.id, update_data, user)
        print(f"Update Success! New Title: {updated_case.title}")
    except Exception as e:
        print(f"Update Failed: {e}")

    # 4. Fast forward time
    print("Simulating 25 hours passing...")
    case.created_at = datetime.utcnow() - timedelta(hours=25)
    db.commit()

    # 5. Update case (Should fail)
    print("Attempting update after 24h...")
    try:
        update_case(db, case.id, {"title": "Should Fail"}, user)
        print("ERROR: Update succeeded when it should have failed!")
    except ValueError as e:
        print(f"SUCCESS: Update failed as expected: {e}")
    except Exception as e:
        print(f"Update Failed with unexpected error: {e}")

    # Cleanup
    db.delete(case)
    db.commit()

if __name__ == "__main__":
    verify()
