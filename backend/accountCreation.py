import sqlite3
import hashlib

# Connect to the database (or create it)
conn = sqlite3.connect("chat_website.db")
cursor = conn.cursor()

# Create a table for users
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
)
""")
conn.commit()

def hash_password(password):
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_account(username, email, password):
    """Create a new user account."""
    password_hash = hash_password(password)
    try:
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", 
                       (username, email, password_hash))
        conn.commit()
        print("Account created successfully!")
    except sqlite3.IntegrityError:
        print("Error: Username or email already exists.")

if __name__ == "__main__":
    print("Welcome to the Chat Website Account Creation")
    username = input("Enter a username: ")
    email = input("Enter your email: ")
    password = input("Enter a password: ")
    create_account(username, email, password)