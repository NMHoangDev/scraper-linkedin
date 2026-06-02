"""KPI schemas for all-platform module."""

from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List


class KpiWeekItem(BaseModel):
    start_day: str
    end_day: str
    total_reaction: int = 0
    total_comment: int = 0
    total_post_crawl: int = 0
    total_session_crawl: int = 0
    platform: str = "Facebook"


class AssignKpiRequest(BaseModel):
    leader_role: str
    role: str
    email: str
    profile_slug: str
    email_leader: str
    kpi: List[KpiWeekItem]
    platform: str = "Facebook"


class KpiMemberData(BaseModel):
    email: str
    role: str
    profile_slug: Optional[str] = None
    email_leader: Optional[str] = None
    kpi: List[dict] = []
    profile_id: Optional[str] = None
    facebook_name: Optional[str] = None
    seeding_stats: Optional[dict] = None


class GetKpiByEmailRequest(BaseModel):
    email: str


class GetAllKpiRequest(BaseModel):
    leader_email: str


class CheckPermissionRequest(BaseModel):
    email: str


class VerifyLeaderCodeRequest(BaseModel):
    code: str


class UpdateRoleToMemberRequest(BaseModel):
    email: str
    leader_email: str


class SyncProgressRequest(BaseModel):
    email: str
    posts: List[dict]  # [{post_url, reactions, comments, shares}]
