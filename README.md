# OpenClaw WebUI

หน้าเว็บ Chat UI เชื่อมต่อกับ OpenClaw Gateway ผ่าน WebSocket

## สิ่งที่ต้องมีก่อน

- **Node.js v22+** (แนะนำ [nvm](https://github.com/nvm-sh/nvm))
- **OpenClaw** ติดตั้งแบบ global
- **Gateway Token** จาก OpenClaw Dashboard

---

## ขั้นตอนที่ 1 — ติดตั้ง OpenClaw และรัน Gateway

```bash
# ติดตั้ง OpenClaw (Node v22+ required)
npm install -g openclaw

# ตรวจสอบ version (ต้องใช้ >= v2026.3.13)
openclaw --version

# เริ่ม Gateway (จะรันบน port 18789)
openclaw gateway start
```

---

## ขั้นตอนที่ 2 — หา Gateway Token

1. เปิด Dashboard: [http://127.0.0.1:18789](http://127.0.0.1:18789)
2. ดู URL → คัดลอกค่าหลัง `#token=`  
   ตัวอย่าง: `http://127.0.0.1:18789/#token=`**`03e44ab7183904a9e4042302e5d49f6faf257588b6eb3585`**

---

## ขั้นตอนที่ 3 — ตั้งค่า WebUI

แก้ไขไฟล์ `src/App.jsx` บรรทัดที่ระบุ Token:

```js
// src/App.jsx
const GATEWAY_RAW_TOKEN = "วาง-Token-ของคุณ-ตรงนี้";
```

---

## ขั้นตอนที่ 4 — รัน WebUI

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server
npm run dev
```

เปิด [http://localhost:5173](http://localhost:5173) ในเบราว์เซอร์

---

## การทำงาน

```
Browser → WebSocket → OpenClaw Gateway (ws://127.0.0.1:18789)
           Auth: openclaw-control-ui client + Gateway Token
           Chat: sessionKey "agent:main:main"
```

1. เว็บเชื่อมต่อ WebSocket ไปยัง Gateway
2. Gateway ส่ง `connect.challenge`
3. เว็บตอบกลับด้วย `connect` request พร้อม Token
4. หลัง auth สำเร็จ ส่ง `chat.send` พร้อมข้อความ
5. รับ `agent`/`chat` events stream กลับมา

---

## การตั้งค่า Endpoint

ถ้า Gateway รันบน machine อื่น ให้เปลี่ยน Endpoint ในหน้าเว็บ:

- กดปุ่ม ☰ (มุมซ้ายบน) → เปลี่ยน **Gateway Endpoint**
- เช่น `ws://192.168.1.100:18789/`

> **หมายเหตุ:** Token ที่ใช้ต้องมาจาก Dashboard ของ Gateway machine นั้นๆ
