/**
 * 统一第三方登录认证服务
 * Cloudflare Worker 主入口
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, Provider } from './types'
import { verifyAuthJWT } from './middleware/auth-jwt'
import { handleAuth } from './handlers/auth'
import { handleCallback } from './handlers/callback'
import { handleVerifyToken } from './handlers/verify'
import { successResponse, errorResponse } from './utils/response'

const app = new Hono<{ Bindings: Env }>()

// CORS 中间件
app.use('/*', cors())

// 健康检查
app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Auth Service is running',
    timestamp: Date.now(),
  })
})

// Apple 域名验证文件
app.get('/.well-known/apple-developer-domain-association.txt', (c) => {
  const content = `{"applinks":{"apps":[],"details":[{"appID":"3A23J8Y46P.jp.xdreamstar.auth-bridge.app","paths":["*"]}]}}`
  return c.text(content, 200, {
    'Content-Type': 'application/json',
  })
})

// 测试页面
app.get('/test', (c) => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>统一第三方登录服务 - 测试页面</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 16px; padding: 40px; max-width: 800px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
    .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
    .section { margin-bottom: 40px; padding: 24px; background: #f8f9fa; border-radius: 12px; }
    .section-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .badge { background: #667eea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: normal; }
    .oauth-buttons { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .btn { padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-google { background: #fff; color: #333; border: 1px solid #ddd; }
    .btn-line { background: #00B900; color: white; }
    .btn-x { background: #000; color: white; }
    .btn-facebook { background: #1877F2; color: white; }
    .btn-instagram { background: linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4); color: white; }
    .result { margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border-left: 4px solid #667eea; display: none; }
    .result.show { display: block; }
    .result.success { border-left-color: #10b981; background: #f0fdf4; }
    .result.error { border-left-color: #ef4444; background: #fef2f2; }
    .result-title { font-weight: 600; margin-bottom: 8px; color: #333; }
    pre { background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin-top: 8px; }
    .info { background: #e0e7ff; color: #4338ca; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; line-height: 1.6; }
    .url-display { background: white; padding: 12px; border-radius: 6px; border: 1px solid #ddd; margin-top: 12px; font-family: monospace; font-size: 12px; word-break: break-all; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 统一第三方登录服务</h1>
    <p class="subtitle">Third-party Login Service - 测试页面</p>
    <div class="section">
      <div class="section-title">🌐 H5 OAuth 模式测试 <span class="badge">无需签名</span></div>
      <div class="info">点击下方按钮将跳转到对应平台的授权页面，授权后会自动回调到本服务，然后重定向回此页面。</div>
      <div class="oauth-buttons">
        <button class="btn btn-google" onclick="loginOAuth('google')">🔵 Google 登录</button>
        <button class="btn btn-apple" onclick="loginOAuth('apple')" style="background: #000; color: white;">🍎 Apple 登录</button>
        <!-- 暂时禁用其他平台 -->
        <!-- <button class="btn btn-line" onclick="loginOAuth('line')">💚 LINE 登录</button> -->
        <!-- <button class="btn btn-x" onclick="loginOAuth('x')">🐦 X 登录</button> -->
        <!-- <button class="btn btn-facebook" onclick="loginOAuth('facebook')">📘 Facebook 登录</button> -->
        <!-- <button class="btn btn-instagram" onclick="loginOAuth('instagram')">📷 Instagram 登录</button> -->
      </div>
      <div id="oauth-result" class="result"></div>
    </div>
    <div class="section">
      <div class="section-title">📱 App SDK 模式说明 <span class="badge">需要签名</span></div>
      <div class="info">App SDK 模式需要客户端生成 HMAC-SHA256 签名。<br>浏览器环境无法安全存储 app_secret，仅供后端或 App 使用。<br><strong>测试命令：</strong> <code>node test-sign.js</code></div>
      <div class="url-display">POST http://localhost:8787/auth/google<br>Headers: x-app-id, x-signature, x-timestamp, x-nonce<br>Body: { provider, token, platform, device_id }</div>
    </div>
    <div class="section">
      <div class="section-title">⚙️ OAuth 配置信息</div>
      <div class="info" style="background: #fef3c7; color: #92400e;"><strong>⚠️ 注意：</strong> 当前回调地址配置为 <code>http://localhost:8787/callback/{provider}</code><br>需要在各平台开发者控制台添加此回调地址才能正常使用。</div>
      <div style="margin-top: 16px; font-size: 13px; color: #666; line-height: 1.8;"><strong>Google:</strong> https://console.cloud.google.com/<br><strong>LINE:</strong> https://developers.line.biz/<br><strong>X:</strong> https://developer.twitter.com/<br><strong>Facebook:</strong> https://developers.facebook.com/<br><strong>Instagram:</strong> https://developers.facebook.com/</div>
    </div>
  </div>
  <script>
    const BASE_URL = window.location.origin;
    const OAUTH_CONFIGS = {
      google: { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', clientId: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com', scope: 'openid email profile' },
      apple: { authUrl: 'https://appleid.apple.com/auth/authorize', clientId: 'jp.xdreamstar.auth-bridge-dev.service', scope: 'name email', responseMode: 'form_post' },
      // 暂时禁用的平台（需要时取消注释）
      // line: { authUrl: 'https://access.line.me/oauth2/v2.1/authorize', clientId: '2008334619', scope: 'profile openid' },
      // x: { authUrl: 'https://twitter.com/i/oauth2/authorize', clientId: 'Q3ZwM25NbVdRdXFfUUNaWW1QTmc6MTpjaQ', scope: 'tweet.read users.read' },
      // facebook: { authUrl: 'https://www.facebook.com/v12.0/dialog/oauth', clientId: '838156468673287', scope: 'email public_profile' },
      // instagram: { authUrl: 'https://api.instagram.com/oauth/authorize', clientId: '838156468673287', scope: 'user_profile' }
    };
    function loginOAuth(provider) {
      const config = OAUTH_CONFIGS[provider];
      if (!config) { alert('暂不支持该平台'); return; }
      const redirectUri = BASE_URL + '/callback/' + provider;
      const state = encodeURIComponent(window.location.href);
      let authUrl = config.authUrl + '?client_id=' + config.clientId + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code&scope=' + encodeURIComponent(config.scope) + '&state=' + state;
      if (provider === 'google') authUrl += '&prompt=consent';  // 强制显示授权页面
      if (provider === 'apple') authUrl += '&response_mode=form_post';  // Apple 使用 POST 回调
      // if (provider === 'x') authUrl += '&code_challenge=challenge&code_challenge_method=plain';  // 暂时禁用
      console.log('跳转到授权页面:', authUrl);
      window.location.href = authUrl;
    }
    function checkCallback() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token'), userId = params.get('user_id'), isNew = params.get('is_new'), error = params.get('error'), message = params.get('message');
      const resultDiv = document.getElementById('oauth-result');
      if (token && userId) {
        resultDiv.className = 'result show success';
        resultDiv.innerHTML = '<div class="result-title">✅ 登录成功！</div><div><strong>User ID:</strong> ' + userId + '</div><div><strong>是否新用户:</strong> ' + (isNew === 'true' ? '是' : '否') + '</div><div><strong>JWT Token:</strong></div><pre>' + token + '</pre>';
      } else if (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<div class="result-title">❌ 登录失败</div><div><strong>错误代码:</strong> ' + error + '</div>' + (message ? '<div><strong>错误信息:</strong> ' + decodeURIComponent(message) + '</div>' : '');
      }
    }
    checkCallback();
  </script>
</body>
</html>`;
  
  return c.html(html)
})

// Token 验证接口（第三方后端验证 token 用，需要认证 JWT）
// ⚠️ 必须放在 /auth/:provider 之前，否则会被通配路由匹配
app.post('/auth/verify', verifyAuthJWT, handleVerifyToken)
// 兼容旧路径
app.post('/verify-token', verifyAuthJWT, handleVerifyToken)

// 认证接口（App 端调用，使用 JWT 验证）
app.post('/auth/:provider', verifyAuthJWT, async (c) => {
  const provider = c.req.param('provider') as Provider
  const appId = c.get('appId') as string
  
  // 处理认证
  return handleAuth(c.req.raw, provider, c.env, appId)
})

// OAuth 回调（H5 用，无需签名）
// GET 方式：Google 等平台使用
app.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider') as Provider
  return handleCallback(c.req.raw, provider, c.env)
})

// POST 方式：Apple 使用 (response_mode=form_post)
app.post('/callback/:provider', async (c) => {
  const provider = c.req.param('provider') as Provider
  return handleCallback(c.req.raw, provider, c.env)
})

// 404 处理
app.notFound((c) => {
  return errorResponse('NOT_FOUND', '接口不存在', 404)
})

// 错误处理
app.onError((err, c) => {
  console.error('Worker 错误:', err)
  return errorResponse('INTERNAL_ERROR', err.message, 500)
})

export default app

