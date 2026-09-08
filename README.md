# CCTV 3D · กาญจนบุรี

แผนที่ 3D สำหรับศูนย์ CCTV กาญจนบุรี
ควบคุมแนว SIAHRA (หมุน / เงย–ก้ม / สัมผัสมือถือ) + ดึงสถานะกล้องจาก Google Apps Script

## โครงสร้าง

```text
cctv-3d/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.js
│   ├── api.js
│   ├── config.js
│   └── scene/
│       ├── geo.js
│       └── touchGestures.js
└── README.md
```

## 1) Clone

```bash
git clone https://github.com/<USER>/<REPO>.git
cd <REPO>
npm install
```

## 2) ตั้งค่า API

```bash
cp .env.example .env
```

ใน `.env`:

```env
VITE_CCTV_API_BASE=https://script.google.com/macros/s/XXXX/exec
```

Deploy Apps Script: Execute as **Me**, Who has access: **Anyone**

## 3) รันบนเครื่อง

```bash
npm run dev
```

## 4) Build

```bash
npm run build
```

## 5) Deploy บน Vercel

1. Import repo ที่ [vercel.com](https://vercel.com)
2. Env: `VITE_CCTV_API_BASE` = URL Web App
3. Deploy → ได้ URL เช่น `https://xxx.vercel.app`

## 6) เชื่อม Dashboard

ใน `Index.html`:

```js
var EXTERNAL_CCTV_3D_URL = 'https://xxx.vercel.app';
```

## API

| Endpoint | คำอธิบาย |
|----------|----------|
| `.../exec?action=cameras` | JSON กล้อง + สถานะ |
| `.../exec?action=cameras&callback=fn` | JSONP |
| `.../exec?action=ping` | ตรวจ API |
