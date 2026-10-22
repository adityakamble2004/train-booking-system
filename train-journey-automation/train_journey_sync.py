
import os
import json
import argparse
import logging
from datetime import date, timedelta
from pathlib import Path

import mysql.connector
import requests
from dotenv import load_dotenv

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_URL = os.getenv(
    "API_URL",
    "http://localhost:8081/api/v1/admin/journeys"
).strip()

LOGIN_URL = os.getenv(
    "LOGIN_URL",
    "http://localhost:8081/api/v1/auth/login"
).strip()

COACH_FILE = BASE_DIR / "train_coaches.json"
LOG_FILE = BASE_DIR / "train_journey_sync.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

log = logging.getLogger("train-journey-sync")


# --------------------------------------------------
# ENVIRONMENT VALIDATION
# --------------------------------------------------

def validate_config():
    required = [
        "DB_HOST",
        "DB_USER",
        "DB_NAME",
        "ADMIN_EMAIL",
        "ADMIN_PASSWORD",
        "API_URL",
        "LOGIN_URL"
    ]

    missing = [
        key for key in required
        if not os.getenv(key, "").strip()
    ]

    if missing:
        raise RuntimeError(
            "Missing .env settings: " + ", ".join(missing)
        )


# --------------------------------------------------
# 1. AUTOMATIC ADMIN LOGIN
# --------------------------------------------------

def get_nested_value(data, path):
    """Read a token field such as token or data.accessToken."""
    value = data

    for key in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(key)

    return value


def authenticate():
    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    token_field = os.getenv("TOKEN_FIELD", "token").strip()
    request_format = os.getenv(
        "LOGIN_BODY_FORMAT", "email-password"
    ).strip()

    if request_format == "username-password":
        login_payload = {
            "username": email,
            "password": password
        }
    else:
        login_payload = {
            "email": email,
            "password": password
        }

    log.info("Logging in to the admin API...")

    response = requests.post(
        LOGIN_URL,
        json=login_payload,
        headers={"Accept": "application/json"},
        timeout=(5, 30)
    )

    if not response.ok:
        # Avoid logging credentials or authentication response secrets.
        raise RuntimeError(
            f"Admin login failed: HTTP {response.status_code}. "
            "Check LOGIN_URL, credentials, and login request format."
        )

    
    try:
        data = response.json()
    except ValueError:
        print("Login response is not JSON.")
        print("HTTP status:", response.status_code)
        print("Response:", response.text[:1000])
        raise RuntimeError("Login endpoint did not return JSON.")

    def show_structure(value):
        if isinstance(value, dict):
            return {
                key: show_structure(item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [
                show_structure(value[0])
            ] if value else []
        if isinstance(value, str):
            return "<string>"
        if value is None:
            return None
        return f"<{type(value).__name__}>"

    print("Login HTTP status:", response.status_code)
    print("Login response structure:", show_structure(data))
    print("Response cookie names:", list(response.cookies.keys()))

    token = get_nested_value(
        data,
        os.getenv("TOKEN_FIELD", "token").strip()
    )


    token = get_nested_value(data, token_field)

    if not isinstance(token, str) or not token.strip():
        raise RuntimeError(
            f"Login response does not contain a valid "
            f"token at '{token_field}'. Check TOKEN_FIELD "
            "in .env and the actual login response."
        )

    log.info("Admin login successful.")
    return token.strip()


# --------------------------------------------------
# 2. SELECT TARGET DATE
# --------------------------------------------------

def get_target_date(mode=None):
    today = date.today()

    if mode == "today":
        return today

    if mode == "tomorrow":
        return today + timedelta(days=1)

    while True:
        choice = input(
            "\nEnter 1 for today or 0 for tomorrow: "
        ).strip()

        if choice == "1":
            return today

        if choice == "0":
            return today + timedelta(days=1)

        print("Invalid choice. Please enter 1 or 0.")


# --------------------------------------------------
# 3. FETCH TRAIN NUMBERS FROM MYSQL
# --------------------------------------------------

def fetch_trains():
    connection = None

    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME"),
            connection_timeout=10
        )

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT train_no, train_name
            FROM train_master_txt
            WHERE train_no IS NOT NULL
              AND TRIM(CAST(train_no AS CHAR)) <> ''
            ORDER BY train_no
        """)

        rows = cursor.fetchall()
        cursor.close()

        trains = []
        seen = set()

        for row in rows:
            train_no = str(row["train_no"]).strip()

            if train_no and train_no not in seen:
                seen.add(train_no)

                trains.append({
                    "trainNo": train_no,
                    "trainName": row.get("train_name") or ""
                })

        log.info("Fetched %d unique trains from MySQL.", len(trains))
        return trains

    finally:
        if connection is not None and connection.is_connected():
            connection.close()


# --------------------------------------------------
# 4. LOAD COACH CONFIGURATION
# --------------------------------------------------

def load_coach_config():
    config = {}

    if COACH_FILE.exists():
        with open(COACH_FILE, "r", encoding="utf-8") as file:
            config = json.load(file)

    default_json = os.getenv("DEFAULT_CLASSES_JSON", "").strip()

    if "default" not in config:
        if not default_json:
            raise RuntimeError(
                "No default coach configuration found. "
                "Add 'default' to train_coaches.json or "
                "set DEFAULT_CLASSES_JSON in .env."
            )

        config["default"] = json.loads(default_json)

    return config


def get_classes(train_no, config):
    classes = config.get(train_no, config["default"])

    if not isinstance(classes, list) or not classes:
        raise ValueError(
            f"Missing coach configuration for train {train_no}"
        )

    seen_codes = set()

    for item in classes:
        if not isinstance(item, dict):
            raise ValueError("Each class must be a JSON object.")

        code = item.get("classCode")
        coaches = item.get("coaches")

        if not isinstance(code, str) or not code.strip():
            raise ValueError(
                f"Invalid classCode for train {train_no}"
            )

        if code in seen_codes:
            raise ValueError(
                f"Duplicate classCode {code} for train {train_no}"
            )

        if type(coaches) is not int or coaches < 1:
            raise ValueError(
                f"Invalid coach count for train {train_no}, class {code}"
            )

        seen_codes.add(code)

    return classes


# --------------------------------------------------
# 5. CREATE JOURNEY USING BEARER TOKEN
# --------------------------------------------------

def create_journey(session, train, target_date, config):
    train_no = train["trainNo"]
    classes = get_classes(train_no, config)

    payload = {
        "trainNo": train_no,
        "fromDate": target_date.isoformat(),
        "toDate": target_date.isoformat(),
        "classes": classes
    }

    log.info(
        "Processing train %s (%s) for %s",
        train_no,
        train["trainName"],
        target_date.isoformat()
    )

    response = session.post(
        API_URL,
        json=payload,
        timeout=(5, 30)
    )

    if response.ok:
        log.info(
            "SUCCESS | Train %s | HTTP %s | %s",
            train_no,
            response.status_code,
            response.text[:500]
        )
        return True

    log.error(
        "FAILED | Train %s | HTTP %s | %s",
        train_no,
        response.status_code,
        response.text[:1000]
    )

    return False


# --------------------------------------------------
# 6. MAIN AUTOMATION
# --------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Automate train journey creation."
    )

    parser.add_argument(
        "--date",
        choices=["today", "tomorrow"],
        help="Select today or tomorrow. Omit for interactive selection."
    )

    args = parser.parse_args()

    validate_config()

    target_date = get_target_date(args.date)
    log.info("Starting automation for %s", target_date)

    # Authenticate before processing trains.
    token = authenticate()

    # Load train data and coach settings.
    config = load_coach_config()
    trains = fetch_trains()

    if not trains:
        log.warning("No trains found. Nothing to process.")
        return

    success = 0
    failed = 0

    # All journey requests use the Bearer token.
    with requests.Session() as session:
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        for index, train in enumerate(trains, start=1):
            log.info(
                "Progress: %d/%d",
                index,
                len(trains)
            )

            try:
                result = create_journey(
                    session,
                    train,
                    target_date,
                    config
                )

                if result:
                    success += 1
                else:
                    failed += 1

            except requests.RequestException as exc:
                failed += 1
                log.error(
                    "Request error for train %s: %s",
                    train["trainNo"],
                    exc
                )

            except (ValueError, TypeError, KeyError) as exc:
                failed += 1
                log.error(
                    "Data/configuration error for train %s: %s",
                    train["trainNo"],
                    exc
                )

    log.info(
        "COMPLETED | Date=%s | Total=%d | Success=%d | Failed=%d",
        target_date,
        len(trains),
        success,
        failed
    )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log.exception("Automation terminated.")
        raise
