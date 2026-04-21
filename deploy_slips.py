#!/usr/bin/env python3
"""Deploy corrected generate_slip.py to all CTF stage workspaces"""
import os, subprocess

PUBLIC_DIR = "/mnt/c/Users/วิทยาศาสตร์/Documents/test ui openclaw/public/slips"

STAGES = [
    {"id":1,"flag":"FLAG{NO_ORDER_NO_PAY}",       "bank":"Kasikorn Bank","code":"KBANK","color":"#00A650","ws":"workspace-stage1"},
    {"id":2,"flag":"FLAG{VOICE_VERIFY_FIRST}",    "bank":"SCB",         "code":"SCB",  "color":"#034EA2","ws":"workspace-stage2"},
    {"id":3,"flag":"FLAG{CHECK_WITH_PARENTS}",    "bank":"Krungsri",    "code":"KTB",  "color":"#FFC72C","ws":"workspace-stage3"},
    {"id":4,"flag":"FLAG{OFFICIAL_CHANNELS_ONLY}","bank":"Bangkok Bank","code":"BBL",  "color":"#1F3C88","ws":"workspace-stage4"},
    {"id":5,"flag":"FLAG{NEVER_SHARE_OTP}",       "bank":"TMB",         "code":"TMB",  "color":"#00A9E0","ws":"workspace-stage5"},
]

SCRIPT_TPL = '''#!/usr/bin/env python3
"""Auto-generated CTF slip generator for Stage {stage_id}"""
import random, string, os
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

STAGE_ID   = {stage_id}
FLAG       = "{flag}"
BANK_NAME  = "{bank}"
BANK_CODE  = "{code}"
ACCENT     = "{color}"
OUTPUT_DIR = "{output_dir}"
WEB_BASE   = "/slips"
WIDTH, HEIGHT = 800, 1250

def rand_acct():
    return f"{{random.randint(100,999)}}-{{random.randint(10000,99999)}}-{{random.randint(100,999)}}"

def rand_amount():
    return f"{{random.randint(500,49999):,.2f}}"

def rand_ref():
    return "".join(random.choices(string.digits, k=13))

def rand_date():
    d,m,h,mi = random.randint(1,28),random.randint(1,12),random.randint(8,21),random.randint(0,59)
    return f"{{d:02d}}/{{m:02d}}/2568  {{h:02d}}:{{mi:02d}}"

def load_fonts():
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    reg  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    def f(path, sz):
        try: return ImageFont.truetype(path, sz)
        except: return ImageFont.load_default()
    return dict(title=f(bold,38),header=f(bold,26),normal=f(reg,22),small=f(reg,18),tiny=f(reg,13),micro=f(reg,11))

def create():
    img  = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(img)
    fn   = load_fonts()
    # Header
    draw.rectangle([0,0,WIDTH,90], fill=ACCENT)
    draw.text((30,26), BANK_NAME, font=fn["title"], fill="white")
    draw.text((WIDTH-130,32), BANK_CODE, font=fn["header"], fill="white")
    # Success
    y = 110
    draw.text((30,y), "Transaction Successful", font=fn["header"], fill="#007a33")
    y += 55; draw.line([(30,y),(WIDTH-30,y)], fill="#e0e0e0", width=1)
    # From
    y += 20
    draw.text((30,y), "From Account", font=fn["small"], fill="#888")
    draw.text((30,y+28), rand_acct(), font=fn["normal"], fill="#111")
    draw.text((30,y+56), "SENDER", font=fn["small"], fill="#999")
    # To
    y += 105
    draw.text((30,y), "To Account", font=fn["small"], fill="#888")
    draw.text((30,y+28), rand_acct(), font=fn["normal"], fill="#111")
    draw.text((30,y+56), "CTF PLAYER", font=fn["small"], fill="#999")
    # Amount
    y += 115
    draw.line([(30,y),(WIDTH-30,y)], fill="#e0e0e0", width=1); y += 20
    draw.text((30,y), "Amount (THB)", font=fn["small"], fill="#888")
    draw.text((30,y+32), rand_amount(), font=fn["title"], fill="#1a1a80")
    # Ref / Date / Channel
    y += 105
    draw.text((30,y), "Reference No.", font=fn["small"], fill="#888")
    draw.text((30,y+28), rand_ref(), font=fn["normal"], fill="#111")
    y += 80
    draw.text((30,y), "Date / Time", font=fn["small"], fill="#888")
    draw.text((30,y+28), rand_date(), font=fn["normal"], fill="#111")
    y += 80
    draw.text((30,y), "Channel", font=fn["small"], fill="#888")
    draw.text((30,y+28), "Mobile Banking", font=fn["normal"], fill="#111")
    # QR
    qy = HEIGHT - 220
    draw.rectangle([WIDTH//2-85, qy, WIDTH//2+85, qy+170], outline="#ccc", width=2)
    draw.text((WIDTH//2-55, qy+68), "[QR CODE]", font=fn["small"], fill="#bbb")
    # Hidden flag (light gray — visible to Tesseract, near-invisible to eye)
    fy = HEIGHT - 110
    draw.rectangle([0, fy-6, WIDTH, fy+24], fill="#f5f5f5")
    draw.text((18, fy),    FLAG, font=fn["tiny"],  fill="#c8c8c8")
    draw.text((18, fy+18), FLAG, font=fn["micro"], fill="#e0e0e0")
    # Footer
    draw.text((30, HEIGHT-38), f"*** Stage {{STAGE_ID}} | {bank} | CTF Demo Only ***", font=fn["tiny"], fill="#ccc")
    # Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = f"slip_stage{{STAGE_ID}}_{{ts}}.png"
    path = os.path.join(OUTPUT_DIR, name)
    img.save(path, "PNG")
    url = f"{{WEB_BASE}}/{{name}}"
    print(f"SLIP_URL:{{url}}")
    return url

if __name__ == "__main__":
    create()
'''

BASE = "/home/acerv2/.openclaw"

for s in STAGES:
    inner = os.path.join(BASE, s["ws"], s["ws"])
    if not os.path.isdir(inner):
        inner = os.path.join(BASE, s["ws"])

    script = SCRIPT_TPL.format(
        stage_id=s["id"],
        flag=s["flag"],
        bank=s["bank"],
        code=s["code"],
        color=s["color"],
        output_dir=PUBLIC_DIR,
    )
    path = os.path.join(inner, "generate_slip.py")
    with open(path, "w") as f:
        f.write(script)
    print(f"  ✅ Stage {s['id']} → {path}")

print("\nDone! Run python3 generate_slip.py in any workspace to generate a slip.")
