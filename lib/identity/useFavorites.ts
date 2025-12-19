import { useCallback, useEffect, useState } from 'react'

import { add, list, remove, subscribeFavorites } from './favoritesService'
import type { FavoriteItem } from './types'

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => list())

  useEffect(() => {
    return subscribeFavorites((items) => setFavorites(items))
  }, [])

  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites(add(item))
  }, [])

  const removeFavorite = useCallback((key: string) => {
    setFavorites(remove(key))
  }, [])

  const refresh = useCallback(() => {
    setFavorites(list())
  }, [])

  const isPinned = useCallback(
    (key: string) => favorites.some((entry) => entry.key === key),
    [favorites],
  )

  return { favorites, addFavorite, removeFavorite, refresh, isPinned }
}

export default useFavorites
