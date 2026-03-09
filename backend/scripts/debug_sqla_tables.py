
import os
from sqlalchemy import create_engine, inspect
from app.config import settings

def debug_sqlalchemy():
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables detected by SQLAlchemy: {tables}")
    
    if 'legal_cases' in tables:
        print("legal_cases table exists in SQLAlchemy view.")
    else:
        print("legal_cases table MISSING in SQLAlchemy view.")

if __name__ == "__main__":
    debug_sqlalchemy()
