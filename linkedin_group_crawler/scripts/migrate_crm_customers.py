"""Create crm_customers from deal-centric customer_leads.

Usage:
  python scripts/migrate_crm_customers.py --dry-run --output scratch/crm_customer_dry_run.json
  python scripts/migrate_crm_customers.py --apply --batch-key staging-2026-08-28-01
  python scripts/migrate_crm_customers.py --rollback-batch staging-2026-08-28-01

Safety:
  - Default mode is --dry-run.
  - Do not run against production before the staging duplicate report is
    reviewed and the final unique policy is approved.
  - Rollback is batch-based and uses crm_customer_migration_map as the source
    of truth.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local", override=True)

from app.core.phone import vn_phone_to_e164  # noqa: E402
from app.core.supabase_client import execute_supabase_query, get_supabase_client  # noqa: E402

CONTACT_FIELDS = (
    "id, customer_name, company_name, position, phone, email, zalo, facebook, "
    "telegram, website, tax_code, address, city, industry, source_platform, "
    "status, leaded_by, sdr_id, note, created_at, updated_at, customer_id"
)

CUSTOMER_COLUMNS = (
    "customer_name",
    "company_name",
    "position",
    "phone",
    "phone_normalized",
    "email",
    "email_normalized",
    "zalo",
    "facebook",
    "telegram",
    "website",
    "tax_code",
    "address",
    "city",
    "industry",
    "source",
    "status",
    "owner_id",
    "created_by",
    "note",
)


def now_key() -> str:
    return datetime.now(timezone.utc).strftime("crm-customers-%Y%m%dT%H%M%SZ")


def clean_text(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def normalize_email(value: Any) -> str | None:
    text = clean_text(value)
    return text.lower() if text else None


def normalize_phone(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    return vn_phone_to_e164(text)


def normalize_compare(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def has_clear_identity_conflict(rows: list[dict[str, Any]]) -> bool:
    names = {normalize_compare(row.get("customer_name")) for row in rows if normalize_compare(row.get("customer_name"))}
    companies = {normalize_compare(row.get("company_name")) for row in rows if normalize_compare(row.get("company_name"))}
    return len(names) > 1 and len(companies) > 1


def customer_status_from_deals(rows: list[dict[str, Any]]) -> str:
    statuses = {str(row.get("status") or "").strip().lower() for row in rows}
    if "closed" in statuses:
        return "current_customer"
    if "rejected" in statuses and len(statuses) == 1:
        return "not_fit"
    return "following" if len(rows) > 1 else "new_lead"


def pick_primary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    def score(row: dict[str, Any]) -> tuple[int, str]:
        filled = sum(1 for key in ("email", "phone", "company_name", "tax_code", "address", "website") if clean_text(row.get(key)))
        return filled, str(row.get("updated_at") or row.get("created_at") or "")

    return sorted(rows, key=score, reverse=True)[0]


def build_customer(primary: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    email_normalized = normalize_email(primary.get("email"))
    phone_normalized = normalize_phone(primary.get("phone"))
    owner_id = clean_text(primary.get("leaded_by")) or clean_text(primary.get("sdr_id"))
    return {
        "customer_name": clean_text(primary.get("customer_name")) or "Khach hang chua ten",
        "company_name": clean_text(primary.get("company_name")),
        "position": clean_text(primary.get("position")),
        "phone": clean_text(primary.get("phone")),
        "phone_normalized": phone_normalized,
        "email": clean_text(primary.get("email")),
        "email_normalized": email_normalized,
        "zalo": clean_text(primary.get("zalo")),
        "facebook": clean_text(primary.get("facebook")),
        "telegram": clean_text(primary.get("telegram")),
        "website": clean_text(primary.get("website")),
        "tax_code": clean_text(primary.get("tax_code")),
        "address": clean_text(primary.get("address")),
        "city": clean_text(primary.get("city")),
        "industry": clean_text(primary.get("industry")),
        "source": clean_text(primary.get("source_platform")),
        "status": customer_status_from_deals(rows),
        "owner_id": owner_id,
        "created_by": owner_id,
        "note": clean_text(primary.get("note")),
    }


def fetch_all_deals() -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    rows: list[dict[str, Any]] = []
    page_size = 1000
    start = 0
    while True:
        end = start + page_size - 1
        result = execute_supabase_query(
            lambda: supabase.table("customer_leads")
            .select(CONTACT_FIELDS)
            .order("created_at")
            .range(start, end)
            .execute()
        )
        chunk = result.data or []
        rows.extend(chunk)
        if len(chunk) < page_size:
            break
        start += page_size
    return rows


def make_plan(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    remaining = [row for row in rows if not row.get("customer_id")]
    planned: list[dict[str, Any]] = []

    by_email: dict[str, list[dict[str, Any]]] = defaultdict(list)
    no_email: list[dict[str, Any]] = []
    for row in remaining:
        email = normalize_email(row.get("email"))
        if email:
            by_email[email].append(row)
        else:
            no_email.append(row)

    consumed: set[str] = set()
    for email, group in by_email.items():
        ids = {row["id"] for row in group}
        consumed.update(ids)
        if has_clear_identity_conflict(group):
            planned.append({
                "match_type": "email",
                "action": "review_required",
                "match_key": email,
                "deal_ids": sorted(ids),
                "review_reason": "same_email_different_customer_or_company",
            })
            continue
        planned.append({
            "match_type": "email",
            "action": "created_customer",
            "match_key": email,
            "deal_ids": sorted(ids),
            "customer": build_customer(pick_primary(group), group),
        })

    by_phone: dict[str, list[dict[str, Any]]] = defaultdict(list)
    no_contact: list[dict[str, Any]] = []
    for row in no_email:
        phone = normalize_phone(row.get("phone"))
        if phone:
            by_phone[phone].append(row)
        else:
            no_contact.append(row)

    for phone, group in by_phone.items():
        ids = {row["id"] for row in group if row["id"] not in consumed}
        if not ids:
            continue
        group = [row for row in group if row["id"] in ids]
        consumed.update(ids)
        if has_clear_identity_conflict(group):
            planned.append({
                "match_type": "phone",
                "action": "review_required",
                "match_key": phone,
                "deal_ids": sorted(ids),
                "review_reason": "same_phone_different_customer_or_company",
            })
            continue
        planned.append({
            "match_type": "phone",
            "action": "created_customer",
            "match_key": phone,
            "deal_ids": sorted(ids),
            "customer": build_customer(pick_primary(group), group),
        })

    for row in no_contact:
        if row["id"] in consumed:
            continue
        planned.append({
            "match_type": "empty_contact",
            "action": "kept_separate",
            "match_key": None,
            "deal_ids": [row["id"]],
            "customer": build_customer(row, [row]),
            "review_reason": "missing_email_and_phone",
        })

    report = summarize(planned, len(rows), len(remaining))
    return planned, report


def summarize(planned: list[dict[str, Any]], total_rows: int, unmigrated_rows: int) -> dict[str, Any]:
    created_customers = sum(1 for item in planned if item["action"] in ("created_customer", "kept_separate"))
    linked_deals = sum(len(item["deal_ids"]) for item in planned if item["action"] in ("created_customer", "kept_separate"))
    review_deals = sum(len(item["deal_ids"]) for item in planned if item["action"] == "review_required")
    kept_separate = sum(1 for item in planned if item["action"] == "kept_separate")
    grouped_deals = sum(max(0, len(item["deal_ids"]) - 1) for item in planned if item["action"] == "created_customer")
    return {
        "total_customer_leads": total_rows,
        "unmigrated_customer_leads": unmigrated_rows,
        "customers_to_create": created_customers,
        "deals_to_link": linked_deals,
        "deals_grouped": grouped_deals,
        "review_cases": len([item for item in planned if item["action"] == "review_required"]),
        "review_deals": review_deals,
        "kept_separate_records": kept_separate,
        "unique_policy": "defer_until_staging_report_is_reviewed",
    }


def write_json(path: str | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if path:
        output = Path(path)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
    print(text)


def create_batch(batch_key: str, mode: str, report: dict[str, Any]) -> str:
    supabase = get_supabase_client()
    result = execute_supabase_query(
        lambda: supabase.table("crm_customer_migration_batches").insert({
            "batch_key": batch_key,
            "mode": mode,
            "status": "running",
            "report": report,
        }).execute()
    )
    return result.data[0]["id"]


def complete_batch(batch_id: str, report: dict[str, Any], status: str = "completed") -> None:
    supabase = get_supabase_client()
    execute_supabase_query(
        lambda: supabase.table("crm_customer_migration_batches")
        .update({"status": status, "report": report})
        .eq("id", batch_id)
        .execute()
    )


def apply_plan(planned: list[dict[str, Any]], report: dict[str, Any], batch_key: str) -> dict[str, Any]:
    supabase = get_supabase_client()
    batch_id = create_batch(batch_key, "migrate", report)

    rows_by_id = {row["id"]: row for row in fetch_all_deals()}
    created_customer_ids: list[str] = []
    try:
        for item in planned:
            if item["action"] == "review_required":
                for deal_id in item["deal_ids"]:
                    execute_supabase_query(lambda deal_id=deal_id, item=item: supabase.table("crm_customer_migration_map").insert({
                        "batch_id": batch_id,
                        "deal_id": deal_id,
                        "match_type": item["match_type"],
                        "action": "review_required",
                        "match_key": item.get("match_key"),
                        "review_reason": item.get("review_reason"),
                        "source_snapshot": rows_by_id.get(deal_id, {}),
                    }).execute())
                continue

            customer_payload = {key: item["customer"].get(key) for key in CUSTOMER_COLUMNS}
            customer_payload = {key: value for key, value in customer_payload.items() if value is not None}
            customer_result = execute_supabase_query(
                lambda customer_payload=customer_payload: supabase.table("crm_customers").insert(customer_payload).execute()
            )
            customer_id = customer_result.data[0]["id"]
            created_customer_ids.append(customer_id)

            for deal_id in item["deal_ids"]:
                execute_supabase_query(
                    lambda deal_id=deal_id, customer_id=customer_id: supabase.table("customer_leads")
                    .update({"customer_id": customer_id})
                    .eq("id", deal_id)
                    .execute()
                )
                execute_supabase_query(lambda deal_id=deal_id, customer_id=customer_id, item=item: supabase.table("crm_customer_migration_map").insert({
                    "batch_id": batch_id,
                    "deal_id": deal_id,
                    "customer_id": customer_id,
                    "match_type": item["match_type"],
                    "action": "created_customer" if item["action"] == "created_customer" else "kept_separate",
                    "match_key": item.get("match_key"),
                    "review_reason": item.get("review_reason"),
                    "source_snapshot": rows_by_id.get(deal_id, {}),
                }).execute())

        report = {**report, "batch_key": batch_key, "batch_id": batch_id, "created_customer_ids": created_customer_ids}
        complete_batch(batch_id, report)
        return report
    except Exception as exc:
        complete_batch(batch_id, {**report, "error": str(exc)}, status="failed")
        raise


def rollback_batch(batch_key: str) -> dict[str, Any]:
    supabase = get_supabase_client()
    batch_res = execute_supabase_query(
        lambda: supabase.table("crm_customer_migration_batches")
        .select("*")
        .eq("batch_key", batch_key)
        .single()
        .execute()
    )
    batch = batch_res.data
    if not batch:
        raise SystemExit(f"Batch not found: {batch_key}")

    map_res = execute_supabase_query(
        lambda: supabase.table("crm_customer_migration_map")
        .select("*")
        .eq("batch_id", batch["id"])
        .execute()
    )
    mappings = map_res.data or []
    deal_ids = [row["deal_id"] for row in mappings if row.get("customer_id")]
    customer_ids = sorted({row["customer_id"] for row in mappings if row.get("action") in ("created_customer", "kept_separate") and row.get("customer_id")})

    for deal_id in deal_ids:
        execute_supabase_query(
            lambda deal_id=deal_id: supabase.table("customer_leads")
            .update({"customer_id": None})
            .eq("id", deal_id)
            .execute()
        )

    for customer_id in customer_ids:
        execute_supabase_query(
            lambda customer_id=customer_id: supabase.table("crm_customers").delete().eq("id", customer_id).execute()
        )

    report = {
        "batch_key": batch_key,
        "batch_id": batch["id"],
        "deals_unlinked": len(deal_ids),
        "customers_deleted": len(customer_ids),
    }
    complete_batch(batch["id"], {**(batch.get("report") or {}), "rollback": report}, status="rolled_back")
    return report


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--rollback-batch")
    parser.add_argument("--batch-key", default=None)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if args.rollback_batch:
        write_json(args.output, rollback_batch(args.rollback_batch))
        return

    rows = fetch_all_deals()
    planned, report = make_plan(rows)
    payload = {"report": report, "planned_actions": planned}

    if args.apply:
        batch_key = args.batch_key or now_key()
        applied = apply_plan(planned, report, batch_key)
        write_json(args.output, {"report": applied, "planned_actions": planned})
        return

    write_json(args.output, payload)


if __name__ == "__main__":
    main()
