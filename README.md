# -
嗯哦哦

## 爬虫环境

已配置的 Python 爬虫工具：

| 工具 | 用途 |
| --- | --- |
| requests | 下载网页 |
| beautifulsoup4 + lxml | 解析 HTML、提取内容 |
| scrapy | 大规模、多页面抓取框架 |

### 安装

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 运行示例

```bash
.venv/bin/python scraper.py https://quotes.toscrape.com/
```

脚本会抓取页面标题和所有链接，保存到 `output/links.csv`。
抓取前会检查站点的 robots.txt，被禁止的地址不会抓取。

## 育儿痛点数据

```bash
.venv/bin/python parenting_pain_points.py
```

通过 Stack Exchange 官方 API 抓取 Parenting Stack Exchange（英文育儿问答社区）的公开数据，输出到 `data/`：

| 文件 | 内容 |
| --- | --- |
| `site_tags.csv` | 全站前 200 个标签及问题数 |
| `top_questions.csv` | 得票最高的 1000 个问题（标题、得票、浏览量、标签、链接） |
| `tag_stats.csv` | 按标签汇总的样本内问题数、浏览量、平均得票 |

问答内容来自 [Parenting Stack Exchange](https://parenting.stackexchange.com)，按 CC BY-SA 授权。
