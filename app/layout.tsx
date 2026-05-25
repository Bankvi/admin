import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'

export const metadata: Metadata = {
  title: 'BankVi Admin',
  description: 'Interface d\'administration BankVi — Néo-banque communautaire',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('bv_theme') || 'dark';
              document.documentElement.classList.toggle('dark', t === 'dark');
            } catch(e){}
          `
        }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
