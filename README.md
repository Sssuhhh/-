# -
嗯哦哦

## 公众号排版

`wechat-article/index.html` 是《名人小时候的5个特征》的公众号排版页。用电脑上的 Chrome 或 Edge 打开这个文件，点「一键复制到公众号」，再到公众号后台的图文编辑器里粘贴即可。

排版全部使用内联样式，插画是内联 SVG，不依赖任何外部图片或脚本。

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
