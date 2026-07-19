"""
merge_internship_csvs.py — Merge 6 internships_rows*.csv files into one clean file.

Usage:
  python scripts/merge_internship_csvs.py

Expected input:  data/internships_rows*.csv  (6 files, 553 unique rows total)
Output:          data/internships_merged.csv

The merge validates JSON columns (required_skills, nice_to_have_skills) during
the merge pass — better to fail here than at embed time.
"""

import csv
import glob
import json
import sys
from pathlib import Path

INPUT_GLOB = "data/internships_rows*.csv"
OUTPUT_PATH = "data/internships_merged.csv"

FIELDS = [
    "id", "title", "company", "description", "required_skills",
    "nice_to_have_skills", "location", "mode", "duration", "stipend",
    "eligibility", "openings", "apply_link", "is_active", "category",
    "domain", "application_count", "view_count", "posted_by",
    "created_at", "updated_at",
]


def main() -> None:
    input_files = sorted(glob.glob(INPUT_GLOB))
    if not input_files:
        print(f"ERROR: No CSV files found matching: {INPUT_GLOB}")
        print("Move your 6 CSV exports to the data/ directory first:")
        print("  mkdir -p data && mv internships_rows*.csv data/")
        sys.exit(1)

    print(f"Found {len(input_files)} input files:")
    for f in input_files:
        print(f"  {f}")

    seen_ids: set[str] = set()
    rows: list[dict] = []
    json_errors: list[str] = []

    for path in input_files:
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 1):
                row_id = row.get("id", "").strip()
                if not row_id:
                    print(f"WARNING: Row {i} in {path} has no id — skipping")
                    continue
                if row_id in seen_ids:
                    continue  # deduplicate (shouldn't happen but be defensive)
                seen_ids.add(row_id)

                # Validate JSON columns now, not at embed time
                for col in ("required_skills", "nice_to_have_skills", "domain"):
                    raw = row.get(col, "[]")
                    try:
                        json.loads(raw)
                    except json.JSONDecodeError as exc:
                        json_errors.append(
                            f"{path} row {i} col {col!r}: {exc} (value={raw[:60]!r})"
                        )

                rows.append(row)

    if json_errors:
        print(f"\nWARNING: {len(json_errors)} JSON parse errors found:")
        for err in json_errors[:10]:
            print(f"  {err}")
        if len(json_errors) > 10:
            print(f"  ... and {len(json_errors) - 10} more")
        print("These rows are still included but may cause embed errors.\n")

    Path("data").mkdir(exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nMerged {len(rows)} unique internships → {OUTPUT_PATH}")
    print("Next step: python scripts/embed_all_internships.py")


if __name__ == "__main__":
    main()
