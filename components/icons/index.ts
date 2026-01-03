import AllIcon from './AllIcon'
import LocationsIcon from './LocationsIcon'
import CharactersIcon from './CharactersIcon'
import TechnologiesIcon from './TechnologiesIcon'
import FactionsIcon from './FactionsIcon'
import EventsIcon from './EventsIcon'
import LoreIcon from './LoreIcon'

export const categoryIcons = {
  all: AllIcon,
  locations: LocationsIcon,
  characters: CharactersIcon,
  technologies: TechnologiesIcon,
  factions: FactionsIcon,
  events: EventsIcon,
  lore: LoreIcon,
  reserve: AllIcon,
}

export type CategoryIconKey = keyof typeof categoryIcons
