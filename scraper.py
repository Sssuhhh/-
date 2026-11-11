"""简单爬虫示例：抓取网页标题和链接，保存为 CSV。

用法:
    python scraper.py https://quotes.toscrape.com/
    python scraper.py https://quotes.toscrape.com/ -o output/links.csv
"""
import argparse
import csv
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

USER_AGENT = "simple-scraper/1.0"


def allowed_by_robots(url: str) -> bool:
    """检查目标站点的 robots.txt 是否允许抓取该地址。"""
    parts = urlparse(url)
    robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
    try:
        resp = requests.get(robots_url, headers={"User-Agent": USER_AGENT}, timeout=10)
    except requests.RequestException:
        return True  # 取不到 robots.txt 时按无限制处理
    if resp.status_code != 200:
        return True
    parser = RobotFileParser()
    parser.parse(resp.text.splitlines())
    return parser.can_fetch(USER_AGENT, url)


def fetch(url: str, retries: int = 3) -> str:
    """下载网页，失败时按 1s、2s、4s 间隔重试。"""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or resp.encoding
            return resp.text
        except requests.RequestException as exc:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
            print(f"请求失败（{exc}），{wait} 秒后重试", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def parse(html: str, base_url: str) -> tuple[str, list[dict]]:
    """返回页面标题和页面内所有链接。"""
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.get_text(strip=True) if soup.title else ""
    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        if not href.startswith(("http://", "https://")) or href in seen:
            continue
        seen.add(href)
        links.append({"text": a.get_text(strip=True), "url": href})
    return title, links


def main() -> int:
    ap = argparse.ArgumentParser(description="抓取网页标题和链接")
    ap.add_argument("url", help="要抓取的网页地址")
    ap.add_argument("-o", "--output", default="output/links.csv", help="CSV 输出路径")
    args = ap.parse_args()

    if not allowed_by_robots(args.url):
        print("该地址被站点的 robots.txt 禁止抓取，已停止。", file=sys.stderr)
        return 1

    title, links = parse(fetch(args.url), args.url)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "url"])
        writer.writeheader()
        writer.writerows(links)

    print(f"标题: {title}")
    print(f"链接数: {len(links)}，已保存到 {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
