import { createClient } from '@supabase/supabase-js'

const env = (globalThis as any).process.env

export default async function handler(req: any, res: any) {
  const supabaseUrl = env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ ok: false, error: 'Missing Supabase env vars' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { error } = await supabase.from('shows').select('id').limit(1)

  if (error) {
    res.status(500).json({ ok: false, error: error.message })
    return
  }

  res.status(200).json({ ok: true, pingedAt: new Date().toISOString() })
}
