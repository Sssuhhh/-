"""抓取 Parenting Stack Exchange 的公开问答数据，统计育儿痛点。

数据来源: Stack Exchange 官方 API (api.stackexchange.com)，内容为 CC BY-SA 授权。

用法:
    python parenting_pain_points.py            # 默认抓取得票最高的 1000 个问题
    python parenting_pain_points.py --pages 5  # 只抓 500 个
"""
import argparse
import csv
import html
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

API = "https://api.stackexchange.com/2.3"
SITE = "parenting"
USER_AGENT = "simple-scraper/1.0"

# 表示孩子年龄段的标签，与"问题主题"分开统计
AGE_TAGS = {
    "newborn", "infant", "toddler", "pre-schooler", "primary-schooler",
    "pre-teen", "teen", "adult-child", "age-appropriate",
}


def api_get(path: str, **params) -> dict:
    """调用 API；遵守返回的 backoff 字段，失败时重试。"""
    params.setdefault("site", SITE)
    for attempt in range(4):
        try:
            resp = requests.get(f"{API}/{path}", params=params,
                                headers={"User-Agent": USER_AGENT}, timeout=30)
            data = resp.json()
        except (requests.RequestException, ValueError) as exc:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
            print(f"请求失败（{exc}），重试", file=sys.stderr)
            continue
        if "error_id" in data:
            raise RuntimeError(f"API 错误: {data.get('error_message')}")
        if data.get("backoff"):
            time.sleep(data["backoff"])
        return data
    raise RuntimeError("unreachable")


def fetch_tags(pages: int = 2) -> list[dict]:
    """全站标签及其问题数（覆盖所有问题，不只是高票问题）。"""
    tags = []
    for page in range(1, pages + 1):
        data = api_get("tags", order="desc", sort="popular", pagesize=100, page=page)
        tags += [{"tag": t["name"], "questions": t["count"]} for t in data["items"]]
        if not data.get("has_more"):
            break
        time.sleep(0.5)
    return tags


def fetch_questions(pages: int) -> list[dict]:
    """按得票从高到低抓取问题。"""
    questions = []
    for page in range(1, pages + 1):
        data = api_get("questions", order="desc", sort="votes", pagesize=100, page=page)
        for q in data["items"]:
            questions.append({
                "title": html.unescape(q["title"]),
                "score": q["score"],
                "views": q["view_count"],
                "answers": q["answer_count"],
                "tags": ";".join(q["tags"]),
                "created": datetime.fromtimestamp(
                    q["creation_date"], timezone.utc).strftime("%Y-%m-%d"),
                "url": q["link"],
            })
        print(f"已抓取 {len(questions)} 个问题（剩余配额 {data.get('quota_remaining')}）",
              file=sys.stderr)
        if not data.get("has_more"):
            break
        time.sleep(0.5)
    return questions


def aggregate_by_tag(questions: list[dict]) -> list[dict]:
    """按标签汇总样本内的问题数、浏览量和得票。"""
    stats = defaultdict(lambda: {"n": 0, "views": 0, "score": 0})
    for q in questions:
        for tag in q["tags"].split(";"):
            s = stats[tag]
            s["n"] += 1
            s["views"] += q["views"]
            s["score"] += q["score"]
    rows = [{
        "tag": tag,
        "kind": "age" if tag in AGE_TAGS else "topic",
        "sample_questions": s["n"],
        "total_views": s["views"],
        "avg_views": round(s["views"] / s["n"]),
        "avg_score": round(s["score"] / s["n"], 1),
    } for tag, s in stats.items()]
    return sorted(rows, key=lambda r: r["total_views"], reverse=True)


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="抓取育儿问答数据并统计痛点")
    ap.add_argument("--pages", type=int, default=10, help="问题页数，每页 100 个")
    ap.add_argument("-o", "--outdir", default="data", help="输出目录")
    args = ap.parse_args()
    out = Path(args.outdir)

    tags = fetch_tags()
    questions = fetch_questions(args.pages)
    by_tag = aggregate_by_tag(questions)

    write_csv(out / "site_tags.csv", tags)
    write_csv(out / "top_questions.csv", questions)
    write_csv(out / "tag_stats.csv", by_tag)
    print(f"完成: {len(tags)} 个标签, {len(questions)} 个问题, 输出到 {out}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
