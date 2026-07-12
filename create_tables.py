from database import get_connection

conn = get_connection()

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS vehicles(

id INTEGER PRIMARY KEY AUTOINCREMENT,

registration_number TEXT UNIQUE NOT NULL,

model TEXT NOT NULL,

vehicle_type TEXT,

max_load_capacity REAL,

odometer INTEGER,

acquisition_cost REAL,

status TEXT
)
""")

conn.commit()

conn.close()

print("Vehicle table created successfully!")