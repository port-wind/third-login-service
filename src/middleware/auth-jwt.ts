/**
 * JWT 认证中间件
 * 用于验证第三方后台的认证 JWT
 */

import type { Context, Next } from 'hono'
import * as jose from 'jose'
import { getAppConfig } from '../config/apps'
import { errorResponse } from '../utils/response'

/**
 * 验证第三方后台的认证 JWT
 * JWT payload: { app_id, exp }
 * 密钥: app_secret
 * 有效期: 5分钟
 */
export async function verifyAuthJWT(c: Context, next: Next) {
  try {
    // 从 Authorization header 获取 JWT
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(errorResponse('MISSING_AUTH_TOKEN', '缺少认证 Token', 401), 401)
    }
    
    const authToken = authHeader.replace('Bearer ', '')
    
    // 尝试解析 JWT 获取 app_id（不验证签名）
    let appId: string
    try {
      const decoded = jose.decodeJwt(authToken)
      appId = decoded.app_id as string
      
      if (!appId) {
        return c.json(errorResponse('INVALID_AUTH_TOKEN', '认证 Token 格式错误', 401), 401)
      }
    } catch (error) {
      return c.json(errorResponse('INVALID_AUTH_TOKEN', '认证 Token 格式错误', 401), 401)
    }
    
    // 获取 app 配置
    const appConfig = getAppConfig(appId)
    if (!appConfig) {
      return c.json(errorResponse('APP_NOT_FOUND', '应用不存在或已停用', 404), 404)
    }
    
    // 验证 JWT 签名和有效期
    try {
      const secret = new TextEncoder().encode(appConfig.app_secret)
      const { payload } = await jose.jwtVerify(authToken, secret, {
        algorithms: ['HS256'],
      })
      
      // 检查是否包含 app_id
      if (payload.app_id !== appId) {
        return c.json(errorResponse('INVALID_AUTH_TOKEN', 'app_id 不匹配', 401), 401)
      }
      
      // 将 app_id 存储到 context 中供后续使用
      c.set('appId', appId)
      
      await next()
    } catch (error: any) {
      if (error.code === 'ERR_JWT_EXPIRED') {
        return c.json(errorResponse('AUTH_TOKEN_EXPIRED', '认证 Token 已过期', 401), 401)
      }
      
      return c.json(errorResponse('INVALID_AUTH_TOKEN', '认证 Token 验证失败', 401), 401)
    }
  } catch (error: any) {
    console.error('[AuthJWT] 验证失败:', error)
    return c.json(errorResponse('AUTH_FAILED', error.message || '认证失败', 500), 500)
  }
}

