import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'
import  DBProvider  from '@/components/DBProvider'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'FormCraft – Dynamic Order Forms',
  description: 'สร้างฟอร์มสั่งซื้อสินค้าพร้อม variant และเซ็ตสินค้า',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <DBProvider>
          {children}
        </DBProvider>
      </body>
    </html>
  )
}
