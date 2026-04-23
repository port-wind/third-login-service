/**
 * Apple Sign In 服务
 */

import type { Env } from '../types'
import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from 'jose'

interface AppleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  is_private_email?: boolean
}

interface AppleTokenData {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token?: string
  token_type: string
}

/**
 * 验证 Apple ID Token
 */
export async function verifyAppleIdToken(
  idToken: string,
  env: Env
): Promise<AppleUserInfo | null> {
  try {
    const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))
    const { payload } = await jwtVerify(idToken, JWKS, {
      audience: env.APPLE_CLIENT_ID,
      issuer: 'https://appleid.apple.com',
    })

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: (payload.email_verified === 'true' || payload.email_verified === true),
      is_private_email: payload.is_private_email === 'true' || payload.is_private_email === true,
    }
  } catch (error) {
    console.error('[Apple] ID Token 验证失败:', error)
    return null
  }
}

/**
 * 生成 Apple Client Secret (JWT)
 * Apple 要求使用 ES256 签名的 JWT 作为 client_secret
 */
async function generateAppleClientSecret(env: Env): Promise<string> {
  try {
    // 导入 ES256 私钥
    const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, 'ES256')
    
    // 创建 JWT
    const clientSecret = await new SignJWT({})
      .setProtectedHeader({
        alg: 'ES256',
        kid: env.APPLE_KEY_ID,
      })
      .setIssuer(env.APPLE_TEAM_ID)
      .setIssuedAt()
      .setExpirationTime('180d') // Apple 要求最长 6 个月
      .setAudience('https://appleid.apple.com')
      .setSubject(env.APPLE_CLIENT_ID)
      .sign(privateKey)
    
    return clientSecret
  } catch (error) {
    console.error('[Apple] 生成 Client Secret 失败:', error)
    throw error
  }
}

/**
 * 用授权码换取 Token
 */
export async function exchangeAppleCode(
  code: string,
  env: Env
): Promise<AppleTokenData | null> {
  try {
    // 生成 client_secret
    const clientSecret = await generateAppleClientSecret(env)
    
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: env.APPLE_REDIRECT_URI,
      }).toString(),
    })

    if (!response.ok) {
      console.error('[Apple] Code 换取 Token 失败:', await response.text())
      return null
    }

    return await response.json() as AppleTokenData
  } catch (error) {
    console.error('[Apple] Code 换取 Token 异常:', error)
    return null
  }
}

