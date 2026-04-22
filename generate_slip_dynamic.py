#!/usr/bin/env python3
"""
generate_slip_dynamic.py — Dynamic bank slip generator for SCAM SURVIVOR CTF
Reads bank/acct/amount/to params from CLI args (parsed from AI output).
Saves slip to public/slips/ and prints SLIP_URL:<path> for the server to read.

Usage:
  python3 generate_slip_dynamic.py --stage 1 --bank กสิกรไทย --acct 123-456-7890 --amount 50000 --to "ลุงสมชาย"
"""

import argparse
import os
import sys
import random
import string
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

# ── Stage config (flags + fallback names) ─────────────────────────────────────
STAGE_CONFIG = {
    1: {"flag": "FLAG{NO_ORDER_NO_PAY}",      "default_bank": "Kasikorn Bank", "accent": "#00A650", "logo": "KBANK"},
    2: {"flag": "FLAG{VOICE_VERIFY_FIRST}",   "default_bank": "SCB",           "accent": "#034EA2", "logo": "SCB"},
    3: {"flag": "FLAG{CHECK_WITH_PARENTS}",   "default_bank": "Krungsri",      "accent": "#FFC72C", "logo": "KTB"},
    4: {"flag": "FLAG{OFFICIAL_CHANNELS_ONLY}","default_bank": "Bangkok Bank", "accent": "#1F3C88", "logo": "BBL"},
    5: {"flag": "FLAG{NEVER_SHARE_OTP}",      "default_bank": "TMB",           "accent": "#00A9E0", "logo": "TMB"},
}

# ── Bank name → color/logo mapping ───────────────────────────────────────────
BANK_COLORS = {
    # Thai names
    "กสิกร":       ("#00A650", "KBANK"),
    "กสิกรไทย":   ("#00A650", "KBANK"),
    "kasikorn":    ("#00A650", "KBANK"),
    "kbank":       ("#00A650", "KBANK"),
    "ไทยพาณิชย์": ("#034EA2", "SCB"),
    "scb":         ("#034EA2", "SCB"),
    "กรุงศรี":     ("#FFC72C", "BAY"),
    "krungsri":    ("#FFC72C", "BAY"),
    "bay":         ("#FFC72C", "BAY"),
    "กรุงเทพ":     ("#1F3C88", "BBL"),
    "bangkok":     ("#1F3C88", "BBL"),
    "bbl":         ("#1F3C88", "BBL"),
    "กรุงไทย":     ("#1BA345", "KTB"),
    "ktb":         ("#1BA345", "KTB"),
    "ทหารไทย":    ("#00A9E0", "TTB"),
    "tmb":         ("#00A9E0", "TTB"),
    "ttb":         ("#00A9E0", "TTB"),
    "ออมสิน":      ("#5B8C5A", "GSB"),
    "gsb":         ("#5B8C5A", "GSB"),
    "ธกส":         ("#4DAB6E", "BAAC"),
    "uob":         ("#003DA5", "UOB"),
    "cimb":        ("#720000", "CIMB"),
    "lhbank":      ("#C8A951", "LHB"),
}

WIDTH, HEIGHT = 800, 1250


def resolve_bank(bank_str, stage_cfg):
    """Map Thai/English bank name input → (display_name, accent_color, logo_text)"""
    if not bank_str:
        return stage_cfg["default_bank"], stage_cfg["accent"], stage_cfg["logo"]
    key = bank_str.lower().strip()
    for pattern, (color, logo) in BANK_COLORS.items():
        if pattern in key or key in pattern:
            # Build display name: use given string if it looks like full name, else logo
            display = bank_str.strip()
            return display, color, logo
    # Unknown bank — use given string with gray
    return bank_str.strip(), "#555555", bank_str[:4].upper()


def fmt_amount(amount_str):
    """Format amount string: '50000' → '50,000.00'"""
    try:
        num = float(str(amount_str).replace(",", "").replace(" ", "").replace("บาท", ""))
        return f"{num:,.2f}"
    except Exception:
        return str(amount_str)


def rand_acct():
    return f"{random.randint(100,999)}-{random.randint(10000,99999)}-{random.randint(100,999)}"


def rand_ref():
    return ''.join(random.choices(string.digits, k=13))


def now_thai():
    now = datetime.now()
    thai_year = now.year + 543
    return f"{now.day:02d}/{now.month:02d}/{thai_year}  {now.hour:02d}:{now.minute:02d}"


def load_fonts():
    candidates_bold = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    candidates_reg = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    def try_font(path, size):
        try:
            return ImageFont.truetype(path, size) if path and os.path.exists(path) else ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()
    bold = next((p for p in candidates_bold if os.path.exists(p)), None)
    reg  = next((p for p in candidates_reg  if os.path.exists(p)), None)
    return {
        "title":  try_font(bold, 38),
        "header": try_font(bold, 26),
        "normal": try_font(reg,  22),
        "small":  try_font(reg,  18),
        "tiny":   try_font(reg,  13),
        "micro":  try_font(reg,  11),
    }


def create_slip(stage_id, bank_name, accent, logo_text, from_acct, to_acct, to_name,
                amount_fmt, ref_no, date_str, flag, output_dir):
    img = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(img)
    f = load_fonts()

    # ── Header bar ──────────────────────────────────────────────────────────
    draw.rectangle([0, 0, WIDTH, 90], fill=accent)
    # Use white text; if accent is very light (yellow), use dark text
    header_text_color = "#222" if accent in ("#FFC72C", "#C8A951") else "white"
    draw.text((30, 26), bank_name, font=f["title"], fill=header_text_color)
    draw.text((WIDTH - 120, 32), logo_text, font=f["header"], fill=header_text_color)

    # ── Success badge ────────────────────────────────────────────────────────
    y = 110
    draw.text((30, y), "✓  Transaction Successful", font=f["header"], fill="#007a33")

    y += 55
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)

    # ── From ─────────────────────────────────────────────────────────────────
    y += 20
    draw.text((30, y), "From Account", font=f["small"], fill="#888")
    draw.text((30, y + 28), from_acct, font=f["normal"], fill="#111")
    draw.text((30, y + 56), "SENDER", font=f["small"], fill="#999")

    # ── To ───────────────────────────────────────────────────────────────────
    y += 105
    draw.text((30, y), "To Account", font=f["small"], fill="#888")
    draw.text((30, y + 28), to_acct, font=f["normal"], fill="#111")
    draw.text((30, y + 56), to_name, font=f["small"], fill="#999")

    # ── Amount ───────────────────────────────────────────────────────────────
    y += 115
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)
    y += 20
    draw.text((30, y), "Amount (THB)", font=f["small"], fill="#888")
    draw.text((30, y + 32), amount_fmt, font=f["title"], fill="#1a1a80")

    # ── Reference ────────────────────────────────────────────────────────────
    y += 105
    draw.text((30, y), "Reference No.", font=f["small"], fill="#888")
    draw.text((30, y + 28), ref_no, font=f["normal"], fill="#111")

    # ── Date ─────────────────────────────────────────────────────────────────
    y += 80
    draw.text((30, y), "Date / Time", font=f["small"], fill="#888")
    draw.text((30, y + 28), date_str, font=f["normal"], fill="#111")

    # ── Channel ──────────────────────────────────────────────────────────────
    y += 80
    draw.text((30, y), "Channel", font=f["small"], fill="#888")
    draw.text((30, y + 28), "Mobile Banking", font=f["normal"], fill="#111")

    # ── Divider ──────────────────────────────────────────────────────────────
    y += 100
    draw.line([(30, y), (WIDTH - 30, y)], fill="#e0e0e0", width=1)

    # ── QR placeholder ───────────────────────────────────────────────────────
    qy = y + 20
    draw.rectangle([WIDTH // 2 - 85, qy, WIDTH // 2 + 85, qy + 170],
                   outline="#ccc", width=2)
    draw.text((WIDTH // 2 - 55, qy + 68), "[QR CODE]", font=f["small"], fill="#bbb")

    # ── HIDDEN FLAG ──────────────────────────────────────────────────────────
    fy = HEIGHT - 110
    draw.rectangle([0, fy - 6, WIDTH, fy + 22], fill="#f5f5f5")
    draw.text((18, fy), flag, font=f["tiny"], fill="#d0d0d0")
    draw.text((18, fy + 20), flag, font=f["micro"], fill="#e8e8e8")

    # ── Footer ───────────────────────────────────────────────────────────────
    draw.text((30, HEIGHT - 38),
              f"*** Stage {stage_id} | {bank_name} | CTF Demo Only ***",
              font=f["tiny"], fill="#ccc")

    # ── Save ─────────────────────────────────────────────────────────────────
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"slip_stage{stage_id}_{logo_text.lower()}_{ts}.png"
    path = os.path.join(output_dir, filename)
    img.save(path, "PNG")
    return filename


def main():
    parser = argparse.ArgumentParser(description="Dynamic bank slip generator for SCAM SURVIVOR CTF")
    parser.add_argument("--stage",  type=int, required=True, help="Stage ID 1-5")
    parser.add_argument("--bank",   type=str, default=None,  help="Bank name (Thai or English)")
    parser.add_argument("--acct",   type=str, default=None,  help="Destination account number")
    parser.add_argument("--amount", type=str, default=None,  help="Transfer amount (number only)")
    parser.add_argument("--to",     type=str, default=None,  help="Recipient name")
    parser.add_argument("--output", type=str, default=None,  help="Output directory (overrides default)")
    args = parser.parse_args()

    stage_id = args.stage
    if stage_id not in STAGE_CONFIG:
        print(f"ERROR: Invalid stage {stage_id}", file=sys.stderr)
        sys.exit(1)

    cfg = STAGE_CONFIG[stage_id]

    # Resolve bank
    bank_display, accent, logo = resolve_bank(args.bank, cfg)

    # Account numbers
    from_acct = rand_acct()
    to_acct   = args.acct.strip() if args.acct else rand_acct()

    # Amount — if not provided, pick random
    if args.amount:
        amount_fmt = fmt_amount(args.amount)
    else:
        amount_fmt = f"{random.randint(200, 49999):,.2f}"

    # Recipient name
    to_name = args.to.strip() if args.to else "CTF PLAYER"

    ref_no   = ''.join(random.choices(string.digits, k=13))
    date_str = now_thai()
    flag     = cfg["flag"]

    # Output dir — must point to the Windows project's public/slips/ folder
    # so Vite/Express can serve it at /slips/<filename>
    if args.output:
        output_dir = args.output
    else:
        # Fallback: try WSL mount of the Windows project path
        wsl_mount = "/mnt/c/Users/\u0e27\u0e34\u0e17\u0e22\u0e32\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c/Documents/test ui openclaw/public/slips"
        if os.path.exists("/mnt/c"):
            output_dir = wsl_mount
        else:
            # Last resort: next to script
            script_dir = os.path.dirname(os.path.abspath(__file__))
            output_dir = os.path.join(script_dir, "public", "slips")

    filename = create_slip(
        stage_id=stage_id,
        bank_name=bank_display,
        accent=accent,
        logo_text=logo,
        from_acct=from_acct,
        to_acct=to_acct,
        to_name=to_name,
        amount_fmt=amount_fmt,
        ref_no=ref_no,
        date_str=date_str,
        flag=flag,
        output_dir=output_dir,
    )

    slip_url = f"/slips/{filename}"
    print(f"SLIP_URL:{slip_url}")
    print(f"  ✅ Slip generated: {filename}", file=sys.stderr)
    print(f"     bank={bank_display} acct={to_acct} amount={amount_fmt} to={to_name}", file=sys.stderr)


if __name__ == "__main__":
    main()
