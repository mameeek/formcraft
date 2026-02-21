# FormCraft — คู่มือ Deploy (Netlify + Neon DB)

## โครงสร้าง

- ข้อมูล (สินค้า, ฟอร์ม, คำสั่งซื้อ) → Neon PostgreSQL
- Frontend + API → Netlify serverless
- ตะกร้าสินค้า → localStorage (browser เท่านั้น)

---

## ขั้นตอนครั้งแรก

### 1. สร้าง Neon Database (ฟรี)

1. ไปที่ console.neon.tech → Sign up
2. กด "New Project" → ตั้งชื่อ formcraft
3. ไปที่ Connection Details → copy Connection string (postgresql://...)

### 2. สร้าง Tables ใน Neon SQL Editor

```sql
CREATE TABLE IF NOT EXISTS form_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  field_values JSONB DEFAULT '{}',
  items JSONB DEFAULT '[]',
  shipping_method TEXT DEFAULT 'pickup',
  subtotal NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_slip TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_confirmed_at TIMESTAMPTZ,
  payment_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Deploy บน Netlify

1. netlify.com → Add new site → Import from GitHub → เลือก repo
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Environment variables → เพิ่ม:
   DATABASE_URL = postgresql://...จาก Neon...
5. Deploy ✅

### 4. Local Development

```bash
cp .env.local.example .env.local
# แก้ใส่ DATABASE_URL จาก Neon
npm install
npm run dev
```
