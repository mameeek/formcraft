import type { Product, FormConfig } from '@/types'
import { uid } from '@/lib/utils'

export const defaultProducts: Product[] = [
  {
    id: 'p1', type: 'single', name: 'พวงกุญแจอะคริลิค', code: 'keychain',
    price: 69, images: [], description: 'พวงกุญแจอะคริลิคลายพิเศษ', tags: ['ของที่ระลึก'],
    aspectRatio: 'square',
    variants: [{
      id: 'v1', name: 'ลาย', required: true, expandAsProducts: true,
      options: [
        { id: 'o1', label: 'มังกร MWIT',  code: 'dragon'   },
        { id: 'o2', label: 'โลโก้ 36 ปี', code: 'logo36'   },
        { id: 'o3', label: 'ตึก MWIT',    code: 'building'  },
        { id: 'o4', label: 'มาสคอต',      code: 'mascot'    },
      ],
    }],
  },
  {
    id: 'p2', type: 'single', name: 'โปสการ์ด ชุด 5 ใบ', code: 'postcard',
    price: 49, images: [], description: 'โปสการ์ดชุด 5 ลายคละ', tags: ['ของที่ระลึก'],
    aspectRatio: '4/3',
    variants: [],
  },
  {
    id: 'p3', type: 'single', name: 'กระเป๋าผ้า Canvas Tote', code: 'tote',
    price: 149, images: [], description: 'กระเป๋าผ้า Canvas คุณภาพดี ใช้ได้ทุกวัน', tags: ['กระเป๋า'],
    aspectRatio: '3/4',
    variants: [{
      id: 'v2', name: 'ลาย', required: true, expandAsProducts: false,
      options: [
        { id: 'o5', label: 'OPH26',            code: 'oph'  },
        { id: 'o6', label: '36th Anniversary',  code: '36th' },
      ],
    }],
  },
  {
    id: 'p4', type: 'single', name: 'แผ่นสติ๊กเกอร์ A5', code: 'sticker',
    price: 35, images: [], description: 'สติ๊กเกอร์กระดาษ A5 พิมพ์ลายคมชัด', tags: ['สติ๊กเกอร์'],
    aspectRatio: '4/3',
    variants: [{
      id: 'v3', name: 'ลาย', required: true, expandAsProducts: false,
      options: [
        { id: 'o7', label: 'Science Series',    code: 'science'  },
        { id: 'o8', label: 'School Life Series', code: 'school'  },
      ],
    }],
  },
  {
    id: 'p5', type: 'single', name: 'เสื้อยืด', code: 'shirt',
    price: 279, images: [], description: 'เสื้อยืด Cotton 100% ลายพิเศษ Limited Edition', tags: ['เสื้อผ้า'],
    aspectRatio: 'square',
    variants: [
      { id: 'v4', name: 'ไซส์', required: true, options: [
        { id: 'o9',  label: 'XS', code: 'xs' }, { id: 'o10', label: 'S',   code: 's'   },
        { id: 'o11', label: 'M',  code: 'm'  }, { id: 'o12', label: 'L',   code: 'l'   },
        { id: 'o13', label: 'XL', code: 'xl' }, { id: 'o14', label: '2XL', code: '2xl' },
      ]},
      { id: 'v5', name: 'สี', required: true, options: [
        { id: 'o15', label: 'ขาว',   code: 'w' },
        { id: 'o16', label: 'กรมท่า', code: 'n' },
      ]},
      { id: 'v6', name: 'ลาย', required: true, expandAsProducts: false, options: [
        { id: 'o17', label: 'OPH26 Limited',    code: 'oph'  },
        { id: 'o18', label: '36th Anniversary',  code: '36th' },
      ]},
    ],
  },
  {
    id: 's1', type: 'set', name: 'เซ็ต A – Starter', code: 'set_a',
    price: 89, originalPrice: 104, images: [], description: 'พวงกุญแจ + สติ๊กเกอร์', tags: ['เซ็ต'],
    aspectRatio: 'square', variants: [],
    setItems: [{ productId: 'p1', label: 'พวงกุญแจ' }, { productId: 'p4', label: 'สติ๊กเกอร์' }],
  },
  {
    id: 's2', type: 'set', name: 'เซ็ต B – Collector', code: 'set_b',
    price: 239, originalPrice: 302, images: [], description: 'พวงกุญแจ + สติ๊กเกอร์ + โปสการ์ด + กระเป๋าผ้า', tags: ['เซ็ต'],
    aspectRatio: 'square', variants: [],
    setItems: [
      { productId: 'p1', label: 'พวงกุญแจ' }, { productId: 'p4', label: 'สติ๊กเกอร์' },
      { productId: 'p2', label: 'โปสการ์ด' }, { productId: 'p3', label: 'กระเป๋าผ้า' },
    ],
  },
  {
    id: 's3', type: 'set', name: 'เซ็ต C – Ultimate', code: 'set_c',
    price: 449, originalPrice: 581, images: [], description: 'ครบทุกอย่างรวมเสื้อยืด', tags: ['เซ็ต'],
    aspectRatio: 'square', variants: [],
    setItems: [
      { productId: 'p1', label: 'พวงกุญแจ' }, { productId: 'p4', label: 'สติ๊กเกอร์' },
      { productId: 'p2', label: 'โปสการ์ด' }, { productId: 'p3', label: 'กระเป๋าผ้า' },
      { productId: 'p5', label: 'เสื้อยืด' },
    ],
  },
]

export const defaultForm: FormConfig = {
  id: 'form1',
  title: 'Pre-Order สินค้าที่ระลึก',
  subtitle: 'กรอกข้อมูลและเลือกสินค้าที่ต้องการ',
  coverColor: '#0d0d1a',
  accentColor: '#e94560',
  theme: 'dark',
  logoEmoji: '🎓',
  bannerImage: '',
  qrCodeImage: '',
  published: true,
  shipping: { enabled: true, cost: 50 },
  paymentNote: 'โอนผ่าน PromptPay และแนบสลิปเพื่อยืนยัน',
  promptPayId: '099-999-9999',
  sections: [
    {
      id: 'sec1', title: 'ข้อมูลผู้สั่งซื้อ',
      fields: [
        { id: 'f1', type: 'text',  label: 'ชื่อ',       placeholder: 'ชื่อจริง',       required: true,  width: 'half' },
        { id: 'f2', type: 'text',  label: 'นามสกุล',    placeholder: 'นามสกุล',        required: true,  width: 'half' },
        { id: 'f3', type: 'tel',   label: 'เบอร์โทร',   placeholder: '08X-XXX-XXXX',   required: true,  width: 'half' },
        { id: 'f4', type: 'email', label: 'อีเมล',      placeholder: 'email@example.com', required: false, width: 'half' },
      ],
    },
    {
      id: 'sec2', title: 'ที่อยู่จัดส่ง',
      fields: [
        {
          id: 'f5', type: 'textarea', label: 'ที่อยู่', placeholder: 'บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์',
          required: false, width: 'full',
          condition: { fieldId: '__shipping__', operator: 'equals', value: 'delivery' },
        },
      ],
    },
  ],
}

/** A fresh, empty form (no demo products) for when an admin creates a new form. */
export function blankFormConfig(title: string): FormConfig {
  return {
    id: uid(),
    title,
    subtitle: '',
    coverColor: '#0d0d1a',
    accentColor: '#e94560',
    theme: 'dark',
    logoEmoji: '📋',
    bannerImage: '',
    qrCodeImage: '',
    published: true,
    shipping: { enabled: false, cost: 0 },
    paymentNote: '',
    promptPayId: '',
    sections: [
      {
        id: uid(), title: 'ข้อมูลผู้สั่งซื้อ',
        fields: [
          { id: uid(), type: 'dropdown', label: 'คำนำหน้า',   placeholder: '', required: true,  width: 'half', options: ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นาง', 'นางสาว'] },
          { id: uid(), type: 'text',     label: 'ชื่อ',       placeholder: 'ชื่อจริง',        required: true,  width: 'half' },
          { id: uid(), type: 'text',     label: 'นามสกุล',    placeholder: 'นามสกุล',         required: true,  width: 'half' },
          { id: uid(), type: 'tel',      label: 'เบอร์โทร',   placeholder: '08X-XXX-XXXX',    required: true,  width: 'half' },
          { id: uid(), type: 'email',    label: 'อีเมล',      placeholder: 'email@example.com', required: false, width: 'half' },
        ],
      },
      {
        // Condition lives on the section, not each field, so the whole
        // address block shows/hides together when shipping is toggled.
        id: uid(), title: 'ที่อยู่จัดส่ง',
        condition: { fieldId: '__shipping__', operator: 'equals', value: 'delivery' },
        fields: [
          { id: uid(), type: 'text', label: 'ที่อยู่',         placeholder: 'บ้านเลขที่ ถนน',   required: false, width: 'full' },
          { id: uid(), type: 'text', label: 'ตำบล',           placeholder: 'ตำบล',            required: false, width: 'half' },
          { id: uid(), type: 'text', label: 'อำเภอ',          placeholder: 'อำเภอ',           required: false, width: 'half' },
          { id: uid(), type: 'text', label: 'จังหวัด',         placeholder: 'จังหวัด',          required: false, width: 'half' },
          { id: uid(), type: 'text', label: 'รหัสไปรษณีย์',    placeholder: 'รหัสไปรษณีย์',      required: false, width: 'half' },
        ],
      },
    ],
  }
}
