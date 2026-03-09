
import sqlite3
import os

def check():
    db_file = 'legal_management.db'
    if not os.path.exists(db_file):
        print(f"File {db_file} not found!")
        return
    
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in {db_file}: {tables}")
    
    if 'legal_cases' in tables:
        count = cursor.execute("SELECT COUNT(*) FROM legal_cases").fetchone()[0]
        print(f"Total rows in legal_cases: {count}")
    else:
        print("Table 'legal_cases' NOT FOUND!")
    
    conn.close()

if __name__ == "__main__":
    check()
