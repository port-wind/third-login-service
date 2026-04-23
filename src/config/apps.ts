/**
 * 接入应用配置
 * 支持多个第三方应用接入
 */

export interface AppConfig {
  app_id: string          // 应用唯一标识
  app_name: string        // 应用名称
  app_secret: string      // 用于生成和验证 JWT 的密钥
  status: 'active' | 'disabled'  // 状态
}

/**
 * 所有接入应用配置（写死配置）
 * 
 * 说明：
 * - app_secret: 用于生成和验证认证 JWT (5分钟过期)
 */
export const APP_CONFIGS: Record<string, AppConfig> = {
  // 测试应用（开发环境用）
  'test_app': {
    app_id: 'test_app',
    app_name: 'Test App',
    app_secret: 'test_secret_123456',
    status: 'active',
  },
  
  // 生产环境应用 - Bingo84
  'bingo84_app': {
    app_id: 'bingo84_app',
    app_name: 'Bingo84 App',
    app_secret: 'EJXWZ/30yN+rHcxawc0BxlKdzUsJTliMhITvEhA5W7U=',
    status: 'active',
  },
  
  // H5 OAuth 回调（默认 app_id，用于 H5 登录页面）
  'h5_callback': {
    app_id: 'h5_callback',
    app_name: 'H5 OAuth Callback',
    app_secret: 'h5_callback_secret_123456',
    status: 'active',
  },
}

/**
 * 根据 app_id 获取应用配置
 */
export function getAppConfig(appId: string): AppConfig | null {
  const config = APP_CONFIGS[appId]
  if (!config || config.status !== 'active') {
    return null
  }
  return config
}

