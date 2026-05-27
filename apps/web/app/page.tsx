'use client'

export default function Home() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const btn = document.getElementById('btn') as HTMLButtonElement
    const success = document.getElementById('s') as HTMLElement
    const form = e.currentTarget
    btn.textContent = 'Joining...'
    btn.disabled = true
    const email = (document.getElementById('em') as HTMLInputElement).value
    try {
      const r = await fetch('https://formspree.io/f/xwvzvbdj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (r.ok) { form.style.display = 'none'; success.style.display = 'block' }
      else { btn.textContent = 'Try again'; btn.disabled = false }
    } catch { btn.textContent = 'Try again'; btn.disabled = false }
  }

  return (
    <div className="container">
      <span className="bell">🔔</span>
      <h1>Ledger<em>Bell</em></h1>
      <p className="tagline">Real-time financial alerts for Xero and Sage.<br/>Know the moment it happens — not when you next log in.</p>
      <div className="divider"/>
      <ul className="features">
        <li><span className="trigger">Invoice paid</span><span className="arrow">→</span><span>instant WhatsApp</span></li>
        <li><span className="trigger">Invoice overdue</span><span className="arrow">→</span><span>Slack</span></li>
        <li><span className="trigger">Cash below threshold</span><span className="arrow">→</span><span>email</span></li>
        <li><span className="trigger">VAT deadline</span><span className="arrow">→</span><span>email</span></li>
        <li><span className="trigger">Peppol e-invoice</span><span className="arrow">→</span><span>WhatsApp</span></li>
      </ul>
      <div className="platforms">
        <div className="pill"><div className="dot-x"/>Xero</div>
        <div className="pill"><div className="dot-s"/>Sage</div>
      </div>
      <div className="badge"><div className="pulse"/>Launching December 2026</div>
      <form id="f" onSubmit={handleSubmit}>
        <div className="form-row">
          <input id="em" type="email" name="email" placeholder="your@email.com" required/>
          <button id="btn" type="submit">Get early access</button>
        </div>
        <p className="note">No spam. One email when beta opens.</p>
      </form>
      <div id="s" className="success">✓ You&apos;re on the list. We&apos;ll be in touch when beta opens.</div>
      <div className="footer">
        <a href="https://github.com/duttmamta/ledgerbell">GitHub</a>
        <div className="sep"/>
        <a href="mailto:admin@xtrec.co.uk">admin@xtrec.co.uk</a>
        <div className="sep"/>
        <a href="#">XTREC Limited · UK</a>
      </div>
    </div>
  )
}
