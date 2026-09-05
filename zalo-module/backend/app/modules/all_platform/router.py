"""Router tổng cho zalo-module — chỉ mount auth/users (bắt buộc để đăng nhập)
+ 7 router con thuộc luồng chat Zalo hiện đại (Extension + zca-js). Giữ
nguyên prefix/tag y hệt app gốc (`/zalo/...`) để frontend copy sang không
cần đổi path nào — xem docs/ZALO_CHAT_FEATURE_EXTRACTION_GUIDE.md.

`inbox_share` ("Tin nhắn KPI" — member tick chia sẻ 1 conversation để leader
verify KPI) ĐƯỢC GIỮ vì đây chính là cơ chế THẬT mà
ZaloInboxAdminShell.tsx/InboxShareToggle.tsx (frontend, đã giữ nguyên) dùng
để ghi vào `zalo_module_conversation_permissions` — không phải bolt-on tách
biệt như tưởng ban đầu (endpoint "share" đơn giản trong events.py mới là
phần đã bỏ, vì chỉ ZaloChatView.tsx — trang /zalo-chat cũ, KHÔNG copy sang —
mới gọi nó). Phụ thuộc `member_of_teams`/`teams` của app gốc — 2 bảng này
ĐÃ tồn tại sẵn trên server self-host dùng chung (không cần tạo lại, xem
README.md mục "Vì sao dùng chung app_users").
"""

from __future__ import annotations

from fastapi import APIRouter

from app.modules.all_platform.routers.auth import router as auth_router
from app.modules.all_platform.routers.users import router as users_router, teams_router

from app.modules.all_platform.zalo.api.routes.auth import router as zalo_auth_router
from app.modules.all_platform.zalo.api.routes.accounts import router as zalo_accounts_router
from app.modules.all_platform.zalo.api.routes.conversations import router as zalo_conversations_router
from app.modules.all_platform.zalo.api.routes.events import router as zalo_events_router
from app.modules.all_platform.zalo.api.routes.listener import router as zalo_listener_router
from app.modules.all_platform.zalo.api.routes.inbox_share import router as zalo_inbox_share_router
from app.modules.all_platform.zalo.api.routes.maintenance import router as zalo_maintenance_router

all_platform_router = APIRouter()

# ── Auth (đăng nhập app_users — dùng chung DB/JWT với app seeding, xem README) ─
all_platform_router.include_router(auth_router, prefix="/auth", tags=["All-Platform Auth"])
all_platform_router.include_router(users_router, prefix="/users", tags=["All-Platform Users"])
all_platform_router.include_router(teams_router, prefix="/teams", tags=["All-Platform Teams"])

# ── Zalo (extension login + zca-js worker/listener + nhắn-nhận tin) ──────────
all_platform_router.include_router(zalo_auth_router, prefix="/zalo", tags=["Zalo Auth"])
all_platform_router.include_router(zalo_accounts_router, prefix="/zalo", tags=["Zalo Accounts"])
all_platform_router.include_router(zalo_conversations_router, prefix="/zalo", tags=["Zalo Conversations"])
all_platform_router.include_router(zalo_events_router, prefix="/zalo", tags=["Zalo Events"])
all_platform_router.include_router(zalo_listener_router, prefix="/zalo", tags=["Zalo Listener"])
all_platform_router.include_router(zalo_inbox_share_router, prefix="/zalo", tags=["Zalo Inbox Share"])
all_platform_router.include_router(zalo_maintenance_router, prefix="/zalo", tags=["Zalo Maintenance"])
