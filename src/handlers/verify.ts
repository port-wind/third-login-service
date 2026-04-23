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
import { verifyFirebasePhoneToken } from '../services/phone'
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
    let isPhoneToken = false
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
        
        // 进一步判断是否是 Phone 登录
        const firebase = payload.firebase as any
        if (firebase?.sign_in_provider === 'phone') {
          isPhoneToken = true
        }
      }
    } catch (e) {
      // 解析失败，当作我们的 JWT 处理
    }
    
    // 处理第三方 Token（Firebase/Google/Phone）
    if (isThirdPartyToken) {
      // 处理 Phone 登录
      if (isPhoneToken) {
        console.log('[Verify] 检测到 Phone Token，开始验证...')
        
        const phoneUser = await verifyFirebasePhoneToken(token, c.env)
        
        if (!phoneUser) {
          return c.json(errorResponse('INVALID_TOKEN', 'Phone Token 验证失败'), 401)
        }
        
        console.log('[Verify] Phone 用户信息:', {
          sub: phoneUser.sub,
          phone_number: phoneUser.phone_number,
          firebase: phoneUser.firebase
        })
        
        const provider = 'phone'
        const providerUid = phoneUser.phone_number
        
        // 查询或创建用户
        let user = await getUserByProvider(c.env.AUTH_DB, provider, providerUid)
        let isNew = false
        
        if (!user) {
          const nickname = phoneUser.phone_number
          const avatar = ''
          user = await createUser(c.env.AUTH_DB, provider, providerUid, nickname, avatar)
          isNew = true
        }
        
        // 获取 app_id（从中间件传入的）
        const appId = c.get('appId') as string
        
        // 生成我们系统的 JWT Token（包含 a0 和 phone_number）
        const jwt = await generateJWT(user.user_id, appId, provider, c.env, a0, undefined, phoneUser.phone_number)
        
        // 构建响应数据
        const responseData = {
          valid: true,
          user_id: user.user_id,
          jwt: jwt,
          nickname: user.nickname,
          avatar: user.avatar,
          provider: provider,
          provider_uid: providerUid,
          app_id: appId,
          phone_number: phoneUser.phone_number,
          is_new: isNew,
          a0: a0 || null,
          token_type: 'third_party'
        }
        
        console.log('[Verify] Phone 验证-准备返回的响应数据:', {
          user_id: responseData.user_id,
          phone_number: responseData.phone_number,
          provider: responseData.provider,
          is_new: responseData.is_new
        })
        
        // 返回用户信息 + JWT Token
        return c.json(successResponse(responseData))
      }
      
      // 处理 Google/Apple 登录
      console.log('[Verify] 检测到第三方 Token，开始验证...')
      
      const googleUser = await verifyGoogleIdToken(token, c.env)
      
      if (!googleUser) {
        return c.json(errorResponse('INVALID_TOKEN', '第三方 Token 验证失败'), 401)
      }
      
      console.log('[Verify] Google 用户信息:', {
        sub: googleUser.sub,
        name: googleUser.name,
        email: googleUser.email,
        email_type: typeof googleUser.email,
        email_length: googleUser.email?.length,
        picture: googleUser.picture?.substring(0, 50) + '...',
        firebase: googleUser.firebase
      })
      
      // 判断登录提供商
      const provider = googleUser.firebase?.sign_in_provider === 'apple.com' ? 'apple' : 'google'
      
      // 统一使用第三方平台原始 ID（不使用 Firebase UID）
      const providerUid = provider === 'apple' 
        ? (googleUser.firebase?.identities?.['apple.com']?.[0] || googleUser.sub)
        : (googleUser.firebase?.identities?.['google.com']?.[0] || googleUser.sub)
      
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
      
      // 生成我们系统的 JWT Token（包含 a0 和 email）
      const jwt = await generateJWT(user.user_id, appId, provider, c.env, a0, googleUser.email)
      
      // 构建响应数据
      const responseData = {
        valid: true,
        user_id: user.user_id,
        jwt: jwt,
        nickname: user.nickname,
        avatar: user.avatar,
        provider: provider,
        provider_uid: providerUid,
        app_id: appId,
        email: googleUser.email,
        is_new: isNew,
        a0: a0 || null,
        token_type: 'third_party'
      }
      
      console.log('[Verify] 准备返回的响应数据:', {
        user_id: responseData.user_id,
        jwt_length: responseData.jwt.length,
        jwt_preview: responseData.jwt.substring(0, 30) + '...',
        nickname: responseData.nickname,
        avatar: responseData.avatar,
        avatar_exists: !!responseData.avatar,
        avatar_length: responseData.avatar?.length,
        email: responseData.email,
        email_exists: !!responseData.email,
        email_is_string: typeof responseData.email === 'string',
        email_value_json: JSON.stringify(responseData.email),
        provider: responseData.provider,
        a0: responseData.a0
      })
      
      // 返回用户信息 + JWT Token
      return c.json(successResponse(responseData))
    }
    
    // 处理我们系统的 JWT Token
    console.log('[Verify] 检测到系统 JWT Token，开始验证...')
    
    const decoded = await verifyJWT(token, c.env)
    
    if (!decoded) {
      return c.json(errorResponse('INVALID_TOKEN', 'Token 无效或已过期'), 401)
    }
    
    console.log('[Verify] JWT 解码成功:', {
      user_id: decoded.user_id,
      app_id: decoded.app_id,
      provider: decoded.provider,
      email: decoded.email,  // ← 添加 email 日志
      email_exists: !!decoded.email,
      a0: decoded.a0,
      a0_exists: !!decoded.a0,
      iat: decoded.iat,
      exp: decoded.exp
    })
    
    // 从数据库查询完整用户信息
    const userQuery = await c.env.AUTH_DB.prepare(
      'SELECT u.user_id, u.nickname, u.avatar, up.provider, up.provider_uid FROM users u LEFT JOIN user_providers up ON u.user_id = up.user_id WHERE u.user_id = ? AND up.provider = ? LIMIT 1'
    ).bind(decoded.user_id, decoded.provider).first()
    
    // 构建响应数据
    const systemResponseData = {
      valid: true,
      user_id: decoded.user_id,
      nickname: userQuery?.nickname || '',
      avatar: userQuery?.avatar || '',
      provider: decoded.provider,
      provider_uid: userQuery?.provider_uid || '',
      app_id: decoded.app_id,
      platform: decoded.platform,
      device_id: decoded.device_id,
      email: decoded.email || null,  // 从 JWT 中获取 email
      phone_number: decoded.phone_number || null,  // 从 JWT 中获取 phone_number
      a0: decoded.a0 || null,
      issued_at: decoded.iat,
      expires_at: decoded.exp,
      expires_in: decoded.exp - Math.floor(Date.now() / 1000),
      token_type: 'system_jwt'
    }
    
    console.log('[Verify] 系统JWT验证-准备返回的响应数据:', {
      user_id: systemResponseData.user_id,
      nickname: systemResponseData.nickname,
      avatar: systemResponseData.avatar,
      avatar_exists: !!systemResponseData.avatar,
      email: systemResponseData.email,
      email_exists: !!systemResponseData.email,
      phone_number: systemResponseData.phone_number,
      phone_number_exists: !!systemResponseData.phone_number,
      a0: systemResponseData.a0,
      a0_exists: !!systemResponseData.a0,
      a0_type: typeof systemResponseData.a0,
      a0_value_json: JSON.stringify(systemResponseData.a0),
      provider: systemResponseData.provider
    })
    
    // Token 有效，返回完整的用户信息（包含 a0）
    return c.json(successResponse(systemResponseData))
    
  } catch (error: any) {
    console.error('[Verify] Token 验证失败:', error)
    return c.json(errorResponse('VERIFY_FAILED', error.message || 'Token 验证失败'), 500)
  }
}

