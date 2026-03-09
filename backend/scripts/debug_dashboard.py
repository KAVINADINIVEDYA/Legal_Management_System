import os
import json
from app.database import SessionLocal, engine
from app.services.case_service import get_case_stats
from app.services.agreement_service import get_agreement_stats

def debug():
    print(f"CWD: {os.getcwd()}")
    print(f"Engine URL: {engine.url}")
    db_path = str(engine.url).replace("sqlite:///", "")
    print(f"Resolved DB Path: {os.path.abspath(db_path)}")
    db = SessionLocal()
    try:
        case_stats = get_case_stats(db)
        agreement_stats = get_agreement_stats(db)
        print(json.dumps({
            "cases": case_stats,
            "agreements": agreement_stats
        }, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    debug()
