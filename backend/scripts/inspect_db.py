
import sqlite3
import json

def inspect_db():
    conn = sqlite3.connect('legal_management.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check users
    cursor.execute("SELECT id, username, role FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    
    # Check cases
    cursor.execute("SELECT id, case_number, status, assigned_officer_id FROM legal_cases")
    cases = [dict(row) for row in cursor.fetchall()]
    
    # Check agreements
    cursor.execute("SELECT id, agreement_number, status FROM agreements")
    agreements = [dict(row) for row in cursor.fetchall()]
    
    print(json.dumps({
        "users": users,
        "cases": cases,
        "agreements": agreements
    }, indent=2))
    
    conn.close()

if __name__ == "__main__":
    inspect_db()
