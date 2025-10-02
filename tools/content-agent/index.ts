#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

import { ContentAgent, type CheckLinksReport } from './core'
import type { AgentConfig } from './types'

interface CliOptions {
  base?: string
  syncCategory?: boolean
  quiet?: boolean
  out?: string
  force?: boolean
  help?: boolean
}

interface ParsedArgs {
  command: string | null
  options: CliOptions
}

function parseArgs(argv: string[]): ParsedArgs {
  const options: CliOptions = {}
  const args = [...argv]
  let command: string | null = null

  while (args.length) {
    const token = args.shift()
    if (!token) break
    if (!command && !token.startsWith('-')) {
      command = token
      continue
    }
    switch (token) {
      case '--base':
        options.base = args.shift() ?? undefined
        break
      case '--sync-category':
        options.syncCategory = true
        break
      case '--force':
        options.force = true
        break
      case '-q':
      case '--quiet':
        options.quiet = true
        break
      case '-o':
      case '--out':
        options.out = args.shift() ?? undefined
        break
      case '-h':
      case '--help':
        options.help = true
        break
      default:
        if (token === '--no-sync-category') {
          options.syncCategory = false
        } else if (!token.startsWith('-') && !command) {
          command = token
        } else {
          throw new Error(`Unknown option: ${token}`)
        }
        break
    }
  }

  return { command, options }
}

function usage(): void {
  console.log(`axiom-content-agent <command> [options]\n\nCommands:\n  scan                 List discovered items per category\n  validate             Validate manifests against schema v2\n  build-aggregate      Rebuild root content/manifest.json\n  diff                 Show differences against current root manifest\n  fix                  Auto-fix entries and rebuild manifest\n  check-links          Check referenced files exist\n  pr                   Prepare PR checklist (informational)\n\nOptions:\n  --base <dir>         Override base directory (default public/data/)\n  --sync-category      Rewrite per-category manifests with normalized items\n  -q, --quiet          Reduce logging\n  -o, --out <file>     Write JSON report to file\n  -h, --help           Show help\n`)
}

function writeReport(outPath: string | undefined, payload: unknown, quiet: boolean): void {
  if (!outPath) return
  const abs = path.resolve(outPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  if (!quiet) console.log(`[report] ${abs}`)
}

function formatDuration(start: number): string {
  const ms = Date.now() - start
  return `${ms}ms`
}

async function runScan(agent: ContentAgent, quiet: boolean): Promise<void> {
  const started = Date.now()
  const scans = await agent.scanCategories()
  if (!quiet) console.log(`Scan completed in ${formatDuration(started)}`)
  for (const scan of scans) {
    const total = scan.normalized.length
    const missing = scan.missingFiles.length
    const errors = scan.errors.length
    console.log(` - ${scan.key}: ${total} items${missing ? `, missing files: ${missing}` : ''}${errors ? `, schema issues: ${errors}` : ''}`)
  }
}

async function runValidate(agent: ContentAgent, quiet: boolean, outPath?: string): Promise<number> {
  const started = Date.now()
  const report = await agent.validate()
  if (!quiet) console.log(`Validation completed in ${formatDuration(started)}`)
  const tally: Record<string, number> = { error: 0, warning: 0 }
  for (const issue of report.issues) {
    tally[issue.level] = (tally[issue.level] ?? 0) + 1
    if (quiet && issue.level === 'warning') continue
    const location = issue.itemId ? ` [${issue.itemId}]` : ''
    const prefix = issue.level === 'error' ? '[ERROR]' : '[WARN ]'
    console.log(`${prefix}${location} ${issue.message}`)
  }
  if (!quiet) {
    console.log(`Summary: ${tally.error} errors, ${tally.warning} warnings`)
  }
  writeReport(outPath, report, quiet)
  return report.hasErrors ? 1 : 0
}

async function runBuild(agent: ContentAgent, quiet: boolean, outPath?: string): Promise<void> {
  const started = Date.now()
  const { aggregate } = await agent.buildAggregate()
  await agent.writeRootManifest(aggregate.manifest)
  if (!quiet) {
    console.log(`Root manifest rebuilt in ${formatDuration(started)}`)
    console.log(`Items: ${aggregate.manifest.items.length} (added ${aggregate.added.length}, removed ${aggregate.removed.length}, updated ${aggregate.updated.length})`)
  }
  writeReport(outPath, aggregate, quiet)
}

async function runDiff(agent: ContentAgent, quiet: boolean, outPath?: string): Promise<void> {
  const started = Date.now()
  const diff = await agent.diff()
  if (!quiet) console.log(`Diff computed in ${formatDuration(started)}`)
  if (!diff.aggregate.added.length && !diff.aggregate.removed.length && !diff.aggregate.updated.length) {
    console.log('No item changes detected')
  } else {
    if (diff.aggregate.added.length) console.log(` + Added: ${diff.aggregate.added.join(', ')}`)
    if (diff.aggregate.removed.length) console.log(` - Removed: ${diff.aggregate.removed.join(', ')}`)
    if (diff.aggregate.updated.length) console.log(` * Updated: ${diff.aggregate.updated.join(', ')}`)
  }
  if (diff.categoryChanges.length) {
    for (const entry of diff.categoryChanges) {
      console.log(` ${entry.key}: ${entry.previous} -> ${entry.next}`)
    }
  }
  if (diff.aggregate.duplicates.length) {
    console.log('Duplicate ids:')
    for (const dup of diff.aggregate.duplicates) {
      console.log(` ! ${dup.id} (${dup.sources.join(', ')})`)
    }
  }
  writeReport(outPath, diff, quiet)
}

async function runFix(agent: ContentAgent, options: CliOptions, quiet: boolean, outPath?: string): Promise<void> {
  const started = Date.now()
  const result = await agent.fix({ syncCategory: options.syncCategory })
  if (!quiet) console.log(`Fix completed in ${formatDuration(started)}`)
  const updated = result.categoryWrites.filter((entry) => entry.changed)
  if (updated.length) {
    for (const entry of updated) {
      console.log(` ~ Updated ${entry.key} manifest (${entry.manifestPath})`)
    }
  }
  console.log(`Root manifest items: ${result.aggregate.manifest.items.length}`)
  console.log(`Added ${result.aggregate.added.length}, removed ${result.aggregate.removed.length}, updated ${result.aggregate.updated.length}`)
  if (result.aggregate.duplicates.length) {
    console.log('Duplicate ids detected:')
    for (const dup of result.aggregate.duplicates) {
      console.log(` ! ${dup.id} (${dup.sources.join(', ')})`)
    }
  }
  writeReport(outPath, result, quiet)
}

async function runCheckLinks(agent: ContentAgent, quiet: boolean, outPath?: string): Promise<number> {
  const started = Date.now()
  const report: CheckLinksReport = await agent.checkLinks()
  if (!quiet) console.log(`Link check completed in ${formatDuration(started)}`)
  if (!report.missing.length) {
    console.log('All referenced content files exist')
    writeReport(outPath, report, quiet)
    return 0
  }
  for (const missing of report.missing) {
    console.log(` [MISS] ${missing.id} -> ${missing.file}`)
  }
  console.log(`${report.missing.length} missing files detected`)
  writeReport(outPath, report, quiet)
  return 1
}

async function runPr(agent: ContentAgent, quiet: boolean): Promise<void> {
  const started = Date.now()
  const diff = await agent.diff()
  if (!quiet) console.log(`PR summary prepared in ${formatDuration(started)}`)
  console.log('PR checklist:')
  console.log(' - [ ] build-aggregate executed')
  console.log(` - [ ] validator status: ${diff.aggregate.duplicates.length ? 'issues detected' : 'no duplicate ids'}`)
  console.log(` - [ ] category counters verified (${diff.categoryChanges.length ? 'changes pending' : 'up to date'})`)
  console.log(' - [ ] PreviewPane sanitation confirmed')
  console.log(' - [ ] Manual UI smoke check completed')
  console.log(' - [ ] Git branch, commit, PR created manually')
  console.log('Note: Automated PR creation is not implemented yet.')
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (options.help || !command) {
    usage()
    return
  }

  const rootDir = process.cwd()
  let overrides: Partial<AgentConfig> | undefined
  if (options.base) overrides = { base: options.base }
  const agent = await ContentAgent.create(rootDir, overrides)

  try {
    switch (command) {
      case 'scan':
        await runScan(agent, options.quiet ?? false)
        break
      case 'validate': {
        const code = await runValidate(agent, options.quiet ?? false, options.out)
        process.exitCode = code
        break
      }
      case 'build-aggregate':
        await runBuild(agent, options.quiet ?? false, options.out)
        break
      case 'diff':
        await runDiff(agent, options.quiet ?? false, options.out)
        break
      case 'fix':
        await runFix(agent, options, options.quiet ?? false, options.out)
        break
      case 'check-links': {
        const code = await runCheckLinks(agent, options.quiet ?? false, options.out)
        process.exitCode = code
        break
      }
      case 'pr':
        await runPr(agent, options.quiet ?? false)
        break
      default:
        throw new Error(`Unknown command: ${command}`)
    }
  } catch (error) {
    const err = error as Error
    console.error(`[agent] ${err.message}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[agent] ${(error as Error).message}`)
  process.exitCode = 1
})
