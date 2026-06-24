import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    console.error('Xero OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=xero_denied', request.url))
  }

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

  console.log('Xero tokens received:', {
    expires_in: tokens.expires_in,
    has_refresh: !!tokens.refresh_token,
    token_preview: tokens.access_token?.slice(0, 20) + '...',
  })

  return NextResponse.redirect(new URL('/?connected=xero', request.url))
}
