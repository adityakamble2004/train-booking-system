import csv
import re
import mysql.connector


# =========================================================
# CONFIGURATION
# =========================================================

CSV_FILE = "Train_No-Index.csv"

DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "root"
DB_NAME = "train manager"

RESET_TABLE = True


# =========================================================
# TRAIN NUMBER CHECK
# =========================================================

TRAIN_NO_PATTERN = re.compile(r"^\d{4,6}/\d{4,6}$")


def is_train_number(value):
    if not value:
        return False

    value = value.strip()

    return bool(TRAIN_NO_PATTERN.fullmatch(value))


# =========================================================
# CLEAN
# =========================================================

def clean(value):

    if value is None:
        return None

    value = value.strip()

    if value == "":
        return None

    return value


# =========================================================
# MERGE TEXT
# =========================================================

def merge_text(old, new):

    old = clean(old)
    new = clean(new)

    if not old:
        return new

    if not new:
        return old

    if new in old:
        return old

    return old + " " + new


# =========================================================
# DATABASE CONNECTION
# =========================================================

connection = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD
)

cursor = connection.cursor()


# =========================================================
# CREATE DATABASE
# =========================================================

cursor.execute(
    f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`"
)

cursor.close()
connection.close()


# =========================================================
# CONNECT TO DATABASE
# =========================================================

connection = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME
)

cursor = connection.cursor()


# =========================================================
# CREATE TABLE
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS trains (

    id INT AUTO_INCREMENT PRIMARY KEY,

    train_no VARCHAR(30) NOT NULL,

    from_station VARCHAR(255),

    to_station VARCHAR(255),

    train_name VARCHAR(255),

    table_no VARCHAR(100)

)
""")


# =========================================================
# CLEAR OLD DATA
# =========================================================

if RESET_TABLE:

    print("Clearing old train data...")

    cursor.execute("TRUNCATE TABLE trains")

    connection.commit()


# =========================================================
# RECORD STORAGE
# =========================================================

records = []

suspicious = []

csv_rows = 0


# =========================================================
# PENDING LEFT / RIGHT RECORD
# =========================================================

left_record = None
right_record = None


# =========================================================
# SAVE RECORD
# =========================================================

def save_record(record, side, row_number):

    if record is None:
        return

    train_no = clean(record[0])

    if not train_no:
        return

    if not is_train_number(train_no):

        suspicious.append(
            (
                row_number,
                side,
                record
            )
        )

        return

    final_record = (

        clean(record[0]),

        clean(record[1]),

        clean(record[2]),

        clean(record[3]),

        clean(record[4])

    )

    records.append(final_record)


# =========================================================
# PROCESS ONE SIDE
# =========================================================

def process_side(
    current,
    pending,
    side,
    row_number
):

    # -----------------------------------------------------
    # New train number found
    # -----------------------------------------------------

    if is_train_number(current[0]):

        # Save previous train
        if pending is not None:

            save_record(
                pending,
                side,
                row_number
            )

        # Start new train
        return list(current)


    # -----------------------------------------------------
    # No train number
    #
    # This can be continuation information.
    # -----------------------------------------------------

    if pending is None:

        return None


    # -----------------------------------------------------
    # Merge continuation values
    # -----------------------------------------------------

    for i in range(1, 5):

        value = clean(current[i])

        if not value:
            continue

        # -------------------------------------------------
        # Station continuation
        #
        # Example:
        #
        # Sri Chhatrapati
        # Shahu Maharaj (T)
        # -------------------------------------------------

        if i == 1:

            pending[1] = merge_text(
                pending[1],
                value
            )

        elif i == 2:

            pending[2] = merge_text(
                pending[2],
                value
            )

        elif i == 3:

            pending[3] = merge_text(
                pending[3],
                value
            )

        elif i == 4:

            pending[4] = merge_text(
                pending[4],
                value
            )


    return pending


# =========================================================
# READ CSV
# =========================================================

with open(
    CSV_FILE,
    "r",
    encoding="utf-8-sig",
    newline=""
) as file:

    reader = csv.reader(file)

    for row in reader:

        csv_rows += 1

        # -------------------------------------------------
        # Ignore completely empty row
        # -------------------------------------------------

        if not row:
            continue

        if not any(
            clean(value)
            for value in row
        ):
            continue


        # -------------------------------------------------
        # Ensure 10 columns
        # -------------------------------------------------

        while len(row) < 10:

            row.append("")


        # -------------------------------------------------
        # LEFT RECORD
        # -------------------------------------------------

        left = [

            clean(row[0]),
            clean(row[1]),
            clean(row[2]),
            clean(row[3]),
            clean(row[4])

        ]


        # -------------------------------------------------
        # RIGHT RECORD
        # -------------------------------------------------

        right = [

            clean(row[5]),
            clean(row[6]),
            clean(row[7]),
            clean(row[8]),
            clean(row[9])

        ]


        # -------------------------------------------------
        # PROCESS LEFT
        # -------------------------------------------------

        left_record = process_side(
            left,
            left_record,
            "LEFT",
            csv_rows
        )


        # -------------------------------------------------
        # PROCESS RIGHT
        # -------------------------------------------------

        right_record = process_side(
            right,
            right_record,
            "RIGHT",
            csv_rows
        )


# =========================================================
# SAVE LAST RECORDS
# =========================================================

if left_record is not None:

    save_record(
        left_record,
        "LEFT",
        csv_rows
    )


if right_record is not None:

    save_record(
        right_record,
        "RIGHT",
        csv_rows
    )


# =========================================================
# REMOVE EXACT DUPLICATES
# =========================================================

unique_records = []

seen = set()

for record in records:

    if record not in seen:

        seen.add(record)

        unique_records.append(record)


records = unique_records


# =========================================================
# VALIDATE DATA BEFORE INSERT
# =========================================================

valid_records = []

invalid_records = []

for index, record in enumerate(records, start=1):

    train_no = record[0]
    from_station = record[1]
    to_station = record[2]
    train_name = record[3]
    table_no = record[4]


    # -----------------------------------------------------
    # Train number
    # -----------------------------------------------------

    if not is_train_number(train_no):

        invalid_records.append(
            (index, record, "Invalid train number")
        )

        continue


    # -----------------------------------------------------
    # Length validation
    # -----------------------------------------------------

    if from_station and len(from_station) > 255:

        invalid_records.append(
            (index, record, "From station too long")
        )

        continue


    if to_station and len(to_station) > 255:

        invalid_records.append(
            (index, record, "To station too long")
        )

        continue


    if train_name and len(train_name) > 255:

        invalid_records.append(
            (index, record, "Train name too long")
        )

        continue


    if table_no and len(table_no) > 100:

        invalid_records.append(
            (index, record, "Table number too long")
        )

        continue


    valid_records.append(record)


# =========================================================
# INSERT
# =========================================================

insert_query = """
INSERT INTO trains
(
    train_no,
    from_station,
    to_station,
    train_name,
    table_no
)
VALUES
(
    %s,
    %s,
    %s,
    %s,
    %s
)
"""


inserted_count = 0

try:

    batch_size = 500


    for start in range(
        0,
        len(valid_records),
        batch_size
    ):

        batch = valid_records[
            start:start + batch_size
        ]


        cursor.executemany(
            insert_query,
            batch
        )


        connection.commit()


        inserted_count += len(batch)


        print(
            f"Inserted "
            f"{inserted_count} / "
            f"{len(valid_records)} records..."
        )


except Exception as e:

    connection.rollback()

    print()
    print("========================================")
    print("DATABASE INSERT ERROR")
    print("========================================")
    print(e)

    cursor.close()
    connection.close()

    raise


# =========================================================
# CLOSE CONNECTION
# =========================================================

cursor.close()
connection.close()


# =========================================================
# FINAL REPORT
# =========================================================

print()
print("========================================")
print("IMPORT COMPLETED")
print("========================================")

print(
    "CSV rows read       :",
    csv_rows
)

print(
    "Train records found :",
    len(records)
)

print(
    "Valid records       :",
    len(valid_records)
)

print(
    "Inserted records    :",
    inserted_count
)

print(
    "Invalid records     :",
    len(invalid_records)
)

print(
    "Suspicious rows     :",
    len(suspicious)
)

print("========================================")


# =========================================================
# SHOW INVALID RECORDS
# =========================================================

if invalid_records:

    print()
    print("INVALID RECORDS")
    print("----------------------------------------")

    for item in invalid_records[:20]:

        print(
            "Record:",
            item[0]
        )

        print(
            "Reason:",
            item[2]
        )

        print(
            "Data:",
            item[1]
        )

        print("----------------------------------------")


# =========================================================
# SHOW SUSPICIOUS ROWS
# =========================================================

if suspicious:

    print()
    print("SUSPICIOUS CSV ROWS")
    print("----------------------------------------")

    for item in suspicious[:20]:

        print(
            "CSV row:",
            item[0],
            "| Side:",
            item[1]
        )

        print(
            "Data:",
            item[2]
        )

        print("----------------------------------------")


print()
print("Done.")