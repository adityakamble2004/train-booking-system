
import re
import mysql.connector
from pathlib import Path

# ---------------- MYSQL CONFIGURATION ----------------
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "root"
DB_NAME = "train manager"

# Text file located beside this Python script
FILE_PATH = Path(__file__).with_name("train_master.txt")

BATCH_SIZE = 500


def main():
    if not FILE_PATH.exists():
        print(f"File not found: {FILE_PATH}")
        return

    connection = None
    cursor = None
    inserted = 0
    skipped = 0
    batch = []

    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )

        cursor = connection.cursor()
        print("Connected to MySQL successfully.")

        insert_sql = """
            INSERT INTO train_master_txt
            (serial_no, train_name, train_no, starts, ends)
            VALUES (%s, %s, %s, %s, %s)
        """

        with open(FILE_PATH, "r", encoding="utf-8-sig") as file:
            for line_number, line in enumerate(file, start=1):
                line = line.strip()

                # Ignore blank lines and the header
                if not line:
                    continue

                if "S.No" in line and "Train No." in line:
                    continue

                # Split using tabs or 2+ consecutive spaces.
                # Single spaces inside names remain untouched.
                cells = re.split(r"\t+| {2,}", line)

                cells = [cell.strip() for cell in cells]

                if len(cells) != 5:
                    skipped += 1
                    print(
                        f"Skipped line {line_number}: "
                        f"expected 5 columns, found {len(cells)}"
                    )
                    print(f"  {line}")
                    continue

                serial_text, train_name, train_no, starts, ends = cells

                try:
                    serial_no = int(serial_text)

                    if not all([
                        train_name,
                        train_no,
                        starts,
                        ends
                    ]):
                        raise ValueError("Empty required field")

                    batch.append((
                        serial_no,
                        train_name,
                        train_no,
                        starts,
                        ends
                    ))

                except ValueError as error:
                    skipped += 1
                    print(
                        f"Skipped line {line_number}: {error}"
                    )
                    continue

                # Insert in batches
                if len(batch) >= BATCH_SIZE:
                    cursor.executemany(insert_sql, batch)
                    connection.commit()

                    inserted += len(batch)
                    print(f"Inserted {inserted} records...")
                    batch.clear()

        # Insert remaining records
        if batch:
            cursor.executemany(insert_sql, batch)
            connection.commit()
            inserted += len(batch)

        print("\n========== IMPORT COMPLETED ==========")
        print(f"Inserted records: {inserted}")
        print(f"Skipped lines:    {skipped}")
        print("Target table: train_master_txt")
        print("======================================")

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()

        print(f"Import error: {error}")

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    main()
