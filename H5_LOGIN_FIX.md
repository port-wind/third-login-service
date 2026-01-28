# H5 登录修复说明

## 🐛 问题描述

H5 OAuth 回调时，生成的用户 JWT 使用硬编码的 `app_id: 'h5_callback'`，但该 `app_id` 不在应用配置列表中，导致后续验证可能失败。

## ✅ 修复内容

### 1. 添加 `h5_callback` 应用配置

在 `src/config/apps.ts` 中添加了 `h5_callback` 配置：

```typescript
'h5_callback': {
  app_id: 'h5_callback',
  app_name: 'H5 OAuth Callback',
  app_secret: 'h5_callback_secret_123456',
  status: 'active',
}
```

### 2. 支持动态 `app_id`

更新 `src/handlers/callback.ts`，支持从 `state` 参数中传递自定义 `app_id`：

```typescript
// state 参数现在支持 JSON 格式
const stateObj = {
  callback_url: window.location.href,
  app_id: 'test_app',  // 可选，默认 'h5_callback'
  a0: '自定义字段'      // 可选
};
```

## 📝 使用方式

### 方式 1：使用默认 `h5_callback`（简单）

适用于不需要区分不同 H5 应用的场景。

```javascript
// 登录时
const stateObj = {
  callback_url: window.location.href
};

// 验证时（后台）
const authJWT = await new SignJWT({ app_id: 'h5_callback' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('5m')
  .sign(new TextEncoder().encode('h5_callback_secret_123456'));
```

### 方式 2：使用自定义 `app_id`（灵活）

适用于需要区分不同 H5 应用的场景。

```javascript
// 登录时
const stateObj = {
  callback_url: window.location.href,
  app_id: 'test_app'  // 使用你的 app_id
};

// 验证时（后台）
const authJWT = await new SignJWT({ app_id: 'test_app' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('5m')
  .sign(new TextEncoder().encode('test_secret_123456'));
```

## 🧪 测试步骤

### 1. 测试默认 H5 登录

```bash
# 访问测试页面
open https://auth-login.pwtk-dev.work/test

# 点击 Google 登录，完成授权
# 成功后会获得一个 JWT token
```

### 2. 验证 Token（使用 h5_callback）

```javascript
import { SignJWT } from 'jose';

// 生成认证 JWT
const authJWT = await new SignJWT({ app_id: 'h5_callback' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('5m')
  .sign(new TextEncoder().encode('h5_callback_secret_123456'));

// 验证用户 JWT
const response = await fetch('https://auth-login.pwtk-dev.work/auth/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authJWT}`,
  },
  body: JSON.stringify({
    token: '<从H5登录获得的用户JWT>'
  })
});

const result = await response.json();
console.log('验证结果:', result);
```

### 3. 验证 Token（使用自定义 app_id）

```javascript
// H5 登录时传递 app_id
function loginWithGoogle() {
  const stateObj = {
    callback_url: window.location.href,
    app_id: 'test_app'  // 使用 test_app
  };
  
  const params = new URLSearchParams({
    client_id: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com',
    redirect_uri: 'https://auth-login.pwtk-dev.work/callback/google',
    response_type: 'code',
    scope: 'openid email profile',
    state: encodeURIComponent(JSON.stringify(stateObj)),
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// 验证时使用对应的 app_id 和 app_secret
const authJWT = await new SignJWT({ app_id: 'test_app' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('5m')
  .sign(new TextEncoder().encode('test_secret_123456'));
```

## ⚠️ 重要说明

### App ID 和 App Secret 对应关系

| App ID | App Secret | 用途 |
|--------|-----------|------|
| `h5_callback` | `h5_callback_secret_123456` | 默认 H5 OAuth 回调 |
| `test_app` | `test_secret_123456` | 测试应用 |
| `demo_h5_web` | `secret_h5_xxxxxxxxxxxxxxxxxxxxxxxx` | 示例 H5 应用 |

### 验证时的注意事项

1. **认证 JWT 的 `app_id` 必须与用户 JWT 的 `app_id` 一致**
2. **认证 JWT 使用对应 `app_id` 的 `app_secret` 签名**
3. **认证 JWT 有效期为 5 分钟**

### 错误示例

❌ **错误：app_id 不一致**

```javascript
// H5 登录时使用默认 app_id (h5_callback)
// 但验证时使用 test_app 的认证 JWT
const authJWT = await new SignJWT({ app_id: 'test_app' })...

// 结果：用户 JWT 的 app_id 是 'h5_callback'，但认证 JWT 的 app_id 是 'test_app'
// 虽然能通过验证（因为不检查一致性），但数据不一致
```

✅ **正确：app_id 一致**

```javascript
// 方案 A：都使用 h5_callback
// H5 登录：默认或明确指定 app_id: 'h5_callback'
// 验证时：使用 h5_callback 的认证 JWT

// 方案 B：都使用 test_app
// H5 登录：在 state 中指定 app_id: 'test_app'
// 验证时：使用 test_app 的认证 JWT
```

## 🎯 最佳实践

### 单个 H5 应用

如果只有一个 H5 应用，使用默认 `h5_callback` 即可：

```javascript
// 登录时不指定 app_id（自动使用 h5_callback）
const stateObj = {
  callback_url: window.location.href
};
```

### 多个 H5 应用

如果有多个 H5 应用需要区分，在配置中添加对应的 app_id：

```typescript
// src/config/apps.ts
'my_h5_app_1': {
  app_id: 'my_h5_app_1',
  app_name: 'My H5 App 1',
  app_secret: 'secret_xxx',
  status: 'active',
},
```

然后在登录时指定：

```javascript
const stateObj = {
  callback_url: window.location.href,
  app_id: 'my_h5_app_1'  // 使用自定义 app_id
};
```

## 📚 相关文档

- [H5 登录接口文档](./API_H5_LOGIN.md) - 已更新，包含 app_id 使用说明
- [后台验证接口文档](./API_VERIFY_TOKEN.md) - 验证 Token 的完整说明

