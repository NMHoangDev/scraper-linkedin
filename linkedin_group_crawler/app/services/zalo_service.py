"""Zalo crawler service — per-user login via QR screenshot + Playwright crawl."""
from __future__ import annotations

import base64 as _b64
import hashlib as _hashlib
import json
import os
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from playwright.sync_api import sync_playwright


# ── Config (env vars) ─────────────────────────────────────────────────────────

PROFILE_DIR: str = os.getenv("ZALO_PROFILE_DIR", "")
OUTPUT_DIR: str = os.getenv("ZALO_OUTPUT_DIR", "")
GSHEET_KEY_FILE: str = os.getenv("ZALO_GSHEET_KEY_FILE", "")
GSHEET_ID: str = os.getenv("ZALO_GSHEET_ID", "")
_HEADLESS: bool = os.getenv("ZALO_HEADLESS", "false").strip().lower() in ("1", "true", "yes")


def _get_target_groups() -> List[str]:
    raw = os.getenv("ZALO_TARGET_GROUPS", "")
    return [g.strip() for g in raw.split(",") if g.strip()]


def _sanitize_user_id(user_id: str) -> str:
    """Sanitize user_id to be safe as a directory name."""
    return re.sub(r"[^\w@.-]", "_", user_id.strip())[:64]


# ── Per-user login sessions ───────────────────────────────────────────────────

@dataclass
class _LoginSession:
    user_id: str
    status: str = "opening"   # opening | waiting | logged_in | closed
    logged_in: bool = False
    error: Optional[str] = None
    latest_screenshot: Optional[str] = None  # base64 PNG, updated by login thread
    close_evt: threading.Event = field(default_factory=threading.Event)


_login_sessions: Dict[str, _LoginSession] = {}
_login_sessions_lock = threading.Lock()


def _run_login_browser(user_id: str) -> None:
    """Background thread: opens Chrome for one user to log in, takes screenshots for QR display."""
    with _login_sessions_lock:
        session = _login_sessions.get(user_id)
    if not session:
        return

    profile_dir = str(Path(PROFILE_DIR) / user_id) if PROFILE_DIR else ""
    if profile_dir:
        Path(profile_dir).mkdir(parents=True, exist_ok=True)

    close_evt = session.close_evt
    close_evt.clear()

    try:
        with sync_playwright() as p:
            try:
                ctx = p.chromium.launch_persistent_context(
                    user_data_dir=profile_dir,
                    channel="chrome",
                    headless=False,
                    args=_ARGS,
                    locale="vi-VN",
                )
            except Exception as ex:
                with _login_sessions_lock:
                    s = _login_sessions.get(user_id)
                    if s:
                        s.status = "closed"
                        s.error = str(ex)
                return

            ctx.add_init_script(_STEALTH)
            page = ctx.new_page()
            try:
                page.goto("https://chat.zalo.me", wait_until="domcontentloaded")
                page.wait_for_timeout(3000)
            except Exception:
                pass

            with _login_sessions_lock:
                s = _login_sessions.get(user_id)
                if s:
                    s.status = "waiting"

            # Poll every 3 s: check login state + capture screenshot for QR display
            while not close_evt.wait(timeout=3):
                try:
                    logged = _is_logged_in(page)
                except Exception:
                    logged = False

                try:
                    shot = _b64.b64encode(page.screenshot(timeout=5000)).decode()
                except Exception:
                    shot = None

                with _login_sessions_lock:
                    s = _login_sessions.get(user_id)
                    if s:
                        s.logged_in = logged
                        if shot:
                            s.latest_screenshot = shot
                        if logged:
                            s.status = "logged_in"

            try:
                ctx.close()
            except Exception:
                pass
    except Exception:
        pass
    finally:
        with _login_sessions_lock:
            s = _login_sessions.get(user_id)
            if s:
                s.status = "closed"


def open_browser_for_login(user_id: str) -> Dict[str, Any]:
    """Open Chrome for a user to log in. Non-blocking."""
    uid = _sanitize_user_id(user_id)
    with _login_sessions_lock:
        existing = _login_sessions.get(uid)
        if existing and existing.status in ("opening", "waiting", "logged_in"):
            return {"already_open": True, "status": existing.status, "logged_in": existing.logged_in}
        session = _LoginSession(user_id=uid)
        _login_sessions[uid] = session
    threading.Thread(target=_run_login_browser, args=(uid,), daemon=True).start()
    return {"already_open": False, "status": "opening", "logged_in": False}


def get_login_screenshot(user_id: str) -> Optional[str]:
    """Return the latest base64 PNG screenshot from the user's login browser (shows QR code)."""
    uid = _sanitize_user_id(user_id)
    with _login_sessions_lock:
        session = _login_sessions.get(uid)
    return session.latest_screenshot if session else None


def get_login_status(user_id: str) -> Dict[str, Any]:
    uid = _sanitize_user_id(user_id)
    with _login_sessions_lock:
        session = _login_sessions.get(uid)
    if session is None or session.status == "closed":
        # Profile dir with files means previously logged in
        profile_path = (Path(PROFILE_DIR) / uid) if PROFILE_DIR else None
        already = bool(profile_path and profile_path.exists() and any(profile_path.iterdir()))
        return {"browser_open": False, "logged_in": already, "status": "logged_in" if already else "closed", "error": None}
    return {
        "browser_open": session.status in ("waiting", "logged_in"),
        "logged_in": session.logged_in,
        "status": session.status,
        "error": session.error,
    }


def close_login_browser(user_id: str) -> None:
    uid = _sanitize_user_id(user_id)
    with _login_sessions_lock:
        session = _login_sessions.get(uid)
    if session:
        session.close_evt.set()


# ── Per-user crawl jobs ───────────────────────────────────────────────────────

@dataclass
class ZaloCrawlJob:
    job_id: str
    user_id: str
    groups: List[str]
    status: str = "pending"
    phase: str = "login"          # "login" | "crawling"
    screenshot: Optional[str] = None  # base64 PNG while waiting for QR scan
    logs: List[str] = field(default_factory=list)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    results: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    stop_evt: threading.Event = field(default_factory=threading.Event)


_job_lock = threading.Lock()
_user_jobs: Dict[str, ZaloCrawlJob] = {}       # user_id -> current job
_user_crawl_locks: Dict[str, threading.Lock] = {}  # user_id -> lock


def _get_crawl_lock(user_id: str) -> threading.Lock:
    with _job_lock:
        if user_id not in _user_crawl_locks:
            _user_crawl_locks[user_id] = threading.Lock()
        return _user_crawl_locks[user_id]


# ── File helpers (per-user) ───────────────────────────────────────────────────

def _group_dir_name(title: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', '_', title).strip()


def _group_output_dir(group_name: str, user_id: str) -> Optional[Path]:
    if not OUTPUT_DIR:
        return None
    return Path(OUTPUT_DIR) / user_id / _group_dir_name(group_name)


def load_group_messages(group_name: str, user_id: str) -> Optional[List[Dict[str, Any]]]:
    out = _group_output_dir(group_name, user_id)
    if out is None:
        return None
    path = out / "messages.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_messages(messages: List[Dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)


# ── Public API ────────────────────────────────────────────────────────────────

def get_zalo_status(user_id: str) -> Dict[str, Any]:
    uid = _sanitize_user_id(user_id)
    output_ok = bool(OUTPUT_DIR)
    gsheet_ok = bool(GSHEET_KEY_FILE) and Path(GSHEET_KEY_FILE).exists() and bool(GSHEET_ID)
    with _job_lock:
        job = _user_jobs.get(uid)
    return {
        "profileConfigured": True,  # no longer needed — session is per-crawl
        "outputConfigured": output_ok,
        "gsheetConfigured": gsheet_ok,
        "ready": output_ok,
        "groupCount": len(_get_target_groups()),
        "currentJob": _job_to_dict(job),
    }


def get_configured_groups(user_id: str) -> List[Dict[str, Any]]:
    uid = _sanitize_user_id(user_id)
    result = []
    for name in _get_target_groups():
        messages = load_group_messages(name, uid)
        out_dir = _group_output_dir(name, uid)
        last_crawl = None
        if out_dir:
            msg_path = out_dir / "messages.json"
            if msg_path.exists():
                mtime = msg_path.stat().st_mtime
                last_crawl = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
        result.append({
            "id": re.sub(r"[^a-zA-Z0-9_-]", "_", name),
            "name": name,
            "messageCount": len(messages) if messages is not None else 0,
            "lastCrawl": last_crawl,
            "hasCrawledData": messages is not None,
        })
    return result


def _job_to_dict(job: Optional[ZaloCrawlJob]) -> Optional[Dict[str, Any]]:
    if job is None:
        return None
    return {
        "jobId": job.job_id,
        "userId": job.user_id,
        "groups": job.groups,
        "status": job.status,
        "phase": job.phase,
        "logs": job.logs[-100:],
        "startedAt": job.started_at.isoformat() if job.started_at else None,
        "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
        "results": job.results,
        "error": job.error,
    }


def get_crawl_screenshot(user_id: str) -> Optional[str]:
    """Return the stored screenshot for the current login phase (on-demand only)."""
    uid = _sanitize_user_id(user_id)
    with _job_lock:
        job = _user_jobs.get(uid)
    if job is None or job.phase != "login":
        return None
    return job.screenshot  # written by crawl thread; safe string read under CPython GIL


def get_crawl_status(user_id: str) -> Optional[Dict[str, Any]]:
    uid = _sanitize_user_id(user_id)
    with _job_lock:
        return _job_to_dict(_user_jobs.get(uid))


def start_crawl(user_id: str, groups: List[str]) -> Optional[ZaloCrawlJob]:
    uid = _sanitize_user_id(user_id)
    with _job_lock:
        existing = _user_jobs.get(uid)
        if existing and existing.status in ("pending", "running"):
            return None
        job_id = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")
        job = ZaloCrawlJob(job_id=job_id, user_id=uid, groups=groups)
        _user_jobs[uid] = job
    threading.Thread(target=_run_crawl, args=(job,), daemon=True).start()
    return job


def stop_crawl(user_id: str) -> Dict[str, Any]:
    uid = _sanitize_user_id(user_id)
    with _job_lock:
        job = _user_jobs.get(uid)
    if job:
        job.stop_evt.set()
        if job.status in ("pending", "running"):
            job.status = "stopped"
            job.logs.append("Stopped by user.")
            job.finished_at = datetime.now(tz=timezone.utc)
    return {"stopped": True}


def export_group(group_name: str, user_id: str) -> Dict[str, Any]:
    uid = _sanitize_user_id(user_id)
    messages = load_group_messages(group_name, uid)
    if messages is None:
        return {"success": False, "error": "No crawled data found for this group"}
    log: List[str] = []
    _export_to_gsheet(messages, group_name, log)
    return {"success": True, "logs": log, "messageCount": len(messages)}


# ── Playwright helpers ────────────────────────────────────────────────────────

_STEALTH = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    if (!window.chrome) { window.chrome = { runtime:{}, loadTimes:function(){}, csi:function(){}, app:{} }; }
    Object.defineProperty(navigator, 'plugins', { get: () => { const a=[1,2,3,4,5]; a.__proto__=PluginArray.prototype; return a; } });
    Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN','vi','en-US','en'] });
"""

_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-infobars",
    "--disable-dev-shm-usage",
    "--window-size=1366,768",
    "--lang=vi-VN",
    "--disable-features=IsolateOrigins,site-per-process",
]

_EXTRACT_JS = r"""el => {
  const sel = "[class*='msg'],[class*='chat-message'],[class*='message-item'],[data-qa*='message'],[class*='bubble']";
  const all = Array.from(el.querySelectorAll(sel));
  const dateRe = /^(Hôm nay|Hôm qua|Yesterday|Today|\d{1,2}\s+tháng\s+\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|Thứ\s+\S+)/i;
  const top = all.filter(n => {
    const t = n.innerText.trim();
    if (dateRe.test(t) && t.length < 60) return false;
    let p = n.parentElement;
    while (p && p !== el) { if (p.matches(sel)) return false; p = p.parentElement; }
    return true;
  });
  const timeRe = /^\d{1,2}:\d{2}$/;
  return top.map(e => {
    const senderEl = e.querySelector('.message-sender-name-content');
    const cls = Array.from(e.classList).join(' ');
    const isSent = /\b(send-msg|msg-send|msg--out|msg-item--out|own-msg)\b/i.test(cls) ||
      (() => { const r = e.getBoundingClientRect(); return r.width > 40 && r.left > window.innerWidth * 0.45; })();
    let timeText = null;
    for (const t of e.querySelectorAll('[class*="time"],[class*="meta"]')) {
      if (timeRe.test(t.innerText.trim())) { timeText = t.innerText.trim(); break; }
    }
    const cEl = e.querySelector('[class*="content"],[class*="text"],[class*="body"]');
    const raw = e.innerText.trim();
    const imgs = Array.from(e.querySelectorAll('img[src]'))
      .filter(i => !i.classList.contains('a-child') && i.src && !i.src.startsWith('data:') && !i.closest('.message-reaction-container'))
      .map(i => i.src);
    let sender = senderEl ? senderEl.innerText.trim() : null;
    if (!sender && isSent) sender = '__me__';
    return { sender, time_text: timeText, content: cEl ? cEl.innerText.trim() : raw, raw, image_urls: imgs, is_sent: isSent, top: e.getBoundingClientRect().top + window.scrollY };
  });
}"""

_EMOJI_RE = re.compile(r'^(/-\w+|:[>oOdDpPsS*]|:-+[()\[\]hHdD|/*]+|;-\)|b-\))+$', re.IGNORECASE)
_TIME_RE = re.compile(r'^\d{1,2}:\d{2}$')
_SYSTEM_RE = re.compile(r'Sử dụng Zalo PC|Tải Zalo PC')
_DATE_SEP_RE = re.compile(
    r'^(Hôm nay|Hôm qua|Yesterday|Today|\d{1,2}\s+tháng\s+\d{1,2}|\d{1,2}/\d{1,2}/\d{2,4}|Thứ\s+\w+)',
    re.IGNORECASE | re.UNICODE,
)
_FILE_ATTACH_RE = re.compile(r'Tải về để xem lâu dài', re.IGNORECASE)
_DOCTYPE_RE = re.compile(r'<\s*!DOCTYPE', re.IGNORECASE)


def _clean(text: str) -> str:
    if _FILE_ATTACH_RE.search(text):
        first_line = _DOCTYPE_RE.split(text.split('\n')[0])[0].strip()
        name = first_line if first_line else "file đính kèm"
        return f"[File: {name}]"
    lines = text.split('\n')
    while lines and (_EMOJI_RE.fullmatch(lines[-1].strip()) or _TIME_RE.fullmatch(lines[-1].strip())):
        lines.pop()
    return '\n'.join(lines).strip()


def _is_junk(msg: Dict[str, Any]) -> bool:
    c = (msg.get('content') or '').strip()
    return (not c or _EMOJI_RE.fullmatch(c) is not None or _TIME_RE.fullmatch(c) is not None
            or bool(_SYSTEM_RE.search(c)) or _DATE_SEP_RE.fullmatch(c) is not None)


def _propagate_sender(msgs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    last = None
    out = []
    for m in msgs:
        if m.get('is_sent'):
            out.append(m)
            continue
        if m['sender'] and m['sender'] != '__me__':
            last = m['sender']
        elif not m['sender'] and last:
            m = dict(m)
            m['sender'] = last
        out.append(m)
    return out


def _extract(root: Any) -> List[Dict[str, Any]]:
    try:
        nodes = root.evaluate(_EXTRACT_JS)
    except Exception:
        nodes = []
    msgs, seen = [], set()
    for n in nodes:
        raw = (n.get('raw') or '').strip()
        if not raw:
            continue
        top = float(n.get('top', 0.0))
        key: Tuple[float, str] = (round(top, 1), raw[:200])
        if key in seen:
            continue
        seen.add(key)
        msgs.append({
            'sender': (n.get('sender') or '').strip() or None,
            'time_text': (n.get('time_text') or '').strip() or None,
            'content': _clean((n.get('content') or '').strip() or raw),
            'raw': raw,
            'image_urls': n.get('image_urls') or [],
            'is_sent': bool(n.get('is_sent')),
            'top': top,
        })
    return _propagate_sender([m for m in sorted(msgs, key=lambda x: x['top']) if not _is_junk(m)])


def _scroll_up(root: Any) -> None:
    try:
        root.evaluate("""el => {
            const sels=['.message-view__scroll','[class*="message-view__scroll"]','[class*="msg-list-scroll"]'];
            let t=null;
            for(const s of sels){const f=el.querySelector(s)||document.querySelector(s);if(f&&f.scrollHeight>f.clientHeight+10){t=f;break;}}
            if(!t){let b=-1;for(const n of[el,...el.querySelectorAll('*')]){const oy=getComputedStyle(n).overflowY;if((oy==='auto'||oy==='scroll')&&n.scrollHeight>n.clientHeight+10){const sc=n.scrollHeight-n.clientHeight;if(sc>b){b=sc;t=n;}}}}
            if(!t)return;
            t.scrollTop=Math.max(0,t.scrollTop-t.clientHeight);
            t.dispatchEvent(new Event('scroll',{bubbles:true}));
        }""")
    except Exception:
        pass


def _scroll_bottom(root: Any) -> None:
    try:
        root.evaluate("""el => {
            const sels=['.message-view__scroll','[class*="message-view__scroll"]'];
            let t=null;
            for(const s of sels){const f=el.querySelector(s)||document.querySelector(s);if(f){t=f;break;}}
            if(!t){let b=-1;for(const n of[el,...el.querySelectorAll('*')]){const oy=getComputedStyle(n).overflowY;if((oy==='auto'||oy==='scroll')&&n.scrollHeight>n.clientHeight+10){const sc=n.scrollHeight-n.clientHeight;if(sc>b){b=sc;t=n;}}}}
            if(t){t.scrollTop=t.scrollHeight;t.dispatchEvent(new Event('scroll',{bubbles:true}));}
        }""")
    except Exception:
        pass


def _find_root(page: Any) -> Any:
    best, best_score = None, (-1, -1)
    for sel in ["main", "[role='main']", "[class*='conversation']", "[class*='chat']"]:
        try:
            loc = page.locator(sel)
            for i in range(min(loc.count(), 3)):
                cand = loc.nth(i)
                try:
                    sc = cand.evaluate("el=>{const n=el.querySelectorAll(\"[class*='msg'],[class*='message']\");return[n.length,(el.innerText||'').length];}")
                    s = (int(sc[0]), int(sc[1]))
                    if s > best_score:
                        best_score, best = s, cand
                except Exception:
                    pass
        except Exception:
            pass
    return best if best is not None else page


def _is_logged_in(page: Any) -> bool:
    try:
        url = page.url
        if "accounts.zalo.me" in url or "login" in url.lower():
            return False
        count = page.locator(
            "[class*='conversation'], [class*='contact-list'], [class*='sidebar'], [class*='chat-list']"
        ).count()
        return count > 0
    except Exception:
        return False


def _open_group(page: Any, title: str, log: List[str]) -> bool:
    norm = " ".join(title.replace("\xa0", " ").split())

    for exact in (True, False):
        for t in (title, norm):
            try:
                loc = page.get_by_text(t, exact=exact)
                if loc.count() > 0:
                    loc.first.scroll_into_view_if_needed()
                    loc.first.click(timeout=10000)
                    page.wait_for_timeout(1500)
                    log.append(f"Opened via sidebar: {t}")
                    return True
            except Exception:
                pass

    log.append(f"Sidebar lookup failed — trying search box for '{title}'")
    search_selectors = [
        "input[placeholder*='Tìm']",
        "input[placeholder*='Search']",
        "input[type='search']",
        "[class*='search'] input",
        "[class*='Search'] input",
    ]
    search_input = None
    for sel in search_selectors:
        try:
            loc = page.locator(sel).first
            if loc.is_visible(timeout=3000):
                search_input = loc
                break
        except Exception:
            pass

    if search_input is None:
        try:
            page.locator("[class*='search-icon'], [class*='btn-search']").first.click(timeout=3000)
            page.wait_for_timeout(800)
            for sel in search_selectors:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible(timeout=2000):
                        search_input = loc
                        break
                except Exception:
                    pass
        except Exception:
            pass

    if search_input is None:
        log.append("Could not find Zalo search input.")
        return False

    try:
        search_input.click(timeout=5000)
        page.wait_for_timeout(500)
        search_input.fill(norm)
        page.wait_for_timeout(2000)

        for exact in (True, False):
            for t in (title, norm):
                try:
                    result = page.get_by_text(t, exact=exact)
                    if result.count() > 0:
                        result.first.click(timeout=8000)
                        page.wait_for_timeout(1500)
                        try:
                            search_input.fill("")
                        except Exception:
                            pass
                        log.append(f"Opened via search: {t}")
                        return True
                except Exception:
                    pass

        log.append("Search returned no matching result.")
        return False
    except Exception as ex:
        log.append(f"Search fallback error: {ex}")
        return False


_IMG_EXTS = {"image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/jpeg": "jpg"}

_BLOB_FETCH_JS = """async (url) => {
    try {
        const r = await fetch(url);
        const blob = await r.blob();
        return await new Promise(res => {
            const fr = new FileReader();
            fr.onloadend = () => res(fr.result);
            fr.readAsDataURL(blob);
        });
    } catch { return null; }
}"""


def _download_images(page: Any, messages: List[Dict[str, Any]], out_dir: Path, log: List[str]) -> None:
    img_dir = out_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    for msg in messages:
        new_urls: List[str] = []
        files: List[str] = list(msg.get("image_files") or [])
        for url in msg.get("image_urls", []):
            if not url.startswith("blob:"):
                new_urls.append(url)
                continue
            try:
                b64str = page.evaluate(_BLOB_FETCH_JS, url)
                if not b64str or not isinstance(b64str, str) or "," not in b64str:
                    continue
                header, data = b64str.split(",", 1)
                mime = header.split(";")[0].replace("data:", "").strip()
                ext = _IMG_EXTS.get(mime, "jpg")
                h = _hashlib.md5(url.encode()).hexdigest()[:12]
                fname = f"img_{h}.{ext}"
                (img_dir / fname).write_bytes(_b64.b64decode(data))
                files.append(fname)
                downloaded += 1
            except Exception as ex:
                log.append(f"Image download error: {ex}")
        msg["image_urls"] = new_urls
        if files:
            msg["image_files"] = files
    if downloaded:
        log.append(f"Downloaded {downloaded} images to {img_dir}.")


def _crawl_all_messages(
    page: Any, root: Any, log: List[str], stop_evt: Optional[threading.Event] = None
) -> List[Dict[str, Any]]:
    _scroll_bottom(root)
    page.wait_for_timeout(2000)
    all_msgs: Dict[Tuple[Any, Any, str], Tuple[int, int, Dict[str, Any]]] = {}
    stagnant = 0
    for round_idx in range(1, 200):
        if stop_evt and stop_evt.is_set():
            log.append("Crawl stopped by user.")
            break
        batch = _extract(root)
        new_count = 0
        for pos, msg in enumerate(batch):
            key = (msg.get('sender'), msg.get('time_text'), msg['raw'][:200])
            if key not in all_msgs:
                all_msgs[key] = (round_idx, pos, msg)
                new_count += 1
        log.append(f"Round {round_idx}: +{new_count} new, total={len(all_msgs)}")
        _scroll_up(root)
        stagnant = 0 if new_count > 0 else stagnant + 1
        if stagnant >= 8:
            log.append("Reached history limit.")
            break
        page.wait_for_timeout(3000)
    ordered = [msg for _, _, msg in sorted(all_msgs.values(), key=lambda x: (-x[0], x[1]))]
    log.append(f"Collected {len(ordered)} messages total.")
    return ordered


def _export_to_gsheet(messages: List[Dict[str, Any]], group_name: str, log: List[str]) -> None:
    if not GSHEET_KEY_FILE or not GSHEET_ID:
        log.append("Google Sheets not configured (ZALO_GSHEET_KEY_FILE / ZALO_GSHEET_ID missing).")
        return
    try:
        import gspread  # type: ignore
        from google.oauth2.service_account import Credentials  # type: ignore
        creds = Credentials.from_service_account_file(
            GSHEET_KEY_FILE,
            scopes=["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"],
        )
        gc = gspread.authorize(creds)
        sh = gc.open_by_key(GSHEET_ID)
        safe_name = group_name[:100]
        try:
            ws = sh.worksheet(safe_name)
            ws.clear()
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=safe_name, rows=len(messages) + 10, cols=5)
        rows = [["#", "sender", "time_text", "is_sent", "content"]] + [
            [i + 1, m.get("sender") or "", m.get("time_text") or "",
             "yes" if m.get("is_sent") else "", m.get("content") or ""]
            for i, m in enumerate(messages)
        ]
        ws.update(rows, value_input_option="RAW")
        log.append(f"Exported {len(messages)} rows → worksheet '{safe_name}'")
    except Exception as ex:
        log.append(f"Google Sheets export failed: {ex}")


# ── Crawl thread ──────────────────────────────────────────────────────────────

def _run_crawl(job: ZaloCrawlJob) -> None:
    log = job.logs
    uid = job.user_id
    stop_evt = job.stop_evt  # per-job — no cross-job interference

    crawl_lock = _get_crawl_lock(uid)
    with crawl_lock:
        # If caller already cancelled before we got the lock, bail immediately
        if stop_evt.is_set():
            job.status = "stopped"
            job.finished_at = datetime.now(tz=timezone.utc)
            return
        job.status = "running"
        job.started_at = datetime.now(tz=timezone.utc)
        try:
            with sync_playwright() as p:
                # Fresh browser — no persistent profile, no saved session
                browser = p.chromium.launch(headless=_HEADLESS, args=_ARGS)
                ctx = browser.new_context(locale="vi-VN")
                ctx.add_init_script(_STEALTH)
                page = ctx.new_page()

                # Auto-stop when user closes the browser window
                page.on("close", lambda: stop_evt.set())

                log.append("Opening chat.zalo.me ...")
                try:
                    page.goto("https://chat.zalo.me", wait_until="domcontentloaded")
                    page.wait_for_timeout(3000)
                except Exception:
                    if stop_evt.is_set():
                        log.append("Browser closed by user.")
                        return
                    raise

                # ── Wait for QR scan ────────────────────────────────────────
                if not _is_logged_in(page):
                    log.append("Waiting for QR scan...")
                    try:
                        job.screenshot = _b64.b64encode(page.screenshot(timeout=5000)).decode()
                    except Exception:
                        pass
                    deadline = time.time() + 300  # 5-minute timeout
                    while not stop_evt.is_set() and time.time() < deadline:
                        try:
                            if _is_logged_in(page):
                                break
                        except Exception:
                            # Page threw — browser was closed
                            stop_evt.set()
                            break
                        stop_evt.wait(timeout=3)
                    job.screenshot = None

                    if stop_evt.is_set():
                        log.append("Browser closed or cancelled during login.")
                        return

                    if not _is_logged_in(page):
                        raise RuntimeError("Login timeout (5 min). Please try again.")

                # ── Wait for Zalo to sync messages ──────────────────────────
                job.phase = "crawling"
                log.append("Logged in. Waiting for Zalo to sync messages...")
                for _ in range(5):  # 10 s total, interruptible
                    if stop_evt.is_set():
                        break
                    page.wait_for_timeout(2000)

                if stop_evt.is_set():
                    log.append("Stopped while waiting for sync.")
                    return

                # ── Crawl groups ────────────────────────────────────────────
                log.append("Starting crawl.")
                for group_name in job.groups:
                    if stop_evt.is_set():
                        log.append("Crawl stopped.")
                        break
                    log.append(f"\n=== {group_name} ===")
                    try:
                        if not _open_group(page, group_name, log):
                            log.append(f"Cannot open '{group_name}' — skipping.")
                            job.results[group_name] = {"success": False, "error": "Group not found in sidebar"}
                            continue
                        page.wait_for_timeout(3000)
                        root = _find_root(page)
                        messages = _crawl_all_messages(page, root, log, stop_evt)
                        if OUTPUT_DIR:
                            out_dir = Path(OUTPUT_DIR) / uid / _group_dir_name(group_name)
                            _download_images(page, messages, out_dir, log)
                            _save_messages(messages, out_dir / "messages.json")
                        _export_to_gsheet(messages, group_name, log)
                        job.results[group_name] = {"success": True, "messageCount": len(messages)}
                        page.wait_for_timeout(1500)
                    except Exception as ex:
                        log.append(f"Error: {ex}")
                        job.results[group_name] = {"success": False, "error": str(ex)}
                        if stop_evt.is_set():
                            break

                try:
                    ctx.close()
                except Exception:
                    pass
                try:
                    browser.close()
                except Exception:
                    pass

            job.status = "stopped" if stop_evt.is_set() else "done"
        except Exception as ex:
            job.status = "error"
            job.error = str(ex)
            log.append(f"Fatal: {ex}")
        finally:
            job.screenshot = None
            job.finished_at = datetime.now(tz=timezone.utc)
