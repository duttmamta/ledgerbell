import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: 'openid profile email accounting.transactions.read accounting.contacts.read accounting.settings.read offline_access',
    state: crypto.randomUUID(), // CSRF protection
  })

  const authUrl = `https://login.xero.com/identity/connect/authorize?${params}`
  return NextResponse.redirect(authUrl)
}
