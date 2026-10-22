
import requests
from pymongo import MongoClient
import mysql.connector
import time

# ============================================================
# CONFIGURATION
# ============================================================

# RailRadar API
API_KEY = "rg_2688520f13014b8fa12a32d5586e167d"
API_URL = "https://api.railradar.in/v1/trains/{}"

# MySQL
MYSQL_HOST = "localhost"
MYSQL_USER = "root"
MYSQL_PASSWORD = "root"
MYSQL_DATABASE = "train manager"
MYSQL_TABLE = "train_master_txt"

# MongoDB
MONGO_URI = "mongodb://localhost:27017/"
MONGO_DATABASE = "railway"
MONGO_COLLECTION = "train_master_details"

# Maximum API requests for this run
MAX_API_HITS = 500

# Delay between requests
REQUEST_DELAY = 0.2


def main():
    mysql_conn = None
    mysql_cursor = None
    mongo_client = None

    success_count = 0
    failed_count = 0
    skipped_count = 0

    try:
        # ----------------------------------------------------
        # CONNECT TO MYSQL
        # ----------------------------------------------------
        mysql_conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE
        )

        mysql_cursor = mysql_conn.cursor()
        print("Connected to MySQL")

        # ----------------------------------------------------
        # CONNECT TO MONGODB
        # ----------------------------------------------------
        mongo_client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000
        )

        mongo_client.admin.command("ping")

        mongo_collection = mongo_client[
            MONGO_DATABASE
        ][MONGO_COLLECTION]

        print("Connected to MongoDB")
        print(f"Target collection: {MONGO_DATABASE}.{MONGO_COLLECTION}")

        # ----------------------------------------------------
        # READ TRAIN NUMBERS FROM NEW MYSQL TABLE
        # ----------------------------------------------------
        query = f"""
            SELECT train_no
            FROM `{MYSQL_TABLE}`
            WHERE train_no IS NOT NULL
              AND TRIM(train_no) <> ''
            ORDER BY serial_no
            LIMIT %s
        """

        mysql_cursor.execute(query, (MAX_API_HITS,))
        train_rows = mysql_cursor.fetchall()

        print(f"\nTrain records selected: {len(train_rows)}")

        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Accept": "application/json"
        }

        # ----------------------------------------------------
        # PROCESS EACH TRAIN
        # ----------------------------------------------------
        for index, row in enumerate(train_rows, start=1):
            original_train_no = str(row[0]).strip()

            # Use first train number if stored as a pair
            train_number = original_train_no.split("/")[0].strip()

            if not train_number:
                skipped_count += 1
                print(f"Skipping empty train number at record {index}")
                continue

            print("\n" + "=" * 55)
            print(f"Processing {index}/{len(train_rows)}")
            print(f"Source train number: {original_train_no}")
            print(f"API train number:   {train_number}")

            # Avoid duplicate API requests if already imported
            if mongo_collection.find_one(
                {"apiTrainNumber": train_number},
                {"_id": 1}
            ):
                print("Already exists in MongoDB. Skipping API request.")
                skipped_count += 1
                continue

            try:
                time.sleep(REQUEST_DELAY)

                response = requests.get(
                    API_URL.format(train_number),
                    headers=headers,
                    timeout=20
                )

                print(f"API status: {response.status_code}")

                if response.status_code != 200:
                    print(f"API request failed: {response.text}")
                    failed_count += 1
                    continue

                json_data = response.json()

                if not json_data.get("success", False):
                    print("API returned success=false")
                    failed_count += 1
                    continue

                # Keep the full response and add source information
                json_data["apiTrainNumber"] = train_number
                json_data["sourceTrainNo"] = original_train_no

                result = mongo_collection.insert_one(json_data)

                print("Inserted into MongoDB successfully.")
                print(f"MongoDB ID: {result.inserted_id}")

                success_count += 1

            except requests.exceptions.RequestException as error:
                print(f"API connection error: {error}")
                failed_count += 1

            except Exception as error:
                print(f"Error processing train: {error}")
                failed_count += 1

        # ----------------------------------------------------
        # FINAL SUMMARY
        # ----------------------------------------------------
        print("\n" + "=" * 55)
        print("IMPORT COMPLETED")
        print("=" * 55)
        print(f"API request limit: {MAX_API_HITS}")
        print(f"Inserted:          {success_count}")
        print(f"Failed:            {failed_count}")
        print(f"Skipped:           {skipped_count}")
        print(f"Collection:        {MONGO_DATABASE}.{MONGO_COLLECTION}")
        print("=" * 55)

    except Exception as error:
        print(f"Setup error: {error}")

    finally:
        if mysql_cursor:
            mysql_cursor.close()

        if mysql_conn and mysql_conn.is_connected():
            mysql_conn.close()

        if mongo_client:
            mongo_client.close()


if __name__ == "__main__":
    main()
