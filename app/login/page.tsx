'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Lock, Phone, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react'

type Step = 'credentials' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('credentials')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginOTP, resendOTP, user } = useAuth()
  const router = useRouter()

  useEffect(() => { if (user) router.replace('/dashboard') }, [user, router])

  // Countdown pour renvoyer l'OTP
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const result = await login(phone, password)
      if (result?.requires_otp && result?.otp_token) {
        setOtpToken(result.otp_token)
        setStep('otp')
        setCountdown(60)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects')
    } finally { setLoading(false) }
  }

  const handleOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await loginOTP(otpToken, otpCode)
      router.replace('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code OTP invalide')
      setOtpCode('')
    } finally { setLoading(false) }
  }

  const handleResendOTP = async () => {
    try {
      await resendOTP()
      setCountdown(60)
      setError('')
    } catch {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-primary">
      {/* Ambient */}
      <div className="orb-container">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage:'linear-gradient(var(--gold) 1px,transparent 1px),linear-gradient(90deg,var(--gold) 1px,transparent 1px)',
        backgroundSize:'60px 60px'
      }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass mb-4"
            style={{ boxShadow:'0 0 0 1px var(--gold-glow),0 8px 32px var(--gold-glow)' }}>
            <ShieldCheck size={32} className="text-gold" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">BankVi</h1>
          <p className="text-muted text-sm mt-1">Interface d&apos;administration sécurisée</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in">
          {(['credentials','otp'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s || (s === 'credentials' && step === 'otp')
                  ? 'bg-gold text-white shadow-lg' : 'glass text-muted'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${step === s ? 'text-gold font-medium' : 'text-muted'}`}>
                {s === 'credentials' ? 'Identifiants' : 'Vérification OTP'}
              </span>
              {i < 1 && <div className={`w-8 h-px ${step === 'otp' ? 'bg-gold' : 'bg-white/10'} transition-colors`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay:'0.1s' }}>

          {step === 'credentials' ? (
            <>
              <h2 className="font-display text-xl font-semibold text-primary mb-6">Connexion</h2>
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Téléphone</label>
                  <div className="relative flex flex-row">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+22890000001" className="input-glass-log pl-10 pr-10 pt-4 pb-4" required autoComplete="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted mr-10" />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" className="input-glass-log pl-10 pr-10 pt-4 pb-4" required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gold transition-colors">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" className="btn-gold w-full mt-2" disabled={loading}>
                  {loading ? <Spinner /> : 'Continuer →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(213,156,124,0.12)' }}>
                  <KeyRound size={20} className="text-gold" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-primary">Code OTP</h2>
                  <p className="text-xs text-muted">Envoyé par SMS au {phone}</p>
                </div>
              </div>
              <form onSubmit={handleOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Code à 6 chiffres</label>
                  <input
                    type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000" maxLength={6}
                    className="input-glass text-center text-2xl font-bold tracking-[0.5em] font-mono"
                    autoFocus required inputMode="numeric"
                  />
                </div>
                {error && <ErrorBox msg={error} />}
                <button type="submit" className="btn-gold w-full" disabled={loading || otpCode.length < 6}>
                  {loading ? <Spinner /> : 'Vérifier le code'}
                </button>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-muted">Renvoyer dans <span className="text-gold font-semibold">{countdown}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResendOTP}
                      className="text-xs text-gold hover:underline flex items-center gap-1 mx-auto">
                      <RefreshCw size={12} /> Renvoyer le code
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setOtpCode('') }}
                  className="w-full text-xs text-muted hover:text-primary transition-colors text-center mt-2">
                  ← Modifier les identifiants
                </button>
              </form>
            </>
          )}

          <div className="divider mt-6" />
          <p className="text-center text-xs text-muted">Accès réservé aux administrateurs BankVi</p>
        </div>

        <p className="text-center text-xs text-muted mt-6 animate-fade-in" style={{ animationDelay:'0.2s' }}>
          BankVi Admin v1.0 — Togo 🇹🇬
        </p>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl p-3 text-sm" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
      {msg}
    </div>
  )
}
function Spinner() {
  return <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Chargement…</span>
}
