import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import path from 'node:path'
import lighthouse from 'lighthouse'
import { launch as launchChrome } from 'chrome-launcher'

const HOST = process.env.LIGHTHOUSE_HOST ?? '127.0.0.1'
const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 4174)
const TARGET_URL =
  process.env.LIGHTHOUSE_URL ?? `http://${HOST}:${PORT}/dashboard/content/all`
const MIN_SCORE = Number(process.env.LIGHTHOUSE_MIN_SCORE ?? 0.9)
const REPORTS_DIR = process.env.LIGHTHOUSE_REPORTS_DIR ?? 'reports'
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm'

async function startDevServer() {
  const command = NPM_COMMAND
  const args = ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)]
  const child = spawn(command, args, {
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  })

  const logStream = (stream) => (data) => {
    if (process.env.LIGHTHOUSE_DEBUG) {
      process.stdout.write(data)
    }
  }

  child.stdout.on('data', logStream('stdout'))
  child.stderr.on('data', (data) => {
    if (process.env.LIGHTHOUSE_DEBUG) {
      process.stderr.write(data)
    }
  })

  return child
}

async function waitForServer(child, url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Dev server exited early with code ${child.exitCode}`)
    }
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok || response.status >= 200) {
        return
      }
    } catch {
      // ignore until timeout
    }
    await delay(1000)
  }
  throw new Error('Timed out waiting for dev server to start')
}

async function runLighthouse() {
  const child = await startDevServer()
  try {
    await waitForServer(child, `http://${HOST}:${PORT}`, 30_000)

    let chrome
    try {
      chrome = await launchChrome({
        chromeFlags: ['--headless=new', '--disable-dev-shm-usage'],
      })
    } catch (error) {
      throw new Error(
        `Unable to launch Chrome for Lighthouse. Install a Chrome-based browser or set CHROME_PATH. Original error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    try {
      const options = {
        port: chrome.port,
        output: 'html',
        logLevel: 'error',
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1400, height: 900, deviceScaleFactor: 1 },
      }

      const config = {
        extends: 'lighthouse:default',
      }

      const runnerResult = await lighthouse(TARGET_URL, options, config)
      const { lhr, report } = runnerResult

      const scores = {
        performance: lhr.categories.performance?.score ?? 0,
        accessibility: lhr.categories.accessibility?.score ?? 0,
      }

      if (scores.performance < MIN_SCORE || scores.accessibility < MIN_SCORE) {
        throw new Error(
          `Lighthouse scores below threshold (${MIN_SCORE * 100}): ` +
            `performance=${Math.round(scores.performance * 100)}, ` +
            `accessibility=${Math.round(scores.accessibility * 100)}`,
        )
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const reportPath = path.resolve(REPORTS_DIR, `lighthouse-dashboard-${timestamp}.html`)
      await mkdir(path.dirname(reportPath), { recursive: true })
      await writeFile(reportPath, report, 'utf8')

      console.log(
        `Lighthouse scores OK (performance=${Math.round(scores.performance * 100)}, accessibility=${Math.round(
          scores.accessibility * 100,
        )})`,
      )
      console.log(`Report saved to ${reportPath}`)
    } finally {
      if (chrome) {
        await chrome.kill()
      }
    }
  } finally {
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
        })
        killer.on('exit', resolve)
        killer.on('error', resolve)
      })
    } else {
      child.kill('SIGTERM')
      await new Promise((resolve) => child.once('exit', resolve))
    }
  }
}

runLighthouse().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
