
import csv
import os
import time
import threading
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict, deque
from concurrent.futures import (
    ThreadPoolExecutor,
    wait,
    FIRST_COMPLETED,
)

import requests
import mysql.connector

# ================ CONFIGURATION =================

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": os.getenv("TRAIN_DB_PASSWORD", "root"),
    "database": "train_manager",
}

BASE_URL = "http://localhost:8080/api/v1/trains"

OUTPUT_DIR = Path(
    r"C:\Users\hp534\Desktop\trainbooking app\test using py"
)
RESULTS_FILE = OUTPUT_DIR / "stress_results.csv"
SUMMARY_FILE = OUTPUT_DIR / "stress_summary.csv"

# Safety limits
MAX_ALLOWED_WORKERS = 100
MAX_ALLOWED_DURATION = 300
MAX_ALLOWED_REQUESTS = 20000

# Stop on sustained server-side failures, not ordinary 404 responses.
FAILURE_WINDOW = 100
MAX_SERVER_FAILURE_RATE = 0.20
MAX_P95_LATENCY_MS = 3000

thread_local = threading.local()

# =================================================


def load_trains_from_database():
    """Load train numbers once, before the load test begins."""

    connection = mysql.connector.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT train_no
            FROM train_manager.train_master_txt
            WHERE train_no IS NOT NULL
        """)

        # Preserve train numbers as strings, including leading zeroes.
        trains = list(dict.fromkeys(
            str(row[0]).strip()
            for row in cursor.fetchall()
            if row[0] is not None and str(row[0]).strip()
        ))

        cursor.close()
        return trains

    finally:
        connection.close()


def get_session():
    """Use a separate HTTP session per worker thread."""

    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()

    return thread_local.session


def test_train(train_no, timeout):
    """Make one schedule API request and record its result."""

    started = time.perf_counter()
    timestamp = datetime.now().isoformat(timespec="seconds")
    url = f"{BASE_URL}/{train_no}/schedule"

    try:
        response = get_session().get(url, timeout=timeout)
        elapsed_ms = (time.perf_counter() - started) * 1000

        return {
            "timestamp": timestamp,
            "train_no": train_no,
            "status": response.status_code,
            "latency_ms": round(elapsed_ms, 2),
            "success": 200 <= response.status_code < 300,
            "server_failure": response.status_code >= 500,
            "error": "",
        }

    except requests.RequestException as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000

        return {
            "timestamp": timestamp,
            "train_no": train_no,
            "status": "",
            "latency_ms": round(elapsed_ms, 2),
            "success": False,
            "server_failure": True,
            "error": str(exc)[:300],
        }


def percentile(values, p):
    if not values:
        return 0.0

    values = sorted(values)
    index = min(
        len(values) - 1,
        max(0, int((p / 100) * len(values) + 0.999999) - 1),
    )
    return round(values[index], 2)


def main():
    parser = argparse.ArgumentParser(
        description="MySQL-backed train schedule API load test"
    )

    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--max-workers", type=int, default=100)
    parser.add_argument("--duration", type=int, default=300)
    parser.add_argument("--max-requests", type=int, default=20000)
    parser.add_argument("--timeout", type=float, default=10)

    args = parser.parse_args()

    if not 1 <= args.workers <= args.max_workers <= MAX_ALLOWED_WORKERS:
        parser.error(
            f"Workers must satisfy 1 <= workers <= max-workers "
            f"<= {MAX_ALLOWED_WORKERS}"
        )

    if not 1 <= args.duration <= MAX_ALLOWED_DURATION:
        parser.error(f"Duration must be 1-{MAX_ALLOWED_DURATION} seconds")

    if not 1 <= args.max_requests <= MAX_ALLOWED_REQUESTS:
        parser.error(
            f"Maximum requests must be 1-{MAX_ALLOWED_REQUESTS}"
        )

    if not 0.1 <= args.timeout <= 30:
        parser.error("Timeout must be between 0.1 and 30 seconds")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load the complete train list before generating API traffic.
    try:
        trains = load_trains_from_database()
    except mysql.connector.Error as exc:
        print(f"MySQL connection/query failed: {exc}")
        return

    if not trains:
        print("No train numbers found in train_master_txt.")
        return

    print(f"Database: {DB_CONFIG['database']}")
    print(f"Trains loaded: {len(trains)}")
    print(f"Initial workers: {args.workers}")
    print(f"Maximum workers: {args.max_workers}")
    print(f"Duration limit: {args.duration}s")
    print(f"Request limit: {args.max_requests}")

    # Confirm that the schedule API is reachable.
    try:
        response = requests.get(
            f"{BASE_URL}/{trains[0]}/schedule",
            timeout=args.timeout,
        )
        print(f"API preflight HTTP status: {response.status_code}")
    except requests.RequestException as exc:
        print(f"API preflight failed: {exc}")
        print("Check that your backend is running.")
        return

    print("\nStarting staged load test. Press Ctrl+C to stop.\n")

    fields = [
        "timestamp",
        "train_no",
        "status",
        "latency_ms",
        "success",
        "server_failure",
        "error",
    ]

    results = []
    recent = deque(maxlen=FAILURE_WINDOW)

    started = time.monotonic()
    deadline = started + args.duration
    completed = 0
    next_train = 0
    workers = args.workers
    next_scale = started + 15
    stop_reason = "Configured limit reached"

    try:
        with RESULTS_FILE.open(
            "w", newline="", encoding="utf-8-sig"
        ) as output:
            writer = csv.DictWriter(output, fieldnames=fields)
            writer.writeheader()
            output.flush()

            with ThreadPoolExecutor(
                max_workers=args.max_workers
            ) as executor:

                pending = {}

                def submit_request():
                    nonlocal next_train

                    train_no = trains[next_train % len(trains)]
                    next_train += 1

                    future = executor.submit(
                        test_train, train_no, args.timeout
                    )
                    pending[future] = train_no

                def record_result(result):
                    nonlocal completed

                    writer.writerow(result)
                    output.flush()

                    results.append(result)
                    recent.append(result)
                    completed += 1

                    if completed % 100 == 0:
                        elapsed = time.monotonic() - started
                        print(
                            f"Completed {completed} | "
                            f"Workers {workers} | "
                            f"RPS {completed / max(elapsed, 0.001):.1f}"
                        )

                # Fill the initial worker slots.
                for _ in range(workers):
                    if completed + len(pending) < args.max_requests:
                        submit_request()

                while pending:
                    now = time.monotonic()

                    if now >= deadline:
                        stop_reason = "Duration limit reached"
                        break

                    if completed >= args.max_requests:
                        stop_reason = "Request limit reached"
                        break

                    done, _ = wait(
                        pending,
                        timeout=min(1.0, max(0, deadline - now)),
                        return_when=FIRST_COMPLETED,
                    )

                    for future in done:
                        pending.pop(future, None)

                        try:
                            result = future.result()
                        except Exception as exc:
                            result = {
                                "timestamp": datetime.now().isoformat(),
                                "train_no": "",
                                "status": "",
                                "latency_ms": 0,
                                "success": False,
                                "server_failure": True,
                                "error": str(exc)[:300],
                            }

                        record_result(result)

                    if not done:
                        continue

                    # Safety checks use the most recent 100 requests.
                    if len(recent) == FAILURE_WINDOW:
                        server_failure_rate = sum(
                            r["server_failure"] for r in recent
                        ) / len(recent)

                        p95 = percentile(
                            [r["latency_ms"] for r in recent], 95
                        )

                        if server_failure_rate >= MAX_SERVER_FAILURE_RATE:
                            stop_reason = (
                                "Safety stop: server/connection failures "
                                f"reached {server_failure_rate:.0%}"
                            )
                            break

                        if p95 >= MAX_P95_LATENCY_MS:
                            stop_reason = (
                                f"Safety stop: recent P95 latency "
                                f"reached {p95} ms"
                            )
                            break

                    now = time.monotonic()

                    # Increase active concurrency gradually.
                    if now >= next_scale and workers < args.max_workers:
                        workers = min(workers + 10, args.max_workers)
                        next_scale = now + 15
                        print(f"Increasing active workers to {workers}")

                    # Refill active request slots.
                    while (
                        len(pending) < workers
                        and completed + len(pending) < args.max_requests
                        and time.monotonic() < deadline
                    ):
                        submit_request()

                # Cancel tasks that haven't started; running requests
                # finish or time out before the executor closes.
                for future in pending:
                    future.cancel()

    except KeyboardInterrupt:
        stop_reason = "Manually interrupted"
        print("\nStop requested. Finishing in-flight requests...")

    elapsed = time.monotonic() - started

    # Summarize each train number.
    grouped = defaultdict(list)
    for result in results:
        if result["train_no"]:
            grouped[result["train_no"]].append(result)

    with SUMMARY_FILE.open(
        "w", newline="", encoding="utf-8-sig"
    ) as output:
        summary_fields = [
            "train_no",
            "total",
            "success",
            "failure",
            "http_4xx",
            "http_5xx",
            "success_rate_pct",
            "avg_ms",
            "p95_ms",
            "p99_ms",
            "max_ms",
        ]

        writer = csv.DictWriter(output, fieldnames=summary_fields)
        writer.writeheader()

        for train_no, rows in grouped.items():
            latencies = [r["latency_ms"] for r in rows]
            successes = sum(r["success"] for r in rows)

            writer.writerow({
                "train_no": train_no,
                "total": len(rows),
                "success": successes,
                "failure": len(rows) - successes,
                "http_4xx": sum(
                    str(r["status"]).startswith("4") for r in rows
                ),
                "http_5xx": sum(
                    str(r["status"]).startswith("5") for r in rows
                ),
                "success_rate_pct": round(
                    100 * successes / len(rows), 2
                ),
                "avg_ms": round(sum(latencies) / len(latencies), 2),
                "p95_ms": percentile(latencies, 95),
                "p99_ms": percentile(latencies, 99),
                "max_ms": max(latencies),
            })

    successes = sum(r["success"] for r in results)
    failures = len(results) - successes

    print("\n========== FINAL REPORT ==========")
    print(f"Stop reason: {stop_reason}")
    print(f"Unique trains loaded: {len(trains)}")
    print(f"Completed requests: {len(results)}")
    print(f"Successful (2xx): {successes}")
    print(f"Non-2xx / errors: {failures}")
    print(f"Elapsed time: {elapsed:.2f}s")
    print(f"Throughput: {len(results) / max(elapsed, 0.001):.2f} RPS")
    print(f"Detailed results: {RESULTS_FILE}")
    print(f"Per-train summary: {SUMMARY_FILE}")


if __name__ == "__main__":
    main()
