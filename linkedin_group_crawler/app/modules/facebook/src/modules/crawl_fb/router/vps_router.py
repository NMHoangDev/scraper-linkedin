from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.modules.all_platform.auth_deps import require_admin
from app.modules.facebook.src.modules.crud.vps_fb.vps_fb import (
    get_all_vps_fb,
    create_vps_fb,
    update_vps_fb,
    delete_vps_fb,
)
from app.modules.facebook.src.modules.crud.vps_fb.vps_cookie import (
    get_all_vps_cookies,
    get_vps_cookies_by_vps_id,
    create_vps_cookie,
    delete_vps_cookie,
)

router = APIRouter(
    prefix="/vps_fb",
    tags=["vps_fb"],
)

# Trước đây file này không có bất kỳ auth nào — /vps_fb/cookies/all trả nguyên
# session cookie Facebook thật của mọi VPS cho bất kỳ ai gọi, không cần đăng
# nhập. Chiếm đoạt cookie = đăng nhập thẳng vào acc mà không cần mật khẩu/2FA.
Admin = Depends(require_admin)

# --- MODELS FOR VPS_FB ---
class VpsFbCreate(BaseModel):
    name: str
    http: str
    active_session: int = 0
    active: bool = True

class VpsFbUpdate(BaseModel):
    name: Optional[str] = None
    http: Optional[str] = None
    active_session: Optional[int] = None
    active: Optional[bool] = None

# --- MODELS FOR VPS_COOKIE ---
class VpsCookieCreate(BaseModel):
    vps_fb_id: Optional[int] = None
    cookie: Dict[str, Any]
    status: Optional[str] = "idle"
    email: Optional[str] = None
    id_member: Optional[str] = None

# ==========================================
# ROUTES FOR VPS_FB
# ==========================================
@router.get("")
def get_vps_list(_admin: dict = Admin):
    try:
        data = get_all_vps_fb()
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("")
def create_vps(vps: VpsFbCreate, _admin: dict = Admin):
    try:
        data = create_vps_fb(vps.model_dump())
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.put("/{vps_id}")
def update_vps(vps_id: int, vps: VpsFbUpdate, _admin: dict = Admin):
    update_data = vps.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        data = update_vps_fb(vps_id, update_data)
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.delete("/{vps_id}")
def delete_vps(vps_id: int, _admin: dict = Admin):
    try:
        data = delete_vps_fb(vps_id)
        return {"data": data, "message": "Deleted successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# ==========================================
# ROUTES FOR VPS_COOKIE
# ==========================================
@router.get("/cookies/all")
def get_all_cookies(_admin: dict = Admin):
    try:
        data = get_all_vps_cookies()
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/{vps_id}/cookies")
def get_cookies_by_vps(vps_id: int, _admin: dict = Admin):
    try:
        data = get_vps_cookies_by_vps_id(vps_id)
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/cookies")
def create_cookie(cookie_data: VpsCookieCreate, _admin: dict = Admin):
    try:
        data = create_vps_cookie(cookie_data.model_dump(exclude_unset=True))
        return {"data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.delete("/cookies/{cookie_id}")
def delete_cookie(cookie_id: str, _admin: dict = Admin):
    try:
        data = delete_vps_cookie(cookie_id)
        return {"data": data, "message": "Cookie deleted successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
