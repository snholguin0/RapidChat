import sqlite3
import hashlib

# Global database connection
conn = sqlite3.connect("chat_website.db")
cursor = conn.cursor()

# Create the users table if it doesn't exist
def initialize_database():
    """Initialize the database and create the users table if it doesn't exist."""
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
    """)
    conn.commit()

# Hash a password
def hash_password(password):
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

# Create a new user account
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

# Delete a user account
def delete_account(username):
    """Delete a user account by username."""
    cursor.execute("DELETE FROM users WHERE username = ?", (username,))
    conn.commit()
    if cursor.rowcount > 0:
        print(f"Account '{username}' has been deleted successfully.")
    else:
        print(f"Account '{username}' not found.")

# Verify login credentials
def verify_login(username, password):
    """Verify login credentials."""
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if user and user[0] == hash_password(password):
        print("Login successful!")
        return True
    else:
        print("Invalid username or password.")
        return False

# Retrieve user details by username
def get_user_by_username(username):
    """Retrieve user details by username."""
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if user:
        print(f"User found: {user}")
        return user
    else:
        print("User not found.")
        return None

# List all users
def list_all_users():
    """List all users in the database."""
    cursor.execute("SELECT id, username, email FROM users")
    users = cursor.fetchall()
    for user in users:
        print(user)

# Close the database connection
def close_connection():
    """Close the database connection."""
    conn.close()

