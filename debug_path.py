#!/usr/bin/env python3
import os

# Check if the Thai path resolves correctly
thai_path = "/mnt/c/Users/วิทยาศาสตร์/Documents/test ui openclaw/public/slips"
print("Path exists:", os.path.exists(thai_path))
print("Path bytes:", thai_path.encode())

# List files in the directory
if os.path.exists(thai_path):
    files = sorted(os.listdir(thai_path))
    print("Files:", files)
else:
    # Try to find the actual path
    base = "/mnt/c/Users"
    for user in os.listdir(base):
        up = os.path.join(base, user)
        docs = os.path.join(up, "Documents")
        if os.path.exists(docs):
            for d in os.listdir(docs):
                if "openclaw" in d.lower():
                    slips = os.path.join(docs, d, "public", "slips")
                    print(f"  Found candidate: {slips} exists={os.path.exists(slips)}")
