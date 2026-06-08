"""Supabase client singleton for the all-platform module."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions

if TYPE_CHECKING:
    pass

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client.

    Reads ``SUPABASE_URL`` and ``SUPABASE_SERVICE_ROLE_KEY`` from environment.
    Raises ``RuntimeError`` if either is missing.
    """
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        _supabase_client = create_client(
            url,
            key,
            options=SyncClientOptions(),
        )
    return _supabase_client
