"""Seed realistic demo data for the `crm_customers` feature (customer entity
distinct from deals) so a product owner can review the UI.

Usage:
  python scripts/seed_crm_demo_data.py                 # dry-run (default), prints plan only
  python scripts/seed_crm_demo_data.py --apply          # writes data via real HTTP API
  python scripts/seed_crm_demo_data.py --cleanup        # deletes everything from the manifest

Design notes:
  - ALL writes (customers, deals, quotes, contracts, the seed-actor account) go
    through the real FastAPI HTTP endpoints, exercising real validation/
    normalization/permission code paths — mirrors the constraint used by
    scripts/migrate_crm_customers.py's sibling scripts, but here direct
    Supabase access is reserved for read-only verification/lookups.
  - Idempotent: every demo customer has a stable, deterministic
    `customer_name` starting with `ZZZ-DEMO-CUSTOMER-`. Before creating
    anything we check (via API list/search) whether it already exists, and if
    so we reuse its id for dependents (deals/quotes/contracts), which are
    each also check-before-create.
  - `--cleanup` is driven entirely by the manifest file written during
    `--apply` (scratch/crm_demo_seed_manifest.json), not by pattern-matching,
    per the task spec.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local", override=True)

from app.core.supabase_client import execute_supabase_query, get_supabase_client  # noqa: E402

BASE_URL = "http://localhost:8010"
API = f"{BASE_URL}/api/all-platform"

MANIFEST_PATH = ROOT / "scratch" / "crm_demo_seed_manifest.json"

NAME_PREFIX = "ZZZ-DEMO-CUSTOMER-"

SEED_ACTOR_EMAIL = "zzz-demo-seed-actor@markee.local"
SEED_ACTOR_PASSWORD = "DemoSeed!2026"
SEED_ACTOR_NAME = "ZZZ Demo Seed Actor"


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def past_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()


def future_iso(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat()


# ---------------------------------------------------------------------------
# HTTP session helper
# ---------------------------------------------------------------------------
class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url
        self.session = requests.Session()
        self.token: str | None = None
        self.user: dict[str, Any] | None = None

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = path if path.startswith("http") else f"{self.base_url}{path}"
        resp = self.session.request(method, url, headers=self._headers(), timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def get(self, path: str, **kwargs: Any) -> dict[str, Any]:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.request("POST", path, json=json_body or {})

    def put(self, path: str, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.request("PUT", path, json=json_body or {})


def ensure_seed_actor(client: ApiClient) -> dict[str, Any]:
    """Register the throwaway seed-actor account (or log in if it already
    exists from a prior run). Returns the {id, email, name} user dict and
    leaves the client authenticated (bearer token set) for subsequent calls."""
    reg = client.post(
        f"{API}/auth/register",
        {"email": SEED_ACTOR_EMAIL, "password": SEED_ACTOR_PASSWORD, "name": SEED_ACTOR_NAME},
    )
    if reg.get("success"):
        # /register does NOT return access_token in the JSON body (only via
        # HttpOnly cookie on the Response) — session cookie jar already has it
        # since we reuse client.session, so no extra login call is needed.
        # But to also carry a bearer token (defensive — some endpoints may
        # not look at cookies in tests), do an explicit login next.
        pass
    else:
        msg = str(reg.get("message") or "")
        if "already" not in msg.lower() and "ton tai" not in msg.lower() and "exist" not in msg.lower():
            print(f"  [WARN] register returned failure (continuing to login anyway): {msg}")

    login = client.post(f"{API}/auth/login", {"email": SEED_ACTOR_EMAIL, "password": SEED_ACTOR_PASSWORD})
    if not login.get("success"):
        raise RuntimeError(f"Could not log in seed actor: {login.get('message')}")

    me = client.get(f"{API}/auth/me")
    if not me.get("success"):
        raise RuntimeError(f"Could not fetch seed actor profile: {me.get('message')}")
    user = me["data"]
    # auth/login sets an HttpOnly cookie on client.session AND we also want a
    # bearer token for the Authorization header path (used by get_current_user
    # in customer_lead.py's own cookie-or-bearer check) — grab it via cookies.
    token = client.session.cookies.get("crawlpro_access_token")
    client.token = token
    client.user = user
    return user


# ---------------------------------------------------------------------------
# Demo customer definitions
# ---------------------------------------------------------------------------
def demo_customers() -> list[dict[str, Any]]:
    return [
        {
            "key": "no_deal",
            "customer_name": f"{NAME_PREFIX}Nguyen Van An",
            "company_name": "Cong ty TNHH An Phat",
            "position": "Giam doc",
            "phone": "0912345601",
            "email": "an.nguyen.zzzdemo@example.com",
            "zalo": "0912345601",
            "facebook": "facebook.com/an.nguyen.zzzdemo",
            "website": "anphat-zzzdemo.vn",
            "tax_code": "0312345601",
            "address": "12 Nguyen Hue, Quan 1",
            "city": "TP. Ho Chi Minh",
            "industry": "Ban le",
            "source": "FB_Inbox",
            "status": "new_lead",
            "note": "Khach hang demo - moi tiep can, chua co deal nao.",
            "scenario": ["no deal at all"],
        },
        {
            "key": "one_deal",
            "customer_name": f"{NAME_PREFIX}Tran Thi Bich",
            "company_name": "Cong ty CP Bich Ngoc",
            "position": "Truong phong Marketing",
            "phone": "0912345602",
            "email": "bich.tran.zzzdemo@example.com",
            "zalo": "0912345602",
            "facebook": "facebook.com/bich.tran.zzzdemo",
            "website": "bichngoc-zzzdemo.vn",
            "tax_code": "0312345602",
            "address": "45 Le Loi, Quan 1",
            "city": "TP. Ho Chi Minh",
            "industry": "Thoi trang",
            "source": "Zalo",
            "status": "following",
            "note": "Khach hang demo - dang cham soc, co dung 1 deal.",
            "scenario": ["exactly one deal"],
            "deal": {
                "estimated_budget": 45_000_000,
                "note": "Deal duy nhat cua khach hang demo Bich.",
            },
        },
        {
            "key": "multi_deal_multi_team",
            "customer_name": f"{NAME_PREFIX}Le Van Cuong",
            "company_name": "Cong ty TNHH Cuong Thinh",
            "position": "CEO",
            "phone": "0912345603",
            "email": "cuong.le.zzzdemo@example.com",
            "zalo": "0912345603",
            "facebook": "facebook.com/cuong.le.zzzdemo",
            "website": "cuongthinh-zzzdemo.vn",
            "tax_code": "0312345603",
            "address": "78 Vo Van Tan, Quan 3",
            "city": "TP. Ho Chi Minh",
            "industry": "Xay dung",
            "source": "Website",
            "status": "following",
            "note": "Khach hang demo - nhieu deal, trai 2 team khac nhau.",
            "scenario": ["multiple deals (2+ teams)"],
            "deal": {
                "estimated_budget": 60_000_000,
                "note": "Deal 1/3 cua khach hang demo Cuong (team A neu co).",
            },
            "extra_deals": [
                {
                    "estimated_budget": 30_000_000,
                    "note": "Deal 2/3 cua khach hang demo Cuong (team B neu co).",
                },
                {
                    "estimated_budget": 15_000_000,
                    "note": "Deal 3/3 cua khach hang demo Cuong.",
                },
            ],
        },
        {
            "key": "has_quote",
            "customer_name": f"{NAME_PREFIX}Pham Thi Dung",
            "company_name": "Cong ty CP Dung Phat",
            "position": "Ke toan truong",
            "phone": "0912345604",
            "email": "dung.pham.zzzdemo@example.com",
            "zalo": "0912345604",
            "facebook": "facebook.com/dung.pham.zzzdemo",
            "website": "dungphat-zzzdemo.vn",
            "tax_code": "0312345604",
            "address": "23 Cach Mang Thang 8, Quan 10",
            "city": "TP. Ho Chi Minh",
            "industry": "Giao duc",
            "source": "Referral",
            "status": "current_customer",
            "note": "Khach hang demo - da co bao gia gui.",
            "scenario": ["at least one quote"],
            "deal": {
                "estimated_budget": 80_000_000,
                "note": "Deal cho bao gia demo Dung.",
            },
        },
        {
            "key": "has_contract",
            "customer_name": f"{NAME_PREFIX}Hoang Van Em",
            "company_name": "Cong ty TNHH Em Gia Phat",
            "position": "Pho giam doc",
            "phone": "0912345605",
            "email": "em.hoang.zzzdemo@example.com",
            "zalo": "0912345605",
            "facebook": "facebook.com/em.hoang.zzzdemo",
            "website": "emgiaphat-zzzdemo.vn",
            "tax_code": "0312345605",
            "address": "56 Nguyen Trai, Quan 5",
            "city": "TP. Ho Chi Minh",
            "industry": "Logistics",
            "source": "Manual",
            "status": "current_customer",
            "note": "Khach hang demo - da ky hop dong.",
            "scenario": ["at least one contract"],
            "deal": {
                "estimated_budget": 120_000_000,
                "note": "Deal cho hop dong demo Em.",
            },
        },
        {
            "key": "large_value",
            "customer_name": f"{NAME_PREFIX}Vu Thi Giang",
            "company_name": "Tap doan Giang Long",
            "position": "Chu tich HDQT",
            "phone": "0912345606",
            "email": "giang.vu.zzzdemo@example.com",
            "zalo": "0912345606",
            "facebook": "facebook.com/giang.vu.zzzdemo",
            "website": "gianglong-zzzdemo.vn",
            "tax_code": "0312345606",
            "address": "1 Ham Nghi, Quan 1",
            "city": "TP. Ho Chi Minh",
            "industry": "Bat dong san",
            "source": "Manual",
            "status": "current_customer",
            "note": "Khach hang demo - deal gia tri lon.",
            "scenario": ["large total deal value"],
            "deal": {
                "estimated_budget": 850_000_000,
                "lifetime_value": 850_000_000,
                "note": "Deal gia tri lon cho khach hang demo Giang (850 trieu VND).",
            },
        },
        {
            "key": "overdue_followup",
            "customer_name": f"{NAME_PREFIX}Dang Van Hai",
            "company_name": "Cong ty TNHH Hai Dang",
            "position": "Truong phong Kinh doanh",
            "phone": "0912345607",
            "email": "hai.dang.zzzdemo@example.com",
            "zalo": "0912345607",
            "facebook": "facebook.com/hai.dang.zzzdemo",
            "website": "haidang-zzzdemo.vn",
            "tax_code": "0312345607",
            "address": "89 Dien Bien Phu, Binh Thanh",
            "city": "TP. Ho Chi Minh",
            "industry": "Van tai",
            "source": "Manual",
            "status": "following",
            "note": "Khach hang demo - lich follow-up da qua han.",
            "scenario": ["overdue follow-up"],
            "deal": {
                "estimated_budget": 25_000_000,
                "note": "Deal qua han follow-up cho khach hang demo Hai.",
                "follow_up_date": past_iso(14) + "T09:00:00+07:00",
            },
        },
        {
            "key": "not_fit",
            "customer_name": f"{NAME_PREFIX}Bui Thi Kim",
            "company_name": "Ho kinh doanh Kim Anh",
            "position": "Chu ho kinh doanh",
            "phone": "0912345608",
            "email": "kim.bui.zzzdemo@example.com",
            "zalo": "0912345608",
            "facebook": "facebook.com/kim.bui.zzzdemo",
            "website": None,
            "tax_code": None,
            "address": "34 Le Van Sy, Quan Phu Nhuan",
            "city": "TP. Ho Chi Minh",
            "industry": "F&B",
            "source": "FB_Inbox",
            "status": "not_fit",
            "note": "Khach hang demo - khong phu hop, ngan sach qua thap.",
            "scenario": ["status coverage: not_fit"],
            "deal": {
                "estimated_budget": 3_000_000,
                "note": "Deal da danh gia khong phu hop cho khach hang demo Kim.",
            },
        },
        {
            "key": "new_lead_filler",
            "customer_name": f"{NAME_PREFIX}Ngo Van Long",
            "company_name": "Cong ty TNHH Long Phung",
            "position": "Nhan vien mua hang",
            "phone": "0912345609",
            "email": "long.ngo.zzzdemo@example.com",
            "zalo": "0912345609",
            "facebook": "facebook.com/long.ngo.zzzdemo",
            "website": "longphung-zzzdemo.vn",
            "tax_code": "0312345609",
            "address": "67 Truong Chinh, Tan Binh",
            "city": "TP. Ho Chi Minh",
            "industry": "San xuat",
            "source": "Manual",
            "status": "new_lead",
            "note": "Khach hang demo - lead moi, dang cho lien he.",
            "scenario": ["status coverage: new_lead (secondary)"],
            "deal": {
                "estimated_budget": 12_000_000,
                "note": "Deal moi tao cho khach hang demo Long.",
            },
        },
    ]


# ---------------------------------------------------------------------------
# Supabase read-only helpers (verification / lookups only — no writes)
# ---------------------------------------------------------------------------
def find_customer_by_name(customer_name: str) -> dict[str, Any] | None:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_customers").select("*").eq("customer_name", customer_name).limit(1).execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def find_deals_for_customer(customer_id: str) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("customer_leads").select("*").eq("customer_id", customer_id).execute()
    )
    return res.data or []


def find_quotes_for_deal(deal_id: str) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("quotes").select("*").eq("deal_id", deal_id).execute()
    )
    return res.data or []


def find_contracts_for_deal(deal_id: str) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("contracts").select("*").eq("deal_id", deal_id).execute()
    )
    return res.data or []


def find_active_quote_form() -> dict[str, Any] | None:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("quote_forms")
        .select("id, code, name, status")
        .eq("code", "STANDARD_QUOTE_FORM")
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if rows:
        return rows[0]
    # fallback: any active form
    res2 = execute_supabase_query(
        lambda: supabase.table("quote_forms").select("id, code, name, status").eq("status", "active").limit(1).execute()
    )
    rows2 = res2.data or []
    return rows2[0] if rows2 else None


def find_teams(limit: int = 2) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    res = execute_supabase_query(lambda: supabase.table("teams").select("id, name_team").limit(limit).execute())
    return res.data or []


# ---------------------------------------------------------------------------
# Plan / apply
# ---------------------------------------------------------------------------
def customer_payload_fields(spec: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "customer_name", "company_name", "position", "phone", "email", "zalo",
        "facebook", "website", "tax_code", "address", "city", "industry",
        "source", "status", "note",
    )
    return {k: spec.get(k) for k in keys if spec.get(k) is not None}


def build_plan(teams: list[dict[str, Any]], quote_form: dict[str, Any] | None) -> list[dict[str, Any]]:
    customers = demo_customers()
    plan = []
    for spec in customers:
        plan.append(spec)
    return plan


def apply_seed(client: ApiClient, manifest: dict[str, Any]) -> dict[str, Any]:
    actor = manifest["seed_actor"]
    teams = find_teams(limit=2)
    quote_form = find_active_quote_form()
    if not quote_form:
        print("  [WARN] No active quote_form found in DB — quote scenario will be skipped. Run scripts/seed_quote_forms.py first.")

    manifest.setdefault("customers", {})
    manifest.setdefault("quote_form_id_used", quote_form["id"] if quote_form else None)
    manifest.setdefault("teams_used", teams)

    for spec in demo_customers():
        key = spec["key"]
        name = spec["customer_name"]
        print(f"\n--- {key}: {name} ---")

        existing_customer = find_customer_by_name(name)
        deals_created: list[dict[str, Any]] = []
        quotes_created: list[dict[str, Any]] = []
        contracts_created: list[dict[str, Any]] = []
        customer_row: dict[str, Any]

        if existing_customer:
            customer_row = existing_customer
            print(f"  customer already exists -> id={customer_row['id']} (skip create)")
        else:
            first_deal_spec = spec.get("deal")
            if first_deal_spec:
                deal_payload = dict(first_deal_spec)
                deal_payload.setdefault("leaded_by", actor["id"])
                if teams:
                    deal_payload.setdefault("team_id", teams[0]["id"])
                body = {
                    "customer": customer_payload_fields(spec),
                    "deal": deal_payload,
                }
                result = client.post(f"{API}/crm/customers/with-deal", body)
                if not result.get("success"):
                    raise RuntimeError(f"Failed to create customer+deal for {name}: {result.get('message')}")
                data = result["data"]
                customer_row = data["customer"]
                deals_created.append(data["deal"])
                print(f"  CREATED customer -> id={customer_row['id']}, first deal -> id={data['deal']['id']}")
            else:
                # No deal wanted for this scenario -> plain customer create.
                body = customer_payload_fields(spec)
                result = client.post(f"{API}/crm/customers", body)
                if not result.get("success"):
                    raise RuntimeError(f"Failed to create customer {name}: {result.get('message')}")
                customer_row = result["data"]
                print(f"  CREATED customer (no deal) -> id={customer_row['id']}")

        customer_id = customer_row["id"]

        # ---- extra deals (idempotent by count-of-existing-deals check) ----
        extra_specs = spec.get("extra_deals") or []
        if extra_specs:
            existing_deals = find_deals_for_customer(customer_id)
            existing_count = len(existing_deals)
            wanted_total = (1 if spec.get("deal") else 0) + len(extra_specs)
            if existing_count >= wanted_total:
                print(f"  extra deals already present ({existing_count}/{wanted_total}) -> skip")
                deals_created = existing_deals
            else:
                team_choices = teams if teams else [None]
                for i, extra in enumerate(extra_specs):
                    deal_payload = dict(extra)
                    deal_payload["customer_name"] = name
                    deal_payload["customer_id"] = customer_id
                    deal_payload.setdefault("leaded_by", actor["id"])
                    team = team_choices[(i + 1) % len(team_choices)] if team_choices[0] else None
                    if team:
                        deal_payload.setdefault("team_id", team["id"])
                    result = client.post(f"{API}/customer-leads", deal_payload)
                    if not result.get("success"):
                        raise RuntimeError(f"Failed to create extra deal for {name}: {result.get('message')}")
                    deals_created.append(result["data"])
                    print(f"  CREATED extra deal -> id={result['data']['id']}")
                # refresh full list (includes the very first deal too)
                deals_created = find_deals_for_customer(customer_id)
        elif not deals_created:
            deals_created = find_deals_for_customer(customer_id)

        # ---- quote scenario ----
        if "at least one quote" in (spec.get("scenario") or []) and quote_form and deals_created:
            deal_id = deals_created[0]["id"]
            existing_quotes = find_quotes_for_deal(deal_id)
            if existing_quotes:
                quotes_created = existing_quotes
                print(f"  quote already exists for deal {deal_id} -> skip")
            else:
                quote_body = {
                    "deal_id": deal_id,
                    "quote_form_id": quote_form["id"],
                    "data": {
                        "customerRecipient": spec.get("position") or "Quy khach",
                        "customerCompanyName": spec.get("company_name") or name,
                        "customerContactName": name.replace(NAME_PREFIX, ""),
                        "customerAddress": spec.get("address") or "",
                        "customerPhone": spec.get("phone") or "",
                        "customerEmail": spec.get("email") or "",
                        "customerTaxCode": spec.get("tax_code") or "",
                        "quoteTitle": "BANG BAO GIA - DEMO",
                        "quoteDate": datetime.now(timezone.utc).date().isoformat(),
                        "validityDays": 30,
                        "currency": "VND",
                        "defaultVatRate": 10,
                    },
                    "items": [
                        {
                            "description": "Trien khai he thong CRM demo",
                            "service_description": "Trien khai he thong CRM demo",
                            "unit": "Goi",
                            "quantity": 1,
                            "unit_price": 80_000_000,
                            "discount_percent": 0,
                            "vat_rate": 10,
                        }
                    ],
                }
                result = client.post(f"{API}/quotes", quote_body)
                if not result.get("success"):
                    raise RuntimeError(f"Failed to create quote for {name}: {result.get('message')}")
                quotes_created.append(result["data"])
                print(f"  CREATED quote -> id={result['data'].get('id')}")

        # ---- contract scenario ----
        if "at least one contract" in (spec.get("scenario") or []) and deals_created:
            deal_id = deals_created[0]["id"]
            existing_contracts = find_contracts_for_deal(deal_id)
            if existing_contracts:
                contracts_created = existing_contracts
                print(f"  contract already exists for deal {deal_id} -> skip")
            else:
                contract_body = {
                    "deal_id": deal_id,
                    "title": f"Hop dong dich vu - {name}",
                    "template_type": "service",
                    "contract_value": float(deals_created[0].get("estimated_budget") or 120_000_000),
                    "currency": "VND",
                    "start_date": datetime.now(timezone.utc).date().isoformat(),
                    "end_date": future_iso(365),
                    "payment_terms": "Thanh toan 50% khi ky, 50% khi ban giao.",
                    "progress_percent": 20,
                    "payment_collected_percent": 50,
                    "clauses": [
                        {"title": "Dieu 1: Pham vi dich vu", "body": "Ben B cung cap dich vu CRM demo cho Ben A."},
                        {"title": "Dieu 2: Thanh toan", "body": "Thanh toan theo tien do da thoa thuan."},
                    ],
                }
                result = client.post(f"{API}/contracts", contract_body)
                if not result.get("success"):
                    raise RuntimeError(f"Failed to create contract for {name}: {result.get('message')}")
                contracts_created.append(result["data"])
                print(f"  CREATED contract -> id={result['data'].get('id')}")

        manifest["customers"][key] = {
            "customer_name": name,
            "customer_id": customer_id,
            "status": customer_row.get("status"),
            "scenario": spec.get("scenario") or [],
            "deal_ids": [d["id"] for d in deals_created],
            "quote_ids": [q["id"] for q in quotes_created],
            "contract_ids": [c["id"] for c in contracts_created],
        }

    return manifest


def load_manifest() -> dict[str, Any]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {}


def save_manifest(manifest: dict[str, Any]) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def run_apply() -> None:
    client = ApiClient(BASE_URL)
    print(f"== Seed actor: {SEED_ACTOR_EMAIL} ==")
    actor = ensure_seed_actor(client)
    print(f"  actor id = {actor.get('id')}")

    manifest = load_manifest()
    manifest["seed_actor"] = {"id": actor.get("id"), "email": SEED_ACTOR_EMAIL, "name": SEED_ACTOR_NAME}
    manifest["last_apply_at"] = now_utc_iso()

    manifest = apply_seed(client, manifest)
    save_manifest(manifest)

    print(f"\n== Manifest written to {MANIFEST_PATH} ==")
    print(json.dumps(manifest, ensure_ascii=False, indent=2, default=str))


def run_dry_run() -> None:
    print("DRY RUN — no writes will be made. Use --apply to actually seed data.\n")
    for spec in demo_customers():
        print(f"- [{spec['key']}] {spec['customer_name']} (status={spec['status']}) scenario={spec.get('scenario')}")
        if spec.get("deal"):
            print(f"    + 1 deal: {spec['deal']}")
        for extra in spec.get("extra_deals") or []:
            print(f"    + extra deal: {extra}")
    existing = MANIFEST_PATH.exists()
    print(f"\nManifest file exists: {existing} ({MANIFEST_PATH})")


def run_cleanup() -> None:
    if not MANIFEST_PATH.exists():
        print(f"No manifest found at {MANIFEST_PATH} — nothing to clean up.")
        return
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    supabase = get_supabase_client()

    customers = manifest.get("customers", {})
    for key, entry in customers.items():
        for contract_id in entry.get("contract_ids", []):
            execute_supabase_query(lambda cid=contract_id: supabase.table("contracts").delete().eq("id", cid).execute())
            print(f"  deleted contract {contract_id}")
        for quote_id in entry.get("quote_ids", []):
            execute_supabase_query(lambda qid=quote_id: supabase.table("quotes").delete().eq("id", qid).execute())
            print(f"  deleted quote {quote_id}")
        for deal_id in entry.get("deal_ids", []):
            execute_supabase_query(lambda did=deal_id: supabase.table("customer_leads").delete().eq("id", did).execute())
            print(f"  deleted deal {deal_id}")
        customer_id = entry.get("customer_id")
        if customer_id:
            execute_supabase_query(lambda cid=customer_id: supabase.table("crm_customers").delete().eq("id", cid).execute())
            print(f"  deleted customer {entry.get('customer_name')} ({customer_id})")

    seed_actor = manifest.get("seed_actor") or {}
    actor_id = seed_actor.get("id")
    if actor_id:
        execute_supabase_query(lambda: supabase.table("app_users").delete().eq("id", actor_id).execute())
        print(f"  deleted seed-actor account {seed_actor.get('email')} ({actor_id})")

    MANIFEST_PATH.unlink(missing_ok=True)
    print(f"\nCleanup complete. Manifest removed: {MANIFEST_PATH}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--cleanup", action="store_true")
    args = parser.parse_args()

    if args.cleanup:
        run_cleanup()
        return
    if args.apply:
        run_apply()
        return
    run_dry_run()


if __name__ == "__main__":
    main()
