import { readFileSync } from 'fs'
import { join } from 'path'

export default function Home() {
  return (
    <div dangerouslySetInnerHTML={{
      __html: readFileSync(
        join(process.cwd(), 'public/coming-soon.html'), 
        'utf8'
      )
    }} />
  )
}
