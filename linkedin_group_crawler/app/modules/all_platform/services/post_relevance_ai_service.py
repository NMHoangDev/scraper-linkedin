import json
import logging
import os
import random
import time
from dataclasses import dataclass
from typing import Optional, Literal

import google.generativeai as genai

logger = logging.getLogger(__name__)


Label = Literal["seeding_ok", "seeding_reject"]


PROMPT_VERSION = "v1"

SYSTEM_PROMPT = """Bạn là bộ lọc AI cho dữ liệu Facebook Group dùng cho mục tiêu seeding (liên hệ bán hàng/dịch vụ).\n\nNhiệm vụ: phân loại một bài đăng vào 1 trong 2 nhãn: \n- seeding_ok: Bài đăng CÓ TIỀM NĂNG seeding. Có thể là: người dùng hỏi tìm dịch vụ/giải pháp/nhu cầu mua sản phẩm-dịch vụ liên quan, hoặc chủ đề cho thấy họ đang cần tư vấn/triển khai giải pháp phần mềm/website/AI... đúng ngành của group.\n- seeding_reject: Bài đăng KHÔNG PHÙ HỢP seeding. Bao gồm: spam/quảng cáo không liên quan, hỏi thăm phiếm linh tinh, meme/troll, thông báo nội bộ group, xin lỗi/hỏi thăm chung chung, hoặc nội dung không có ý định tìm kiếm/tư vấn/mua giải pháp phù hợp.\n\nTiêu chí chấm theo ngữ nghĩa intent của bài.\n\nTrả về đúng JSON (không trả thêm chữ khác), dạng:\n{\n  \"label\": \"seeding_ok\" | \"seeding_reject\",\n  \"reason\": \"giải thích ngắn gọn (1-3 câu) vì sao\"\n}\n\nLưu ý: Nếu không chắc chắn 100% -> chọn seeding_reject (nhưng phải có reason rõ ràng dựa trên nội dung)."""


@dataclass
class PostRelevanceResult:
    label: Label
    reason: str


def _safe_env_int(key: str, default: int) -> int:
    try:
        v = int(os.getenv(key, str(default)))
        return v if v > 0 else default
    except Exception:
        logger.warning("AI config: invalid int env %s, using default=%s", key, default)
        return default


def _safe_env_float(key: str, default: float) -> float:
    try:
        v = float(os.getenv(key, str(default)))
        return v if v >= 0 else default
    except Exception:
        logger.warning("AI config: invalid float env %s, using default=%s", key, default)
        return default


def validate_ai_config() -> dict:
    """Validate/normalize AI env config.

    Rule: never throw; if env missing/invalid => use defaults and log warning.
    """

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_2 = os.getenv("GEMINI_API_KEY_2")
    # We allow missing API key: caller should treat as ai_success=false

    gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

    cfg = {
        "gemini_api_key": gemini_api_key,
        "gemini_api_key_2": gemini_api_key_2,
        "gemini_model": gemini_model,
        "timeout_s": _safe_env_int("RELEVANCE_AI_TIMEOUT_S", 30),
        "max_chars": _safe_env_int("RELEVANCE_AI_MAX_CHARS", 4000),
        "batch_size": _safe_env_int("RELEVANCE_AI_BATCH_SIZE", 8),
        "delay_s": _safe_env_float("RELEVANCE_AI_DELAY_S", 1.2),
    }

    return cfg


def clean_json_response(text: str) -> str:
    """Clean Gemini response to improve JSON parsing."""

    cleaned = (text or "").strip()
    cleaned = cleaned.replace("```json", "```")
    cleaned = cleaned.replace("```", "")
    # Some models may return leading/trailing prose; keep best-effort JSON extraction
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _safe_parse_json(text: str) -> Optional[dict]:
    try:
        return json.loads(text)
    except Exception:
        return None


def call_gemini_with_retry(content: str, industry: str) -> dict:
    """Call Gemini with timeout + retry.

    Must NOT throw. Always returns a dict containing:
    - ai_success: bool
    - label/reason if ai_success
    - model/prompt_version
    """

    cfg = validate_ai_config()

    api_keys = [k for k in [cfg.get("gemini_api_key"), cfg.get("gemini_api_key_2")] if k]
    model_name = cfg.get("gemini_model") or "gemini-1.5-pro"

    prompt = {
        "industry_or_group_intent": industry or None,
        "content": content,
    }

    # Defaults on any failure
    fail_result = {
        "label": "seeding_ok",
        "reason": "Gemini unavailable",
        "model": model_name,
        "prompt_version": PROMPT_VERSION,
        "ai_success": False,
    }

    # Missing key
    if not api_keys:
        logger.warning("AI config: missing GEMINI_API_KEY")
        fail_result["reason"] = "Gemini unavailable"
        return fail_result

    max_retries = 3
    base_backoff = float(os.getenv("RELEVANCE_AI_BACKOFF_S", "0.8"))
    timeout_s = int(cfg.get("timeout_s", 30))

    from concurrent.futures import ThreadPoolExecutor

    for attempt in range(1, max_retries + 1):
        api_key = random.choice(api_keys)
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)

            gen_config = {
                "temperature": 0.2,
                "max_output_tokens": 300,
            }

            def _call():
                return model.generate_content(
                    [
                        {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
                        {"role": "user", "parts": [{"text": json.dumps(prompt, ensure_ascii=False)}]},
                    ],
                    generation_config=gen_config,
                )

            with ThreadPoolExecutor(max_workers=1) as ex:
                fut = ex.submit(_call)
                resp = fut.result(timeout=timeout_s)

            text = getattr(resp, "text", None) or str(resp)
            cleaned = clean_json_response(text)

            data = _safe_parse_json(cleaned)
            if not data:
                logger.warning("AI classify: JSON parse failed")
                return {
                    **fail_result,
                    "reason": "Gemini parse fail",
                }

            label = data.get("label")
            reason = (data.get("reason") or "").strip()

            if label not in ("seeding_ok", "seeding_reject"):
                return {
                    **fail_result,
                    "reason": "Gemini invalid label",
                }

            # Success path
            return {
                "label": label,
                "reason": reason or "",
                "model": model_name,
                "prompt_version": PROMPT_VERSION,
                "ai_success": True,
            }

        except Exception as exc:
            err = f"{type(exc).__name__}: {exc}"
            is_timeout = "Timeout" in err or "timeout" in err

            if attempt < max_retries:
                sleep_s = base_backoff * (2 ** (attempt - 1))
                sleep_s = sleep_s * (0.75 + random.random() * 0.5)
                logger.warning(
                    "AI classify retry %s/%s (timeout=%s) err=%s",
                    attempt,
                    max_retries,
                    is_timeout,
                    err,
                )
                time.sleep(sleep_s)
                continue

            logger.warning("AI classify failed after retries err=%s", err)
            fail_result["reason"] = "Gemini unavailable"
            return fail_result

    return fail_result


def classify_post_relevance(content: str, industry: Optional[str] = None) -> dict:
    """Classify whether a FB post is useful for seeding.

    Public contract (used by crawl background task):
    - Never throw.
    - If AI fails (timeout/parse/unavailable/missing key), return ai_success=false,
      keep label=seeding_ok to avoid deleting.
    """

    start_t = time.time()

    content = (content or "").strip()
    industry = (industry or "").strip()

    cfg = validate_ai_config()
    max_chars = int(cfg.get("max_chars", 4000))
    if max_chars > 0 and len(content) > max_chars:
        content = content[:max_chars]

    result = call_gemini_with_retry(content=content, industry=industry)

    # Keep behavior: fail-safe => ai_success=false means label should not cause delete.
    _ = time.time() - start_t  # reserved for future metrics
    return result

