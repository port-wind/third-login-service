# Token 验证接口

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **接口地址** | `POST https://auth-login.pwtk-dev.work/auth/verify` |
| **认证方式** | JWT Token（请求头 Authorization） |
| **适用场景** | 验证用户 Token（支持系统 JWT 和第三方 Token） |
| **支持的 Token** | ✅ 系统 JWT (我们签发的)<br>✅ Firebase Token<br>✅ Google ID Token |

---

## 🎯 两种使用方式

### 方式 1：验证第三方 Token（Firebase/Google）⚡️ 简单

**适用场景：** 前端用 Firebase/Google 登录后，直接验证 Token

```bash
curl -X POST https://auth-login.pwtk-dev.work/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <认证JWT>" \
  -d '{
    "token": "<Firebase或Google Token>",
    "a0": "自定义字段（可选）"
  }'
```

**返回：**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user_id": "u_xxx",
    "jwt": "eyJhbGciOiJIUzI1NiJ9...",  // ← 我们系统的 JWT (7天有效)
    "nickname": "Yang Liu",
    "avatar": "https://...",
    "provider": "google",
    "provider_uid": "112592060368547074681",
    "app_id": "test_app",
    "email": "xxx@gmail.com",
    "is_new": false,
    "a0": "自定义字段（如果请求时传了）",
    "token_type": "third_party"  // 标识这是第三方 token
  }
}
```

**优点：** 
- ✅ 一步到位，无需先调用 `/auth/google` 登录
- ✅ 自动返回我们系统的 JWT，可用于后续请求
- ✅ 支持传入 `a0` 自定义字段，会被编码到生成的 JWT 中

### 方式 2：验证系统 JWT

**适用场景：** 验证我们系统签发的 JWT Token

```bash
curl -X POST https://auth-login.pwtk-dev.work/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <认证JWT>" \
  -d '{
    "token": "<系统JWT>"
  }'
```

**返回：**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user_id": "u_xxx",
    "nickname": "Yang Liu",
    "avatar": "https://...",
    "provider": "google",
    "provider_uid": "112592060368547074681",
    "app_id": "test_app",
    "platform": "ios",
    "device_id": "xxx",
    "issued_at": 1767326157,
    "expires_at": 1767930957,
    "expires_in": 604800,
    "token_type": "system_jwt"  // 标识这是系统 JWT
  }
}
```

---

## 🔄 完整流程

### 流程 A：使用第三方 Token（推荐）⚡️

```
前端：Firebase/Google 登录
   ↓ 获得 Firebase/Google Token
前端：传 Token 给后台
   ↓
后台：生成认证 JWT
   ↓
后台：调用 /auth/verify
   ↓ 传入 Firebase/Google Token
【本接口】验证服务
   ↓ 验证 Token + 自动创建用户
   ↓ 返回用户信息 + 系统 JWT
后台：保存系统 JWT + 创建会话
   ↓
登录完成 ✅
```

### 流程 B：使用系统 JWT（二次验证）

```
前端：已有系统 JWT (7天有效)
   ↓ 传递给后台
后台：生成认证 JWT
   ↓
后台：调用 /auth/verify
   ↓ 传入系统 JWT
【本接口】验证服务
   ↓ 验证系统 JWT
   ↓ 返回用户详细信息
后台：验证通过
   ↓
请求成功 ✅
```

**关键概念：**

1. **用户 Token**（第三方或系统 JWT）→ 在请求体中
2. **认证 JWT**（你的后台生成，5分钟）→ 在请求头中

---

## 🚀 快速集成

### 场景 1：验证第三方 Token（Firebase/Google）⚡️ 最简单

仅需 2 步即可完成验证 + 登录：

**步骤 1：** 生成认证 JWT（见下方代码示例）  
**步骤 2：** 直接传 Firebase/Google Token 调用接口

✅ **优点：** 一次调用搞定验证 + 登录，自动返回系统 JWT

---

### 场景 2：验证系统 JWT（二次验证）

用于验证我们系统签发的 JWT Token。

---

## 📖 详细步骤

### 步骤 1: 生成认证 JWT

**认证 JWT payload：**
```json
{
  "app_id": "test_app",
  "exp": 当前时间戳 + 300  // 5分钟后
}
```

**签名密钥：** `app_secret`（联系我们获取）

---

**Node.js 示例：**
```javascript
import { SignJWT } from 'jose';

async function generateAuthJWT(appId, appSecret) {
  const secret = new TextEncoder().encode(appSecret);
  
  const jwt = await new SignJWT({ app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')  // 5分钟有效
    .sign(secret);
  
  return jwt;
}

// 使用
const appId = 'test_app';
const appSecret = 'test_secret_123456';
const authJWT = await generateAuthJWT(appId, appSecret);
```

**Python 示例：**
```python
import jwt
import time

def generate_auth_jwt(app_id, app_secret):
    payload = {
        'app_id': app_id,
        'exp': int(time.time()) + 300  # 5分钟后过期
    }
    
    token = jwt.encode(payload, app_secret, algorithm='HS256')
    return token

# 使用
app_id = 'test_app'
app_secret = 'test_secret_123456'
auth_jwt = generate_auth_jwt(app_id, app_secret)
```

**Java 示例：**
```java
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.util.Date;

public static String generateAuthJWT(String appId, String appSecret) {
    long expirationTime = System.currentTimeMillis() + 5 * 60 * 1000; // 5分钟
    
    return Jwts.builder()
        .claim("app_id", appId)
        .setExpiration(new Date(expirationTime))
        .signWith(SignatureAlgorithm.HS256, appSecret)
        .compact();
}

// 使用
String appId = "test_app";
String appSecret = "test_secret_123456";
String authJWT = generateAuthJWT(appId, appSecret);
```

**PHP 示例：**
```php
use Firebase\JWT\JWT;

function generateAuthJWT($appId, $appSecret) {
    $payload = [
        'app_id' => $appId,
        'exp' => time() + 300  // 5分钟后过期
    ];
    
    return JWT::encode($payload, $appSecret, 'HS256');
}

// 使用
$appId = 'test_app';
$appSecret = 'test_secret_123456';
$authJWT = generateAuthJWT($appId, $appSecret);
```

---

### 步骤 2: 发送验证请求

**请求示例：**

```bash
curl -X POST https://auth-login.pwtk-dev.work/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <认证JWT>" \
  -d '{
    "token": "<用户JWT>"
  }'
```

---

### 完整示例 1：验证第三方 Token（Firebase/Google）

**Node.js 示例：**
```javascript
import { SignJWT } from 'jose';

// 验证 Firebase/Google Token
async function verifyThirdPartyToken(firebaseToken) {
  const appId = 'test_app';
  const appSecret = 'test_secret_123456';
  
  // 1. 生成认证 JWT (5分钟有效)
  const secret = new TextEncoder().encode(appSecret);
  const authJWT = await new SignJWT({ app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(secret);
  
  // 2. 发送验证请求（直接传 Firebase Token，可选传入 a0）
  const response = await fetch('https://auth-login.pwtk-dev.work/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authJWT}`,
    },
    body: JSON.stringify({ 
      token: firebaseToken,  // Firebase Token
      a0: 'channel_123'      // 可选：自定义字段
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ 验证成功！');
    console.log('用户ID:', result.data.user_id);
    console.log('系统JWT:', result.data.jwt);  // ← 保存这个，用于后续请求
    console.log('是否新用户:', result.data.is_new);
    console.log('自定义字段a0:', result.data.a0);  // 如果传了会返回
    return result.data;
  } else {
    console.error('❌ 验证失败:', result.message);
    return null;
  }
}
```

---

### 完整示例 2：验证系统 JWT

**Node.js 完整示例：**
```javascript
import { SignJWT } from 'jose';

async function verifyUserJWT(userJWT) {
  const appId = 'test_app';
  const appSecret = 'test_secret_123456';
  
  // 1. 生成认证 JWT (5分钟有效)
  const secret = new TextEncoder().encode(appSecret);
  const authJWT = await new SignJWT({ app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(secret);
  
  // 2. 发送验证请求
  const response = await fetch('https://auth-login.pwtk-dev.work/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authJWT}`,  // 认证JWT放这里
    },
    body: JSON.stringify({ token: userJWT })  // 用户JWT放这里
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('验证成功，用户信息:', result.data);
    // result.data 包含：
    // - user_id: 用户唯一ID
    // - nickname: 用户昵称
    // - avatar: 用户头像
    // - provider: 登录平台
    // - provider_uid: 第三方平台用户ID
    return result.data;
  } else {
    console.error('验证失败:', result.message);
    return null;
  }
}
```

**Python 示例：**
```python
import jwt
import time
import requests
import json

def verify_third_party_token(firebase_token):
    """验证 Firebase/Google Token"""
    app_id = 'test_app'
    app_secret = 'test_secret_123456'
    
    # 1. 生成认证 JWT (5分钟有效)
    auth_payload = {
        'app_id': app_id,
        'exp': int(time.time()) + 300
    }
    auth_jwt = jwt.encode(auth_payload, app_secret, algorithm='HS256')
    
    # 2. 发送验证请求（直接传 Firebase Token，可选传入 a0）
    response = requests.post(
        'https://auth-login.pwtk-dev.work/auth/verify',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_jwt}',
        },
        data=json.dumps({
            'token': firebase_token,  # Firebase Token
            'a0': 'channel_123'       # 可选：自定义字段
        })
    )
    
    result = response.json()
    if result.get('success'):
        print('✅ 验证成功！')
        print(f"用户ID: {result['data']['user_id']}")
        print(f"系统JWT: {result['data']['jwt']}")  # ← 保存这个
        print(f"是否新用户: {result['data']['is_new']}")
        print(f"自定义字段a0: {result['data'].get('a0')}")  # 如果传了会返回
        return result['data']
    else:
        print(f"❌ 验证失败: {result.get('message')}")
        return None
```

---

**Python 完整示例（系统 JWT）：**
```python
import jwt
import time
import requests
import json

def verify_user_jwt(user_jwt):
    app_id = 'test_app'
    app_secret = 'test_secret_123456'
    
    # 1. 生成认证 JWT (5分钟有效)
    auth_payload = {
        'app_id': app_id,
        'exp': int(time.time()) + 300
    }
    auth_jwt = jwt.encode(auth_payload, app_secret, algorithm='HS256')
    
    # 2. 发送验证请求
    response = requests.post(
        'https://auth-login.pwtk-dev.work/auth/verify',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_jwt}',  # 认证JWT放这里
        },
        data=json.dumps({'token': user_jwt})  # 用户JWT放这里
    )
    
    result = response.json()
    if result.get('success'):
        print('验证成功，用户信息:', result['data'])
        return result['data']
    else:
        print('验证失败:', result.get('message'))
        return None
```

---

**Java 完整示例：**
```java
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.net.http.*;
import java.util.Date;

public class TokenVerifier {
    private static final String APP_ID = "test_app";
    private static final String APP_SECRET = "test_secret_123456";
    private static final String VERIFY_URL = "https://auth-login.pwtk-dev.work/auth/verify";
    
    public static JSONObject verifyUserJWT(String userJWT) throws Exception {
        // 1. 生成认证 JWT (5分钟有效)
        long expirationTime = System.currentTimeMillis() + 5 * 60 * 1000;
        String authJWT = Jwts.builder()
            .claim("app_id", APP_ID)
            .setExpiration(new Date(expirationTime))
            .signWith(SignatureAlgorithm.HS256, APP_SECRET)
            .compact();
        
        // 2. 发送验证请求
        HttpClient client = HttpClient.newHttpClient();
        String body = "{\"token\":\"" + userJWT + "\"}";
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(VERIFY_URL))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + authJWT)  // 认证JWT
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return new JSONObject(response.body());
    }
}
```

---

## 📝 请求参数

### 请求头

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `Authorization` | ✅ | 认证 JWT（`Bearer <token>`） | `Bearer eyJhbGci...` |
| `Content-Type` | ✅ | 固定值 | `application/json` |

### 请求体

| 字段 | 必填 | 说明 | 支持的类型 |
|------|------|------|-----------|
| `token` | ✅ | Token 字符串 | • 系统 JWT（我们签发的）<br>• Firebase Token<br>• Google ID Token |
| `a0` | ❌ | 自定义字段（仅在验证第三方Token时有效） | 任意字符串 |

**说明：** 
- 接口会自动识别 Token 类型并进行相应验证
- 当验证第三方 Token 时，可以传入 `a0` 参数，该参数会被编码到生成的系统 JWT 中

---

## ✅ 成功响应

### 响应 A：验证第三方 Token

```json
{
  "success": true,
  "code": "OK",
  "message": "成功",
  "data": {
    "valid": true,
    "user_id": "u_1767327334552_xyak1lza9",
    "jwt": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidV8xNzY3MzI3MzM0NTUyX3h5YWsxbHphOSIsImFwcF9pZCI6InRlc3RfYXBwIiwicHJvdmlkZXIiOiJnb29nbGUiLCJpYXQiOjE3NjczMjczMzQsImV4cCI6MTc2NzkzMjEzNH0.xxx",
    "nickname": "Yang Liu",
    "avatar": "https://lh3.googleusercontent.com/a/ACg8ocJnQd9H-hcEttiCUTlzvVdNTdQp9QPNJHaqqRsLXx-Kx4fXWQ=s96-c",
    "provider": "google",
    "provider_uid": "QNWPigUslTh7n5n4X1QCNUq9yIg1",
    "app_id": "test_app",
    "email": "yang8800346@gmail.com",
    "is_new": false,
    "a0": "自定义字段（如果请求时传了）",
    "token_type": "third_party"
  }
}
```

### 响应 B：验证系统 JWT

```json
{
  "success": true,
  "code": "OK",
  "message": "成功",
  "data": {
    "valid": true,
    "user_id": "u_1734567890_abc123",
    "nickname": "张三",
    "avatar": "https://lh3.googleusercontent.com/a/...",
    "provider": "google",
    "provider_uid": "110081807839981209348",
    "app_id": "test_app",
    "platform": "ios",
    "device_id": "550e8400-e29b-41d4-a716-446655440000",
    "a0": "自定义字段（如果登录时传了）",
    "issued_at": 1734567890,
    "expires_at": 1735172690,
    "expires_in": 604800,
    "token_type": "system_jwt"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 | 备注 |
|------|------|------|------|
| `valid` | boolean | Token 是否有效 | - |
| `user_id` | string | **用户唯一 ID** | - |
| `jwt` | string | **我们系统的 JWT** | 仅第三方 Token 验证时返回 |
| `nickname` | string | **用户昵称** | - |
| `avatar` | string | **用户头像 URL** | - |
| `provider` | string | 登录平台 | google/apple |
| `provider_uid` | string | **第三方平台的用户 ID** | - |
| `app_id` | string | 应用 ID | - |
| `email` | string | 用户邮箱 | 仅第三方 Token 验证时返回 |
| `is_new` | boolean | 是否新用户 | 仅第三方 Token 验证时返回 |
| `token_type` | string | Token 类型 | `third_party` 或 `system_jwt` |
| `platform` | string | 客户端平台 | 仅系统 JWT 验证时返回 |
| `device_id` | string | 设备 ID | 仅系统 JWT 验证时返回 |
| `issued_at` | number | Token 签发时间（秒） | 仅系统 JWT 验证时返回 |
| `expires_at` | number | Token 过期时间（秒） | 仅系统 JWT 验证时返回 |
| `expires_in` | number | 剩余有效期（秒） | 仅系统 JWT 验证时返回 |

---

## ❌ 错误响应

### 401 - 缺少认证 Token
```json
{
  "success": false,
  "code": "MISSING_AUTH_TOKEN",
  "message": "缺少认证 Token"
}
```
**解决：** 检查请求头是否包含 `Authorization: Bearer <JWT>`

### 401 - 认证 Token 无效
```json
{
  "success": false,
  "code": "INVALID_AUTH_TOKEN",
  "message": "认证 Token 验证失败"
}
```
**解决：** 检查 JWT 签名密钥（app_secret）是否正确

### 401 - 认证 Token 已过期
```json
{
  "success": false,
  "code": "AUTH_TOKEN_EXPIRED",
  "message": "认证 Token 已过期"
}
```
**解决：** 重新生成认证 JWT（有效期5分钟）

### 404 - 应用不存在
```json
{
  "success": false,
  "code": "APP_NOT_FOUND",
  "message": "应用不存在或已停用"
}
```
**解决：** 检查 app_id 是否正确

### 400 - 缺少用户 Token
```json
{
  "success": false,
  "code": "MISSING_TOKEN",
  "message": "缺少 token 参数"
}
```
**解决：** 检查请求体是否包含 `token` 字段

### 401 - 用户 Token 无效
```json
{
  "success": false,
  "code": "INVALID_TOKEN",
  "message": "Token 无效或已过期"
}
```
**解决：** 用户 JWT 无效或过期，需要用户重新登录

---

## ⚠️ 重要说明

### Token 类型支持 🆕

本接口**智能识别**三种 Token 类型：

| Token 类型 | 签发方 | 用途 | 识别方式 |
|-----------|--------|------|---------|
| **Firebase Token** | Firebase | Google/Apple 登录 | `iss: https://securetoken.google.com/` |
| **Google ID Token** | Google OAuth | Google 登录 | `iss: https://accounts.google.com` |
| **系统 JWT** | 我们的登录服务 | 二次验证 | 其他格式（HS256） |

**特点：**
- ✅ **自动识别**：无需指定 Token 类型
- ✅ **即验即用**：第三方 Token 可直接验证，无需先登录
- ✅ **自动创建**：第三方 Token 验证成功后自动创建用户（如果是新用户）
- ✅ **返回系统 JWT**：验证第三方 Token 时自动生成并返回系统 JWT

**💡 使用建议：**

| 场景 | 推荐做法 | 原因 |
|------|----------|------|
| 用户首次登录 | 直接验证 Firebase/Google Token | 一步完成验证 + 登录 |
| 用户后续请求 | 使用返回的系统 JWT | 系统 JWT 有效期 7 天 |
| Token 快过期时 | 重新验证 Firebase/Google Token | 刷新系统 JWT |

### 两个 JWT 的区别

| JWT 类型 | 谁生成 | 有效期 | 密钥 | 用途 | 位置 |
|---------|--------|--------|------|------|------|
| **用户 Token** | 第三方 或 我们 | 视情况而定 | 各自密钥 | 标识用户身份 | 请求体 `token` 字段 |
| **认证 JWT** | 你的后台服务 | 5分钟 | `app_secret` | 验证后台身份 | 请求头 `Authorization` |

### App Secret 安全

**✅ 必须做：**
- App Secret **只能在后端使用**
- 使用环境变量存储
- **绝对不能**暴露给 App 或前端

**❌ 绝对禁止：**
- 把 App Secret 写在 App/前端代码中
- 把 App Secret 提交到代码仓库
- 通过网络传输 App Secret 明文

### 认证 JWT 有效期

- ✅ 建议 5 分钟有效期
- ✅ 每次调用验证接口都生成新的认证 JWT
- ✅ 不要重复使用同一个认证 JWT

---

## 🧪 测试

**测试配置：**
- App ID: `test_app`
- App Secret: `test_secret_123456`

**测试脚本：** `node test-sign.js`

---

## 📞 获取配置

联系服务提供方申请：
- App ID
- App Secret（**保密！只能在后端使用**）

**相关文档：**
- [App 登录接口](./API_APP_LOGIN.md)
- [H5 登录接口](./API_H5_LOGIN.md)
