import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.legal_case import LegalCase
from app.schemas.case import CaseResponse
from pydantic import ValidationError

def debug_validation():
    db = SessionLocal()
    try:
        cases = db.query(LegalCase).all()
        print(f"Checking {len(cases)} cases...")
        for c in cases:
            try:
                CaseResponse.model_validate(c)
                # print(f"Case {c.id} ({c.case_number}): OK")
            except ValidationError as e:
                print(f"Validation failed for Case {c.id} ({c.case_number}):")
                print(e)
            except Exception as ex:
                print(f"Other error for Case {c.id}: {ex}")
        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    debug_validation()
