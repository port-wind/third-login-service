# 统一第三方登录服务

基于 Cloudflare Workers 的轻量级第三方登录认证服务，支持 Google、Apple Sign In 等多平台登录。

## ✨ 特性

- 🚀 **部署简单** - 基于 Cloudflare Workers，全球 CDN 加速
- 🔐 **安全可靠** - 统一 JWT 认证机制，5分钟过期的认证 JWT + 7天过期的用户 JWT
- 📱 **多端支持** - 支持 App SDK、H5/Web 网页集成（iframe 弹窗/页面跳转）
- 🌐 **多平台** - Google、Apple（可扩展 LINE、Facebook 等）
- 💾 **数据持久化** - 使用 Cloudflare D1 数据库和 KV 存储
- 🎯 **多应用管理** - 支持多个第三方应用接入，支持测试/生产多环境部署
- 🆕 **智能识别** - 验证接口自动识别 Firebase Token、Google Token、系统 JWT
- ⚡️ **即验即用** - Firebase Token 可直接验证并返回系统 JWT，无需先登录

## 🌐 服务地址

**测试环境：** https://auth-login.pwtk-dev.work  
**测试页面：** https://auth-login.pwtk-dev.work/test

**生产环境：** 待配置（见 [DEPLOYMENT.md](./DEPLOYMENT.md)）

## 📱 支持的登录平台

| 平台 | App SDK | H5/Web | 状态 |
|------|---------|--------|------|
| Google | ✅ | ✅ | 已测试 |
| Apple | ✅ | ✅ | 已测试 |
| LINE | ✅ | ✅ | 预留接口 |
| Facebook | ✅ | ✅ | 预留接口 |
| X (Twitter) | ✅ | ✅ | 预留接口 |

## 🔧 核心接口

### 1. App SDK 登录（JWT 认证）

```bash
# 先生成认证 JWT (包含 app_id, 5分钟过期)
AUTH_JWT="your_generated_auth_jwt"

curl -X POST https://auth-login.pwtk-dev.work/auth/google \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_JWT" \
  -d '{
    "token": "google_id_token",
    "platform": "ios",
    "device_id": "device_uuid"
  }'
```

### 2. Token 验证接口（智能识别多种 Token）🆕

**支持的 Token 类型：**
- ✅ 系统 JWT（我们签发的，7天有效）
- ✅ Firebase Token（Google/Apple 登录）
- ✅ Google ID Token（原生 OAuth）

```bash
# 生成认证 JWT (包含 app_id, 5分钟过期)
AUTH_JWT="your_generated_auth_jwt"

# 验证系统 JWT
curl -X POST https://auth-login.pwtk-dev.work/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_JWT" \
  -d '{"token": "user_jwt_token"}'

# 或直接验证 Firebase Token（自动返回系统 JWT）
curl -X POST https://auth-login.pwtk-dev.work/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_JWT" \
  -d '{"token": "firebase_token"}'
```

### 3. H5/Web OAuth 登录

**Google:**
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=xxx&
  redirect_uri=https://auth-login.pwtk-dev.work/callback/google&
  response_type=code&
  scope=openid email profile
```

**Apple:**
```
https://appleid.apple.com/auth/authorize?
  client_id=xxx&
  redirect_uri=https://auth-login.pwtk-dev.work/callback/apple&
  response_type=code&
  scope=name email&
  response_mode=form_post
```

## 📚 文档

- [App 登录接口](./API_APP_LOGIN.md) - App SDK 登录接口文档
- [H5 登录接口](./API_H5_LOGIN.md) - H5/Web 网页登录接口文档
- [后台验证接口](./API_VERIFY_TOKEN.md) - 后台 JWT 验证接口文档
- [部署指南](./DEPLOYMENT.md) - 多环境部署配置指南
- [集成指南](./INTEGRATION_GUIDE.md) - 不同场景的集成方式和代码示例

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

编辑 `wrangler.dev.toml`（测试环境）或 `wrangler.prod.toml`（生产环境），填入你的配置。

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 完整配置说明。

### 3. 创建数据库

```bash
# 创建 D1 数据库
pnpm wrangler d1 create third-login-service-db

# 运行迁移
pnpm wrangler d1 execute third-login-service-db --file=./migrations/0001_init.sql
```

### 4. 创建 KV 命名空间

```bash
pnpm wrangler kv:namespace create AUTH_KV
```

### 5. 本地开发

```bash
pnpm dev
```

访问 http://localhost:8787/test

### 6. 部署到 Cloudflare

```bash
# 部署测试环境
pnpm deploy:dev

# 部署生产环境（需先配置 wrangler.prod.toml）
pnpm deploy:prod
```

## 🧪 测试

运行测试脚本：

```bash
node test-sign.js
```

或访问测试页面：
```
https://auth-login.pwtk-dev.work/test
```

## 🔐 安全说明

### 认证 JWT（5分钟过期）
- ✅ App 和后端生成，用于调用服务接口
- ✅ 包含 `app_id` 和过期时间
- ✅ 使用 `app_secret` 签名
- ❌ 不要暴露 `app_secret` 给客户端

### 用户 JWT（7天过期）
- ✅ 服务生成，标识用户身份
- ✅ App/H5 传给后台，后台再验证
- ✅ 使用 HTTPS 传输
- ✅ 后端必须调用验证接口验证

### App Secret
- ✅ 只在服务端使用
- ✅ 使用环境变量存储
- ❌ 绝对不能暴露给客户端
- ❌ 不要提交到公开仓库

## 📦 项目结构

```
third-login-service/
├── src/
│   ├── config/         # 应用配置
│   ├── handlers/       # 请求处理器
│   ├── middleware/     # 中间件
│   ├── services/       # 第三方平台服务
│   ├── utils/          # 工具函数
│   ├── types.ts        # 类型定义
│   └── index.ts        # 主入口
├── migrations/              # 数据库迁移文件
├── API_APP_LOGIN.md         # App 登录接口文档
├── API_H5_LOGIN.md          # H5 登录接口文档
├── API_VERIFY_TOKEN.md      # 后台验证接口文档
├── DEPLOYMENT.md            # 部署指南
├── INTEGRATION_GUIDE.md     # 集成指南
├── test-sign.js             # 测试脚本
├── wrangler.toml            # 当前环境配置
├── wrangler.dev.toml        # 测试环境配置
└── wrangler.prod.toml       # 生产环境配置（模板）
```

## 🔑 获取 OAuth 凭证

### Google
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → APIs & Services → Credentials
3. 创建 OAuth 2.0 Client ID
4. 配置授权重定向 URI

### Apple
1. 访问 [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
2. 创建 App ID（启用 Sign In with Apple）
3. 创建 Services ID（配置 Web Authentication）
4. 创建 Key（启用 Sign In with Apple）
5. 配置域名验证文件

## 📊 架构设计

```
┌─────────────┐
│  原生 App   │
└──────┬──────┘
       │ API Key
       ↓
┌─────────────────────────────────────────────┐
│         Cloudflare Worker                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Google  │  │  Apple   │  │  LINE    │  │
│  │  OAuth   │  │  Sign In │  │  Login   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │   JWT 生成/验证   │  │   用户管理       │ │
│  └──────────────────┘  └─────────────────┘ │
└─────────────┬───────────────────────────────┘
              │
         ┌────┴────┐
         ↓         ↓
    ┌────────┐  ┌────┐
    │ D1 DB  │  │ KV │
    └────────┘  └────┘
         ↑
         │ JWT Auth
         │ (5min + 7day)
┌────────────────┐
│  后台服务      │
└────────────────┘
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**技术栈：** Cloudflare Workers · Hono · D1 Database · KV Storage · TypeScript
