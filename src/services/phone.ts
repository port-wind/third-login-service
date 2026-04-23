/**
 * Phone 登录验证服务（Firebase Phone Authentication）
 */

import type { Env } from '../types'
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose'

interface PhoneUserInfo {
  sub: string           // Firebase UID
  phone_number: string  // 手机号（国际格式，例如 +8613800138000）
  firebase?: {
    sign_in_provider?: string
    identities?: {
      phone?: string[]
      [key: string]: string[] | undefined
    }
  }
}

/**
 * 验证 Firebase Phone ID Token
 * 只支持 Firebase Authentication 的手机号登录
 *
 * 必须配置 FIREBASE_PROJECT_ID：校验 iss/aud 绑定到本项目的 Firebase，
 * 否则任意 Firebase 项目的合法签名 Token 都可被本服务接受（跨项目伪造风险）。
 */
export async function verifyFirebasePhoneToken(
  idToken: string,
  env: Env
): Promise<PhoneUserInfo | null> {
  try {
    const projectId = env.FIREBASE_PROJECT_ID?.trim()
    if (!projectId) {
      console.error('[Phone] 未配置 FIREBASE_PROJECT_ID，拒绝验证 Phone Token')
      return null
    }

    // 先解码 token 获取 issuer (不验证签名)
    const payload = decodeJwt(idToken)
    const issuer = payload.iss as string

    console.log('[Phone] Token issuer:', issuer)

    // 必须是本项目 Firebase token（与 jwtVerify 的 issuer 一致）
    const expectedIssuer = `https://securetoken.google.com/${projectId}`
    if (issuer !== expectedIssuer) {
      console.error('[Phone] issuer 不匹配，期望:', expectedIssuer, '实际:', issuer)
      return null
    }

    // Firebase 使用 Google 的公钥验证签名
    const JWKS = createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    )

    console.log('[Phone] 开始验证 JWT 签名')
    const { payload: verifiedPayload } = await jwtVerify(idToken, JWKS, {
      issuer: expectedIssuer,
      audience: projectId,
    })
    
    console.log('[Phone] JWT 验证成功，用户信息:', {
      sub: verifiedPayload.sub,
      phone_number: verifiedPayload.phone_number,
      firebase: verifiedPayload.firebase
    })
    
    // 检查是否是手机号登录
    const firebase = verifiedPayload.firebase as any
    if (!firebase || firebase.sign_in_provider !== 'phone') {
      console.error('[Phone] 不是手机号登录，sign_in_provider:', firebase?.sign_in_provider)
      return null
    }
    
    // 提取手机号
    const phoneNumber = firebase.identities?.phone?.[0] || verifiedPayload.phone_number as string
    
    if (!phoneNumber) {
      console.error('[Phone] 缺少手机号信息')
      return null
    }
    
    console.log('[Phone] 成功提取手机号:', phoneNumber)
    
    return {
      sub: verifiedPayload.sub as string,
      phone_number: phoneNumber,
      firebase: firebase
    }
  } catch (error) {
    console.error('[Phone] 验证失败:', error)
    return null
  }
}
