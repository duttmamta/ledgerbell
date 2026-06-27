import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/encrypt'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=xero_denied', request.url))
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI!,
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokens)
    return NextResponse.redirect(new URL('/?error=xero_token', request.url))
  }

  // Get Xero tenant (org) info
  const connectionsRes = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const connections = await connectionsRes.json()
  const tenant = connections[0]

  // Create or find user (using tenant email as placeholder for now)
  const { data: user } = await supabase
    .from('users')
    .upsert({ email: `xero-${tenant.tenantId}@ledgerbell.co.uk` })
    .select()
    .single()

  // Store encrypted tokens
  await supabase.from('xero_connections').upsert({
    user_id: user.id,
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName,
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  })

  console.log('✅ Xero tokens stored for:', tenant.tenantName)

  return NextResponse.redirect(new URL('/?connected=xero', request.url))
}
