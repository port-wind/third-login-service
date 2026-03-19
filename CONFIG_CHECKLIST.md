# 🔧 生产环境配置清单

## 📋 需要配置的变量

### 1. 基础配置

| 变量 | 说明 | 状态 |
|------|------|------|
| `生产域名` | 例如：`https://auth.bingo84.com` | ❓ 需要提供 |
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

