
import sys
import os
# Ensure backend app is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./legal_management.db"
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Checking agreements table schema...")
        
        # Check columns
        try:
            result = conn.execute(text("PRAGMA table_info(agreements)"))
            columns = [row[1] for row in result]
            print(f"Current columns: {columns}")
            
            if 'currency' not in columns:
                print("Adding currency column...")
                conn.execute(text("ALTER TABLE agreements ADD COLUMN currency VARCHAR(10) DEFAULT 'LKR'"))
            else:
                print("Currency column exists.")

            if 'duration_months' not in columns:
                print("Adding duration_months column...")
                conn.execute(text("ALTER TABLE agreements ADD COLUMN duration_months INTEGER"))
            else:
                print("duration_months column exists.")
                
        except Exception as e:
            print(f"Error checking schema: {e}")
        
        conn.commit()
    print("Migration check complete.")

if __name__ == "__main__":
    migrate()
