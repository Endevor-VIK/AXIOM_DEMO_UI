export type UserRole = 'guest' | 'user' | 'admin'

export type User = {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string
  role: UserRole
  lang?: 'RU' | 'EN'
}

export type Session = {
  isAuthenticated: boolean
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
