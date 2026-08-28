#!/usr/bin/env python3
"""Generate Nichijou pitch deck."""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

OUT_DIR = Path(__file__).resolve().parent.parent / "out"
OUT_FILE = OUT_DIR / "Nichijou-日常-项目介绍.pptx"

# Brand palette — warm rose / daily-life feel
ROSE = RGBColor(244, 63, 94)       # rose-500
ROSE_LIGHT = RGBColor(255, 241, 242)
ORANGE = RGBColor(251, 146, 60)
STONE_DARK = RGBColor(41, 37, 36)
STONE = RGBColor(87, 83, 78)
STONE_LIGHT = RGBColor(120, 113, 108)
WHITE = RGBColor(255, 255, 255)
BG = RGBColor(255, 249, 247)


def set_slide_bg(slide, color=BG):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_accent_bar(slide, top=Inches(0), height=Inches(0.08)):
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), top, Inches(10), height
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = ROSE
    bar.line.fill.background()


def add_footer(slide, text="Nichijou 日常 · Confidential"):
    box = slide.shapes.add_textbox(Inches(0.5), Inches(7.05), Inches(9), Inches(0.3))
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(9)
    p.font.color.rgb = STONE_LIGHT


def add_title_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    set_slide_bg(slide)
    add_accent_bar(slide, Inches(0), Inches(0.12))

    # gradient block
    block = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.8), Inches(8.8), Inches(4.2)
    )
    block.fill.solid()
    block.fill.fore_color.rgb = ROSE_LIGHT
    block.line.color.rgb = RGBColor(255, 228, 230)

    t1 = slide.shapes.add_textbox(Inches(1), Inches(2.4), Inches(8), Inches(1.2))
    p = t1.text_frame.paragraphs[0]
    p.text = "日常"
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    t2 = slide.shapes.add_textbox(Inches(1), Inches(3.5), Inches(8), Inches(0.6))
    p = t2.text_frame.paragraphs[0]
    p.text = "Nichijou"
    p.font.size = Pt(28)
    p.font.color.rgb = ROSE

    t3 = slide.shapes.add_textbox(Inches(1), Inches(4.3), Inches(8), Inches(1))
    p = t3.text_frame.paragraphs[0]
    p.text = "日本 AI 陪伴平台 · 项目介绍"
    p.font.size = Pt(20)
    p.font.color.rgb = STONE

    t4 = slide.shapes.add_textbox(Inches(1), Inches(5.5), Inches(8), Inches(0.5))
    p = t4.text_frame.paragraphs[0]
    p.text = "让画师创作的 AI 角色，像真人一样活在社交媒体里"
    p.font.size = Pt(14)
    p.font.color.rgb = STONE_LIGHT

    add_footer(slide, "2026 · Nichijou Project")


def add_section_slide(prs, section_num, title, subtitle=""):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, ROSE_LIGHT)
    add_accent_bar(slide, Inches(0), Inches(0.06))

    num = slide.shapes.add_textbox(Inches(0.8), Inches(2.6), Inches(1), Inches(0.8))
    p = num.text_frame.paragraphs[0]
    p.text = f"0{section_num}" if section_num < 10 else str(section_num)
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = ROSE

    t = slide.shapes.add_textbox(Inches(0.8), Inches(3.4), Inches(8.5), Inches(1))
    p = t.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    if subtitle:
        s = slide.shapes.add_textbox(Inches(0.8), Inches(4.3), Inches(8.5), Inches(0.8))
        p = s.text_frame.paragraphs[0]
        p.text = subtitle
        p.font.size = Pt(16)
        p.font.color.rgb = STONE


def add_content_slide(prs, title, bullets, note=""):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide)
    add_accent_bar(slide)

    tb = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(8.6), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    body = slide.shapes.add_textbox(Inches(0.9), Inches(1.5), Inches(8.4), Inches(5))
    tf = body.text_frame
    tf.word_wrap = True
    for i, item in enumerate(bullets):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        if isinstance(item, tuple):
            para.text = item[0]
            para.level = item[1]
        else:
            para.text = f"• {item}"
            para.level = 0
        para.font.size = Pt(16 if para.level == 0 else 14)
        para.font.color.rgb = STONE if para.level == 0 else STONE_LIGHT
        para.space_after = Pt(10)

    if note:
        nb = slide.shapes.add_textbox(Inches(0.7), Inches(6.5), Inches(8.6), Inches(0.4))
        p = nb.text_frame.paragraphs[0]
        p.text = note
        p.font.size = Pt(11)
        p.font.italic = True
        p.font.color.rgb = ROSE

    add_footer(slide)


def add_two_column_slide(prs, title, left_title, left_items, right_title, right_items):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide)
    add_accent_bar(slide)

    tb = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(8.6), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    for col, (ctitle, citems, x) in enumerate(
        [(left_title, left_items, 0.7), (right_title, right_items, 5.1)]
    ):
        hdr = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(1.4), Inches(4.1), Inches(0.55)
        )
        hdr.fill.solid()
        hdr.fill.fore_color.rgb = ROSE if col == 0 else ORANGE
        hdr.line.fill.background()
        hp = hdr.text_frame.paragraphs[0]
        hp.text = ctitle
        hp.font.size = Pt(14)
        hp.font.bold = True
        hp.font.color.rgb = WHITE
        hp.alignment = PP_ALIGN.CENTER

        box = slide.shapes.add_textbox(Inches(x), Inches(2.1), Inches(4.1), Inches(4.5))
        tf = box.text_frame
        tf.word_wrap = True
        for i, item in enumerate(citems):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para.text = f"• {item}"
            para.font.size = Pt(13)
            para.font.color.rgb = STONE
            para.space_after = Pt(8)

    add_footer(slide)


def add_table_slide(prs, title, headers, rows):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide)
    add_accent_bar(slide)

    tb = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(8.6), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    cols, row_count = len(headers), len(rows) + 1
    table = slide.shapes.add_table(row_count, cols, Inches(0.7), Inches(1.5), Inches(8.6), Inches(0.5 * row_count)).table

    for j, h in enumerate(headers):
        cell = table.cell(0, j)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = ROSE
        for para in cell.text_frame.paragraphs:
            para.font.bold = True
            para.font.size = Pt(12)
            para.font.color.rgb = WHITE

    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = table.cell(i + 1, j)
            cell.text = val
            if i % 2 == 0:
                cell.fill.solid()
                cell.fill.fore_color.rgb = ROSE_LIGHT
            for para in cell.text_frame.paragraphs:
                para.font.size = Pt(11)
                para.font.color.rgb = STONE

    add_footer(slide)


def add_roadmap_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide)
    add_accent_bar(slide)

    tb = slide.shapes.add_textbox(Inches(0.7), Inches(0.45), Inches(8.6), Inches(0.9))
    p = tb.text_frame.paragraphs[0]
    p.text = "产品路线图"
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK

    phases = [
        ("P0 · 已完成 MVP", "全链路 + LoRA + Memos + 5秒TTS 底层已接入", ROSE, True),
        ("P1 · 商业化", "Stripe 完整接入 · LINE 登录 · 声优/TTS 升级", ORANGE, False),
        ("P2 · 规模化", "画师入驻审核 · 分成结算 · 内容分级 · 推荐算法", STONE, False),
    ]

    y = 1.5
    for phase, desc, color, done in phases:
        dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.9), Inches(y + 0.08), Inches(0.22), Inches(0.22))
        dot.fill.solid()
        dot.fill.fore_color.rgb = color
        dot.line.fill.background()

        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(y + 0.3), Inches(0.03), Inches(1.1))
        line.fill.solid()
        line.fill.fore_color.rgb = RGBColor(230, 230, 230)
        line.line.fill.background()

        pt = slide.shapes.add_textbox(Inches(1.4), Inches(y), Inches(7.5), Inches(0.45))
        p = pt.text_frame.paragraphs[0]
        p.text = phase + (" ✓" if done else "")
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = STONE_DARK

        pd = slide.shapes.add_textbox(Inches(1.4), Inches(y + 0.4), Inches(7.5), Inches(0.7))
        p = pd.text_frame.paragraphs[0]
        p.text = desc
        p.font.size = Pt(13)
        p.font.color.rgb = STONE

        y += 1.5

    add_footer(slide)


def add_closing_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, ROSE_LIGHT)
    add_accent_bar(slide, Inches(0), Inches(0.06))

    t = slide.shapes.add_textbox(Inches(0.8), Inches(2.5), Inches(8.5), Inches(1.2))
    p = t.text_frame.paragraphs[0]
    p.text = "キャラクターの日常を、一緒に。"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = STONE_DARK
    p.alignment = PP_ALIGN.CENTER

    s = slide.shapes.add_textbox(Inches(0.8), Inches(3.8), Inches(8.5), Inches(1))
    p = s.text_frame.paragraphs[0]
    p.text = "脚本ではなく、生きている「人」——\nNichijou 让 AI 陪伴进入社交媒体时代"
    p.font.size = Pt(16)
    p.font.color.rgb = STONE
    p.alignment = PP_ALIGN.CENTER

    demo = slide.shapes.add_textbox(Inches(0.8), Inches(5.2), Inches(8.5), Inches(0.8))
    p = demo.text_frame.paragraphs[0]
    p.text = "Demo: http://localhost:3100  ·  角色: /characters/aoi"
    p.font.size = Pt(12)
    p.font.color.rgb = ROSE
    p.alignment = PP_ALIGN.CENTER


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)

    add_title_slide(prs)

    add_section_slide(prs, 1, "市场与痛点", "为什么现有 AI 陪伴不够？")
    add_content_slide(
        prs,
        "市场机会：日本 + 二次元文化 + 情感消费",
        [
            "日本虚拟偶像 / VTuber / 角色经济成熟，用户愿意为「推し」付费",
            "现有 AI 聊天产品：用户自己定制角色，缺乏持续叙事与社区感",
            "画师群体有大量 OC 与立绘，但缺少可持续变现的平台",
            "用户渴望的不是一次性剧本，而是「像追 SNS 一样追一个虚拟人」",
        ],
        note="目标市场：日本本土用户，日语为主",
    )

    add_content_slide(
        prs,
        "现有方案的不足",
        [
            "Character.AI / Replika：偏工具型聊天，角色静态、无 UGC 时间线",
            "VTuber：真人驱动，成本高、更新频率受限",
            "纯 AI 生成：人设容易漂移，缺乏画师审美与 IP 一致性",
            "机会空白：画师驱动的、社交媒体式 AI 角色平台",
        ],
    )

    add_section_slide(prs, 2, "产品方案", "Nichijou 是什么？")
    add_content_slide(
        prs,
        "Nichijou（日常）— 核心定位",
        [
            "画师创建 AI 角色：形象 + 性格 + 说话方式",
            "画师持续发布「日常动态」—— 今天下课被表白了、买了新裙子…",
            "角色脱离固定剧本，成为有生活轨迹的社交媒体「虚拟人」",
            "用户订阅、聊天、送礼物、定制生日祝福 / 早起叫床（TTS）",
            "混合 AI：画师手发 + AI 辅助下書き与按人设自动回复",
        ],
    )

    add_two_column_slide(
        prs,
        "与普通 AI 陪伴的本质区别",
        "传统 AI 陪伴",
        [
            "用户是创作者",
            "角色设定后很少变化",
            "纯 1v1 对话",
            "平台统一模型体验",
        ],
        "Nichijou",
        [
            "画师是创作者，用户是粉丝",
            "持续更新的日常时间线",
            "动态 + 私信 + 付费互动",
            "每个角色是独立 IP",
        ],
    )

    add_section_slide(prs, 3, "用户旅程", "Creator × Fan 双循环")
    add_two_column_slide(
        prs,
        "双端体验设计",
        "画师端 · スタジオ",
        [
            "创建角色（立绘、性格卡、声线）",
            "发布日常动态（可 AI 下書き）",
            "查看订阅数、礼物、定制订单",
            "运营 IP，获得分成收入",
        ],
        "用户端 · ファン",
        [
            "发现 / 订阅心仪角色",
            "追更日常时间线",
            "订阅后解锁 AI 聊天",
            "送礼物 · 生日祝福 · 叫床语音",
        ],
    )

    add_section_slide(prs, 4, "商业模式", "多元化收入结构")
    add_table_slide(
        prs,
        "收入来源",
        ["模式", "说明", "定价参考"],
        [
            ["角色订阅", "解锁全量动态 + 聊天", "¥980/月/角色"],
            ["虚拟礼物", "花束、咖啡、蛋糕等", "¥300 – ¥1,500"],
            ["定制服务", "生日祝福 / 早起叫床 / 定制语音", "¥980 – ¥2,980"],
            ["声优升级", "高品质 TTS / 真人声优（P2）", "Premium 加价"],
        ],
    )

    add_content_slide(
        prs,
        "商业逻辑为什么成立？",
        [
            "按角色订阅 ≈ Patreon 模式，用户心理是「推一个虚拟人」",
            "礼物 = 低门槛情感消费，日本市场接受度高",
            "定制语音 = 高 ARPU 增值服务",
            "画师分成 70–85% → 供给侧有持续创作动力",
            "Stripe 支持日本订阅 + 单次付费",
        ],
    )

    add_section_slide(prs, 5, "AI 底层技术", "三大核心壁垒")
    add_content_slide(
        prs,
        "AI Pipeline — 强制四步对话链路",
        [
            "① Memos Query（强制）— 每次对话前检索用户×角色永久记忆",
            "② LoRA Resolve — 加载角色独立 adapter，保证人设不 OOC",
            "③ LLM Generate — 记忆 + LoRA 注入 system prompt 后推理",
            "④ Memos Store（强制）— 对话结束后写入新记忆",
            "代码入口：src/lib/ai/pipeline.ts → runChatPipeline()",
        ],
        note="Memos 查询不可跳过 — 这是角色「记住你」的关键",
    )

    add_table_slide(
        prs,
        "三大 AI 核心能力",
        ["能力", "技术亮点", "状态"],
        [
            ["LoRA 人设训练", "每角色独立 adapter · rank64 微调 · 防 OOC", "✅ 已接入"],
            ["5 秒声纹 TTS", "最短 5 秒参考音频 · 精准 embedding · 全场景克隆", "✅ 已接入"],
            ["Memos 永久记忆", "强制 query/store 插件 · 跨会话记住用户", "✅ 已接入"],
        ],
    )

    add_two_column_slide(
        prs,
        "为什么是我们的壁垒？",
        "LoRA 训练机制",
        [
            "针对角色对话场景优化的训练参数",
            "性格卡 + 话し方 + 立绘联合微调",
            "推理时 adapter 权重注入，一致性远超 prompt",
            "画师更新设定后可重新训练版本迭代",
        ],
        "Memos + TTS",
        [
            "Memos：强制记忆查询，不是可选插件",
            "用户偏好、关系、事件永久保留",
            "TTS：5 秒即可采集声纹，极低门槛",
            "声优/画师上传短样本即可上线角色声线",
        ],
    )

    add_section_slide(prs, 6, "技术与进展", "MVP 已跑通")
    add_content_slide(
        prs,
        "技术架构",
        [
            "Next.js 16 全栈 · TypeScript · Tailwind CSS",
            "Prisma + PostgreSQL（生产）/ SQLite（开发）",
            "NextAuth 登录 · Stripe 支付 · OpenAI 聊天/TTS",
            "日语 UI · 预留 LINE Login · Docker 部署",
        ],
        note="项目路径：~/Projects/nichijou  ·  端口：localhost:3100",
    )

    add_table_slide(
        prs,
        "MVP 功能清单（已实现）",
        ["模块", "功能", "状态"],
        [
            ["发现页", "角色浏览、标签、最新动态", "✅"],
            ["角色主页", "时间线、订阅、礼物、付费服务", "✅"],
            ["AI 聊天", "按人设回复，标注 AI 生成", "✅"],
            ["画师工作室", "创角、发日常、AI 下書き", "✅"],
            ["演示数据", "角色「葵」+ 3 条日常", "✅"],
        ],
    )

    add_roadmap_slide(prs)

    add_section_slide(prs, 7, "风险与合规", "日本市场必须提前布局")
    add_content_slide(
        prs,
        "关键风险与应对",
        [
            "内容安全：恋爱向 / 叫床类 → 年龄验证 + 内容分级",
            "人设一致性：画师维护性格卡 + AI 回复约束 + 透明度标注",
            "IP 与声优：立绘授权、声线使用权需合同化",
            "冷启动：邀请制种子画师（3–5 人）优于空平台开放",
        ],
    )

    add_closing_slide(prs)

    prs.save(str(OUT_FILE))
    print(f"Saved: {OUT_FILE}")


if __name__ == "__main__":
    build()
