#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const MANIFEST_RELATIVE = 'public/data/content/manifest.json'
const OUTPUT_RELATIVE = 'public/data/content/manifest.v2.1.json'

async function readJson(filePath) {
  const data = await fs.readFile(filePath, 'utf8')
  return JSON.parse(data)
}

function withDefaults(item) {
  const next = { ...item }
  if (typeof next.renderMode !== 'string') {
    next.renderMode = 'plain'
  }
  if (typeof next.assetsBase !== 'string') {
    next.assetsBase = ''
  }
  return next
}

function upgradePayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(withDefaults)
  }
  if (payload && typeof payload === 'object') {
    const clone = { ...payload }
    if (Array.isArray(clone.items)) {
      clone.items = clone.items.map(withDefaults)
    }
    return clone
  }
  throw new Error('Unsupported manifest shape')
}

async function main() {
  const manifestPath = path.resolve(ROOT, MANIFEST_RELATIVE)
  const outputPath = path.resolve(ROOT, OUTPUT_RELATIVE)
  const raw = await readJson(manifestPath)
  const upgraded = upgradePayload(raw)
  await fs.writeFile(outputPath, JSON.stringify(upgraded, null, 2) + '\n', 'utf8')
  const total = Array.isArray(upgraded)
    ? upgraded.length
    : Array.isArray(upgraded.items)
    ? upgraded.items.length
    : 0
  console.log(`[migrate-v2.1] wrote ${OUTPUT_RELATIVE} with ${total} entries`)
  if (Array.isArray(upgraded)) {
    console.log('[migrate-v2.1] note: array manifest detected; consider migrating categories separately.')
  }
}

main().catch((error) => {
  console.error('[migrate-v2.1] failed:', error)
  process.exitCode = 1
})
