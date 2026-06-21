import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Debugging: Check if keys are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("⚠️ Warning: Supabase environment variables are missing. Using placeholder values for compilation.")
}

// Create a single instance client-side
const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

// Use 'globalThis' which works in both Browser and Node environments
declare global {
  var supabaseGlobal: ReturnType<typeof createSupabaseClient> | undefined
}

export const supabase = globalThis.supabaseGlobal || createSupabaseClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.supabaseGlobal = supabase
}

export function getSupabase() {
  return supabase
}