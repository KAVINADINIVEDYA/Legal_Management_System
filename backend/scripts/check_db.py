import sqlite3
import os

db_path = 'legal_management.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT title, status FROM agreements WHERE title LIKE 'Workflow Test%';")
    rows = cursor.fetchall()
    for row in rows:
        print(f"Title: {row[0]}, Status: {row[1]}")
    conn.close()
else:
    print(f"Database not found at {db_path}")
