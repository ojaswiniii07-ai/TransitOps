from database import get_connection

def add_vehicle(registration_number, model, vehicle_type,
                max_load_capacity, odometer,
                acquisition_cost, status):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO vehicles
        (registration_number, model, vehicle_type,
         max_load_capacity, odometer,
         acquisition_cost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        registration_number,
        model,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status
    ))

    conn.commit()
    conn.close()

    print("Vehicle Added Successfully!")


def get_all_vehicles():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM vehicles")

    vehicles = cursor.fetchall()

    conn.close()

    return vehicles


def update_vehicle_status(vehicle_id, new_status):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE vehicles
        SET status = ?
        WHERE id = ?
    """, (new_status, vehicle_id))

    conn.commit()

    if cursor.rowcount > 0:
        print("Vehicle updated successfully!")
    else:
        print("Vehicle not found.")

    conn.close()



def delete_vehicle(vehicle_id):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM vehicles
        WHERE id = ?
    """, (vehicle_id,))

    conn.commit()

    if cursor.rowcount > 0:
        print("Vehicle deleted successfully!")
    else:
        print("Vehicle not found.")

    conn.close()