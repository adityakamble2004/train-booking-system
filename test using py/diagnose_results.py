
import csv
from collections import Counter
from pathlib import Path

path = Path("stress_results.csv")
counts = Counter()
examples = {}

with path.open(encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        if row["success"].strip().lower() == "true":
            continue

        status = row.get("status", "").strip()
        error = row.get("error", "").strip()

        if status:
            reason = f"HTTP {status}"
        else:
            reason = error or "Unknown connection error"

        counts[reason] += 1
        examples.setdefault(reason, row.get("train_no", "?"))

print("Failure breakdown:")
for reason, count in counts.most_common():
    print(f"{count:6}  {reason} (example train: {examples[reason]})")
