import { config } from '../config'
import { hashPassword } from '../auth/password'
import { addUserRole, createUser, findUserByEmail, getUserRoles, setUserRoles } from './users'

async function ensureTestUser(emailRaw: string, passwordRaw: string) {
  const email = emailRaw.trim().toLowerCase()
  if (!email) return
  const existing = findUserByEmail(email)
  if (!existing) {
    const passwordHash = await hashPassword(passwordRaw)
    const user = createUser(email, passwordHash)
    addUserRole(user.id, 'test')
    return
  }
  const roles = getUserRoles(existing.id)
  if (!roles.includes('test')) {
    addUserRole(existing.id, 'test')
  }
}

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
    await ensureTestUser(config.testEmail, config.testPassword)
    await ensureTestUser(config.testerEmail, config.testerPassword)
  }
}
