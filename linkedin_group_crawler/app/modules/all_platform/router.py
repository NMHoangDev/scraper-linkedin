"""Main all-platform router — mounts platform-specific and shared sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.modules.all_platform.routers import (
    seeding_router,
    kpi_router,
    categories_router,
    users_router,
    teams_router,
    auth_router,
    social_accounts_router,
)
from app.modules.all_platform.routers.platforms import router as platforms_router
from app.modules.all_platform.routers.linkedin_auth import router as linkedin_auth_router
from app.modules.all_platform.routers.posts import facebook_posts_router
from app.modules.all_platform.routers.posts_linkedin import linkedin_posts_router
from app.modules.all_platform.routers.posts_unified import router as unified_posts_router
from app.modules.all_platform.routers.groups import facebook_groups_router
from app.modules.all_platform.routers.groups_linkedin import linkedin_groups_router
from app.modules.all_platform.routers.crawl_linkedin import crawl_linkedin_router
from app.modules.all_platform.routers.linkedin_legacy import router as linkedin_legacy_router
from app.modules.all_platform.routers.crawl_facebook import crawl_facebook_router

all_platform_router = APIRouter()

# ── Facebook ────────────────────────────────────────────────────────────────────
all_platform_router.include_router(
    seeding_router,
    prefix="/facebook",
    tags=["All-Platform Facebook Seeding"],
)
all_platform_router.include_router(
    facebook_posts_router,
    prefix="/facebook",
    tags=["All-Platform Facebook Posts"],
)
all_platform_router.include_router(
    facebook_groups_router,
    prefix="/facebook",
    tags=["All-Platform Facebook Groups"],
)
all_platform_router.include_router(
    crawl_facebook_router,
    prefix="/facebook",
    tags=["All-Platform Facebook Crawl"],
)

# ── LinkedIn ───────────────────────────────────────────────────────────────────
all_platform_router.include_router(
    seeding_router,
    prefix="/linkedin",
    tags=["All-Platform LinkedIn Seeding"],
)
all_platform_router.include_router(
    linkedin_posts_router,
    prefix="/linkedin",
    tags=["All-Platform LinkedIn Posts"],
)
all_platform_router.include_router(
    linkedin_groups_router,
    prefix="/linkedin",
    tags=["All-Platform LinkedIn Groups"],
)
all_platform_router.include_router(
    crawl_linkedin_router,
    prefix="/linkedin",
    tags=["All-Platform LinkedIn Crawl"],
)
all_platform_router.include_router(
    linkedin_auth_router,
    prefix="/linkedin",
    tags=["All-Platform LinkedIn Auth"],
)
all_platform_router.include_router(
    linkedin_legacy_router,
    prefix="/linkedin",
)

# ── Unified Posts (Tong-hop page — no cache, all filters server-side) ──────────
all_platform_router.include_router(
    unified_posts_router,
    prefix="/unified",
    tags=["All-Platform Unified Posts"],
)

# ── KPI (platform-agnostic) ───────────────────────────────────────────────────
all_platform_router.include_router(
    kpi_router,
    prefix="/kpi",
    tags=["All-Platform KPI"],
)

# ── Categories (platform-agnostic) ────────────────────────────────────────────
all_platform_router.include_router(
    categories_router,
    prefix="/categories",
    tags=["All-Platform Categories"],
)

# ── Users & Teams ──────────────────────────────────────────────────────────────
all_platform_router.include_router(
    users_router,
    prefix="/users",
    tags=["All-Platform Users"],
)
all_platform_router.include_router(
    teams_router,
    prefix="/teams",
    tags=["All-Platform Teams"],
)

# ── Auth ─────────────────────────────────────────────────────────────────────
all_platform_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["All-Platform Auth"],
)

# ── Social Accounts ───────────────────────────────────────────────────────────
all_platform_router.include_router(
    social_accounts_router,
    prefix="/social-accounts",
    tags=["All-Platform Social Accounts"],
)

# ── Platforms ─────────────────────────────────────────────────────────────────
all_platform_router.include_router(
    platforms_router,
    prefix="/platforms",
    tags=["All-Platform Platforms"],
)
