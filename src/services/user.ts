/**
 * 用户服务
 */

import type { Env, User, UserProvider, Provider } from '../types'

/**
 * 根据第三方账号查询用户
 */
export async function getUserByProvider(
  db: D1Database,
  provider: Provider,
  providerUid: string
): Promise<User | null> {
  const result = await db
    .prepare(
      `SELECT u.* FROM users u
       INNER JOIN user_providers up ON u.user_id = up.user_id
       WHERE up.provider = ? AND up.provider_uid = ?`
    )
    .bind(provider, providerUid)
    .first<User>()
  
  return result || null
}

/**
 * 创建新用户
 */
export async function createUser(
  db: D1Database,
  provider: Provider,
  providerUid: string,
  nickname: string,
  avatar: string
): Promise<User> {
  const userId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = Date.now()
  
  // 插入用户
  await db
    .prepare('INSERT INTO users (user_id, nickname, avatar, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, nickname, avatar || '', now)
    .run()
  
  // 绑定第三方账号
  await db
    .prepare('INSERT INTO user_providers (user_id, provider, provider_uid, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, provider, providerUid, now)
    .run()
  
  return {
    user_id: userId,
    nickname,
    avatar,
    created_at: now,
  }
}

/**
 * 绑定第三方账号到已有用户
 */
export async function bindProvider(
  db: D1Database,
  userId: string,
  provider: Provider,
  providerUid: string
): Promise<void> {
  const now = Date.now()
  
  await db
    .prepare('INSERT INTO user_providers (user_id, provider, provider_uid, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, provider, providerUid, now)
    .run()
}

/**
 * 记录登录日志
 */
export async function logLogin(
  db: D1Database,
  userId: string,
  provider: Provider,
  appId: string,
  platform?: string,
  deviceId?: string
): Promise<void> {
  const now = Date.now()
  
  await db
    .prepare(
      'INSERT INTO login_logs (user_id, provider, app_id, platform, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(userId, provider, appId, platform || '', deviceId || '', now)
    .run()
}

