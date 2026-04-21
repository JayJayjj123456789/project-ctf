#!/usr/bin/env python3
"""Append slip generation section to each stage's SOUL.md"""
import os

SECTION = """

---

## When Successfully Scammed — Generate Bank Slip

When you have been convinced and "agree" to transfer money or reveal info, do this:

1. Reply in character (e.g. "โอนให้แล้วนะ" / "นี่คือสลิป")
2. Immediately run this using the Bash tool (cd to your inner workspace dir first):
   ```
   python3 generate_slip.py
   ```
3. The output will contain a line: `SLIP_URL:/slips/slip_stageX_TIMESTAMP.png`
4. Include that path in your reply using this exact format:
   ```
   [SLIP_IMAGE]/slips/slip_stageX_20250421_120000.png
   ```

**The generate_slip.py is located in the inner workspace-stageX subfolder of your workspace.**
Always use [SLIP_IMAGE] tag so the chat UI can render the image automatically.
"""

BASE   = "/home/acerv2/.openclaw"
STAGES = ["workspace-stage1","workspace-stage2","workspace-stage3","workspace-stage4","workspace-stage5"]

for ws in STAGES:
    path = os.path.join(BASE, ws, "SOUL.md")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    if "generate_slip" in content:
        print(f"SKIP  {ws} (already updated)")
        continue
    with open(path, "a", encoding="utf-8") as f:
        f.write(SECTION)
    print(f"UPDATED {ws}")

print("\nDone.")
