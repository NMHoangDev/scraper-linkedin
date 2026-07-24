"""Request schemas for the admin-only phone bridge adapter."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PhonePlatform = Literal["messenger", "zalo"]


class StrictBridgeRequest(BaseModel):
    """Reject fields the adapter has not explicitly reviewed for forwarding."""

    model_config = ConfigDict(extra="forbid")


class OpenConversationRequest(StrictBridgeRequest):
    title: str = Field(min_length=1, max_length=200)
    maxInboxScrolls: int | None = Field(default=None, ge=0, le=10)


class SendMessageRequest(StrictBridgeRequest):
    text: str = Field(min_length=1, max_length=2000)
    dryRun: bool = True
    confirmed: bool = False


class FacebookOpenPostRequest(StrictBridgeRequest):
    url: str = Field(min_length=1)


class FacebookPrepareLikeRequest(StrictBridgeRequest):
    url: str | None = None


class FacebookConfirmLikeRequest(StrictBridgeRequest):
    confirmationToken: str = Field(min_length=10)
    humanConfirmed: Literal[True]
    confirmed: bool = False


class FacebookCommentRequest(StrictBridgeRequest):
    text: str = Field(min_length=1, max_length=2000)
    confirmed: bool = False


class FacebookCreatePostRequest(StrictBridgeRequest):
    text: str = Field(min_length=1, max_length=5000)
    dryRun: bool = True
