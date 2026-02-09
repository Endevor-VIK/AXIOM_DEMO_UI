export type UserRole = 'user' | 'creator' | 'test'

export type User = {
  id: string
  email?: string
  displayName: string
  handle: string
  avatarUrl?: string
  roles: UserRole[]
  lang?: 'RU' | 'EN'
}

export type Session = {
  isAuthenticated: boolean
  isLoading?: boolean
  user?: User | null
}

export type FavoriteType =
  | 'content'
  | 'character'
  | 'location'
  | 'technology'
  | 'faction'
  | 'event'
  | 'lore'
  | 'other'

export type FavoriteItem = {
  key: string // stable key `${type}:${id}`
  id: string
  type: FavoriteType
  title: string
  route: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}
