from playwright.sync_api import sync_playwright
import json
import re
import os
import base64
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GSHEET_KEY_FILE = os.getenv("GSHEET_KEY_FILE") or None
GSHEET_ID = os.getenv("GSHEET_ID") or None


_tg = os.getenv("TARGET_GROUPS")
if _tg:
    if '|' in _tg:
        TARGET_GROUPS = [s.strip() for s in _tg.split('|') if s.strip()]
    else:
        TARGET_GROUPS = [s.strip() for s in _tg.split(',') if s.strip()]
else:
    TARGET_GROUPS = [
        "[SZ] Track3: Dev + AI Interns 04/2026",
        "[Sz] AI Team - Interns",
        "[SZ] Marketing New member",
    ]

# PROFILE_DIR and OUTPUT_DIR default to relative paths under the repo if not set
PROFILE_DIR = os.getenv("PROFILE_DIR") or os.path.join(os.getcwd(), "zalo-profile")
OUTPUT_DIR = os.getenv("OUTPUT_DIR") or os.path.join(os.getcwd(), "zalo_data")


def normalize_title(text):
    return " ".join(text.replace("\xa0", " ").split())


def open_target_group(page, target_group_title, timeout_ms=15000):
    target_text = normalize_title(target_group_title)

    for exact in (True, False):
        for title in (target_group_title, target_text):
            try:
                locator = page.get_by_text(title, exact=exact)
                if locator.count() > 0:
                    locator.first.scroll_into_view_if_needed()
                    locator.first.click(timeout=timeout_ms)
                    print(f"Opened group '{title}' (exact={exact})")
                    return True
            except Exception:
                continue

    print(f"Warning: could not auto-open '{target_group_title}'. Open it manually then press Enter.")
    return False


def wait_for_group_title(page, expected_title=None, timeout_ms=15000):
    title_locator = page.locator("div.header-title, [class*='header-title']")
    try:
        title_locator.first.wait_for(state="visible", timeout=timeout_ms)
        current_title = normalize_title(title_locator.first.inner_text())
        print(f"Current group title: {current_title}")
        return current_title
    except Exception:
        print("Warning: could not find group title.")
        return None



def find_message_root(page):
    selectors = [
        "main",
        "[role='main']",
        "[class*='conversation']",
        "[class*='chat']",
        "[class*='message-list']",
        "[data-qa*='conversation']",
        "[data-qa*='chat']",
    ]
    best_locator = None
    best_score = (-1, -1)

    for selector in selectors:
        try:
            locator = page.locator(selector)
            count = locator.count()
            for index in range(min(count, 5)):
                candidate = locator.nth(index)
                try:
                    score = candidate.evaluate(
                        "el => {const messageNodes = el.querySelectorAll(\"[class*='msg'], [class*='message'], [data-qa*='message'], [class*='bubble'], [class*='chat']\");const textLen = (el.innerText || '').trim().length;return [messageNodes.length, textLen];}"
                    )
                    candidate_score = (int(score[0]), int(score[1]))
                    if candidate_score > best_score:
                        best_score = candidate_score
                        best_locator = candidate
                except Exception:
                    continue
        except Exception:
            continue

    if best_locator is not None:
        print(f"Using message root score={best_score}")
        return best_locator

    print("Warning: could not identify a conversation root; falling back to full page.")
    return page



def scroll_message_root_up(root):
    """Scroll up by one viewport height. Always dispatches scroll event so Zalo's
    lazy loader fires even when already at top. Returns False only if no scroll
    container found at all."""
    try:
        return bool(
            root.evaluate(
                """el => {
                    const knownSelectors = [
                        '.message-view__scroll',
                        '[class*="message-view__scroll"]',
                        '[class*="msg-list-scroll"]',
                        '[class*="chat-scroll"]',
                    ];
                    let target = null;
                    for (const sel of knownSelectors) {
                        const found = el.querySelector(sel) || document.querySelector(sel);
                        if (found && found.scrollHeight > found.clientHeight + 10) {
                            target = found; break;
                        }
                    }
                    if (!target) {
                        const nodes = [el, ...el.querySelectorAll('*')];
                        let bestScore = -1;
                        for (const node of nodes) {
                            const oy = window.getComputedStyle(node).overflowY;
                            const canScroll = (oy==='auto'||oy==='scroll'||oy==='overlay')
                                && node.scrollHeight > node.clientHeight + 10;
                            if (!canScroll) continue;
                            const score = node.scrollHeight - node.clientHeight;
                            if (score > bestScore) { bestScore = score; target = node; }
                        }
                    }
                    if (!target) return false;
                    const before = target.scrollTop;
                    // Always scroll toward top (triggers Zalo loader even at position 0)
                    target.scrollTop = Math.max(0, before - target.clientHeight);
                    target.dispatchEvent(new Event('scroll', {bubbles: true}));
                    return true;
                }"""
            )
        )
    except Exception:
        return False


def scroll_to_bottom(root):
    """Jump to the very bottom so the newest messages are visible first."""
    try:
        root.evaluate("""el => {
            const knownSelectors = [
                '.message-view__scroll',
                '[class*="message-view__scroll"]',
                '[class*="msg-list-scroll"]',
                '[class*="chat-scroll"]',
            ];
            let target = null;
            for (const sel of knownSelectors) {
                const found = el.querySelector(sel) || document.querySelector(sel);
                if (found && found.scrollHeight > found.clientHeight + 10) {
                    target = found; break;
                }
            }
            if (!target) {
                const nodes = [el, ...el.querySelectorAll('*')];
                let best = -1;
                for (const node of nodes) {
                    const oy = window.getComputedStyle(node).overflowY;
                    if ((oy==='auto'||oy==='scroll'||oy==='overlay') && node.scrollHeight > node.clientHeight+10) {
                        const score = node.scrollHeight - node.clientHeight;
                        if (score > best) { best = score; target = node; }
                    }
                }
            }
            if (target) {
                target.scrollTop = target.scrollHeight;
                target.dispatchEvent(new Event('scroll', {bubbles: true}));
            }
        }""")
    except Exception:
        pass


def crawl_and_extract_all(page, root, settle_ms=3000):
    """Scroll to bottom first (capture newest), then scroll all the way to the top.
    Zalo uses a virtual DOM — messages unload as you scroll — so we extract
    incrementally at every position and accumulate.
    """
    # Start at the very bottom to ensure newest messages are captured first
    print("  Scrolling to bottom to capture newest messages...")
    scroll_to_bottom(root)
    page.wait_for_timeout(2000)

    # key -> (round_index, batch_position, msg)
    # round_index: higher = older (we scroll up, so later rounds see older messages)
    # batch_position: DOM order top→bottom = chronological within a view
    all_msgs = {}
    stagnant_rounds = 0
    round_index = 0

    while True:
        round_index += 1

        batch = extract_structured_messages(root)
        new_count = 0
        for batch_pos, msg in enumerate(batch):
            key = (msg.get('sender'), msg.get('time_text'), msg['raw'][:200])
            if key not in all_msgs:
                all_msgs[key] = (round_index, batch_pos, msg)
                new_count += 1

        print(f"Round {round_index}: +{new_count} new msgs, total={len(all_msgs)}")

        scroll_message_root_up(root)

        if new_count == 0:
            stagnant_rounds += 1
        else:
            stagnant_rounds = 0

        if stagnant_rounds >= 8:
            print("No new messages for 8 consecutive rounds — reached history limit.")
            break

        page.wait_for_timeout(settle_ms)

    # Sort: highest round first (oldest messages), then by DOM position within each round
    # Result: chronological order oldest → newest
    ordered = [
        msg for _, _, msg in
        sorted(all_msgs.values(), key=lambda x: (-x[0], x[1]))
    ]
    print(f"Total messages collected: {len(ordered)}")
    return ordered


_EMOJI_REACTION_RE = re.compile(r'^(/-\w+|:[>oOdDpPsS*]|:-+[()\[\]hHdD|/*]+|;-\)|b-\))+$', re.IGNORECASE)
_TIME_RE = re.compile(r'^\d{1,2}:\d{2}$')
_EMOJI_LINE_RE = _EMOJI_REACTION_RE   # same pattern, one definition
_ZALO_SYSTEM_RE  = re.compile(r'Sử dụng Zalo PC|Tải Zalo PC')
# Date separators Zalo renders between message groups
_DATE_SEP_RE = re.compile(
    r'^(Hôm nay|Hôm qua|Yesterday|Today'
    r'|\d{1,2}\s+tháng\s+\d{1,2}'          # "14 tháng 5"
    r'|\d{1,2}/\d{1,2}/\d{2,4}'            # "14/05/2026"
    r'|\d{1,2}-\d{1,2}-\d{2,4}'            # "14-05-2026"
    r'|Thứ\s+\w+,?\s*\d{1,2}\s+tháng\s+\d{1,2}'  # "Thứ Tư, 14 tháng 5"
    r')$',
    re.IGNORECASE | re.UNICODE
)
_FILE_ATTACH_RE = re.compile(r'Tải về để xem lâu dài', re.IGNORECASE)
_FILE_SIZE_RE   = re.compile(r'^\d+\.?\d*\s*[KMG]B$', re.IGNORECASE)
_LINE_NUM_RE    = re.compile(r'^\d+$')   # bare line numbers from code-preview


def _clean_content(text):
    """Remove trailing emoji reaction lines and lone timestamps."""
    lines = text.split('\n')
    while lines and (_EMOJI_LINE_RE.fullmatch(lines[-1].strip()) or
                     _TIME_RE.fullmatch(lines[-1].strip())):
        lines.pop()
    return '\n'.join(lines).strip()


def _clean_for_sheet(content, raw, sender=None):
    """Extra cleaning for Google Sheets display:
    - strip sender name and avatar letter from the start of content
    - strip ALL embedded emoji lines
    - replace file-attachment blobs with [File: name size]
    - remove bare line-number artifacts from code previews
    """
    # Detect file attachment
    if _FILE_ATTACH_RE.search(raw):
        lines = raw.split('\n')
        fname_parts, size = [], ''
        for i, line in enumerate(lines):
            if _FILE_ATTACH_RE.search(line):
                window = [l.strip() for l in lines[max(0, i-4):i] if l.strip()]
                for part in window:
                    if _FILE_SIZE_RE.match(part):
                        size = part
                    elif not _LINE_NUM_RE.match(part) and not _EMOJI_LINE_RE.fullmatch(part):
                        fname_parts.append(part)
                break
        fname = ' '.join(fname_parts).strip()
        return f'[File: {fname} {size}]'.strip() if fname else '[File attached]'

    lines = content.split('\n')

    # Strip leading avatar letter (single char like "a", "N") and sender name
    if lines and len(lines[0].strip()) <= 2 and lines[0].strip().isalpha():
        lines = lines[1:]
    if lines and sender and lines[0].strip() == sender.strip():
        lines = lines[1:]

    # Remove all lines that are pure emoji shortcodes or bare line numbers
    clean = [l for l in lines
             if not _EMOJI_LINE_RE.fullmatch(l.strip())
             and not _LINE_NUM_RE.fullmatch(l.strip())]
    return '\n'.join(clean).strip()


def _is_junk(msg):
    content = msg.get('content', '').strip()
    if not content:
        return True
    if _EMOJI_REACTION_RE.fullmatch(content):
        return True
    if _TIME_RE.fullmatch(content):
        return True
    if _ZALO_SYSTEM_RE.search(content):
        return True
    if _DATE_SEP_RE.fullmatch(content):
        return True
    return False


def _propagate_sender(msgs):
    last_received_sender = None
    result = []
    for msg in msgs:
        if msg.get('is_sent'):
            # Sent messages keep __me__; don't propagate from them to next received
            result.append(msg)
            continue
        if msg['sender'] and msg['sender'] != '__me__':
            last_received_sender = msg['sender']
        elif not msg['sender'] and last_received_sender:
            msg = dict(msg)
            msg['sender'] = last_received_sender
        result.append(msg)
    return result


def probe_sent_selector(page):
    """Inspect the DOM to find the CSS class used for sent/outgoing messages."""
    result = page.evaluate("""() => {
        // Zalo places sent messages on the right; look for rightmost message containers
        const candidates = document.querySelectorAll(
            "[class*='msg'], [class*='message'], [class*='bubble'], [class*='chat']"
        );
        const classes = new Set();
        for (const el of candidates) {
            const rect = el.getBoundingClientRect();
            const parentRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
            // Sent messages are right-aligned — right edge near parent right edge
            if (parentRect && rect.right > parentRect.right - 40 && rect.width > 60) {
                for (const cls of el.classList) classes.add(cls);
            }
        }
        return Array.from(classes);
    }""")
    print(f"  Detected right-side (sent) classes: {result[:20]}")
    return result


def extract_structured_messages(root):
    JS = """el => {
  const selectorStr = "[class*='msg'], [class*='chat-message'], [class*='message-item'], [data-qa*='message'], [class*='bubble']";
  const allItems = Array.from(el.querySelectorAll(selectorStr));

  // Date separator patterns — skip these elements entirely
  const dateSepRe = /^(Hôm nay|Hôm qua|Yesterday|Today|\d{1,2}\s+tháng\s+\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|Thứ\s+\S+)/i;

  // Keep only outermost matching elements — skip nested and date separators
  const topLevel = allItems.filter(node => {
    // Skip date separator pills
    const txt = node.innerText.trim();
    if (dateSepRe.test(txt) && txt.length < 60) return false;
    // Skip elements nested inside another match
    let p = node.parentElement;
    while (p && p !== el) {
      if (p.matches(selectorStr)) return false;
      p = p.parentElement;
    }
    return true;
  });

  const timeRe = /^\\d{1,2}:\\d{2}$/;
  return topLevel.map(e => {
    const senderEl = e.querySelector('.message-sender-name-content');

    // Detect sent (outgoing) messages: Zalo places them in the right half of the viewport.
    // Using left-edge position is more reliable than comparing to parentElement (which may be a tight wrapper).
    const cls = Array.from(e.classList).join(' ');
    const isSent = /\b(send-msg|msg-send|msg--out|msg-item--out|own-msg)\b/i.test(cls) ||
      (() => {
        const r = e.getBoundingClientRect();
        return r.width > 40 && r.left > window.innerWidth * 0.45;
      })();

    // Find first time element whose text matches HH:MM exactly
    let timeText = null;
    const timeNodes = e.querySelectorAll('[class*="time"], [class*="meta"]');
    for (const t of timeNodes) {
      const txt = t.innerText.trim();
      if (timeRe.test(txt)) { timeText = txt; break; }
    }
    const contentEl = e.querySelector('[class*="content"], [class*="text"], [class*="body"]');
    const raw = e.innerText.trim();
    const imgUrls = Array.from(e.querySelectorAll('img[src]'))
      .filter(img =>
        !img.classList.contains('a-child') &&
        img.src && !img.src.startsWith('data:') &&
        !img.closest('.message-reaction-container') &&
        !img.closest('.reaction-emoji-list') &&
        !img.closest('.msg-reaction-icon')
      )
      .map(img => img.src);

    let sender = senderEl ? senderEl.innerText.trim() : null;
    if (!sender && isSent) sender = '__me__';

    return {
      sender,
      time_text: timeText,
      content: contentEl ? contentEl.innerText.trim() : raw,
      raw: raw,
      image_urls: imgUrls,
      is_sent: isSent,
      top: e.getBoundingClientRect().top + window.scrollY
    };
  });
}"""
    try:
        nodes = root.evaluate(JS)
    except Exception as ex:
        print(f"Error extracting messages: {ex}")
        nodes = []

    msgs = []
    seen_keys = set()
    for n in nodes:
        try:
            sender = (n.get('sender') or '').strip() or None
            time_text = (n.get('time_text') or '').strip() or None
            raw = (n.get('raw') or '').strip()
            content = (n.get('content') or '').strip() or raw
            top = float(n.get('top', 0.0))
        except Exception:
            continue

        if not raw:
            continue

        key = (round(top, 1), raw[:200])
        if key not in seen_keys:
            seen_keys.add(key)
            msgs.append({
                'sender': sender,
                'time_text': time_text,
                'content': _clean_content(content),
                'raw': raw,
                'image_urls': n.get('image_urls') or [],
                'is_sent': bool(n.get('is_sent')),
                'top': top,
            })

    msgs_sorted = sorted(msgs, key=lambda x: x.get('top', 0.0))
    msgs_filtered = [m for m in msgs_sorted if not _is_junk(m)]
    msgs_final = _propagate_sender(msgs_filtered)
    return msgs_final


def group_dir_name(title):
    safe = re.sub(r'[\\/:*?"<>|]', '_', title).strip()
    return safe


def save_messages_json(messages, out_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(messages)} messages to {out_path}")


def _fetch_blob_as_b64(page, blob_url):
    """Fetch a blob: URL from inside the page context and return (data_bytes, mime_type)."""
    result = page.evaluate("""async (url) => {
        try {
            const resp = await fetch(url);
            const buf = await resp.arrayBuffer();
            const mime = resp.headers.get('content-type') || '';
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            return {ok: true, b64, mime};
        } catch(e) {
            return {ok: false, error: String(e)};
        }
    }""", blob_url)
    if not result or not result.get('ok'):
        raise RuntimeError(result.get('error', 'blob fetch failed'))
    data = base64.b64decode(result['b64'])
    return data, result.get('mime', '')


def _ext_from_mime(mime):
    if 'png' in mime:
        return 'png'
    if 'gif' in mime:
        return 'gif'
    if 'webp' in mime:
        return 'webp'
    return 'jpg'


def download_images(page, messages, img_dir):
    os.makedirs(img_dir, exist_ok=True)
    counter = 0
    for msg_idx, msg in enumerate(messages):
        urls = msg.get('image_urls') or []
        for url_idx, url in enumerate(urls):
            try:
                if url.startswith('blob:'):
                    data, mime = _fetch_blob_as_b64(page, url)
                    ext = _ext_from_mime(mime)
                else:
                    resp = page.request.get(url, timeout=15000)
                    if not resp.ok:
                        print(f"  Skip image (HTTP {resp.status}): {url[:60]}")
                        continue
                    ext = _ext_from_mime(resp.headers.get('content-type', ''))
                    data = resp.body()

                fname = f"msg{msg_idx:04d}_{url_idx:02d}.{ext}"
                with open(os.path.join(img_dir, fname), 'wb') as f:
                    f.write(data)
                msg.setdefault('image_files', []).append(fname)
                counter += 1
            except Exception as ex:
                print(f"  Failed to download image: {ex}")
    print(f"Downloaded {counter} images to {img_dir}")


def export_to_gsheet(messages, group_title):
    if not GSHEET_KEY_FILE or not GSHEET_ID:
        return
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        print("  gspread not installed. Run: pip install gspread google-auth")
        return

    try:
        creds = Credentials.from_service_account_file(
            GSHEET_KEY_FILE,
            scopes=["https://spreadsheets.google.com/feeds",
                    "https://www.googleapis.com/auth/drive"],
        )
        gc = gspread.authorize(creds)
        sh = gc.open_by_key(GSHEET_ID)

        # One worksheet per group — create if missing, clear if exists
        safe_name = group_title[:100]
        try:
            ws = sh.worksheet(safe_name)
            ws.clear()
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=safe_name, rows=len(messages) + 10, cols=5)

        header = ["#", "sender", "time_text", "is_sent", "content"]
        rows = [header]
        for i, m in enumerate(messages, start=1):
            content = _clean_for_sheet(
                m.get("content") or "",
                m.get("raw") or "",
                sender=m.get("sender"),
            )
            rows.append([
                i,
                m.get("sender") or "",
                m.get("time_text") or "",
                "yes" if m.get("is_sent") else "",
                content,
            ])

        ws.update(rows, value_input_option="RAW")
        print(f"  Exported {len(messages)} rows to Google Sheet worksheet '{safe_name}'")
    except Exception as ex:
        print(f"  Google Sheets export failed: {ex}")


def crawl_group(page, group_title):
    print(f"\n{'='*60}")
    print(f"Crawling: {group_title}")
    print('='*60)

    opened = open_target_group(page, group_title)
    if not opened:
        input(f"Manually open '{group_title}' then press Enter...")

    page.wait_for_timeout(3000)
    actual_title = wait_for_group_title(page)

    # Strict check — don't crawl if wrong group is open
    if actual_title and normalize_title(group_title) not in actual_title:
        print(f"ERROR: Expected '{group_title}' but '{actual_title}' is open. Skipping.")
        return []

    message_root = find_message_root(page)
    probe_sent_selector(page)

    # Log which scroll container will be used
    scroll_cls = message_root.evaluate("""el => {
        const sels = ['.message-view__scroll','[class*="message-view__scroll"]'];
        for (const s of sels) {
            const f = el.querySelector(s) || document.querySelector(s);
            if (f) return f.className;
        }
        return '(fallback: largest scrollable)';
    }""")
    print(f"  Scroll container: {scroll_cls}")

    messages = crawl_and_extract_all(page, message_root)

    out_dir = os.path.join(OUTPUT_DIR, group_dir_name(group_title))
    os.makedirs(out_dir, exist_ok=True)

    img_dir = os.path.join(out_dir, 'images')
    download_images(page, messages, img_dir)

    json_path = os.path.join(out_dir, 'messages.json')
    save_messages_json(messages, json_path)
    export_to_gsheet(messages, group_title)
    return messages


_STEALTH_SCRIPT = """
    // Hide navigator.webdriver — the #1 signal Zalo checks
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Restore window.chrome that real Chrome exposes
    if (!window.chrome) {
        window.chrome = {
            runtime: {},
            loadTimes: function(){},
            csi: function(){},
            app: {}
        };
    }

    // Restore plugins array (Playwright leaves it empty)
    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            const arr = [1, 2, 3, 4, 5];
            arr.__proto__ = PluginArray.prototype;
            return arr;
        }
    });

    // Set realistic languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['vi-VN', 'vi', 'en-US', 'en']
    });

    // Remove automation-related properties from permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
"""

_LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-infobars",
    "--disable-dev-shm-usage",
    "--window-size=1366,768",
    "--lang=vi-VN",
    "--disable-features=IsolateOrigins,site-per-process",
]

with sync_playwright() as p:
    browser = None
    try:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            channel="chrome",
            headless=False,
            args=_LAUNCH_ARGS,
            locale="vi-VN",
        )
        print(f"Using persistent profile: {PROFILE_DIR}")
    except Exception as ex:
        print(f"Warning: persistent Chrome profile failed ({ex})")
        browser = p.chromium.launch(
            channel="chrome",
            headless=False,
            args=_LAUNCH_ARGS,
        )
        context = browser.new_context(locale="vi-VN")

    # Inject stealth script into every page before any JS runs
    context.add_init_script(_STEALTH_SCRIPT)

    page = context.new_page()
    page.goto("https://chat.zalo.me")

    input("Zalo da mo. Nhan Enter de bat dau crawl 3 groups...")

    for group_title in TARGET_GROUPS:
        crawl_group(page, group_title)
        page.wait_for_timeout(1500)

    print(f"\nHoan thanh! Du lieu luu tai: {OUTPUT_DIR}")
    input("Nhan Enter de dong browser...")
    context.close()
    if browser is not None:
        browser.close()
