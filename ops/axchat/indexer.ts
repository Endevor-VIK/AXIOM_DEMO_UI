import { config } from '../../server/src/config'
import { buildAxchatIndex } from '../../server/src/axchat/indexer'

const root = process.cwd()

const chunkSize = Number.isFinite(config.axchatChunkSize) ? config.axchatChunkSize : 1000
const chunkOverlap = Number.isFinite(config.axchatChunkOverlap) ? config.axchatChunkOverlap : 120

const result = buildAxchatIndex({
  root,
  indexPath: config.axchatIndexPath,
  sourceDirs: config.axchatSourceDirs,
  chunkSize,
  chunkOverlap,
})

console.log('[axchat:index] OK')
console.log(`index: ${result.indexPath}`)
console.log(`indexed_at: ${result.indexedAt}`)
console.log(`documents: ${result.documents}`)
console.log(`chunks: ${result.chunks}`)
