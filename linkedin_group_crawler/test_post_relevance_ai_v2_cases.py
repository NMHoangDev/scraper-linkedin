import os

from dotenv import load_dotenv

load_dotenv()

from app.modules.all_platform.services.post_relevance_ai_service_v2 import classify_post_relevance


def run_cases():

    cases = [
        {
            "id": 1,
            "content": "CMC Global đang tìm kiếm Fullstack Java/Angular Developer (4+ YOE) tại Đà Nẵng...",
            "group_industry": "IT & Software",
            "group_intent": "tuyển dụng/tìm dịch vụ IT",
            "expected": "seeding_ok",
        },
        {
            "id": 2,
            "content": "FPT Software tuyển dụng Infra & DevOps...",
            "group_industry": "IT & Software",
            "group_intent": "tuyển dụng/tìm dịch vụ IT",
            "expected": "seeding_ok",
        },
        {
            "id": 3,
            "content": "Mấy ae chuyên sân vườn cảnh quan ẩn mình ở đâu rồi",
            "group_industry": "AI Technology/IT & Software",
            "group_intent": "tuyển dụng/tìm dịch vụ IT",
            "expected": "seeding_reject",
        },
        {
            "id": 4,
            "content": "Chúc mừng sinh nhật admin group, chúc anh nhiều sức khoẻ",
            "group_industry": "Bất kỳ",
            "group_intent": "Bất kỳ",
            "expected": "seeding_reject",
        },
        {
            "id": 5,
            "content": "Mình đang muốn chia sẻ vài câu cảm nghĩ về group hôm nay thôi, anh em ai cũng rảnh vào cuối tuần nhỉ?",
            "group_industry": "Bất kỳ",
            "group_intent": "Bất kỳ",
            "expected": None,
        },
    ]

    results = []
    for c in cases:
        out = classify_post_relevance(
            content=c["content"],
            group_industry=c.get("group_industry"),
            group_intent=c.get("group_intent"),
        )
        results.append({
            "case_id": c["id"],
            "input": {
                "content": c["content"],
                "group_industry": c.get("group_industry"),
                "group_intent": c.get("group_intent"),
            },
            "output": out,
            "expected": c.get("expected"),
        })

    # Print as plain text to copy/paste into report
    for r in results:
        o = r["output"]
        print(
            f"CASE {r['case_id']} | expected={r['expected']} | label={o.get('label')} | confidence={o.get('confidence')} | ai_success={o.get('ai_success')} | reason={o.get('reason')}"
        )
        print("---")


if __name__ == "__main__":
    run_cases()

