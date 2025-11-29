export interface ContentPreviewData {
  id: string
  slug: string
  title: string
  zone: string
  category: string
  status: string
  lang: string
  version: string
  tags: string[]
  preview: {
    kicker: string
    logline: string
    markers: string[]
    signature: string[]
    image: string
  }
}
