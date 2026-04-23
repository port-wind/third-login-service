/**
 * JWT 工具
 */

import type { Env } from '../types'

export interface JWTPayload {
  user_id: string
  app_id: string
  provider: string
  platform?: 'ios' | 'android' | 'h5' | 'web'
  device_id?: string
  email?: string        // 用户邮箱（从第三方获取，Google/Apple 登录时有）
  phone_number?: string // 用户手机号（Phone 登录时有，国际格式如 +8613800138000）
  a0?: string           // 第三方自定义字段
  iat: number
  exp: number
}

/**
 * 生成 JWT
 */
export async function generateJWT(
  userId: string,
  appId: string,
  provider: string,
  env: Env,
  a0?: string,
  email?: string,
  phoneNumber?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  // 计算过期时间（默认 7 天）
  const expiresIn = parseExpiresIn(env.JWT_EXPIRES_IN || '7d')
  
  const payload: JWTPayload = {
    user_id: userId,
    app_id: appId,
    provider,
    ...(a0 && { a0 }),  // 如果有 a0 则包含
    ...(email && { email }),  // 如果有 email 则包含
    ...(phoneNumber && { phone_number: phoneNumber }),  // 如果有 phone_number 则包含
    iat: now,
    exp: now + expiresIn,
  }
  
  // 使用 Web Crypto API 生成 JWT
  const header = { alg: 'HS256', typ: 'JWT' }
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  
  const signature = await signJWT(
    `${encodedHeader}.${encodedPayload}`,
    env.JWT_SECRET
  )
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * 验证 JWT
 */
export async function verifyJWT(token: string, env: Env): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [encodedHeader, encodedPayload, signature] = parts
    
    // 验证签名
    const expectedSignature = await signJWT(
      `${encodedHeader}.${encodedPayload}`,
      env.JWT_SECRET
    )
    
    if (signature !== expectedSignature) return null
    
    // 解析 payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload))
    
    // 验证过期时间
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    
    return payload
  } catch {
    return null
  }
}

/**
 * JWT 签名
 */
async function signJWT(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(data)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData)
  
  return base64UrlEncode(signature)
}

/**
 * Base64 URL 编码
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let binary = ''
  
  if (typeof data === 'string') {
    binary = btoa(unescape(encodeURIComponent(data)))
  } else {
    const bytes = new Uint8Array(data)
    binary = btoa(String.fromCharCode(...bytes))
  }
  
  return binary
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  
  // 补齐 padding
  while (base64.length % 4) {
    base64 += '='
  }
  
  return decodeURIComponent(escape(atob(base64)))
}

/**
 * 解析过期时间字符串
 */
function parseExpiresIn(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/)
  if (!match) return 7 * 24 * 60 * 60 // 默认 7 天
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 60 * 60
    case 'd': return value * 24 * 60 * 60
    default: return 7 * 24 * 60 * 60
  }
}

