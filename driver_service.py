from database import get_connection
from datetime import datetime


# CREATE DRIVER
def add_driver(name, license_number, license_category,
               license_expiry, phone, safety_score,
               status):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute("""
        INSERT INTO drivers
        (
            name,
            license_number,
            license_category,
            license_expiry,
            phone,
            safety_score,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            license_number,
            license_category,
            license_expiry,
            phone,
            safety_score,
            status
        ))
    conn.commit()

    driver_id = cursor.lastrowid
    conn.close()

    return {
        "message": "Driver Added Successfully!",
        "driver_id": driver_id
    }


# READ ALL DRIVERS
def get_all_drivers():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM drivers
        ORDER BY id DESC
    """)

    drivers = cursor.fetchall()

    conn.close()

    return drivers



# READ SINGLE DRIVER
def get_driver_by_id(driver_id):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM drivers
        WHERE id = ?
    """,
    (driver_id,))

    driver = cursor.fetchone()

    conn.close()

    return driver



# UPDATE DRIVER
def update_driver(driver_id, name=None,
                  license_number=None,
                  license_category=None,
                  license_expiry=None,
                  phone=None,
                  safety_score=None,
                  status=None):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute("""
        UPDATE drivers
        SET
            name = COALESCE(?,name),
            license_number = COALESCE(?,license_number),
            license_category = COALESCE(?,license_category),
            license_expiry = COALESCE(?,license_expiry),
            phone = COALESCE(?,phone),
            safety_score = COALESCE(?,safety_score),
            status = COALESCE(?,status)

        WHERE id = ?
    """,
    (
        name,
        license_number,
        license_category,
        license_expiry,
        phone,
        safety_score,
        status,
        driver_id
    ))


    conn.commit()

    updated = cursor.rowcount

    conn.close()


    if updated:
        return {
            "message":"Driver updated successfully"
        }

    return {
        "error":"Driver not found"
    }



# DELETE DRIVER
def delete_driver(driver_id):

    conn = get_connection()
    cursor = conn.cursor()


    # Prevent deleting driver on trip
    cursor.execute("""
        SELECT status
        FROM drivers
        WHERE id=?
    """,
    (driver_id,))


    driver = cursor.fetchone()


    if not driver:
        conn.close()
        return {
            "error":"Driver not found"
        }


    if driver[0] == "On Trip":

        conn.close()

        return {
            "error":
            "Cannot delete driver while on trip"
        }



    cursor.execute("""
        DELETE FROM drivers
        WHERE id=?
    """,
    (driver_id,))


    conn.commit()

    conn.close()


    return {
        "message":"Driver deleted successfully"
    }



# CHECK DRIVER ELIGIBILITY FOR TRIP
def check_driver_available(driver_id):

    conn = get_connection()
    cursor = conn.cursor()


    cursor.execute("""
        SELECT status, license_expiry
        FROM drivers
        WHERE id=?
    """,
    (driver_id,))


    driver = cursor.fetchone()

    conn.close()


    if not driver:
        return False

    status = driver[0]
    expiry = driver[1]

    today = datetime.today().date()

    if status == "Suspended":
        return False

    if status == "On Trip":
        return False

    if datetime.strptime(expiry,"%Y-%m-%d").date() < today:
        return False

    return True