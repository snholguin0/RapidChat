import sqlite3
import hashlib


conn = sqlite3.connect("RapidChat.db")
cursor = conn.cursor()

#This method is in charge of initializing the database this uses SQL
def initializeDatabase():
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

#This method is in charge of password hashing 
def hashPassword(password):
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

#This method is in charge of account creation after the users enters their details it will run the password hash and then put the account into the database
def createAccount(username, email, password):
    """Create a new user account."""
    password_hash = hashPassword(password)
    try:
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", 
                       (username, email, password_hash))
        conn.commit()
        print("Account created successfully!")
    except sqlite3.IntegrityError:
        print("Error: Username or email already exists.")

#This method is for deleting accounts from the database 
def deleteAccount(username):
    """Delete a user account by username."""
    cursor.execute("DELETE FROM users WHERE username = ?", (username,))
    conn.commit()
    if cursor.rowcount > 0:
        print(f"Account '{username}' has been deleted successfully.")
    else:
        print(f"Account '{username}' not found.")

#This account is used to verify login information if a user is in the database login will be successful if they are not in the database it will say invalid username or password
def verifyLogin(username, password):
    """Verify login credentials."""
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if user and user[0] == hashPassword(password):
        print("Login successful!")
        return True
    else:
        print("Invalid username or password.")
        return False

#Closes the database connection 
def closeConnection():
    """Close the database connection."""
    conn.close()
    