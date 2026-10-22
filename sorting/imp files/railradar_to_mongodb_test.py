import requests
from pymongo import MongoClient
import mysql.connector
import time

# ============================================================
# CONFIGURATION
# ============================================================

# ---------- RailRadar API ----------
API_KEY = "rg_2688520f13014b8fa12a32d5586e167d"

API_URL = "https://api.railradar.in/v1/trains/{}"


# ---------- MySQL ----------
MYSQL_HOST = "localhost"
MYSQL_USER = "root"
MYSQL_PASSWORD = "root"
MYSQL_DATABASE = "train manager"


# ---------- MongoDB ----------
MONGO_URI = "mongodb://localhost:27017/"
MONGO_DATABASE = "railway"
MONGO_COLLECTION = "trains"


# ---------- TEST LIMIT ----------
# Only 2 API requests for now
MAX_API_HITS = 500


# ============================================================
# CONNECT TO MYSQL
# ============================================================

mysql_conn = mysql.connector.connect(
    host=MYSQL_HOST,
    user=MYSQL_USER,
    password=MYSQL_PASSWORD,
    database=MYSQL_DATABASE
)

mysql_cursor = mysql_conn.cursor()

print("Connected to MySQL")


# ============================================================
# CONNECT TO MONGODB
# ============================================================

mongo_client = MongoClient(MONGO_URI)

mongo_db = mongo_client[MONGO_DATABASE]
mongo_collection = mongo_db[MONGO_COLLECTION]

print("Connected to MongoDB")


# ============================================================
# GET TRAIN NUMBERS FROM MYSQL
# ============================================================

mysql_cursor.execute("""
    SELECT train_no
    FROM trains
    WHERE train_no IS NOT NULL
    LIMIT %s
""", (MAX_API_HITS,))

train_rows = mysql_cursor.fetchall()

print(f"\nTrain records selected: {len(train_rows)}")


# ============================================================
# RAILRADAR API HEADERS
# ============================================================

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}


# ============================================================
# PROCESS TRAINS
# ============================================================

success_count = 0
failed_count = 0

for index, row in enumerate(train_rows, start=1):

    original_train_no = row[0]
    time.sleep(0.2)  

    # Example:
    # 10103/10104
    #
    # Take only:
    # 10103

    train_number = str(original_train_no).split("/")[0].strip()

    print("\n" + "=" * 60)
    print(f"Processing {index}/{len(train_rows)}")
    print(f"Original train number : {original_train_no}")
    print(f"API train number      : {train_number}")

    # --------------------------------------------------------
    # API REQUEST
    # --------------------------------------------------------

    url = API_URL.format(train_number)

    try:

        response = requests.get(
            url,
            headers=headers,
            timeout=20
        )

        print(f"API Status Code: {response.status_code}")

        # ----------------------------------------------------
        # CHECK API RESPONSE
        # ----------------------------------------------------

        if response.status_code != 200:

            print("API request failed.")
            print(response.text)

            failed_count += 1
            continue

        json_data = response.json()

        # ----------------------------------------------------
        # CHECK SUCCESS
        # ----------------------------------------------------

        if not json_data.get("success", False):

            print("API returned success=false")

            failed_count += 1
            continue

        # ----------------------------------------------------
        # ADD OUR OWN INFORMATION
        # ----------------------------------------------------

        json_data["apiTrainNumber"] = train_number
        json_data["sourceTrainNo"] = original_train_no

        # ----------------------------------------------------
        # INSERT INTO MONGODB
        # ----------------------------------------------------

        result = mongo_collection.insert_one(json_data)

        print("MongoDB document inserted successfully.")
        print("MongoDB ID:", result.inserted_id)

        success_count += 1

    except requests.exceptions.RequestException as e:

        print("API connection error:", e)
        failed_count += 1

    except Exception as e:

        print("Error:", e)
        failed_count += 1


# ============================================================
# CLOSE CONNECTIONS
# ============================================================

mysql_cursor.close()
mysql_conn.close()

mongo_client.close()


# ============================================================
# FINAL RESULT
# ============================================================

print("\n")
print("=" * 60)
print("IMPORT TEST COMPLETED")
print("=" * 60)

print(f"API hits allowed : {MAX_API_HITS}")
print(f"Successful       : {success_count}")
print(f"Failed           : {failed_count}")

print("=" * 60)