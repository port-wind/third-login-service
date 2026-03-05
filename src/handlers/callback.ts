/**
 * OAuth 回调处理器
 * GET /callback/{provider}
 */

import type { Env, Provider } from '../types'
import { redirectResponse, errorResponse } from '../utils/response'
import { generateJWT } from '../utils/jwt'
import { getUserByProvider, createUser, logLogin } from '../services/user'
import { exchangeGoogleCode, getGoogleUserInfo } from '../services/google'
import { exchangeAppleCode, verifyAppleIdToken } from '../services/apple'

/**
 * 处理 OAuth 回调
 */
export async function handleCallback(
  request: Request,
  provider: Provider,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url)
    
    // 获取参数（支持 GET 和 POST 两种方式）
    let code: string | null = null
    let state: string | null = null
    let error: string | null = null
    
    if (request.method === 'POST') {
      // Apple 使用 POST (response_mode=form_post)
      const contentType = request.headers.get('content-type') || ''
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        code = formData.get('code') as string | null
        state = formData.get('state') as string | null
        error = formData.get('error') as string | null
      }
    } else {
      // Google 等平台使用 GET
      code = url.searchParams.get('code')
      state = url.searchParams.get('state')
      error = url.searchParams.get('error')
    }
    
    console.log('[Callback] 收到回调:', { method: request.method, provider, code: code?.substring(0, 20) + '...', state, error })
    
    // 解析 state 参数（可能是字符串或 JSON）
    let callbackUrl = ''
    let a0: string | undefined = undefined
    let appId = 'h5_callback' // 默认 app_id
    let isIframeMode = false
    
    if (state) {
      const decodedState = decodeURIComponent(state)
      
      // 检查是否是 iframe 模式
      if (decodedState.startsWith('iframe:')) {
        isIframeMode = true
        const actualState = decodedState.substring(7) // 去掉 "iframe:" 前缀
        
        // 尝试解析为 JSON
        try {
          const stateObj = JSON.parse(actualState)
          callbackUrl = stateObj.callback_url || actualState
          a0 = stateObj.a0
          appId = stateObj.app_id || appId // 支持自定义 app_id
        } catch {
          callbackUrl = actualState
        }
      } else {
        // 非 iframe 模式，尝试解析为 JSON
        try {
          const stateObj = JSON.parse(decodedState)
          callbackUrl = stateObj.callback_url || decodedState
          a0 = stateObj.a0
          appId = stateObj.app_id || appId // 支持自定义 app_id
        } catch {
          callbackUrl = decodedState
        }
      }
    }
    
    if (!callbackUrl) {
      callbackUrl = `${url.origin}/test`
    }
    
    console.log('[Callback] 解析 state:', { callbackUrl, a0, appId, isIframeMode })
    
    // OAuth 错误处理
    if (error) {
      return redirectResponse(`${callbackUrl}?error=${error}`)
    }
    
    if (!code) {
      return redirectResponse(`${callbackUrl}?error=missing_code`)
    }
    
    // 根据不同平台换取 token 并获取用户信息
    let providerUid: string
    let nickname: string
    let avatar: string
    
    switch (provider) {
      case 'google':
        const tokenData = await exchangeGoogleCode(code, env)
        if (!tokenData) {
          const cbUrl = state ? decodeURIComponent(state) : `${new URL(request.url).origin}/test`
          return redirectResponse(`${cbUrl}?error=google_token_failed`)
        }
        
        const googleUser = await getGoogleUserInfo(tokenData.access_token)
        if (!googleUser) {
          const cbUrl = state ? decodeURIComponent(state) : `${new URL(request.url).origin}/test`
          return redirectResponse(`${cbUrl}?error=google_userinfo_failed`)
        }
        
        providerUid = googleUser.sub
        nickname = googleUser.name
        avatar = googleUser.picture
        break
      
      case 'apple':
        const appleTokenData = await exchangeAppleCode(code, env)
        if (!appleTokenData) {
          const cbUrl = state ? decodeURIComponent(state) : `${new URL(request.url).origin}/test`
          return redirectResponse(`${cbUrl}?error=apple_token_failed`)
        }
        
        const appleUser = await verifyAppleIdToken(appleTokenData.id_token, env)
        if (!appleUser) {
          const cbUrl = state ? decodeURIComponent(state) : `${new URL(request.url).origin}/test`
          return redirectResponse(`${cbUrl}?error=apple_userinfo_failed`)
        }
        
        providerUid = appleUser.sub
        nickname = appleUser.email?.split('@')[0] || 'Apple User'  // Apple 可能不提供名字
        avatar = ''  // Apple 不提供头像
        break
      
      default:
        const cbUrl = state ? decodeURIComponent(state) : `${new URL(request.url).origin}/test`
        return redirectResponse(`${cbUrl}?error=invalid_provider`)
    }
    
    // 查询或创建用户
    let user = await getUserByProvider(env.AUTH_DB, provider, providerUid)
    let isNew = false
    
    if (!user) {
      user = await createUser(env.AUTH_DB, provider, providerUid, nickname, avatar)
      isNew = true
    }
    
    // 记录登录日志
    await logLogin(env.AUTH_DB, user.user_id, provider, appId, 'h5')
    
    // 生成 JWT（包含 a0）
    const jwt = await generateJWT(user.user_id, appId, provider, env, a0)
    
    if (isIframeMode) {
      // iframe 模式：返回 HTML，通过 postMessage 发送结果给父页面
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录成功</title>
</head>
<body>
  <p>登录成功，正在返回...</p>
  <script>
    // 通过 postMessage 发送登录结果给父页面
    window.parent.postMessage({
      success: true,
      token: '${jwt}',
      user_id: '${user.user_id}',
      is_new: ${isNew}${a0 ? `,\n      a0: '${a0}'` : ''}
    }, '*');
  </script>
</body>
</html>`
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    } else {
      // 普通模式：重定向回业务页面（带 token）
      const params = new URLSearchParams({
        token: jwt,
        user_id: user.user_id,
        is_new: String(isNew)
      })
      if (a0) {
        params.append('a0', a0)
      }
      const redirectUrl = `${callbackUrl}?${params.toString()}`
      
      return redirectResponse(redirectUrl)
    }
  } catch (error: any) {
    console.error('OAuth 回调处理失败:', error)
    const url = new URL(request.url)
    const state = url.searchParams.get('state')
    const decodedState = state ? decodeURIComponent(state) : ''
    const isIframeMode = decodedState.startsWith('iframe:')
    
    if (isIframeMode) {
      // iframe 模式：返回 HTML，通过 postMessage 发送错误信息
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录失败</title>
</head>
<body>
  <p>登录失败</p>
  <script>
    window.parent.postMessage({
      success: false,
      error: 'callback_failed',
      message: '${error.message}'
    }, '*');
  </script>
</body>
</html>`
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    } else {
      // 普通模式：重定向
      const cbUrl = decodedState || `${url.origin}/test`
      return redirectResponse(`${cbUrl}?error=callback_failed&message=${encodeURIComponent(error.message)}`)
    }
  }
}

