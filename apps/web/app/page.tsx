import { readFileSync } from 'fs'
import { join } from 'path'

export default function Home() {
  const html = readFileSync(
    join(process.cwd(), 'public/coming-soon.html'),
    'utf8'
  )
  // Extract just the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : ''
  
  return (
    <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
  )
}
