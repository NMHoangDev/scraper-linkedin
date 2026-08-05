"""Online/Total account summary across platforms (Facebook + Zalo).

Tai su dung nguyen ven logic phan quyen + lay du lieu da co san:
  - Facebook: `_scope_query`/`_markee_json` cua routers/fb.py (proxy Markee /sessions).
  - Zalo: `list_accounts()` cua zalo/api/routes/accounts.py (DB + listener status).

Khong tao ban ghi/endpoint moi o phia Markee/Zalo - chi GOM lai thanh 1 con so
Online/Total cho dashboard. Moi nen tang duoc try/except RIENG: 1 ben loi (Markee
sap, Zalo loi) khong duoc lam hong ben con lai hay ca endpoint.
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.modules.all_platform.auth_deps import get_current_user
from app.modules.all_platform.routers.fb import _allowed_owners, _markee_json, _scope_query
from app.modules.all_platform.services import get_all_users
from app.modules.all_platform.zalo.api.routes.accounts import list_accounts as zalo_list_accounts

router = APIRouter()


def _owner_names() -> dict[str, str]:
    """Map id_member -> ten hien thi, dung lam fallback ten khi session/account
    chua duoc doi ten thu cong (label mac dinh = trung voi id, vo nghia de nhan
    dang). `get_all_users()` da tu cache o service layer nen goi lai o day khong
    tao them tai truy van DB."""
    try:
        return {
            str(row.get("id")): str(row.get("name") or row.get("email") or "").strip()
            for row in get_all_users()
            if row.get("id")
        }
    except Exception:
        return {}


async def _facebook_online_total(user: dict[str, Any]) -> dict[str, Any]:
    try:
        status, payload = await _markee_json("GET", "/sessions", params=_scope_query(user), cache_ttl=5.0)
        if status >= 500:
            raise RuntimeError(f"Markee tra ve status {status}")
        sessions = (payload or {}).get("sessions") or []
        owner_names = _owner_names()
        # Danh sach ten hien thi cho tung session - dung de UI show ro dang la tai
        # khoan nao online, khong chi 1 con so. Label mac dinh cua Markee = trung
        # voi user_id (chua doi ten) nen PHAI loai truong hop do (giong accLabel o
        # FE) roi moi fallback ve email/ten nguoi so huu/"Tai khoan Facebook".
        account_list = []
        for s in sessions:
            uid = str(s.get("user_id") or "")
            label = str(s.get("label") or "").strip()
            if not label or label == uid:
                label = (
                    str(s.get("email") or "").strip()
                    or owner_names.get(str(s.get("owner") or ""))
                    or "Tài khoản Facebook"
                )
            account_list.append({
                "label": label,
                "online": bool(s.get("online")) and not s.get("expired") and not s.get("needs_relogin"),
            })
        online = sum(1 for acc in account_list if acc["online"])
        return {
            "platform": "facebook",
            "online": online,
            "total": len(sessions),
            "available": True,
            "error": None,
            "accounts": account_list,
        }
    except HTTPException as exc:
        return {"platform": "facebook", "online": 0, "total": 0, "available": False, "error": str(exc.detail), "accounts": []}
    except Exception as exc:  # Markee down/timeout/malformed payload - khong duoc sap ca endpoint
        return {"platform": "facebook", "online": 0, "total": 0, "available": False, "error": str(exc), "accounts": []}


async def _zalo_online_total(user: dict[str, Any]) -> dict[str, Any]:
    try:
        email = str(user.get("email") or "").strip().lower() or None
        result = await zalo_list_accounts(
            owner_id=None,
            id_member=None,
            x_user_id=str(user.get("id") or "default"),
            caller_email=email,
        )
        accounts = (result or {}).get("accounts") or []
        owner_names = _owner_names()
        account_list = []
        for acc in accounts:
            account_id = str(acc.get("account_id") or "")
            label = str(acc.get("label") or "").strip()
            if not label or label == account_id:
                label = owner_names.get(str(acc.get("id_member") or "")) or "Tài khoản Zalo"
            account_list.append({
                "label": label,
                "online": (acc.get("listener") or {}).get("connected") is True,
            })
        online = sum(1 for acc in account_list if acc["online"])
        return {
            "platform": "zalo",
            "online": online,
            "total": len(accounts),
            "available": True,
            "error": None,
            "accounts": account_list,
        }
    except Exception as exc:  # Zalo listener/DB loi - khong duoc sap ca endpoint
        return {"platform": "zalo", "online": 0, "total": 0, "available": False, "error": str(exc), "accounts": []}


@router.get("/online-summary")
async def accounts_online_summary(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Online/Total theo tung nen tang cho dashboard.

    - admin: toan he thong (allowed_owners=None -> Markee/Zalo tu tra tat ca).
    - leader: chinh minh + thanh vien team minh quan ly (dung lai _allowed_owners
      cho FB va id_member cho Zalo - ca 2 co san tu truoc, khong tu viet lai).
    - member: chi tai khoan cua chinh minh.

    TikTok CHUA duoc dua vao day - chua co module nao ton tai de lay du lieu that.
    Tong chi cong Facebook + Zalo (khong tinh TikTok).
    """
    # Ca 2 helper deu tu bat loi rieng (khong raise ra ngoai) nen chay song song
    # an toan - 1 nen tang cham/loi khong lam cham/hong nen tang con lai.
    facebook, zalo = await asyncio.gather(
        _facebook_online_total(user),
        _zalo_online_total(user),
    )

    total_online = facebook["online"] + zalo["online"]
    total_total = facebook["total"] + zalo["total"]

    return {
        "success": True,
        "data": {
            "facebook": facebook,
            "zalo": zalo,
            "total": {"online": total_online, "total": total_total},
        },
    }
