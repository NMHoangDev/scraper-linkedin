"""Zalo crawler service — wraps Playwright crawl logic for the FastAPI backend."""
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
# headless=false by default — Zalo blocks headless Chrome
_HEADLESS: bool = os.getenv("ZALO_HEADLESS", "false").strip().lower() in ("1", "true", "yes")


def _get_target_groups() -> List[str]:
    raw = os.getenv("ZALO_TARGET_GROUPS", "")
    return [g.strip() for g in raw.split(",") if g.strip()]


# ── Job state ─────────────────────────────────────────────────────────────────

@dataclass
class ZaloCrawlJob:
    job_id: str
    groups: List[str]
    status: str = "pending"
    logs: List[str] = field(default_factory=list)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    results: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


_crawl_lock = threading.Lock()
_job_lock = threading.Lock()
_current_job: Optional[ZaloCrawlJob] = None


# ── Login browser session ─────────────────────────────────────────────────────

@dataclass
class _LoginSession:
    status: str = "opening"   # "opening" | "waiting" | "logged_in" | "closed"
    logged_in: bool = False
    error: Optional[str] = None
    sidebar_groups: List[str] = field(default_factory=list)
    refresh_requested: bool = False


_login_session: Optional[_LoginSession] = None
_login_session_lock = threading.Lock()
_login_close_evt = threading.Event()


def _run_login_browser() -> None:
    """Background thread: opens Chrome so the user can log in to Zalo."""
    global _login_session
    _login_close_evt.clear()
    try:
        with sync_playwright() as p:
            try:
                ctx = p.chromium.launch_persistent_context(
                    user_data_dir=PROFILE_DIR,
                    channel="chrome",
                    headless=False,
                    args=_ARGS,
                    locale="vi-VN",
                )
            except Exception as ex:
                with _login_session_lock:
                    if _login_session:
                        _login_session.status = "closed"
                        _login_session.error = str(ex)
                return

            ctx.add_init_script(_STEALTH)
            page = ctx.new_page()
            try:
                page.goto("https://chat.zalo.me", wait_until="domcontentloaded")
                page.wait_for_timeout(3000)
            except Exception:
                pass

            with _login_session_lock:
                if _login_session:
                    _login_session.status = "waiting"

            # Poll login state every 3 s until closed or logged in
            while not _login_close_evt.wait(timeout=3):
                try:
                    logged = _is_logged_in(page)
                except Exception:
                    logged = False
                with _login_session_lock:
                    if _login_session:
                        _login_session.logged_in = logged
                        if logged:
                            _login_session.status = "logged_in"

            try:
                ctx.close()
            except Exception:
                pass
    except Exception:
        pass
    finally:
        with _login_session_lock:
            if _login_session:
                _login_session.status = "closed"


def open_browser_for_login() -> Dict[str, Any]:
    """Open Chrome for the user to log in. Non-blocking — returns immediately."""
    global _login_session
    with _login_session_lock:
        if _login_session and _login_session.status in ("opening", "waiting", "logged_in"):
            return {
                "already_open": True,
                "status": _login_session.status,
                "logged_in": _login_session.logged_in,
            }
        _login_session = _LoginSession(status="opening")
    _login_close_evt.clear()
    threading.Thread(target=_run_login_browser, daemon=True).start()
    return {"already_open": False, "status": "opening", "logged_in": False}


def get_login_status() -> Dict[str, Any]:
    with _login_session_lock:
        if _login_session is None or _login_session.status == "closed":
            return {"browser_open": False, "logged_in": False, "status": "closed", "error": None}
        return {
            "browser_open": _login_session.status in ("waiting", "logged_in"),
            "logged_in": _login_session.logged_in,
            "status": _login_session.status,
            "error": _login_session.error,
        }


# ── File helpers ──────────────────────────────────────────────────────────────

def _group_dir_name(title: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', '_', title).strip()


def _group_output_dir(group_name: str) -> Optional[Path]:
    if not OUTPUT_DIR:
        return None
    return Path(OUTPUT_DIR) / _group_dir_name(group_name)


def load_group_messages(group_name: str) -> Optional[List[Dict[str, Any]]]:
    out = _group_output_dir(group_name)
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

def get_zalo_status() -> Dict[str, Any]:
    profile_ok = bool(PROFILE_DIR) and Path(PROFILE_DIR).exists()
    output_ok = bool(OUTPUT_DIR)
    gsheet_ok = bool(GSHEET_KEY_FILE) and Path(GSHEET_KEY_FILE).exists() and bool(GSHEET_ID)
    with _job_lock:
        job = _current_job
    return {
        "profileConfigured": profile_ok,
        "outputConfigured": output_ok,
        "gsheetConfigured": gsheet_ok,
        "ready": profile_ok and output_ok,
        "groupCount": len(_get_target_groups()),
        "currentJob": _job_to_dict(job),
    }


def get_configured_groups() -> List[Dict[str, Any]]:
    result = []
    for name in _get_target_groups():
        messages = load_group_messages(name)
        out_dir = _group_output_dir(name)
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
        "groups": job.groups,
        "status": job.status,
        "logs": job.logs[-100:],
        "startedAt": job.started_at.isoformat() if job.started_at else None,
        "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
        "results": job.results,
        "error": job.error,
    }


def get_crawl_status() -> Optional[Dict[str, Any]]:
    with _job_lock:
        return _job_to_dict(_current_job)


def start_crawl(groups: List[str]) -> Optional[ZaloCrawlJob]:
    global _current_job
    with _job_lock:
        if _current_job and _current_job.status in ("pending", "running"):
            return None
        job_id = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")
        job = ZaloCrawlJob(job_id=job_id, groups=groups)
        _current_job = job
    thread = threading.Thread(target=_run_crawl, args=(job,), daemon=True)
    thread.start()
    return job


def export_group(group_name: str) -> Dict[str, Any]:
    messages = load_group_messages(group_name)
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
# Zalo renders file attachments as an HTML preview with this footer text
_FILE_ATTACH_RE = re.compile(r'Tải về để xem lâu dài', re.IGNORECASE)
_DOCTYPE_RE = re.compile(r'<\s*!DOCTYPE', re.IGNORECASE)


def _clean(text: str) -> str:
    # Zalo file attachment: HTML blob with "Tải về để xem lâu dài" watermark
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
    """Return True if the Zalo chat UI is visible (not the login screen)."""
    try:
        url = page.url
        if "accounts.zalo.me" in url or "login" in url.lower():
            return False
        # Look for the conversation list — only present when logged in
        count = page.locator(
            "[class*='conversation'], [class*='contact-list'], [class*='sidebar'], [class*='chat-list']"
        ).count()
        return count > 0
    except Exception:
        return False


def _open_group(page: Any, title: str, log: List[str]) -> bool:
    """Try sidebar first, then fall back to Zalo's search box."""
    norm = " ".join(title.replace("\xa0", " ").split())

    # ── 1. Direct sidebar click ───────────────────────────────────────
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

    # ── 2. Zalo search box fallback ───────────────────────────────────
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
        # Try clicking a search icon first
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

        # Click the first result that matches
        for exact in (True, False):
            for t in (title, norm):
                try:
                    result = page.get_by_text(t, exact=exact)
                    if result.count() > 0:
                        result.first.click(timeout=8000)
                        page.wait_for_timeout(1500)
                        # Clear search
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
    """Download blob: image URLs while the Playwright session is alive and save them as files."""
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


def _crawl_all_messages(page: Any, root: Any, log: List[str]) -> List[Dict[str, Any]]:
    _scroll_bottom(root)
    page.wait_for_timeout(2000)
    all_msgs: Dict[Tuple[Any, Any, str], Tuple[int, int, Dict[str, Any]]] = {}
    stagnant = 0
    for round_idx in range(1, 200):
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
    # Close login browser if open — can't run two Playwright contexts on the same profile dir
    _login_close_evt.set()
    time.sleep(2)

    with _crawl_lock:
        job.status = "running"
        job.started_at = datetime.now(tz=timezone.utc)
        try:
            with sync_playwright() as p:
                browser = None
                try:
                    ctx = p.chromium.launch_persistent_context(
                        user_data_dir=PROFILE_DIR,
                        channel="chrome",
                        headless=_HEADLESS,
                        args=_ARGS,
                        locale="vi-VN",
                    )
                except Exception as ex:
                    log.append(f"Persistent context failed: {ex}. Using fresh context.")
                    browser = p.chromium.launch(headless=_HEADLESS, args=_ARGS)
                    ctx = browser.new_context(locale="vi-VN")

                ctx.add_init_script(_STEALTH)
                page = ctx.new_page()
                log.append("Opening chat.zalo.me ...")
                page.goto("https://chat.zalo.me", wait_until="domcontentloaded")

                # Wait for the UI to fully render (sidebar, conversation list)
                log.append("Waiting for Zalo to load ...")
                page.wait_for_timeout(8000)

                if not _is_logged_in(page):
                    raise RuntimeError(
                        "Zalo session expired or login required. "
                        "Re-login with the profile then restart the backend."
                    )
                log.append("Logged in — sidebar detected.")

                for group_name in job.groups:
                    log.append(f"\n=== {group_name} ===")
                    try:
                        if not _open_group(page, group_name, log):
                            log.append(f"Cannot open '{group_name}' — skipping.")
                            job.results[group_name] = {"success": False, "error": "Group not found in sidebar"}
                            continue
                        page.wait_for_timeout(3000)
                        root = _find_root(page)
                        messages = _crawl_all_messages(page, root, log)
                        out_dir = Path(OUTPUT_DIR) / _group_dir_name(group_name)
                        _download_images(page, messages, out_dir, log)
                        _save_messages(messages, out_dir / "messages.json")
                        _export_to_gsheet(messages, group_name, log)
                        job.results[group_name] = {"success": True, "messageCount": len(messages)}
                        page.wait_for_timeout(1500)
                    except Exception as ex:
                        log.append(f"Error: {ex}")
                        job.results[group_name] = {"success": False, "error": str(ex)}

                ctx.close()
                if browser is not None:
                    browser.close()

            job.status = "done"
        except Exception as ex:
            job.status = "error"
            job.error = str(ex)
            log.append(f"Fatal: {ex}")
        finally:
            job.finished_at = datetime.now(tz=timezone.utc)
