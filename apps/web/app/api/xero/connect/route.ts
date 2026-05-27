import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: 'openid profile email accounting.transactions.read accounting.contacts.read accounting.settings.read offline_access',
    state: crypto.randomUUID(),
  })

  return NextResponse.redirect(
    `https://login.xero.com/identity/connect/authorize?${params}`
  )
}
