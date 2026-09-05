"""Application settings and environment loading (bản rút gọn cho zalo-module
độc lập — chỉ giữ lại các biến mà auth/users router thực sự dùng tới; các
biến riêng của module Zalo (ZALO_*) nằm ở
`app/modules/all_platform/zalo/config.py`, không trộn vào đây).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
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

    # Dùng chung DB self-host + secret JWT với app seeding gốc để SSO nhẹ
    # (tài khoản app_users đăng nhập ở app nào cũng dùng được ở module này) —
    # xem README.md mục "Vì sao tách bảng riêng".
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "crawlpro-default-secret-change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"),
    )
    google_oauth_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    leader_code: str = (os.getenv("LEADER_CODE") or "8888").strip()

    # Đọc bởi zalo/api/security.py::verify_zalo_api_key — để rỗng (mặc định)
    # sẽ TẮT HẲN check X-API-Key, chỉ nên rỗng ở local dev, không phải production.
    api_key: str = os.getenv("API_KEY", "")

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
