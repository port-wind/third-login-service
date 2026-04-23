/**
 * 认证处理器
 * POST /auth/{provider}
 */

import type { Env, Provider, AuthRequest, AuthResponse } from '../types'
import { createSuccessResponse, createErrorResponse } from '../utils/response'
import { generateJWT } from '../utils/jwt'
import { getUserByProvider, createUser, logLogin } from '../services/user'
import { verifyGoogleIdToken, exchangeGoogleCode, getGoogleUserInfo } from '../services/google'
import { verifyAppleIdToken } from '../services/apple'
import { verifyFirebasePhoneToken } from '../services/phone'

/**
 * 处理认证请求
 */
export async function handleAuth(
  request: Request,
  provider: Provider,
  env: Env,
  appId: string  // 从中间件传入的 app_id
): Promise<Response> {
  try {
    console.log(`[Auth] 收到 ${provider} 登录请求`)
    
    // 解析请求
    const body = await request.json() as AuthRequest
    const { token, platform, device_id, a0 } = body
    
    console.log(`[Auth] App ID: ${appId}, Platform: ${platform}, Token 长度: ${token?.length}, a0: ${a0}`)
    
    if (!token) {
      return createErrorResponse('MISSING_TOKEN', '缺少 token 参数', 400)
    }
    
    // 根据不同平台验证并获取用户信息
    let providerUid: string
    let nickname: string
    let avatar: string
    let email: string | undefined  // 添加 email 变量
    
    switch (provider) {
      case 'google':
        console.log('[Auth] 开始验证 Google token')
        const googleUser = await verifyGoogleIdToken(token, env)
        if (!googleUser) {
          console.log('[Auth] Google ID Token 验证失败，尝试作为 OAuth code')
          // 可能是 OAuth code，尝试换取 token
          const tokenData = await exchangeGoogleCode(token, env)
          if (!tokenData) {
            console.error('[Auth] Google token 验证完全失败')
            return createErrorResponse('INVALID_TOKEN', 'Google token 验证失败', 400)
          }
          
          const userInfo = await getGoogleUserInfo(tokenData.access_token)
          if (!userInfo) {
            return createErrorResponse('INVALID_TOKEN', '获取 Google 用户信息失败', 400)
          }
          
          providerUid = userInfo.sub
          nickname = userInfo.name
          avatar = userInfo.picture
          email = userInfo.email  // 保存 email
        } else {
          // 统一使用 Google 原始 ID（不使用 Firebase UID）
          providerUid = googleUser.firebase?.identities?.['google.com']?.[0] || googleUser.sub
          nickname = googleUser.name
          avatar = googleUser.picture
          email = googleUser.email  // 保存 email
        }
        break
      
      case 'apple':
        // Apple Sign In - 支持原生 Apple ID Token 和 Firebase Apple token
        console.log('[Auth] 开始验证 Apple token')
        
        // 先判断是否是 Firebase token（通过 iss 判断，不验证签名）
        let isFirebaseToken = false
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            isFirebaseToken = payload.iss?.startsWith('https://securetoken.google.com/') || false
          }
        } catch (e) {
          // 解析失败，不是 JWT 格式
        }
        
        if (isFirebaseToken) {
          // Firebase Apple token
          console.log('[Auth] 检测到 Firebase token，验证中...')
          const firebaseAppleUser = await verifyGoogleIdToken(token, env)
          if (!firebaseAppleUser) {
            return createErrorResponse('INVALID_TOKEN', 'Firebase Apple token 验证失败', 400)
          }
          if (firebaseAppleUser.firebase?.sign_in_provider === 'apple.com') {
            providerUid = firebaseAppleUser.firebase?.identities?.['apple.com']?.[0] || firebaseAppleUser.sub
            nickname = firebaseAppleUser.email?.split('@')[0] || 'Apple User'
            avatar = ''
            email = firebaseAppleUser.email  // 保存 email (可能为空)
          } else {
            return createErrorResponse('INVALID_TOKEN', 'Token 不是 Apple 登录', 400)
          }
        } else {
          // 原生 Apple ID Token
          console.log('[Auth] 尝试验证原生 Apple ID Token')
          const appleUser = await verifyAppleIdToken(token, env)
          if (!appleUser) {
            console.error('[Auth] Apple token 验证完全失败')
            return createErrorResponse('INVALID_TOKEN', 'Apple token 验证失败', 400)
          }
          
          providerUid = appleUser.sub
          nickname = appleUser.email?.split('@')[0] || 'Apple User'
          avatar = ''
          email = appleUser.email  // 保存 email (可能为空)
        }
        break
      
      case 'phone':
        // Firebase Phone Authentication
        console.log('[Auth] 开始验证 Phone token')
        const phoneUser = await verifyFirebasePhoneToken(token, env)
        if (!phoneUser) {
          console.error('[Auth] Phone token 验证失败')
          return createErrorResponse('INVALID_TOKEN', 'Phone token 验证失败', 400)
        }
        
        providerUid = phoneUser.phone_number
        nickname = phoneUser.phone_number
        avatar = ''
        email = phoneUser.phone_number  // 手机号也存到 email 字段（用于兼容）
        break
      
      default:
        return createErrorResponse('INVALID_PROVIDER', '不支持的登录平台', 400)
    }
    
    // 查询或创建用户
    let user = await getUserByProvider(env.AUTH_DB, provider, providerUid)
    let isNew = false
    
    if (!user) {
      user = await createUser(env.AUTH_DB, provider, providerUid, nickname, avatar)
      isNew = true
    }
    
    // 记录登录日志
    await logLogin(env.AUTH_DB, user.user_id, provider, appId, platform, device_id)
    
    // 生成 JWT（包含 a0、email 和 phone_number）
    const phoneNumber = provider === 'phone' ? providerUid : undefined
    const jwt = await generateJWT(user.user_id, appId, provider, env, a0, email, phoneNumber)
    
    // 返回结果
    const response: AuthResponse = {
      user_id: user.user_id,
      jwt,
      provider,
      is_new: isNew,
      profile: {
        nickname: user.nickname,
        avatar: user.avatar,
      },
    }
    
    return createSuccessResponse(response)
  } catch (error: any) {
    console.error('认证处理失败:', error)
    return createErrorResponse('AUTH_FAILED', error.message || '认证失败', 500)
  }
}

