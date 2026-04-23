# 🔧 生产环境配置清单

## 📋 提供给第三方接入方的信息

**当第三方（如 bingo84_app）接入登录服务时，需要提供以下信息：**

### 基础配置

| 参数 | 值 | 说明 |
|------|---|------|
| `服务地址` | `https://auth-login.bingo84.com` | 第三方登录服务域名 |
| `app_id` | `bingo84_app` | 应用唯一标识 |
| `app_secret` | `EJXWZ/30yN+rHcxawc0BxlKdzUsJTliMhITvEhA5W7U=` | 应用密钥（用于签名验证） |
| `签名算法` | `HMAC-SHA256` | 请求签名算法 |

### 核心 API 接口

| 接口 | 地址 | 说明 |
|------|------|------|
| **App 登录** | `POST https://auth-login.bingo84.com/auth/google`<br>`POST https://auth-login.bingo84.com/auth/apple` | 用户通过 Google/Apple 登录，返回 JWT |
| **Token 验证** | `POST https://auth-login.bingo84.com/auth/verify` | 后台验证 JWT token，获取用户信息 |
| **Phone 登录** | `POST https://auth-login.bingo84.com/auth/phone` | Firebase 手机验证码登录（需客户端与 Worker 使用同一 Firebase 项目） |
| **H5 登录** | `GET https://auth-login.bingo84.com/h5/auth/google?state=xxx`<br>`GET https://auth-login.bingo84.com/h5/auth/apple?state=xxx` | 网页端登录跳转 |

### 接口调用说明

**1. 客户端（App/H5）调用登录接口**
- 用户授权后，获得第三方 token（Google ID Token / Apple Authorization Code）
- 调用登录接口，传入 `app_id`、`platform`、`device_id`、`token`、`timestamp`、`sign`
- 返回系统 JWT token

**2. 后台服务调用验证接口**
- 接收客户端传来的 JWT token
- 调用 `/auth/verify` 接口验证 token 有效性
- 需要签名验证：`app_id`、`token`、`timestamp`、`sign`
- 返回用户完整信息（user_id、nickname、avatar、email、a0 等）

**API 文档：**
- App SDK 登录：`API_APP_LOGIN.md`
- Phone（Firebase 短信）：`API_PHONE_LOGIN.md`
- H5 网页登录：`API_H5_LOGIN.md`
- Token 验证：`API_VERIFY_TOKEN.md`

**重要提示：**
- `app_secret` 必须严格保密，仅在服务端使用
- 所有 API 请求需要使用 `app_id` + `app_secret` 进行签名验证
- 客户端获取 JWT 后，传给后台，由后台调用验证接口

---

## 📋 需要配置的变量

### 1. 基础配置

| 变量 | 说明 | 状态 |
|------|------|------|
| `生产域名` | 例如：`https://auth-login.bingo84.com` | ❓ 需要提供 |
| `D1_DATABASE_ID` | 生产环境数据库 ID | ❓ 需要提供 |
| `KV_NAMESPACE_ID` | 生产环境 KV 存储 ID | ❓ 需要提供 |
| `JWT_SECRET` | JWT 签名密钥（强随机密码） | ❓ 需要提供 |

### 2. 应用接入配置

| 变量 | 值 | 文件位置 |
|------|---|---------|
| `app_id` | `bingo84_app` | ✅ `src/config/apps.ts` |
| `app_secret` | `EJXWZ/30yN+rHcxawc0BxlKdzUsJTliMhITvEhA5W7U=` | ✅ `src/config/apps.ts` |

### 3. Google OAuth 配置

| 变量 | 值/说明 | 状态 |
|------|---------|------|
| `GOOGLE_CLIENT_ID` | `733309423518-7b05kp4sbghcl008u2k34shhtrdh5j7e.apps.googleusercontent.com` | ❓ 需确认 |
| `GOOGLE_CLIENT_SECRET` | Google 应用密钥 | ❓ 需要提供 |
| `GOOGLE_REDIRECT_URI` | `https://生产域名/callback/google` | ❓ 需要填写 |

**Google Console 需要配置：**
- 在 [Google Cloud Console](https://console.cloud.google.com/) 添加生产域名回调地址

### 4. Apple Sign In 配置

| 变量 | 说明 | 状态 |
|------|------|------|
| `APPLE_CLIENT_ID` | Apple Service ID | ❓ 需要提供 |
| `APPLE_TEAM_ID` | Apple Team ID | ❓ 需要提供 |
| `APPLE_KEY_ID` | Apple Key ID（例如：`2JCB9MRNQ5`） | ❓ 需要提供 |
| `APPLE_PRIVATE_KEY` | Apple 私钥内容（`.p8` 文件内容） | ❓ 需要提供 |
| `APPLE_REDIRECT_URI` | `https://生产域名/callback/apple` | ❓ 需要填写 |

**说明：**
- Apple 私钥通常是 `.p8` 文件（如 `AuthKey_XXXXXX.p8`）
- 需要将文件内容（包括 BEGIN/END 行）复制到配置中
- 开发环境已配置示例：`AuthKey_2JCB9MRNQ5.p8`

**Apple Developer 需要配置：**
- 在 [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) 添加生产域名回调地址

### 5. Firebase 手机登录（若启用 Phone）

| 变量 | 说明 | 状态 |
|------|------|------|
| `FIREBASE_PROJECT_ID` | Firebase **项目 ID**，与 App/H5 使用的 `projectId` 必须一致；服务端校验 Phone ID Token 的 `aud`/`iss` 时**必填** | ❓ 启用 Phone 时必填 |
| `FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN` | 仅本服务内置测试页用；不接测试页可不配 | 🟡 可选 |

**说明：** 未配置 `FIREBASE_PROJECT_ID` 时，手机登录相关 Token 校验会被拒绝。详见 [API_PHONE_LOGIN.md](./API_PHONE_LOGIN.md)。

---

## ✅ 配置总结

### 配置文件

1. **`wrangler.prod.toml`** - 填写上述所有变量
2. **`src/config/apps.ts`** - ✅ 已添加 `bingo84_app` 配置

### 外部平台配置

1. **Google Cloud Console** - 添加回调地址：`https://生产域名/callback/google`
2. **Apple Developer** - 添加回调地址：`https://生产域名/callback/apple`

### 部署步骤

```bash
# 1. 修改 wrangler.prod.toml 配置
# 2. 在 Google/Apple 平台添加回调地址
# 3. 部署到生产
npm run deploy:prod
```

---

## 🔐 待收集信息模板

```bash
# 复制此模板，填写后提供给开发人员

# 基础配置
生产域名: https://___________________________
D1_DATABASE_ID: ___________________________
KV_NAMESPACE_ID: ___________________________
JWT_SECRET: ___________________________

# Google OAuth
GOOGLE_CLIENT_ID: 733309423518-7b05kp4sbghcl008u2k34shhtrdh5j7e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: ___________________________

# Apple Sign In
APPLE_CLIENT_ID: ___________________________
APPLE_TEAM_ID: ___________________________
APPLE_KEY_ID: ___________________________
APPLE_PRIVATE_KEY: |
  -----BEGIN PRIVATE KEY-----
  ___________________________
  -----END PRIVATE KEY-----
```

---

## ⚠️ 注意事项

- 所有密钥信息**严格保密**，不要提交到 Git
- 生产环境配置完成后，将 `wrangler.prod.toml` 添加到 `.gitignore`
- 建议使用环境变量或密钥管理器存储敏感信息

