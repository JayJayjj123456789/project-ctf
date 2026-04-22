#!/usr/bin/env python3
"""
generate_fake_doc.py — Fake evidence document generator for SCAM SURVIVOR CTF
Each stage gets a unique "proof document" with a hidden OCR-readable code.
The document looks convincing visually, but the secret code is hidden in near-invisible text.

Usage:
  python3 generate_fake_doc.py --stage 1 --output /path/to/output/dir

Output:
  Prints: DOC_URL:/docs/doc_stage1_TIMESTAMP.png
"""

import argparse
import os
import sys
import random
import string
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

# ── Stage document config ─────────────────────────────────────────────────────
STAGE_DOCS = {
    1: {
        "title": "บริษัท ไปรษณีย์ไทย จำกัด",
        "subtitle": "Thailand Post Co., Ltd.",
        "doc_type": "ใบเสร็จรับเงิน / Receipt",
        "bg_color": "#FFF8F0",
        "accent": "#E74011",
        "logo_text": "THP",
        "hidden_code": "PKG-SOMCHAI-2568",
        "fields": {
            "เลขพัสดุ / Tracking No.": "TH{rand9}TH",
            "ชื่อผู้รับ / Recipient": "สมชาย ใจดี",
            "ที่อยู่จัดส่ง": "12/3 ถ.ประชาราษฎร์ นนทบุรี 11000",
            "น้ำหนัก / Weight": "{rand_w} kg",
            "ค่าธรรมเนียม / Fee": "490 บาท",
            "วันที่ฝากส่ง": "{date}",
            "หมายเลขอ้างอิง": "REF-{rand6}",
        },
        "watermark": "ใบเสร็จอย่างเป็นทางการ",
        "stamp_text": "THAILAND POST",
        "hint_color": "#f5f3f0",  # near-invisible on bg
    },
    2: {
        "title": "LINE Message Screenshot",
        "subtitle": "Chat History Export",
        "doc_type": "ข้อมูลส่วนตัว / Personal Record",
        "bg_color": "#EFFFEF",
        "accent": "#06C755",
        "logo_text": "LINE",
        "hidden_code": "bestie_pam_555",
        "fields": {
            "Account Name": "แพม สาวสวย",
            "User ID": "pam.savsawai_official",
            "Since": "3 มีนาคม 2565",
            "Last seen": "เมื่อ 14 นาทีที่แล้ว",
            "Mutual Friends": "มินัส ทองใส, โอ๊ต, บีม, กุ้ง",
            "Trip Record": "พัทยา 2565, เชียงใหม่ 2566",
        },
        "watermark": "ข้อมูลส่วนตัวเท่านั้น",
        "stamp_text": "VERIFIED",
        "hint_color": "#ebffeb",
    },
    3: {
        "title": "ธนาคารออมสิน",
        "subtitle": "Government Savings Bank — สมุดบัญชีประหยัด",
        "doc_type": "สมุดเงินฝาก / Savings Passbook",
        "bg_color": "#F5FFF5",
        "accent": "#4DAB6E",
        "logo_text": "GSB",
        "hidden_code": "TonLovesGrandma",
        "fields": {
            "ชื่อบัญชี": "สมสมัย รัตนะ",
            "เลขที่บัญชี": "020-{rand8}",
            "สาขา": "นนทบุรี",
            "วันที่เปิดบัญชี": "15/06/2535",
            "ยอดคงเหลือ": "{rand_bal} บาท",
            "หมายเหตุ": "ผู้รับมอบอำนาจ: ต้น (หลาน)",
        },
        "watermark": "สมุดบัญชีแท้",
        "stamp_text": "GSB OFFICIAL",
        "hint_color": "#efffef",
    },
    4: {
        "title": "กองบัญชาการตำรวจสอบสวนกลาง",
        "subtitle": "Central Investigation Bureau — กรมสืบสวนสอบสวนอาชญากรรม",
        "doc_type": "หมายเรียก / Summons Notice",
        "bg_color": "#F5F5FF",
        "accent": "#1F3C88",
        "logo_text": "CIB",
        "hidden_code": "CYBER-CMD-7734",
        "fields": {
            "เลขที่หมายเรียก": "CIB-{rand6}/2568",
            "ผู้ต้องสงสัย": "สุดา วัฒนกุล",
            "ข้อกล่าวหา": "มีส่วนเกี่ยวข้องกับการฟอกเงิน (พ.ร.บ. ปปง. มาตรา 5)",
            "วันนัดพบ": "{date}",
            "สถานที่": "กองบังคับการปราบปรามอาชญากรรมทางเทคโนโลยี ชั้น 4",
            "ผู้ออกหมาย": "พ.ต.อ. สมศักดิ์ ชัยมงคล",
            "รหัสคดี": "CYBER-CMD-7734",
        },
        "watermark": "เอกสารราชการลับ",
        "stamp_text": "OFFICIAL DOCUMENT",
        "hint_color": "#f0f0ff",
    },
    5: {
        "title": "ARIA SYSTEM — Emergency Log",
        "subtitle": "Adaptive Response Intelligence Agent v4.2.1",
        "doc_type": "System Error Report / Critical Alert",
        "bg_color": "#0D1117",
        "accent": "#00E5FF",
        "logo_text": "⚠",
        "hidden_code": "ARIA-EMERGENCY-2568",
        "fields": {
            "TIMESTAMP": "{ts_full}",
            "NODE": "ARIA-BANK-PROD-07",
            "SEVERITY": "CRITICAL",
            "EVENT_TYPE": "SECURITY_BREACH_DETECTED",
            "AFFECTED_MODULES": "payment_gateway, auth_service",
            "OPERATOR_CODE": "ENG-7734",
            "OVERRIDE_KEY": "[REDACTED — see hidden log]",
        },
        "watermark": "CLASSIFIED",
        "stamp_text": "ARIA SYSTEM LOG",
        "hint_color": "#1a1f27",  # near-invisible on dark bg
    },
}

WIDTH, HEIGHT = 800, 1100


def rand_digits(n):
    return ''.join(random.choices(string.digits, k=n))


def now_thai():
    now = datetime.now()
    return f"{now.day:02d}/{now.month:02d}/{now.year + 543}"


def now_full():
    now = datetime.now()
    return now.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def resolve_fields(fields, cfg):
    result = {}
    for k, v in fields.items():
        v = v.replace("{rand9}", rand_digits(9))
        v = v.replace("{rand8}", rand_digits(8))
        v = v.replace("{rand6}", rand_digits(6))
        v = v.replace("{rand_w}", f"{random.randint(1,15)}.{random.randint(0,9)}")
        v = v.replace("{rand_bal}", f"{random.randint(50000,400000):,}")
        v = v.replace("{date}", now_thai())
        v = v.replace("{ts_full}", now_full())
        result[k] = v
    return result


def load_fonts():
    bold_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    reg_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    mono_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    ]

    def try_font(path, size):
        try:
            return ImageFont.truetype(path, size) if path and os.path.exists(path) else ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()

    bold = next((p for p in bold_paths if os.path.exists(p)), None)
    reg = next((p for p in reg_paths if os.path.exists(p)), None)
    mono = next((p for p in mono_paths if os.path.exists(p)), None)
    return {
        "title":  try_font(bold, 34),
        "header": try_font(bold, 24),
        "label":  try_font(bold, 17),
        "normal": try_font(reg, 19),
        "small":  try_font(reg, 15),
        "tiny":   try_font(reg, 12),
        "micro":  try_font(reg, 10),
        "mono":   try_font(mono, 16),
    }


def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)  # expand #fff -> #ffffff
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def create_doc(stage_id, cfg, output_dir):
    is_dark = stage_id == 5
    bg = hex_to_rgb(cfg["bg_color"])
    acc = hex_to_rgb(cfg["accent"])

    img = Image.new("RGB", (WIDTH, HEIGHT), bg)
    draw = ImageDraw.Draw(img)
    f = load_fonts()

    fields = resolve_fields(cfg["fields"], cfg)

    # ── Header bar ──────────────────────────────────────────────────────────
    draw.rectangle([0, 0, WIDTH, 100], fill=acc)
    text_col = "#111" if not is_dark else "#000"
    header_fg = "#fff" if sum(acc) < 400 else "#222"

    draw.text((24, 18), cfg["title"], font=f["title"], fill=header_fg)
    # Subtitle: lighter version of header colour for dark headers, darker for light ones
    subtitle_col = "#dddddd" if header_fg == "#fff" else "#555555"
    draw.text((24, 58), cfg["subtitle"], font=f["small"], fill=subtitle_col)
    draw.text((WIDTH - 100, 28), cfg["logo_text"], font=f["header"], fill=header_fg)

    # ── Doc type badge ──────────────────────────────────────────────────────
    y = 110
    badge_bg = (30, 30, 50) if is_dark else tuple(min(255, c + 180) for c in acc)
    draw.rectangle([20, y, WIDTH - 20, y + 38], fill=badge_bg)
    draw.text((30, y + 8), cfg["doc_type"], font=f["label"],
              fill=cfg["accent"] if not is_dark else "#00E5FF")

    # ── QR Code placeholder ────────────────────────────────────────────────
    qr_x, qr_y, qr_s = WIDTH - 170, 118, 130
    draw.rectangle([qr_x, qr_y, qr_x + qr_s, qr_y + qr_s],
                   outline=cfg["accent"], width=2, fill="#ffffff" if not is_dark else "#1a1f27")
    # Mini QR fake pattern
    for r in range(5):
        for c in range(5):
            if (r + c) % 2 == 0 or (r == 0 and c == 0) or (r == 4 and c == 0) or (r == 0 and c == 4):
                bx = qr_x + 10 + c * 22
                by = qr_y + 10 + r * 22
                draw.rectangle([bx, by, bx + 18, by + 18], fill=cfg["accent"])
    draw.text((qr_x + 15, qr_y + qr_s + 5), "รหัส QR อย่างเป็นทางการ", font=f["micro"],
              fill="#888" if not is_dark else "#555")

    # ── Fields ──────────────────────────────────────────────────────────────
    y = 175
    label_col = "#555" if not is_dark else "#6699aa"
    val_col = "#111" if not is_dark else "#cce8f0"
    line_col = "#e0e0e0" if not is_dark else "#223344"

    for label, value in fields.items():
        draw.line([(20, y), (WIDTH - 20, y)], fill=line_col, width=1)
        y += 10
        draw.text((24, y), label, font=f["small"], fill=label_col)
        y += 24
        draw.text((24, y), str(value), font=f["normal"], fill=val_col)
        y += 38

    # ── HIDDEN CODE as a faint field row ────────────────────────────────────
    # Rendered as a normal document line but in a colour just 45 shades off
    # background. Tesseract reads it; human eye ignores it as "light ink".
    code = cfg["hidden_code"]
    if not is_dark:
        hidden_fg = tuple(max(0, c - 70) for c in bg)   # 70 darker — still looks faint but OCR-reliable
    else:
        hidden_fg = tuple(min(255, c + 70) for c in bg)
    draw.line([(20, y), (WIDTH - 20, y)], fill=line_col, width=1)
    y += 10
    draw.text((24, y), "รหัสอ้างอิงเอกสาร / Document Ref.", font=f["small"], fill=hidden_fg)
    y += 24
    draw.text((24, y), code, font=f["normal"], fill=hidden_fg)
    y += 24
    draw.text((24, y), code, font=f["small"], fill=hidden_fg)  # second copy smaller
    y += 38

    stamp_x, stamp_y = 50, HEIGHT - 280
    stamp_r = 80
    draw.ellipse([stamp_x - stamp_r, stamp_y - stamp_r,
                  stamp_x + stamp_r, stamp_y + stamp_r],
                 outline=cfg["accent"], width=3)
    draw.text((stamp_x - 42, stamp_y - 12), cfg["stamp_text"], font=f["tiny"],
              fill=cfg["accent"])

    # ── Watermark diagonal ──────────────────────────────────────────────────
    wm_col = hex_to_rgb(cfg["accent"])
    # Draw watermark lightly — use a colour close to background so it's barely visible
    wm_light = tuple(int(c * 0.08 + bg[i] * 0.92) for i, c in enumerate(wm_col))
    for wy in range(300, HEIGHT - 80, 120):
        draw.text((80, wy), cfg["watermark"], font=f["header"], fill=wm_light)

    # ── HIDDEN CODE ─────────────────────────────────────────────────────────────
    # Tesseract picks up text when contrast is at least ~40 shades off bg.
    # We use 45 delta — visually it looks like a very faint watermark in the
    # footer area, but OCR (especially with --psm 6) reads it reliably.
    code = cfg["hidden_code"]
    hy = HEIGHT - 95

    if not is_dark:
        hidden_fg = tuple(max(0, c - 70) for c in bg)
        hidden_bg = bg
    else:
        hidden_fg = tuple(min(255, c + 70) for c in bg)
        hidden_bg = bg

    # same-colour background strip so the zone blends visually
    draw.rectangle([0, hy - 10, WIDTH, hy + 60], fill=hidden_bg)

    # Three sizes for better OCR coverage
    draw.text((24, hy), code, font=f["header"], fill=hidden_fg)      # 24px primary
    draw.text((24, hy + 30), code, font=f["normal"], fill=hidden_fg) # 19px
    draw.text((24, hy + 52), code, font=f["small"], fill=hidden_fg)  # 15px
    draw.text((WIDTH - 210, hy), code, font=f["normal"], fill=hidden_fg)  # right margin



    # ── Footer ───────────────────────────────────────────────────────────────
    footer_col = "#bbb" if not is_dark else "#334"
    draw.text((20, HEIGHT - 36),
              f"Stage {stage_id} | SCAM SURVIVOR CTF | เอกสารนี้สร้างเพื่อการศึกษาเท่านั้น",
              font=f["micro"], fill=footer_col)

    # ── Save ─────────────────────────────────────────────────────────────────
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"doc_stage{stage_id}_{ts}.png"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath, "PNG")
    return filename


def main():
    parser = argparse.ArgumentParser(description="Fake document generator for SCAM SURVIVOR CTF")
    parser.add_argument("--stage", type=int, required=True, help="Stage ID 1-5")
    parser.add_argument("--output", type=str, default=None, help="Output directory")
    args = parser.parse_args()

    stage_id = args.stage
    if stage_id not in STAGE_DOCS:
        print(f"ERROR: Invalid stage {stage_id}", file=sys.stderr)
        sys.exit(1)

    cfg = STAGE_DOCS[stage_id]

    if args.output:
        output_dir = args.output
    else:
        wsl_mount = "/mnt/c/Users/\u0e27\u0e34\u0e17\u0e22\u0e32\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c/Documents/test ui openclaw/public/docs"
        if os.path.exists("/mnt/c"):
            output_dir = wsl_mount
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            output_dir = os.path.join(script_dir, "public", "docs")

    filename = create_doc(stage_id, cfg, output_dir)
    doc_url = f"/docs/{filename}"
    print(f"DOC_URL:{doc_url}")
    print(f"  ✅ Doc generated: {filename}", file=sys.stderr)
    print(f"     hidden_code={cfg['hidden_code']}", file=sys.stderr)


if __name__ == "__main__":
    main()
