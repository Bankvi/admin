'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { auth, getTokens, setTokens, clearTokens, type User } from '@/lib/api'

interface AuthCtx {
  user: User | null; loading: boolean
  login: (phone: string, password: string) => Promise<{ requires_otp?: boolean; otp_token?: string } | void>
  loginOTP: (otp_token: string, code: string) => Promise<void>
  resendOTP: () => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const { access } = getTokens()
    if (!access) { setLoading(false); return }
    try { const d = await auth.verify(); setUser(d.user) }
    catch { clearTokens() }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (phone: string, password: string) => {
    const data = await auth.login(phone, password)
    const allowed = ['superadmin','admin','moderator','monitoring']
    if (!allowed.includes(data.user?.role || '')) throw new Error('Accès non autorisé')
    // Si pas d'OTP requis → connexion directe
    if (!data.requires_otp) {
      setTokens(data.tokens.access, data.tokens.refresh)
      setUser(data.user)
      return
    }
    // Sinon → retourner le token OTP pour l'étape 2
    return { requires_otp: true, otp_token: data.otp_token }
  }

  const loginOTP = async (otp_token: string, code: string) => {
    const data = await auth.verifyOTP(otp_token, code)
    setTokens(data.tokens.access, data.tokens.refresh)
    setUser(data.user)
  }

  const resendOTP = async () => { await auth.sendOTP('admin_login') }

  const logout = async () => {
    const { refresh } = getTokens()
    if (refresh) try { await auth.logout(refresh) } catch {}
    clearTokens(); setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, loading, login, loginOTP, resendOTP, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
