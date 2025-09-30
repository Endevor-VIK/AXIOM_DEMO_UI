import postcss from 'postcss'
import prefixSelector from 'postcss-prefix-selector'
import type { AcceptedPlugin, Declaration } from 'postcss'

export const SCOPE_ATTRIBUTE = 'data-ax-scope'
const DEFAULT_SCOPE_FALLBACK = 'content'
const KEYFRAME_NAME_PREFIX = 'ax'
const SAFE_IDENT_CHARS = /[^a-zA-Z0-9_-]+/g

const listUtils = postcss.list

type QuoteInfo = {
  quote: '"' | "'" | ''
  value: string
}

function normalizeIdent(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  const sanitized = trimmed.replace(SAFE_IDENT_CHARS, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return sanitized
}

export function normalizeScopeId(scope: string): string {
  const normalized = normalizeIdent(scope)
  return normalized || DEFAULT_SCOPE_FALLBACK
}

export function buildScopeSelector(scopeId: string): string {
  return `[${SCOPE_ATTRIBUTE}="${scopeId}"]`
}

export function makeScopedKeyframeName(scopeId: string, name: string): string {
  const safeName = normalizeIdent(name) || 'anim'
  return `${KEYFRAME_NAME_PREFIX}-${scopeId}-${safeName}`
}

function unwrapQuotes(token: string): QuoteInfo {
  if (token.length >= 2) {
    const first = token[0]
    const last = token[token.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return { quote: first as QuoteInfo['quote'], value: token.slice(1, -1) }
    }
  }
  return { quote: '', value: token }
}

function replaceAnimationValue(value: string, replacements: Map<string, string>): string {
  if (!replacements.size) {
    return value
  }

  const segments = listUtils.comma(value)
  let didChange = false
  const updatedSegments = segments.map((segment) => {
    const tokens = listUtils.space(segment)
    let segmentChanged = false

    const rewritten = tokens.map((token) => {
      const trimmed = token.trim()
      if (!trimmed) {
        return token
      }

      const { quote, value: bare } = unwrapQuotes(trimmed)
      const replacement = replacements.get(bare)
      if (!replacement) {
        return token
      }

      segmentChanged = true
      const withQuote = quote ? `${quote}${replacement}${quote}` : replacement
      return withQuote
    })

    if (segmentChanged) {
      didChange = true
      return rewritten.join(' ')
    }

    return segment
  })

  return didChange ? updatedSegments.join(', ') : value
}

function createKeyframePrefixer(scopeId: string): AcceptedPlugin {
  const mapped = new Map<string, string>()

  return {
    postcssPlugin: 'axiom-prefix-keyframes',
    Once() {
      mapped.clear()
    },
    AtRule(atRule) {
      if (!atRule.name.toLowerCase().endsWith('keyframes')) {
        return
      }

      const params = atRule.params.trim()
      if (!params) {
        return
      }

      const { quote, value: name } = unwrapQuotes(params)
      if (!name) {
        return
      }

      const scopedName = makeScopedKeyframeName(scopeId, name)
      mapped.set(name, scopedName)
      atRule.params = quote ? `${quote}${scopedName}${quote}` : scopedName
    },
    Declaration(decl: Declaration) {
      if (!mapped.size) {
        return
      }

      const prop = decl.prop.toLowerCase()
      const normalizedProp = prop.startsWith('-webkit-') ? prop.slice(8) : prop
      if (normalizedProp !== 'animation' && normalizedProp !== 'animation-name') {
        return
      }

      const nextValue = replaceAnimationValue(decl.value, mapped)
      if (nextValue !== decl.value) {
        decl.value = nextValue
      }
    },
  }
}

export async function prefixStyles(css: string, scope: string): Promise<string> {
  if (!css.trim()) {
    return css
  }

  const scopeId = normalizeScopeId(scope)
  const scopedSelector = buildScopeSelector(scopeId)

  const plugins: AcceptedPlugin[] = [
    createKeyframePrefixer(scopeId),
    prefixSelector({
      prefix: scopedSelector,
      transform(prefix, selector, prefixedSelector) {
        const trimmed = selector.trim()
        if (!trimmed) {
          return selector
        }

        if (trimmed.startsWith('@')) {
          return selector
        }

        if (trimmed === ':root') {
          return prefix
        }

        return prefixedSelector
      },
    }),
  ]

  const result = await postcss(plugins).process(css, { from: undefined })
  return result.css
}
