export type AdminUrlCommandReference = {
  key: string
  command: string
  pages: string
  values: string
  description: string
  example: string
  status?: 'active' | 'legacy'
}

export const ADMIN_URL_COMMANDS_REFERENCE: AdminUrlCommandReference[] = [
  {
    key: 'debug',
    command: 'debug',
    pages: 'Any UI route (global scale manager)',
    values: 'empty | 1 | true | on',
    description:
      'Enables visual scale debug overlay (CSS scale metrics, layout, DPR).',
    example: '/dashboard/content/all?debug=1',
  },
  {
    key: 'scale',
    command: 'scale',
    pages: 'Any UI route (global scale manager)',
    values: 'managed | legacy',
    description:
      'Forces UI scaling mode. Default is managed if param is not set.',
    example: '/dashboard?scale=legacy',
  },
  {
    key: 'orionQuality',
    command: 'orionQuality',
    pages: '/login',
    values: 'ultra | high | medium | low',
    description:
      'Overrides Orion login background quality preset for current page load.',
    example: '/login?orionQuality=low',
  },
  {
    key: 'q',
    command: 'q',
    pages: '/dashboard/content/*',
    values: 'any text',
    description:
      'Full-text filter across content id, title, summary and tags.',
    example: '/dashboard/content/all?q=axiom',
  },
  {
    key: 'tag',
    command: 'tag',
    pages: '/dashboard/content/*',
    values: 'content tag value',
    description:
      'Filters content by tag (matches list of tags in content index).',
    example: '/dashboard/content/all?tag=ops',
  },
  {
    key: 'status',
    command: 'status',
    pages: '/dashboard/content/*',
    values: 'draft | published | archived',
    description:
      'Filters content entries by publication status.',
    example: '/dashboard/content/all?status=published',
  },
  {
    key: 'lang',
    command: 'lang',
    pages: '/dashboard/content/*',
    values: 'any | locale code (en, ru, ...)',
    description:
      'Filters content entries by language.',
    example: '/dashboard/content/all?lang=en',
  },
  {
    key: 'mode',
    command: 'mode',
    pages: '/dashboard/content/*',
    values: 'browse | cards | orbit | inspect',
    description:
      'Switches Content Hub view mode. Orbit may be forced back to browse if feature flag is disabled.',
    example: '/dashboard/content/all?mode=inspect',
  },
  {
    key: 'item',
    command: 'item',
    pages: '/dashboard/content/* and /content/:id (when opened from hub)',
    values: 'content id',
    description:
      'Pins currently selected content item in list/cards/orbit flows.',
    example: '/dashboard/content/all?item=CHR-AXIOM-0303',
  },
  {
    key: 'autoplay',
    command: 'autoplay',
    pages: '/dashboard/news',
    values: 'integer seconds, clamped to 2..30',
    description:
      'Sets autoplay interval for Signal Center packets.',
    example: '/dashboard/news?autoplay=8',
  },
  {
    key: 'layout',
    command: 'layout',
    pages: '/dashboard/content/*',
    values: 'inspect',
    description:
      'Legacy compatibility alias for mode=inspect. Removed from URL once mode is changed/reset in UI.',
    example: '/dashboard/content/all?layout=inspect',
    status: 'legacy',
  },
  {
    key: 'view',
    command: 'view',
    pages: '/dashboard/content/*',
    values: 'cards | orbit',
    description:
      'Legacy compatibility alias for mode. Removed from URL once mode is changed/reset in UI.',
    example: '/dashboard/content/all?view=orbit',
    status: 'legacy',
  },
  {
    key: 'id',
    command: 'id',
    pages: 'Legacy Content Hub v2 page (not mounted in main router)',
    values: 'content id',
    description:
      'Legacy selected-item parameter from old ContentHubPage implementation.',
    example: '/dashboard/content?id=CHR-AXIOM-0303',
    status: 'legacy',
  },
]

