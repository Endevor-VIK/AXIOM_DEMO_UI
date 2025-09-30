declare module 'postcss-prefix-selector' {
  import type { PluginCreator } from 'postcss'

  export interface PostcssPrefixSelectorOptions {
    prefix: string
    transform?: (
      prefix: string,
      selector: string,
      prefixedSelector: string,
      file?: string
    ) => string
    transformPrefix?: (
      prefix: string,
      selector: string,
      prefixedSelector: string,
      file?: string
    ) => string
    exclude?: Array<string | RegExp>
  }

  const prefixSelector: PluginCreator<PostcssPrefixSelectorOptions>

  export default prefixSelector
}
