import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LedgerBell',
  description: 'Real-time alerts for Xero and Sage',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
