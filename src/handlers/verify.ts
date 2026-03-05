/**
 * Token 验证接口
 * POST /auth/verify
 * 
 * 支持两种 Token：
 * 1. Firebase/Google Token（第三方 Token）
 * 2. 我们系统的 JWT Token
 */

import type { Context } from 'hono'
import { decodeJwt } from 'jose'
import { verifyJWT, generateJWT } from '../utils/jwt'
import { successResponse, errorResponse } from '../utils/response'
import { verifyGoogleIdToken } from '../services/google'
import { getUserByProvider, createUser } from '../services/user'

export async function handleVerifyToken(c: Context) {
  try {
    // 从请求体或 Header 获取 token
    const body = await c.req.json().catch(() => ({}))
    const token = body.token || c.req.header('Authorization')?.replace('Bearer ', '')
    const a0 = body.a0  // 提取 a0 参数（可选）
    
    if (!token) {
      return c.json(errorResponse('MISSING_TOKEN', '缺少 token 参数'), 400)
    }
    
    // 先尝试判断 token 类型
    let isThirdPartyToken = false
    try {
      const payload = decodeJwt(token)
      const issuer = payload.iss as string
      
      // 判断是否是 Firebase/Google token
      if (issuer && (
        issuer.startsWith('https://securetoken.google.com/') ||  // Firebase
        issuer === 'https://accounts.google.com' ||              // Google
        issuer === 'accounts.google.com'
      )) {
        isThirdPartyToken = true
      }
    } catch (e) {
      // 解析失败，当作我们的 JWT 处理
    }
    
    // 处理第三方 Token（Firebase/Google）
    if (isThirdPartyToken) {
      console.log('[Verify] 检测到第三方 Token，开始验证...')
      
      const googleUser = await verifyGoogleIdToken(token, c.env)
      
      if (!googleUser) {
        return c.json(errorResponse('INVALID_TOKEN', '第三方 Token 验证失败'), 401)
      }
      
      // 判断登录提供商
      const provider = googleUser.firebase?.sign_in_provider === 'apple.com' ? 'apple' : 'google'
      const providerUid = provider === 'apple' 
        ? (googleUser.firebase?.identities?.['apple.com']?.[0] || googleUser.sub)
        : googleUser.sub
      
      // 查询或创建用户
      let user = await getUserByProvider(c.env.AUTH_DB, provider, providerUid)
      let isNew = false
      
      if (!user) {
        const nickname = googleUser.name || googleUser.email?.split('@')[0] || 'User'
        const avatar = googleUser.picture || ''
        user = await createUser(c.env.AUTH_DB, provider, providerUid, nickname, avatar)
        isNew = true
      }
      
      // 获取 app_id（从中间件传入的）
      const appId = c.get('appId') as string
      
      // 生成我们系统的 JWT Token（包含 a0）
      const jwt = await generateJWT(user.user_id, appId, provider, c.env, a0)
      
      // 返回用户信息 + JWT Token
      return c.json(successResponse({
        valid: true,
        user_id: user.user_id,
        jwt: jwt,  // ← 新增：返回我们系统的 JWT
        nickname: user.nickname,
        avatar: user.avatar,
        provider: provider,
        provider_uid: providerUid,
        app_id: appId,
        email: googleUser.email,
        is_new: isNew,
        ...(a0 && { a0 }),  // 如果有 a0 则返回
        token_type: 'third_party'  // 标识这是第三方 token
      }))
    }
    
    // 处理我们系统的 JWT Token
    console.log('[Verify] 检测到系统 JWT Token，开始验证...')
    
    const decoded = await verifyJWT(token, c.env)
    
    if (!decoded) {
      return c.json(errorResponse('INVALID_TOKEN', 'Token 无效或已过期'), 401)
    }
    
    // 从数据库查询完整用户信息
    const userQuery = await c.env.AUTH_DB.prepare(
      'SELECT u.user_id, u.nickname, u.avatar, up.provider, up.provider_uid FROM users u LEFT JOIN user_providers up ON u.user_id = up.user_id WHERE u.user_id = ? AND up.provider = ? LIMIT 1'
    ).bind(decoded.user_id, decoded.provider).first()
    
    // Token 有效，返回完整的用户信息（包含 a0）
    return c.json(successResponse({
      valid: true,
      user_id: decoded.user_id,
      nickname: userQuery?.nickname || '',
      avatar: userQuery?.avatar || '',
      provider: decoded.provider,
      provider_uid: userQuery?.provider_uid || '',
      app_id: decoded.app_id,
      platform: decoded.platform,
      device_id: decoded.device_id,
      ...(decoded.a0 && { a0: decoded.a0 }),  // 如果有 a0 则返回
      issued_at: decoded.iat,
      expires_at: decoded.exp,
      expires_in: decoded.exp - Math.floor(Date.now() / 1000),
      token_type: 'system_jwt'  // 标识这是系统 JWT
    }))
    
  } catch (error: any) {
    console.error('[Verify] Token 验证失败:', error)
    return c.json(errorResponse('VERIFY_FAILED', error.message || 'Token 验证失败'), 500)
  }
}

