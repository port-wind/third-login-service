/**
 * 测试登录服务 API 调用
 * 统一使用认证 JWT 方式：
 * 1. App SDK 模式（使用认证 JWT）
 * 2. 后台验证模式（使用认证 JWT）
 */

import crypto from 'crypto'
import { SignJWT } from 'jose'

// 应用配置（对应 src/config/apps.ts）
const APP_ID = 'test_app'
const API_KEY = 'test_api_key_123456'
const APP_SECRET = 'test_secret_123456'
const BASE_URL = 'https://auth-login.pwtk-dev.work'

/**
 * 生成认证 JWT（用于后台验证）
 * Payload: { app_id, exp }
 * 有效期: 5分钟
 * 密钥: app_secret
 */
async function generateAuthJWT(appId, appSecret) {
  const secret = new TextEncoder().encode(appSecret)
  
  const jwt = await new SignJWT({ app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')  // 5分钟有效
    .sign(secret)
  
  return jwt
}

/**
 * 测试 1: App SDK 登录接口（使用认证 JWT）
 */
async function testAppSDKLogin() {
  console.log('=== 测试 App SDK 登录接口 ===\n')
  
  // 1. 生成认证 JWT
  console.log('步骤 1: 生成认证 JWT')
  console.log('App ID:', APP_ID)
  console.log('App Secret:', APP_SECRET)
  console.log('有效期: 5分钟')
  
  const authJWT = await generateAuthJWT(APP_ID, APP_SECRET)
  console.log('认证 JWT:', authJWT)
  
  // 2. 请求体
  const body = {
    token: 'fake_google_id_token', // 假的 token 用于测试
    platform: 'ios',
    device_id: 'test_device_123'
  }
  
  console.log('\n步骤 2: 调用登录接口')
  console.log('请求 URL:', `${BASE_URL}/auth/google`)
  console.log('认证方式: Bearer Token')
  console.log('请求体:', JSON.stringify(body, null, 2))
  
  try {
    const response = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authJWT}`
      },
      body: JSON.stringify(body)
    })
    
    const result = await response.json()
    
    console.log('\n响应状态:', response.status)
    console.log('响应内容:', JSON.stringify(result, null, 2))
    
    if (result.code === 'INVALID_TOKEN') {
      console.log('\n✅ 认证 JWT 验证通过！（Token 无效是预期的，因为使用的是假 token）')
    } else if (result.success) {
      console.log('\n✅ 登录成功！')
      console.log('用户 JWT Token:', result.data.token)
      return result.data.token // 返回用户JWT供后续测试使用
    } else {
      console.log('\n❌ 错误:', result.message)
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
  }
  
  return null
}

/**
 * 测试 2: 后台验证 JWT 接口（使用认证 JWT）
 */
async function testBackendVerifyToken(userJWT) {
  console.log('\n\n=== 测试后台验证 JWT 接口 ===\n')
  
  // 如果没有用户JWT，使用假的
  const testUserJWT = userJWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.token'
  
  // 1. 生成认证 JWT (5分钟有效)
  console.log('步骤 1: 生成认证 JWT')
  console.log('App ID:', APP_ID)
  console.log('App Secret:', APP_SECRET)
  console.log('有效期: 5分钟')
  
  const authJWT = await generateAuthJWT(APP_ID, APP_SECRET)
  console.log('认证 JWT:', authJWT)
  
  // 2. 发送验证请求
  console.log('\n步骤 2: 发送验证请求')
  console.log('请求 URL:', `${BASE_URL}/auth/verify`)
  console.log('请求头: Authorization: Bearer <认证JWT>')
  console.log('请求体: { token: "<用户JWT>" }')
  
  try {
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authJWT}`  // 认证JWT放这里
      },
      body: JSON.stringify({ token: testUserJWT })  // 用户JWT放这里
    })
    
    const result = await response.json()
    
    console.log('\n响应状态:', response.status)
    console.log('响应内容:', JSON.stringify(result, null, 2))
    
    if (result.code === 'INVALID_TOKEN' || result.code === 'TOKEN_EXPIRED') {
      console.log('\n✅ 认证 JWT 验证通过！（用户 Token 无效是预期的）')
    } else if (result.success) {
      console.log('\n✅ 验证成功！')
      console.log('用户信息:', result.data)
    } else {
      console.log('\n❌ 错误:', result.message)
    }
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
  }
}

/**
 * 测试 3: 完整流程（需要真实的 Google ID Token）
 * 
 * 要运行此测试，需要：
 * 1. 从 Google Sign In SDK 获取真实的 ID Token
 * 2. 将 ID Token 替换下面的 YOUR_REAL_GOOGLE_ID_TOKEN
 * 3. 取消注释下面的代码
 */
async function testRealFlow() {
  console.log('\n\n=== 完整流程测试（真实 Token）===\n')
  
  // 步骤 1: App 端使用 API Key 登录
  const realGoogleToken = 'YOUR_REAL_GOOGLE_ID_TOKEN' // 替换为真实的 Google ID Token
  
  console.log('步骤 1: App 端调用登录接口')
  const loginResponse = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      token: realGoogleToken,
      platform: 'ios',
      device_id: 'device_12345'
    })
  })
  
  const loginResult = await loginResponse.json()
  
  if (!loginResult.success) {
    console.log('❌ 登录失败:', loginResult.message)
    return
  }
  
  console.log('✅ 登录成功！')
  console.log('用户 JWT Token:', loginResult.data.token)
  console.log('User ID:', loginResult.data.user_id)
  
  // 步骤 2: 后台服务验证 JWT
  console.log('\n步骤 2: 后台服务验证用户 JWT')
  
  const userJWT = loginResult.data.token
  const authJWT = await generateAuthJWT(APP_ID, APP_SECRET)
  
  const verifyResponse = await fetch(`${BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authJWT}`
    },
    body: JSON.stringify({ token: userJWT })
  })
  
  const verifyResult = await verifyResponse.json()
  
  if (verifyResult.success) {
    console.log('✅ JWT 验证成功！')
    console.log('完整用户信息:', verifyResult.data)
  } else {
    console.log('❌ JWT 验证失败:', verifyResult.message)
  }
}

// 运行测试
console.log('========================================')
console.log('统一第三方登录服务 - API 测试脚本')
console.log('========================================\n')
console.log('说明：')
console.log('- 用户 JWT: 我们生成，7天有效，标识用户身份')
console.log('- 认证 JWT: 你的后台生成，5分钟有效，验证后台身份')
console.log('========================================\n')

// 运行基本测试
const userJWT = await testAppSDKLogin()
await testBackendVerifyToken(userJWT)

// 要测试真实流程，请取消下面的注释并提供真实的 Google ID Token
// await testRealFlow()

console.log('\n========================================')
console.log('测试完成！')
console.log('========================================')
