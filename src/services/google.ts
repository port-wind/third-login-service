/**
 * Google 登录验证服务
 */

import type { Env } from '../types'
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose'

interface GoogleUserInfo {
  sub: string           // Google user ID
  name: string
  picture: string
  email: string
  firebase?: {          // Firebase 特有字段（可选）
    sign_in_provider?: string
    identities?: {
      'apple.com'?: string[]
      'google.com'?: string[]
      [key: string]: string[] | undefined
    }
  }
}

/**
 * 验证 Google ID Token（App SDK）
 * 支持：
 * 1. 标准 Google OAuth ID Token
 * 2. Firebase Authentication ID Token
 */
export async function verifyGoogleIdToken(
  idToken: string,
  env: Env
): Promise<GoogleUserInfo | null> {
  try {
    // 先尝试使用 Google TokenInfo API 验证（标准 Google ID Token）
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )
    
    if (response.ok) {
      const data = await response.json() as any
      
      // 验证 audience（客户端 ID）
      if (data.aud === env.GOOGLE_CLIENT_ID) {
        return {
          sub: data.sub,
          name: data.name || data.email,
          picture: data.picture || '',
          email: data.email,
        }
      }
    }
    
    // TokenInfo API 失败，尝试作为 Firebase ID Token 验证
    return await verifyFirebaseIdToken(idToken)
  } catch (error) {
    console.error('验证 Google ID Token 失败:', error)
    return null
  }
}

/**
 * 验证 Firebase ID Token
 * Firebase 使用 Google 的公钥签名，但 issuer 不同
 */
async function verifyFirebaseIdToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    // 先解码 token 获取 issuer (不验证签名)
    const payload = decodeJwt(idToken)
    const issuer = payload.iss as string
    
    console.log('[Firebase] Token issuer:', issuer)
    
    // 验证是否是 Firebase token
    if (!issuer || !issuer.startsWith('https://securetoken.google.com/')) {
      console.error('[Firebase] 不是 Firebase token，issuer:', issuer)
      return null
    }
    
    // Firebase 使用 Google 的公钥验证签名
    const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
    
    console.log('[Firebase] 开始验证 JWT 签名')
    const { payload: verifiedPayload } = await jwtVerify(idToken, JWKS)
    
    console.log('[Firebase] JWT 验证成功，用户信息:', {
      sub: verifiedPayload.sub,
      email: verifiedPayload.email,
      name: verifiedPayload.name
    })
    
    // Firebase token 中的用户信息（包含 firebase 字段）
    return {
      sub: (verifiedPayload.sub || verifiedPayload.user_id) as string,
      name: (verifiedPayload.name || (verifiedPayload.email as string)?.split('@')[0]) as string || 'User',
      picture: (verifiedPayload.picture as string) || '',
      email: (verifiedPayload.email as string) || '',
      firebase: verifiedPayload.firebase as any, // 包含 sign_in_provider 和 identities
    }
  } catch (error) {
    console.error('[Firebase] 验证失败:', error)
    return null
  }
}

/**
 * 用 code 换取 access_token（H5 OAuth）
 */
export async function exchangeGoogleCode(
  code: string,
  env: Env
): Promise<{ access_token: string } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Google code 换取 token 失败:', error)
    return null
  }
}

/**
 * 获取 Google 用户信息
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json() as any
    
    return {
      sub: data.id,
      name: data.name || data.email,
      picture: data.picture || '',
      email: data.email,
    }
  } catch (error) {
    console.error('获取 Google 用户信息失败:', error)
    return null
  }
}

