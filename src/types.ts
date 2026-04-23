/**
 * 类型定义
 */

// 支持的第三方平台
export type Provider = 'google' | 'apple' | 'phone'

// Cloudflare 环境变量
export interface Env {
  // D1 数据库
  AUTH_DB: D1Database
  
  // KV 命名空间
  AUTH_KV: KVNamespace
  
  // JWT 配置
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  
  // Apple Sign In
  APPLE_CLIENT_ID: string
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_PRIVATE_KEY: string
  APPLE_REDIRECT_URI: string
  
  // LINE OAuth
  LINE_CLIENT_ID: string
  LINE_CLIENT_SECRET: string
  LINE_REDIRECT_URI: string
  
  // X (Twitter) OAuth
  X_CLIENT_ID: string
  X_CLIENT_SECRET: string
  X_REDIRECT_URI: string
  
  // Facebook OAuth
  FACEBOOK_CLIENT_ID: string
  FACEBOOK_CLIENT_SECRET: string
  FACEBOOK_REDIRECT_URI: string
  
  // Instagram OAuth
  INSTAGRAM_CLIENT_ID: string
  INSTAGRAM_CLIENT_SECRET: string
  INSTAGRAM_REDIRECT_URI: string
  
  // Firebase 配置（测试页面用）
  FIREBASE_API_KEY?: string
  FIREBASE_AUTH_DOMAIN?: string
  FIREBASE_PROJECT_ID?: string
}

// 认证请求
export interface AuthRequest {
  provider: Provider
  token: string           // SDK: id_token, OAuth: code
  redirect_uri?: string   // OAuth 必填
  device_id?: string
  app_id?: string
  platform?: 'ios' | 'android' | 'h5' | 'web'
  a0?: string            // 第三方自定义字段，会在验证时返回
}

// 认证响应
export interface AuthResponse {
  user_id: string
  jwt: string
  provider: Provider
  is_new: boolean
  profile: {
    nickname: string
    avatar: string
  }
}

// 用户信息
export interface User {
  user_id: string
  nickname: string
  avatar: string
  created_at: number
}

// 第三方账号绑定
export interface UserProvider {
  id: number
  user_id: string
  provider: Provider
  provider_uid: string
  created_at: number
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean
  code?: string
  message?: string
  data?: T
}

