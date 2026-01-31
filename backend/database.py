import sqlite3
import os

DB_PATH = "study.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    """Initialize database and tables."""
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("PRAGMA integrity_check;")
            res = cur.fetchone()
            if res[0] != "ok":
                print("[WARNING] Corrupted DB, recreating...")
                conn.close()
                os.remove(DB_PATH)
        except sqlite3.DatabaseError:
            print("[ERROR] Corrupted DB, recreating...")
            conn.close()
            os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
    """)

    # Subjects table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            difficulty INTEGER DEFAULT 1,
            deadline INTEGER DEFAULT 7,
            hours INTEGER DEFAULT 2,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)

    conn.commit()
    conn.close()
    print("[INFO] Database initialized successfully.")

# Initialize DB on import
initialize_db()
