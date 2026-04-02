/**
 * H5 OAuth 启动处理器
 * GET /h5/auth/{provider}
 * 构建第三方 OAuth URL 并重定向
 */

import type { Env, Provider } from '../types'

/**
 * 处理 H5 OAuth 启动
 */
export async function handleH5Auth(
  request: Request,
  provider: Provider,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const state = url.searchParams.get('state') || ''
    
    console.log('[H5Auth] 启动 OAuth 流程:', { provider, state: state.substring(0, 50) })
    
    // 使用配置的回调 URL（不再动态生成）
    let redirectUri = ''
    
    switch (provider) {
      case 'google':
        redirectUri = env.GOOGLE_REDIRECT_URI
        break
      case 'apple':
        redirectUri = env.APPLE_REDIRECT_URI
        break
      default:
        return new Response('不支持的登录方式', { status: 400 })
    }
    
    let authUrl = ''
    
    switch (provider) {
      case 'google':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${env.GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&state=${encodeURIComponent(state)}` +
          `&prompt=consent`
        break
        
      case 'apple':
        authUrl = `https://appleid.apple.com/auth/authorize?` +
          `client_id=${env.APPLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent('name email')}` +
          `&state=${encodeURIComponent(state)}` +
          `&response_mode=form_post`
        break
        
      default:
        return new Response('不支持的登录方式', { status: 400 })
    }
    
    console.log('[H5Auth] 重定向到:', authUrl.substring(0, 100) + '...')
    
    // 重定向到第三方授权页面
    return Response.redirect(authUrl, 302)
    
  } catch (error: any) {
    console.error('[H5Auth] 错误:', error)
    return new Response('启动 OAuth 失败: ' + error.message, { status: 500 })
  }
}
