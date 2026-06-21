'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { User, UserRole } from '@/lib/types'
import { useRouter } from 'next/navigation'
const supabase = getSupabase()
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, pass: string) => Promise<void>
  signUp: (email: string, pass: string, name: string, role: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error || !data) return null
    return data
  }

  useEffect(() => {
    let activeUserId: string | null = null;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userId = session.user.id;
        
        // Prevent duplicate calls for the same user
        if (activeUserId === userId) return;
        activeUserId = userId;
        setLoading(true);

        try {
          let profile = await fetchUserProfile(userId);
          if (!profile) {
             await new Promise(r => setTimeout(r, 500));
             profile = await fetchUserProfile(userId);
          }

          if (profile && activeUserId === userId) {
            setUser({
              id: session.user.id,
              name: profile.full_name,
              email: session.user.email!,
              role: profile.role as UserRole,
              department: 'General',
              createdAt: session.user.created_at || new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Profile fetch error during auth state change:", error);
        } finally {
          if (activeUserId === userId) {
            setLoading(false);
          }
        }
      } else {
        activeUserId = null;
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [])

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) throw error
  }

  const signUp = async (email: string, pass: string, name: string, role: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name,
          role: role, 
        },
      },
    })
    if (error) throw error
  }

  // --- UPDATED SIGNOUT FUNCTION ---
  const signOut = async () => {
    try {
      console.log("Signing out...") // Debug log
      setUser(null) // 1. Clear state IMMEDIATELY to trigger UI change
      await supabase.auth.signOut() // 2. Tell Supabase to kill session
      router.refresh() // 3. Force refresh to clear any server cache
      router.push('/') // 4. Go to home
    } catch (error) {
      console.error("Logout error", error)
      setUser(null) // Force logout even if error
      router.push('/')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)