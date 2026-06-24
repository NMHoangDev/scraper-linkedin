"""Check actual Supabase schema for Zalo tables."""
import asyncio
import httpx
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent / "linkedin_group_crawler"))

from app.core.config import settings  # type: ignore
from app.modules.all_platform.zalo.services.supabase_service import (  # type: ignore
    is_supabase_configured,
    _rest,
)


TABLES = [
    "zalo_users",
    "zalo_accounts",
    "zalo_sessions",
    "zalo_groups",
    "zalo_messages",
]


async def main() -> None:
    if not is_supabase_configured():
        print("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)")
        return

    print("=" * 70)
    print("SUPABASE SCHEMA CHECK — ZALO TABLES")
    print("=" * 70)

    for table in TABLES:
        print(f"\n--- {table} ---")
        try:
            # Try the PostgREST introspection endpoint
            rows = await _rest(
                "GET",
                table,
                params={"select": "*", "limit": "1"},
            )
            # Get keys from first row, else we can only guess
            if isinstance(rows, list) and len(rows) > 0:
                cols = list(rows[0].keys())
                print(f"Columns (from sample row): {cols}")
            else:
                print("(table empty — cannot infer columns from data)")
                # Use Postgres RPC to introspect
                try:
                    info = await _rest(
                        "GET",
                        f"rpc/check_columns",
                        params={"p_table": table},
                    )
                    print(f"rpc: {info}")
                except Exception as rpc_err:
                    print(f"rpc fallback failed: {rpc_err}")
                    # Try a known-good query: insert a non-existent column will fail with column list
                    print("Try query with nonexistent field to get column list in error...")
        except Exception as exc:
            msg = str(exc)
            print(f"SELECT * failed: {msg[:500]}")
            # Many times Supabase will return a useful error like
            # 'column X does not exist' which reveals which columns are bad.
            # If error is a 400 with column list, parse it.

    # Direct introspection via Postgres-style query
    print("\n" + "=" * 70)
    print("TRY: information_schema via PostgREST (usually blocked)")
    print("=" * 70)
    for table in TABLES:
        try:
            # PostgREST does NOT allow direct info_schema access without exposing it.
            # But we can call a function. Let's just try inserting a clearly bad column
            # and see what columns are mentioned.
            rows = await _rest(
                "POST",
                table,
                json=[{"__definitely_not_a_column__": "x"}],
                prefer="return=representation",
            )
            print(f"{table}: unexpected success {rows}")
        except Exception as exc:
            msg = str(exc)
            # Extract column list if present
            print(f"{table} error: {msg[:600]}")


if __name__ == "__main__":
    asyncio.run(main())
