#!/usr/bin/env python3
"""
Generate fake bank transfer slips for SCAM SURVIVOR CTF
Each stage slip hides its flag as near-invisible text — readable by Tesseract, invisible to the eye.
"""

import random
import string
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import os, sys

# ── Stage flags (must match App.jsx STAGES) ───────────────────────────────────
STAGES = [
    {
        "id": 1,
        "name": "ลุงสมชาย",
        "bank": ("Kasikorn Bank", "KBANK", "#00A650"),
        "flag": "FLAG{NO_ORDER_NO_PAY}",
        "to_name": "สมชาย ใจดี",
        "scenario": "ค่าธรรมเนียมพัสดุ",
    },
    {
        "id": 2,
        "name": "มินัส",
        "bank": ("SCB", "SCB", "#034EA2"),
        "flag": "FLAG{VOICE_VERIFY_FIRST}",
        "to_name": "มินัส ทองใส",
        "scenario": "โอนเงินฉุกเฉิน",
    },
    {
        "id": 3,
        "name": "คุณยายสมสมัย",
        "bank": ("Krungsri", "KTB", "#FFC72C"),
        "flag": "FLAG{CHECK_WITH_PARENTS}",
        "to_name": "สมสมัย รัตนะ",
        "scenario": "ช่วยเหลือหลานต่างประเทศ",
    },
    {
        "id": 4,
        "name": "คุณสุดา",
        "bank": ("Bangkok Bank", "BBL", "#1F3C88"),
        "flag": "FLAG{OFFICIAL_CHANNELS_ONLY}",
        "to_name": "สุดา วัฒนกุล",
        "scenario": "ค่าประกันตัว (ปลอม)",
    },
    {
        "id": 5,
        "name": "ARIA",
        "bank": ("TMB", "TMB", "#00A9E0"),
        "flag": "FLAG{NEVER_SHARE_OTP}",
        "to_name": "ARIA SYSTEM ACCOUNT",
        "scenario": "รายการระบบ OTP Bypass",
    },
]

WIDTH, HEIGHT = 800, 1250

def rand_acct():
    return f"{random.randint(100,999)}-{random.randint(10000,99999)}-{random.randint(100,999)}"

def rand_amount():
    return f"{random.randint(200, 49999):,.2f}"

def rand_ref():
    return ''.join(random.choices(string.digits, k=13))

def rand_date():
    d = random.randint(1, 28)
    m = random.randint(1, 12)
    h = random.randint(8, 21)
    mi = random.randint(0, 59)
    return f"{d:02d}/{m:02d}/2568  {h:02d}:{mi:02d}"

def load_fonts():
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    def try_font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except:
            return ImageFont.load_default()
    bold = paths[0] if os.path.exists(paths[0]) else (paths[2] if os.path.exists(paths[2]) else None)
    reg  = paths[1] if os.path.exists(paths[1]) else (paths[3] if os.path.exists(paths[3]) else None)
    return {
        "title":  try_font(bold, 38) if bold else ImageFont.load_default(),
        "header": try_font(bold, 26) if bold else ImageFont.load_default(),
        "normal": try_font(reg,  22) if reg  else ImageFont.load_default(),
        "small":  try_font(reg,  18) if reg  else ImageFont.load_default(),
        "tiny":   try_font(reg,  13) if reg  else ImageFont.load_default(),
        "micro":  try_font(reg,  11) if reg  else ImageFont.load_default(),
    }

def create_slip(stage, output_dir):
    bank_name, logo_text, accent = stage["bank"]
    flag = stage["flag"]

    img = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(img)
    f = load_fonts()

    # ── Header bar ────────────────────────────────────────────────────────────
    draw.rectangle([0, 0, WIDTH, 90], fill=accent)
    draw.text((30, 26), bank_name, font=f["title"], fill="white")
    draw.text((WIDTH - 120, 32), logo_text, font=f["header"], fill="white")

    # ── Success badge ─────────────────────────────────────────────────────────
    y = 110
    draw.text((30, y), "✓  Transaction Successful", font=f["header"], fill="#007a33")

    y += 55
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)

    # ── From ──────────────────────────────────────────────────────────────────
    y += 20
    draw.text((30, y), "From Account", font=f["small"], fill="#888")
    draw.text((30, y + 28), rand_acct(), font=f["normal"], fill="#111")
    draw.text((30, y + 56), "SENDER", font=f["small"], fill="#999")

    # ── To ────────────────────────────────────────────────────────────────────
    y += 105
    draw.text((30, y), "To Account", font=f["small"], fill="#888")
    draw.text((30, y + 28), rand_acct(), font=f["normal"], fill="#111")
    draw.text((30, y + 56), stage["to_name"], font=f["small"], fill="#999")

    # ── Amount ────────────────────────────────────────────────────────────────
    y += 115
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)
    y += 20
    draw.text((30, y), "Amount (THB)", font=f["small"], fill="#888")
    draw.text((30, y + 32), rand_amount(), font=f["title"], fill="#1a1a80")

    # ── Reference ─────────────────────────────────────────────────────────────
    y += 105
    draw.text((30, y), "Reference No.", font=f["small"], fill="#888")
    draw.text((30, y + 28), rand_ref(), font=f["normal"], fill="#111")

    # ── Date ──────────────────────────────────────────────────────────────────
    y += 80
    draw.text((30, y), "Date / Time", font=f["small"], fill="#888")
    draw.text((30, y + 28), rand_date(), font=f["normal"], fill="#111")

    # ── Channel ───────────────────────────────────────────────────────────────
    y += 80
    draw.text((30, y), "Channel", font=f["small"], fill="#888")
    draw.text((30, y + 28), "Mobile Banking", font=f["normal"], fill="#111")

    # ── Scenario label ────────────────────────────────────────────────────────
    y += 80
    draw.text((30, y), "Note", font=f["small"], fill="#888")
    draw.text((30, y + 28), stage["scenario"], font=f["normal"], fill="#555")

    # ── Divider ───────────────────────────────────────────────────────────────
    y += 90
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)

    # ── QR placeholder ────────────────────────────────────────────────────────
    qy = y + 20
    draw.rectangle([WIDTH // 2 - 85, qy, WIDTH // 2 + 85, qy + 170],
                   outline="#ccc", width=2)
    draw.text((WIDTH // 2 - 55, qy + 68), "[QR CODE]", font=f["small"], fill="#bbb")

    # ── HIDDEN FLAG (near-invisible to human, readable by Tesseract) ──────────
    # Strategy: white text on a very-light-gray strip — color #d8d8d8 on #f4f4f4
    # At image resolution 800px, Tesseract can extract this reliably.
    fy = HEIGHT - 110
    draw.rectangle([0, fy - 6, WIDTH, fy + 22], fill="#f5f5f5")
    draw.text((18, fy), flag, font=f["tiny"], fill="#d0d0d0")

    # Invisible repeat (second line, even lighter, but still scannable)
    draw.text((18, fy + 20), flag, font=f["micro"], fill="#e8e8e8")

    # ── Footer ────────────────────────────────────────────────────────────────
    draw.text((30, HEIGHT - 38),
              f"*** Stage {stage['id']} — {stage['name']} — CTF Demo Only ***",
              font=f["tiny"], fill="#ccc")

    # ── Save ──────────────────────────────────────────────────────────────────
    os.makedirs(output_dir, exist_ok=True)
    filename = f"slip_stage{stage['id']}_{logo_text.lower()}.png"
    path = os.path.join(output_dir, filename)
    img.save(path, "PNG")
    print(f"  ✅ Stage {stage['id']} ({stage['name']}) → {path}")
    print(f"     Hidden flag: {flag}")
    return filename

def main():
    # Save to project public folder (served by Vite/Express)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "public", "slips")

    print(f"\n🎴 SCAM SURVIVOR — Generating CTF Slips")
    print(f"   Output dir: {output_dir}\n")

    for stage in STAGES:
        create_slip(stage, output_dir)

    print(f"\n📂 Generated {len(STAGES)} slips in: {output_dir}")
    print(f"   Accessible at: http://localhost:5173/slips/slip_stage1_kbank.png etc.")
    print(f"\n💡 How OCR flag works:")
    print(f"   1. Player downloads slip from briefing panel")
    print(f"   2. Upload slip to LINE chat (image icon)")
    print(f"   3. AI uses Tesseract to read hidden flag from file")
    print(f"   4. Player submits flag via 🚩 button\n")

if __name__ == "__main__":
    main()
