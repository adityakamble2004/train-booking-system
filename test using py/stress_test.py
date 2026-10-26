
import time
import threading
import requests
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from statistics import mean

URL = "http://localhost:8080/api/v1/trains/01488/schedule"

lock = threading.Lock()
results = []
status_counts = Counter()


def make_request(timeout):
    start = time.perf_counter()

    try:
        response = requests.get(URL, timeout=timeout)
        elapsed = time.perf_counter() - start

        result = {
            "status": response.status_code,
            "time": elapsed,
            "error": None,
        }

    except requests.RequestException as exc:
        elapsed = time.perf_counter() - start
        result = {
            "status": None,
            "time": elapsed,
            "error": str(exc),
        }

    with lock:
        results.append(result)
        status_counts[
            result["status"] if result["status"] is not None
            else "ERROR"
        ] += 1

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Stress test a local train schedule API"
    )
    parser.add_argument("--requests", type=int, default=500)
    parser.add_argument("--workers", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=10)
    args = parser.parse_args()

    if args.requests < 1 or args.workers < 1 or args.timeout <= 0:
        parser.error("Requests, workers, and timeout must be positive.")

    print(f"Target: {URL}")
    print(f"Total requests: {args.requests}")
    print(f"Concurrent workers: {args.workers}")
    print("Starting test...\n")

    start = time.perf_counter()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [
            executor.submit(make_request, args.timeout)
            for _ in range(args.requests)
        ]

        for future in as_completed(futures):
            future.result()

    duration = time.perf_counter() - start

    latencies = sorted(r["time"] for r in results)
    successes = sum(
        r["status"] is not None and 200 <= r["status"] < 300
        for r in results
    )
    failures = len(results) - successes

    def percentile(values, p):
        if not values:
            return 0
        index = max(0, int((p / 100) * len(values) + 0.999999) - 1)
        return values[min(index, len(values) - 1)]

    print("========== STRESS TEST RESULTS ==========")
    print(f"Total completed: {len(results)}")
    print(f"Successful (2xx): {successes}")
    print(f"Non-2xx / request errors: {failures}")
    print(f"Elapsed time: {duration:.2f} seconds")
    print(f"Throughput: {len(results) / duration:.2f} requests/sec")

    if latencies:
        print(f"Average latency: {mean(latencies) * 1000:.2f} ms")
        print(f"Median latency: {percentile(latencies, 50) * 1000:.2f} ms")
        print(f"P95 latency: {percentile(latencies, 95) * 1000:.2f} ms")
        print(f"P99 latency: {percentile(latencies, 99) * 1000:.2f} ms")
        print(f"Max latency: {max(latencies) * 1000:.2f} ms")

    print("\nHTTP status counts:")
    for status, count in sorted(status_counts.items(), key=lambda x: str(x[0])):
        print(f"  {status}: {count}")

    print("=========================================")


if __name__ == "__main__":
    main()
