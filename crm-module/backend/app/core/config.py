"""Application settings and environment loading (bản rút gọn cho module CRM
độc lập — chỉ giữ lại các biến mà router/service CRM thực sự dùng tới).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
# .env.local ghi đè .env — dùng cho dev local, không commit (giống app seeding gốc).
load_dotenv(BASE_DIR / ".env.local", override=True)


def _parse_csv(value: str | None, default: tuple[str, ...]) -> list[str]:
    if value is None:
        return list(default)
    items = [item.strip() for item in value.split(",")]
    return [item for item in items if item]


@dataclass
class Settings:
    """Typed settings loaded from environment variables."""

    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    cors_origins: list[str] | None = None

    # Multi-tenant: DB self-host này dùng chung cho nhiều deploy của
    # crm-module (Markee tại crm.markeeai.com, brand khác sau này) — mỗi
    # deploy chỉ set instance của riêng mình qua env CRM_INSTANCE, mọi
    # query CRM đều lọc/gắn theo giá trị này (xem migrations/001_add_instance_scoping.sql).
    crm_instance: str = (os.getenv("CRM_INSTANCE") or "markee").strip()

    # One-way customer master sync: Markee CFO -> CRM. Only the Markee CRM
    # instance enables this; other CRM instances remain fully isolated.
    cfo_supabase_url: str = (os.getenv("CFO_SUPABASE_URL") or "").rstrip("/")
    cfo_supabase_service_role_key: str = os.getenv("CFO_SUPABASE_SERVICE_ROLE_KEY", "")
    cfo_workspace_id: str = (os.getenv("CFO_WORKSPACE_ID") or "default").strip()
    cfo_customer_sync_enabled: bool = (os.getenv("CFO_CUSTOMER_SYNC_ENABLED") or "0").strip().lower() in {
        "1", "true", "yes", "on",
    }
    cfo_customer_sync_interval_seconds: int = max(
        10,
        int(os.getenv("CFO_CUSTOMER_SYNC_INTERVAL_SECONDS", "30")),
    )

    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "crawlpro-default-secret-change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"),
    )
    google_oauth_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    leader_code: str = (os.getenv("LEADER_CODE") or "8888").strip()

    # AI Contract Copilot (soạn/thẩm định/tinh chỉnh hợp đồng bằng AI).
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    ai_model: str = os.getenv("AI_MODEL", "gpt-4o")

    # Không dùng tới trong module CRM (không mount router KPI/MarkeeAI nào),
    # nhưng vài service dùng chung (supabase_kpi_service.py, markeeai_client.py)
    # vẫn còn nằm trong cây service đã copy nên field vẫn cần tồn tại để
    # tránh AttributeError nếu lỡ có code đường dẫn nào đó chạm tới — để trống,
    # KHÔNG hard-code secret thật vào đây.
    markeeai_base_url: str = os.getenv("MARKEEAI_BASE_URL", "")
    markeeai_service_email: str = os.getenv("MARKEEAI_SERVICE_EMAIL", "")
    markeeai_service_password: str = os.getenv("MARKEEAI_SERVICE_PASSWORD", "")
    markeeai_campaign_ids: list[str] = field(default_factory=lambda: _parse_csv(os.getenv("MARKEEAI_CAMPAIGN_IDS"), default=()))
    seeder_service_url: str = os.getenv("SEEDER_SERVICE_URL", "")
    seeder_service_api_key: str = os.getenv("SEEDER_SERVICE_API_KEY", "")

    def __post_init__(self) -> None:
        if self.cors_origins is None:
            self.cors_origins = _parse_csv(
                os.getenv("CORS_ORIGINS"),
                default=(
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                ),
            )


settings = Settings()
