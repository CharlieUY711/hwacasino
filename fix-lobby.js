const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = 'C:\\Carlos\\HWA\\hwacasino\\src'

// 1. /lobby redirect
fs.mkdirSync(path.join(ROOT, 'app/lobby'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'app/lobby/page.tsx'),
`import { redirect } from 'next/navigation'
export default function LobbyPage() { redirect('/games') }
`, 'utf8')
console.log('OK /lobby -> /games')

// 2. Parchear ruleta
const rf = path.join(ROOT, 'app/roulette/play/page.tsx')
let rc = fs.readFileSync(rf, 'utf8')
const rcBefore = rc
rc = rc.split("router.push('/lobby')").join("router.push('/games')")
rc = rc.split('router.push("/lobby")').join('router.push("/games")')
fs.writeFileSync(rf, rc, 'utf8')
console.log('OK roulette <- parcheado:', rc !== rcBefore ? 'cambios aplicados' : 'sin cambios')

// 3. Parchear slot
const sf = path.join(ROOT, 'app/slot/page.tsx')
let sc = fs.readFileSync(sf, 'utf8')
const scBefore = sc
sc = sc.split("router.push('/lobby')").join("router.push('/games')")
sc = sc.split('router.push("/lobby")').join('router.push("/games")')
fs.writeFileSync(sf, sc, 'utf8')
console.log('OK slot <- parcheado:', sc !== scBefore ? 'cambios aplicados' : 'sin cambios')

// 4. Git
const REPO = path.join(ROOT, '..')
execSync('git add -A', { stdio: 'inherit', cwd: REPO })
execSync('git commit -m "feat: lobby redirect + botones back apuntan a /games"', { stdio: 'inherit', cwd: REPO })
execSync('git push', { stdio: 'inherit', cwd: REPO })
console.log('')
console.log('Listo.')
