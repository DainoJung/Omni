import type { Metadata } from 'next'
import { Fira_Sans, Fira_Code } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { SystemStatusBar } from '@/components/system-status-bar'
import { createClient } from '@/lib/supabase/server'

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Omni OS — Command Center',
  description: 'Agent OS for Autonomous Business',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const [
    { data: divisions },
    { count: pendingCount },
  ] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, slug, status')
      .order('created_at', { ascending: false }),
    supabase
      .from('critical_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const divisionMap: Record<string, string> = {}
  for (const d of divisions ?? []) {
    divisionMap[d.id] = d.name
  }

  return (
    <html lang="ko" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body className="h-screen overflow-hidden font-[family-name:var(--font-sans)]">
        <div className="flex h-screen">
          <Sidebar
            divisions={divisions ?? []}
            pendingDecisionCount={pendingCount ?? 0}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <SystemStatusBar divisionMap={divisionMap} />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
