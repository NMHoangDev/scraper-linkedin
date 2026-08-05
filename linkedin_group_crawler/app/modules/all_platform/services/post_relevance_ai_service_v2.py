import json
import logging
import os
import random
from dataclasses import dataclass
from typing import Optional, Literal

from google import genai

logger = logging.getLogger(__name__)

Label = Literal["seeding_ok", "seeding_reject"]

PROMPT_VERSION = "v2"

SYSTEM_PROMPT = """Bạn là bộ lọc AI cho dữ liệu Facebook Group dùng cho mục tiêu seeding (liên hệ bán hàng/dịch vụ).

Nhãn:
- seeding_ok: Bài đăng CÓ TIỀM NĂNG seeding. Nội dung thể hiện nhu cầu tìm kiếm/tư vấn/mua sản phẩm-dịch vụ LIÊN QUAN đến ngành và mục đích của group.
- seeding_reject: Bài đăng KHÔNG PHÙ HỢP seeding. Nội dung ngoài lề, hỏi thăm phiếm, spam/quảng cáo không liên quan, meme/troll, thông báo nội bộ group, hoặc không có ý định tìm kiếm/tư vấn/mua giải pháp.

Input (luôn dùng đúng): {content, group_industry, group_intent}

Output bắt buộc (JSON THUẦN, không kèm chữ khác):
{
  "label": "seeding_ok" | "seeding_reject",
  "confidence": <number 0.0-1.0>,
  "reason": "giải thích ngắn gọn 1 câu"
}

Quy tắc fail-safe (QUAN TRỌNG):
- Nếu mô hình không trả JSON hợp lệ / timeout / lỗi API => label="seeding_ok", confidence=0.0, ai_success=false.

Quy tắc confidence & nhãn (QUAN TRỌNG để đúng business):
- Chỉ gán "seeding_reject" khi nội dung RÕ RÀNG KHÔNG LIÊN QUAN seeding (hỏi thăm phiếm, chúc mừng, meme/troll, thông báo nội bộ group, sân vườn/cảnh quan...).
- Khi nội dung có dấu hiệu tuyển dụng/đi tìm dịch vụ/đang tìm người/nhu cầu liên quan ngành seeding => "seeding_ok".
- Luôn tự ước lượng confidence sao cho: confidence cho reject thường >= 0.7 nếu bạn đã thấy rõ là không liên quan.
"""


@dataclass
class PostRelevanceResult:
    label: Label
    confidence: float
    reason: str


def _safe_env_int(key: str, default: int) -> int:
    try:
        v = int(os.getenv(key, str(default)))
        return v if v > 0 else default
    except Exception:
        logger.warning("AI config: invalid int env %s, using default=%s", key, default)
        return default


def validate_ai_config() -> dict:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_models_raw = os.getenv("GEMINI_MODELS", "gemini-2.5-flash")

    timeout_s = _safe_env_int("RELEVANCE_AI_TIMEOUT_S", 30)
    max_chars = _safe_env_int("RELEVANCE_AI_MAX_CHARS", 4000)
    max_retries = _safe_env_int("GEMINI_MAX_RETRIES", 2)

    models = [m.strip() for m in gemini_models_raw.split(",") if m.strip()]
    if not models:
        models = ["gemini-2.5-flash"]

    return {
        "gemini_api_key": gemini_api_key,
        "gemini_models": models,
        "timeout_s": timeout_s,
        "max_chars": max_chars,
        "max_retries": max_retries,
    }


def clean_json_response(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = cleaned.replace("```json", "```")
    cleaned = cleaned.replace("```", "")
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


def _fail(label: Label = "seeding_ok", reason: str = "Gemini unavailable") -> dict:
    cfg = validate_ai_config()
    models = cfg.get("gemini_models") or ["gemini-2.5-flash"]
    return {
        "label": label,
        "confidence": 0.0,
        "reason": reason,
        "model": models[0] if models else "gemini-2.5-flash",
        "prompt_version": PROMPT_VERSION,
        "ai_success": False,
    }


def call_gemini_once(payload: dict) -> dict:
    cfg = validate_ai_config()

    api_key = cfg.get("gemini_api_key")
    if not api_key:
        logger.warning("AI config: missing GEMINI_API_KEY")
        return _fail(reason="Gemini unavailable (missing API key)")

    model_names = cfg.get("gemini_models") or ["gemini-2.5-flash"]
    timeout_s = int(cfg.get("timeout_s", 30))
    max_retries = int(cfg.get("max_retries", 2))

    from concurrent.futures import ThreadPoolExecutor

    prompt_text = SYSTEM_PROMPT + "\n\n" + json.dumps(payload, ensure_ascii=False)

    # Fallback by multiple models in order.
    for model_name in model_names:
        # Retry each model up to GEMINI_MAX_RETRIES.
        for _attempt_idx in range(1, max_retries + 1):
            try:
                client = genai.Client(api_key=api_key)

                def _call():
                    return client.models.generate_content(
                        model=model_name,
                        contents=prompt_text,
                    )

                with ThreadPoolExecutor(max_workers=1) as ex:
                    fut = ex.submit(_call)
                    resp = fut.result(timeout=timeout_s)

                text = getattr(resp, "text", None) or str(resp)
                cleaned = clean_json_response(text)
                data = _safe_parse_json(cleaned)
                if not data:
                    logger.warning("AI classify: JSON parse failed")
                    continue

                label = data.get("label")
                reason = (data.get("reason") or "").strip()
                confidence = data.get("confidence")

                try:
                    confidence_f = float(confidence)
                except Exception:
                    continue

                if label not in ("seeding_ok", "seeding_reject"):
                    continue

                return {
                    "label": label,
                    "confidence": max(0.0, min(1.0, confidence_f)),
                    "reason": reason,
                    "model": model_name,
                    "prompt_version": PROMPT_VERSION,
                    "ai_success": True,
                }

            except Exception as exc:
                err = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "AI classify error model=%s err=%s",
                    model_name,
                    err,
                )
                continue

    return _fail(reason="Gemini unavailable")


def classify_post_relevance(
    content: str,
    group_industry: Optional[str] = None,
    group_intent: Optional[str] = None,
) -> dict:
    """Hardening version: exact IO + fail-safe."""

    cfg = validate_ai_config()

    content = (content or "").strip()
    group_industry = (group_industry or "").strip()
    group_intent = (group_intent or "").strip()

    max_chars = int(cfg.get("max_chars", 4000))
    if max_chars > 0 and len(content) > max_chars:
        content = content[:max_chars]

    payload = {
        "content": content,
        "group_industry": group_industry or None,
        "group_intent": group_intent or None,
    }

    return call_gemini_once(payload=payload)

