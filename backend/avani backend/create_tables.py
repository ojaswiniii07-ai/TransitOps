from database import get_connection


def create_vehicle_table(cursor):

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_number TEXT UNIQUE NOT NULL,
        vehicle_name TEXT NOT NULL,
        vehicle_type TEXT,
        max_load_capacity INTEGER,
        odometer INTEGER,
        acquisition_cost REAL,
        status TEXT DEFAULT 'Available'
    )
    """)

    print("Vehicle table created successfully!")


def create_driver_table(cursor):

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        license_category TEXT NOT NULL,
        license_expiry TEXT NOT NULL,
        phone TEXT,
        safety_score INTEGER DEFAULT 100,
        status TEXT DEFAULT 'Available'
    )
    """)

    print("Driver table created successfully!")


# Main execution

conn = get_connection()
cursor = conn.cursor()

create_vehicle_table(cursor)

create_driver_table(cursor)


conn.commit()
conn.close()

print("Database setup completed!")