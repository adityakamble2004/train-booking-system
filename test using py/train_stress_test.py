
import ast
import csv
import re
import time
import threading
import argparse
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, deque

import requests

# ---------------- CONFIGURATION ----------------
FOLDER = Path(
    r"C:\Users\hp534\Desktop\trainbooking app\test using py"
)
TRAIN_FILE = FOLDER / "train_numbers"
RESULTS_FILE = FOLDER / "stress_results.csv"
SUMMARY_FILE = FOLDER / "stress_summary.csv"

BASE_URL = "http://localhost:8080/api/v1/trains"

# Conservative automatic safety limits
MAX_WORKERS = 100
MAX_DURATION_SECONDS = 300
MAX_REQUESTS = 20000
REQUEST_TIMEOUT = 10

# Stop if recent completed requests exceed these thresholds
FAILURE_WINDOW = 100
MAX_FAILURE_RATE = 0.20
MAX_P95_LATENCY_MS = 3000
# ------------------------------------------------

thread_local = threading.local()


def load_trains():
    if not TRAIN_FILE.exists():
        raise FileNotFoundError(f"Train file not found: {TRAIN_FILE}")

    content = TRAIN_FILE.read_text(encoding="utf-8-sig").strip()
    match = re.search(r"trains\s*=\s*(\[.*?\])", content, re.S)

    if match:
        content = match.group(1)

    try:
        parsed = ast.literal_eval(content)
        values = list(parsed) if isinstance(parsed, (list, tuple, set)) else [parsed]
    except (ValueError, SyntaxError):
        values = re.findall(r"\b\d+\b", content)

    trains = list(dict.fromkeys(
        str(v).strip() for v in values if str(v).strip().isdigit()
    ))

    if not trains:
        raise ValueError("No train numbers found in train_numbers.")

    return trains


def session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session


def test_train(train, timeout):
    started = time.perf_counter()
    timestamp = datetime.now().isoformat(timespec="seconds")

    try:
        response = session().get(
            f"{BASE_URL}/{train}/schedule",
            timeout=timeout,
        )
        latency = (time.perf_counter() - started) * 1000

        return {
            "timestamp": timestamp,
            "train": train,
            "status": response.status_code,
            "latency_ms": round(latency, 2),
            "success": 200 <= response.status_code < 300,
            "error": "",
        }
    except requests.RequestException as exc:
        latency = (time.perf_counter() - started) * 1000

        return {
            "timestamp": timestamp,
            "train": train,
            "status": "",
            "latency_ms": round(latency, 2),
            "success": False,
            "error": str(exc)[:300],
        }


def percentile(values, p):
    if not values:
        return 0.0
    values = sorted(values)
    return round(values[min(len(values) - 1, int((p / 100) * len(values)))], 2)


def main():
    parser = argparse.ArgumentParser(
        description="Staged train API load test with safety stops"
    )
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--max-workers", type=int, default=100)
    parser.add_argument("--duration", type=int, default=300)
    parser.add_argument("--max-requests", type=int, default=20000)
    parser.add_argument("--timeout", type=float, default=10)
    args = parser.parse_args()

    if not 1 <= args.workers <= args.max_workers <= MAX_WORKERS:
        parser.error(f"Require 1 <= workers <= max-workers <= {MAX_WORKERS}")
    if not 1 <= args.duration <= MAX_DURATION_SECONDS:
        parser.error(f"Duration must be 1-{MAX_DURATION_SECONDS} seconds")
    if not 1 <= args.max_requests <= MAX_REQUESTS:
        parser.error(f"max-requests must be 1-{MAX_REQUESTS}")
    if not 0.1 <= args.timeout <= REQUEST_TIMEOUT:
        parser.error(f"Timeout must be 0.1-{REQUEST_TIMEOUT} seconds")

    FOLDER.mkdir(parents=True, exist_ok=True)
    trains = load_trains()

    # Confirm the API is reachable before applying load.
    try:
        response = requests.get(
            f"{BASE_URL}/{trains[0]}/schedule",
            timeout=args.timeout,
        )
        print(f"Preflight HTTP status: {response.status_code}")
    except requests.RequestException as exc:
        print(f"API is unreachable: {exc}")
        print("Start your local backend and try again.")
        return

    print(f"Loaded {len(trains)} unique train numbers.")
    print(f"Initial workers: {args.workers}")
    print(f"Maximum workers: {args.max_workers}")
    print(f"Duration limit: {args.duration}s")
    print(f"Request limit: {args.max_requests}")
    print("Press Ctrl+C to stop manually.\n")

    fields = [
        "timestamp", "train", "status", "latency_ms", "success", "error"
    ]
    recent = deque(maxlen=FAILURE_WINDOW)
    all_results = []
    stop_reason = "Test limits reached"
    started = time.monotonic()
    deadline = started + args.duration
    completed = 0
    next_train = 0
    workers = args.workers
    next_scale = started + 15
    interrupted = False

    try:
        with RESULTS_FILE.open(
            "w", newline="", encoding="utf-8-sig"
        ) as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()

            with ThreadPoolExecutor(max_workers=args.max_workers) as pool:
                pending = {}

                def submit_one():
                    nonlocal next_train
                    train = trains[next_train % len(trains)]
                    next_train += 1
                    future = pool.submit(test_train, train, args.timeout)
                    pending[future] = train

                # Start with a limited number of concurrent requests.
                for _ in range(workers):
                    if completed + len(pending) < args.max_requests:
                        submit_one()

                while pending:
                    now = time.monotonic()

                    if now >= deadline or completed >= args.max_requests:
                        stop_reason = "Duration/request limit reached"
                        break

                    done = set()
                    for future in as_completed(
                        list(pending), timeout=None
                    ):
                        done.add(future)
                        break

                    for future in done:
                        pending.pop(future, None)
                        result = future.result()
                        writer.writerow(result)
                        file.flush()

                        all_results.append(result)
                        recent.append(result)
                        completed += 1

                    now = time.monotonic()

                    if completed % 100 == 0:
                        elapsed = now - started
                        print(
                            f"Completed {completed} | "
                            f"Workers {workers} | "
                            f"RPS {completed / max(elapsed, 0.001):.1f}"
                        )

                    # Detect sustained problems from the most recent requests.
                    if len(recent) == FAILURE_WINDOW:
                        failure_rate = sum(
                            not r["success"] for r in recent
                        ) / len(recent)
                        recent_p95 = percentile(
                            [r["latency_ms"] for r in recent], 95
                        )

                        if failure_rate >= MAX_FAILURE_RATE:
                            stop_reason = (
                                f"Safety stop: recent failure rate "
                                f"{failure_rate:.0%}"
                            )
                            break

                        if recent_p95 >= MAX_P95_LATENCY_MS:
                            stop_reason = (
                                f"Safety stop: recent P95 latency "
                                f"{recent_p95} ms"
                            )
                            break

                    # Scale up gradually, not all at once.
                    if now >= next_scale and workers < args.max_workers:
                        workers = min(workers + 10, args.max_workers)
                        next_scale = now + 15
                        print(f"Increasing concurrency to {workers}")

                    # Maintain the active request count.
                    while (
                        len(pending) < workers
                        and completed + len(pending) < args.max_requests
                        and time.monotonic() < deadline
                    ):
                        submit_one()

                # Cancel requests that have not started.
                for future in pending:
                    future.cancel()

                file.flush()

    except KeyboardInterrupt:
        interrupted = True
        stop_reason = "Manually interrupted"

    # Calculate and save summary from recorded requests.
    elapsed = time.monotonic() - started
    grouped = {}

    for result in all_results:
        grouped.setdefault(result["train"], []).append(result)

    with SUMMARY_FILE.open(
        "w", newline="", encoding="utf-8-sig"
    ) as file:
        summary_fields = [
            "train", "total", "success", "failure",
            "success_rate_pct", "avg_ms", "p95_ms", "p99_ms", "max_ms"
        ]
        writer = csv.DictWriter(file, fieldnames=summary_fields)
        writer.writeheader()

        for train, rows in grouped.items():
            latencies = [r["latency_ms"] for r in rows]
            success_count = sum(r["success"] for r in rows)

            writer.writerow({
                "train": train,
                "total": len(rows),
                "success": success_count,
                "failure": len(rows) - success_count,
                "success_rate_pct": round(
                    100 * success_count / len(rows), 2
                ),
                "avg_ms": round(sum(latencies) / len(latencies), 2),
                "p95_ms": percentile(latencies, 95),
                "p99_ms": percentile(latencies, 99),
                "max_ms": max(latencies),
            })

    success_count = sum(r["success"] for r in all_results)

    print("\n========== FINAL REPORT ==========")
    print(f"Stop reason: {stop_reason}")
    print(f"Completed: {len(all_results)}")
    print(f"Successful 2xx: {success_count}")
    print(f"Failed/non-2xx: {len(all_results) - success_count}")
    print(f"Elapsed: {elapsed:.2f}s")
    print(f"Throughput: {len(all_results) / max(elapsed, 0.001):.2f} RPS")
    print(f"Detailed results: {RESULTS_FILE}")
    print(f"Per-train summary: {SUMMARY_FILE}")

    if interrupted:
        print("Test was manually interrupted.")


if __name__ == "__main__":
    main()
