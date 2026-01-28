-- 统一第三方登录服务 - 数据库初始化

-- 1. 应用配置表
CREATE TABLE IF NOT EXISTS apps (
  app_id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  app_secret TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_api_key ON apps(api_key);

-- 2. 用户表
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 3. 用户第三方账号绑定表
CREATE TABLE IF NOT EXISTS user_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_uid TEXT NOT NULL,
  app_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_providers_provider_uid ON user_providers(provider, provider_uid);
CREATE INDEX IF NOT EXISTS idx_user_providers_app_id ON user_providers(app_id);

-- 4. 登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  app_id TEXT,
  platform TEXT,
  device_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_app_id ON login_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_app_created ON login_logs(app_id, created_at DESC);

