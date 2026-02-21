# ⚡ FormCraft – Next.js Dynamic Order Form Builder

## 📁 โครงสร้างโปรเจกต์

```
src/
├── app/                           # Next.js App Router
│   ├── globals.css                # Global styles & CSS variables
│   ├── layout.tsx                 # Root layout (fonts, metadata)
│   ├── page.tsx                   # Root → redirect to /dashboard
│   │
│   ├── dashboard/
│   │   ├── layout.tsx             # Admin layout with Sidebar
│   │   └── page.tsx               # 📊 Dashboard: stats, top products, recent orders
│   │
│   ├── editor/
│   │   ├── layout.tsx             # Admin layout with Sidebar
│   │   └── page.tsx               # ✏️ Editor: form builder, product manager, settings
│   │
│   ├── submissions/
│   │   ├── layout.tsx             # Admin layout with Sidebar
│   │   └── page.tsx               # 📦 Submissions: table + dashboard + CSV export
│   │
│   ├── form/
│   │   └── page.tsx               # 🛒 Public Form: multi-step order form
│   │
│   └── api/
│       └── upload/
│           └── route.ts           # POST /api/upload – image upload handler
│
├── components/
│   ├── ui/
│   │   ├── index.tsx              # Shared atoms: Btn, Card, Input, Label, TabBar...
│   │   ├── ImageSlider.tsx        # ← Image slider with arrows + dots + counter
│   │   └── ImageUploader.tsx      # ← Drag & drop image uploader (uses /api/upload)
│   │
│   ├── admin/
│   │   ├── ProductManager.tsx     # Product list + editor panel with image upload
│   │   ├── FormBuilder.tsx        # Section/field editor
│   │   └── FormSettings.tsx       # Theme, shipping, payment config
│   │
│   ├── form/
│   │   ├── ProductCard.tsx        # Product tile with ImageSlider
│   │   └── ConfigureModal.tsx     # Variant selector bottom sheet with images
│   │
│   └── layout/
│       └── Sidebar.tsx            # Left nav with Next.js Link
│
├── hooks/                         # (reserved for custom hooks)
│
├── lib/
│   ├── defaults.ts                # Default products & form config
│   └── utils.ts                   # uid, fmt, getProductVariants, exportCSV
│
├── store/
│   └── index.ts                   # Zustand stores: useAppStore + useCartStore
│                                  # (persisted to localStorage via zustand/persist)
└── types/
    └── index.ts                   # TypeScript types: Product, FormConfig, Submission...
```

## ✨ ฟีเจอร์หลัก

### 🖼️ Image Slider ใหม่!
- อัปโหลดรูปหลายรูปต่อสินค้า (สูงสุด 6 รูป)
- Drag & drop หรือคลิกเพื่ออัปโหลด
- รูปแรกเป็น Cover (แสดงป้าย COVER)
- เรียงลำดับรูปได้
- Slider พร้อม arrow, dot indicator, counter
- Arrows โชว์เมื่อ hover
- ในโมดาล Variant สินค้าในเซ็ตจะรวม thumbnail ไว้ด้วย

### 🛍️ Dynamic Ordering
- ซื้อสินค้าเดิมหลายรอบด้วย variant ต่างกัน
- เซ็ตสินค้าที่ link กับสินค้าจริง, variant สืบทอดอัตโนมัติ
- Variant configurator modal แบบ bottom sheet

### 📊 Admin
- Dashboard: stats, top products, recent orders
- Product Manager: CRUD พร้อม image upload
- Form Builder: section + field editor
- Form Settings: theme, shipping, payment
- Submissions: table (expandable) + summary + CSV export

## 📦 CSV Export Schema

| คอลัมน์ | คำอธิบาย |
|---------|----------|
| ID | รหัสออร์เดอร์ |
| วันที่ | วันที่สั่งซื้อ |
| ชื่อ | ชื่อลูกค้า |
| เบอร์ | เบอร์โทร |
| อีเมล | อีเมล |
| รายการสินค้า | สินค้า + variant |
| จำนวนรายการ | จำนวนสินค้า |
| การจัดส่ง | รับเอง / ไปรษณีย์ |
| ค่าจัดส่ง | บาท |
| ยอดสินค้า | ก่อนค่าส่ง |
| ยอดรวม | รวมค่าส่ง |

## 🛠️ Stack

- **Next.js 14** – App Router, Server Components, API Routes
- **TypeScript** – Full type safety
- **Zustand** – State management with persistence (localStorage)
- **next/image** – Optimized image display
- **next/font** – Syne + DM Sans fonts

---
