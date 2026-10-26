
import argparse
import csv
import time
import threading
from collections import defaultdict
from concurrent.futures import (
    ThreadPoolExecutor,
    wait,
    FIRST_COMPLETED,
)
from datetime import datetime, timezone
from itertools import cycle

import requests

BASE_URL = "http://localhost:8080/api/v1/trains"
TRAINS = ["12723", "12724"]

CSV_FILE = "stress_results.csv"
SUMMARY_FILE = "stress_summary.csv"

thread_local = threading.local()


def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session


def test_train(train_id, timeout):
    url = f"{BASE_URL}/{train_id}/schedule"
    started = time.perf_counter()
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        response = get_session().get(url, timeout=timeout)
        elapsed = time.perf_counter() - started

        return {
            "timestamp": timestamp,
            "train": train_id,
            "status": response.status_code,
            "latency_ms": round(elapsed * 1000, 2),
            "success": 200 <= response.status_code < 300,
            "error": "",
        }

    except requests.RequestException as exc:
        elapsed = time.perf_counter() - started

        return {
            "timestamp": timestamp,
            "train": train_id,
            "status": "",
            "latency_ms": round(elapsed * 1000, 2),
            "success": False,
            "error": str(exc)[:300],
        }


def percentile(values, p):
    if not values:
        return 0.0

    values = sorted(values)
    index = max(0, int((p / 100) * len(values) + 0.999999) - 1)
    return values[min(index, len(values) - 1)]


def main():
    parser = argparse.ArgumentParser(
        description="Concurrent train schedule API load test"
    )
    parser.add_argument("--workers", type=int, default=50)
    parser.add_argument("--duration", type=int, default=60)
    parser.add_argument("--timeout", type=float, default=10)
    args = parser.parse_args()

    if not 1 <= args.workers <= 200:
        parser.error("Workers must be between 1 and 200.")
    if not 1 <= args.duration <= 3600:
        parser.error("Duration must be between 1 and 3600 seconds.")
    if not 0.1 <= args.timeout <= 120:
        parser.error("Timeout must be between 0.1 and 120 seconds.")

    print("TRAIN API LOAD TEST")
    print(f"Base URL: {BASE_URL}")
    print(f"Trains: {', '.join(TRAINS)}")
    print(f"Workers: {args.workers}")
    print(f"Duration: {args.duration} seconds")
    print("Press Ctrl+C to stop early.\n")

    # Verify the local API is reachable before applying load.
    try:
        r = requests.get(
            f"{BASE_URL}/{TRAINS[0]}/schedule",
            timeout=args.timeout,
        )
        print(f"Preflight: train {TRAINS[0]} returned HTTP {r.status_code}")
    except requests.RequestException as exc:
        print(f"Preflight failed: {exc}")
        print("Check that your local API is running.")
        return

    results = []
    counts = defaultdict(int)
    latencies = defaultdict(list)
    train_cycle = cycle(TRAINS)
    completed = 0
    interrupted = False
    started = time.perf_counter()
    deadline = started + args.duration

    fields = [
        "timestamp", "train", "status",
        "latency_ms", "success", "error"
    ]

    try:
        with open(CSV_FILE, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()

            with ThreadPoolExecutor(
                max_workers=args.workers
            ) as pool:
                pending = set()

                # Keep up to `workers` requests in flight.
                for _ in range(args.workers):
                    train = next(train_cycle)
                    pending.add(
                        pool.submit(test_train, train, args.timeout)
                    )

                while pending:
                    remaining = deadline - time.perf_counter()

                    if remaining > 0:
                        done, pending = wait(
                            pending,
                            timeout=remaining,
                            return_when=FIRST_COMPLETED,
                        )
                    else:
                        done = set()

                    # Once time expires, stop scheduling new requests.
                    for future in done:
                        result = future.result()
                        writer.writerow(result)
                        results.append(result)
                        completed += 1

                        train = result["train"]
                        counts[train] += 1
                        latencies[train].append(result["latency_ms"])

                        if completed % 100 == 0:
                            file.flush()
                            elapsed = time.perf_counter() - started
                            rps = completed / elapsed if elapsed else 0
                            print(
                                f"Completed: {completed} | "
                                f"Elapsed: {elapsed:.1f}s | "
                                f"Overall RPS: {rps:.1f}"
                            )

                    if time.perf_counter() >= deadline:
                        # Drain outstanding requests without adding more.
                        if pending:
                            done, pending = wait(
                                pending,
                                return_when=FIRST_COMPLETED,
                            )
                            for future in done:
                                result = future.result()
                                writer.writerow(result)
                                results.append(result)
                                completed += 1
                                counts[result["train"]] += 1
                                latencies[result["train"]].append(
                                    result["latency_ms"]
                                )
                        if pending:
                            continue
                        break

                    # Refill only the slots that completed.
                    for _ in range(len(done)):
                        train = next(train_cycle)
                        pending.add(
                            pool.submit(test_train, train, args.timeout)
                        )

    except KeyboardInterrupt:
        interrupted = True
        print("\nStop requested. Waiting for running requests to finish.")

    elapsed = time.perf_counter() - started

    # Calculate summary from recorded request results.
    with open(SUMMARY_FILE, "w", newline="", encoding="utf-8") as file:
        fields = [
            "train", "total", "success", "failure",
            "success_rate_pct", "avg_ms", "p95_ms", "p99_ms",
            "max_ms", "requests_per_sec",
        ]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()

        for train in TRAINS:
            rows = [r for r in results if r["train"] == train]
            times = [r["latency_ms"] for r in rows]
            successes = sum(r["success"] for r in rows)
            total = len(rows)

            writer.writerow({
                "train": train,
                "total": total,
                "success": successes,
                "failure": total - successes,
                "success_rate_pct": round(
                    successes / total * 100, 2
                ) if total else 0,
                "avg_ms": round(sum(times) / len(times), 2)
                    if times else 0,
                "p95_ms": percentile(times, 95),
                "p99_ms": percentile(times, 99),
                "max_ms": max(times) if times else 0,
                "requests_per_sec": round(
                    total / elapsed, 2
                ) if elapsed else 0,
            })

    print("\n========== FINAL RESULTS ==========")
    print(f"Elapsed: {elapsed:.2f} seconds")
    print(f"Total requests: {len(results)}")
    print(f"Overall throughput: {len(results) / elapsed:.2f} RPS")
    print(f"Request log: {CSV_FILE}")
    print(f"Summary: {SUMMARY_FILE}")

    for train in TRAINS:
        rows = [r for r in results if r["train"] == train]
        times = [r["latency_ms"] for r in rows]
        successes = sum(r["success"] for r in rows)
        total = len(rows)

        print(f"\nTrain {train}")
        print(f"  Requests: {total}")
        print(f"  Successful: {successes}")
        print(f"  Failed: {total - successes}")
        print(
            f"  Success rate: "
            f"{successes / total * 100:.2f}%"
            if total else "  Success rate: N/A"
        )
        print(
            f"  Average latency: {sum(times) / len(times):.2f} ms"
            if times else "  Average latency: N/A"
        )
        print(f"  P95 latency: {percentile(times, 95):.2f} ms")
        print(f"  P99 latency: {percentile(times, 99):.2f} ms")

    if interrupted:
        print("\nTest stopped early.")


if __name__ == "__main__":
    main()
