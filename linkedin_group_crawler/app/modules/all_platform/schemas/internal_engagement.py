"""Schemas for the Internal Engagement (Tương tác nội bộ) feature.

Posts come from the external MarkeeAI product (the company's own Facebook
Page publishing tool) — see services/markeeai_client.py.
"""

from __future__ import annotations

from typing import List

from pydantic import BaseModel


class InternalEngagementPost(BaseModel):
    id: str
    fanpage_id: str
    fanpage_name: str | None = None
    facebook_post_id: str | None = None
    content: str = ""
    media_urls: List[str] = []
    permalink_url: str | None = None
    status: str | None = None
    created_at: str | None = None


class MyMarksRequest(BaseModel):
    email_member: str
    link_posts: List[str]


ACTION_TYPES = (
    "comment",
    "like",
    "love",
    "care",
    "haha",
    "wow",
    "sad",
    "angry",
    "share",
)


class InternalEngagementActionRecordRequest(BaseModel):
    email_member: str
    link_post: str
    fanpage_id: str
    fanpage_name: str | None = None
    facebook_post_id: str | None = None
    action_type: str
    content: str | None = None
    reaction_id: str | None = None
    id_social_account: str | None = None
    profile_id: str | None = None
    status: str = "success"
    error_message: str | None = None


class InternalEngagementSummaryRequest(BaseModel):
    email_member: str
    date_from: str | None = None
    date_to: str | None = None


class TeamScopedRequest(BaseModel):
    """Common params for the team-visibility endpoints — `email` is the
    calling user (used to resolve admin/leader/member scope server-side)."""
    email: str
    team_id: str | None = None  # admin only: filter to one team; ignored for leader/member


class PostInteractionsRequest(TeamScopedRequest):
    link_post: str


class TeamTrendRequest(TeamScopedRequest):
    days: int = 14


class TeamTotalsRequest(TeamScopedRequest):
    date_from: str | None = None
    date_to: str | None = None
