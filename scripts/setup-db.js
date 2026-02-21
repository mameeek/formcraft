// Run once to create tables: node scripts/setup-db.js
const { neon } = require('@neondatabase/serverless')

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Set DATABASE_URL in .env.local first')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  console.log('🔧 Setting up FormCraft database...')

  await sql`
    CREATE TABLE IF NOT EXISTS form_config (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
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
    )
  `

  console.log('✅ Tables created!')
  console.log('👉 Now go to your app, open Admin → Dashboard, and click "Push to DB" to migrate your data')
}

setup().catch(console.error)
