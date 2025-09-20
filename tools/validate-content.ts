import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('public/data/content')
const badEscape = new RegExp('\\\\(?!["\\/bfnrtu])') // any \ not followed by a valid escape

function walk(dir: string, acc: string[] = []) {
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      if (entry.startsWith('_')) continue
      walk(filePath, acc)
    } else {
      acc.push(filePath)
    }
  }
  return acc
}

let exit = 0
for (const file of walk(ROOT)) {
  if (!file.endsWith('.json')) continue
  const raw = fs.readFileSync(file, 'utf8')
  try {
    JSON.parse(raw)
  } catch (err) {
    console.error(`[json] ${file} -> ${(err as Error).message}`)
    exit = 1
    continue
  }
  if (badEscape.test(raw)) {
    console.error(`[escape?] ${file} -> potentially invalid \ escape`)
    exit = Math.max(exit, 2)
  }
}

process.exit(exit)
