
import sqlite3
import json

DB_PATH = "legal_management.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(legal_cases)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "case_details" not in columns:
            print("Adding case_details column...")
            cursor.execute("ALTER TABLE legal_cases ADD COLUMN case_details TEXT")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column case_details already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
