'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { getSupabase } from '@/lib/supabase' // <--- IMPORT ADDED
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Zap, Loader2, AlertCircle } from 'lucide-react'
const supabase = getSupabase()
export default function AuthPage() {
  const { signIn } = useAuth() // We only need signIn from context, we'll handle signUp manually
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('citizen') 
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        if (!name) throw new Error("Name is required for signup")
        
        // 1. Sign Up the User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role: role }, // Still send metadata just in case
          },
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("No user created")

        // 2. MANUALLY Create the Profile row
        // This bypasses the need for a database trigger which might be failing
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: email,
              full_name: name,
              role: role,
            }
          ])

        if (profileError) {
           console.error("Profile creation failed:", profileError)
           // Clean up the auth user if profile fails, so they can try again
           // await supabase.auth.admin.deleteUser(authData.user.id) 
           throw new Error("Failed to create profile data. Please try again.")
        }

        alert('Account created! You can now log in.')
        setIsLogin(true) // Switch to login view
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-primary">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">CityPulse</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Welcome back! Please sign in.' : 'Join your community today.'}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label htmlFor="name-input" className="block text-sm font-medium mb-1">Full Name</label>
                <Input 
                  id="name-input"
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Jane Doe" 
                />
              </div>
              <div>
                <label htmlFor="role-select" className="block text-sm font-medium mb-1">I am a...</label>
                <select 
                  id="role-select"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Select Role"
                >
                  <option value="citizen">Citizen</option>
                  <option value="field_staff">Field Staff</option>
                  <option value="officer">Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email-input" className="block text-sm font-medium mb-1">Email</label>
            <Input 
              id="email-input"
              required 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@example.com" 
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-sm font-medium mb-1">Password</label>
            <Input 
              id="password-input"
              required 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
            />
          </div>

          <Button type="submit" className="w-full h-11 text-lg font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-primary hover:underline font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  )
}