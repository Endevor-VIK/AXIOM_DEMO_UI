import { config } from '../config'
import { hashPassword } from '../auth/password'
import { addUserRole, createUser, findUserByEmail, getUserRoles, setUserRoles } from './users'

export async function seedUsers() {
  if (config.creatorEmail && config.creatorPassword) {
    const email = config.creatorEmail.trim().toLowerCase()
    if (email) {
      const existing = findUserByEmail(email)
      if (!existing) {
        const passwordHash = await hashPassword(config.creatorPassword)
        const user = createUser(email, passwordHash)
        setUserRoles(user.id, ['creator'])
      } else {
        const roles = getUserRoles(existing.id)
        if (!roles.includes('creator')) {
          addUserRole(existing.id, 'creator')
        }
      }
    }
  }

  if (config.seedTest) {
    const email = config.testEmail.trim().toLowerCase()
    if (email) {
      const existing = findUserByEmail(email)
      if (!existing) {
        const passwordHash = await hashPassword(config.testPassword)
        const user = createUser(email, passwordHash)
        addUserRole(user.id, 'test')
      } else {
        const roles = getUserRoles(existing.id)
        if (!roles.includes('test')) {
          addUserRole(existing.id, 'test')
        }
      }
    }
  }
}
