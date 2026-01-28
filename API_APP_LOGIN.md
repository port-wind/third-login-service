# App SDK 登录接口

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **接口地址** | `POST https://auth-login.pwtk-dev.work/auth/{provider}` |
| **认证方式** | 请求头添加 `Authorization: Bearer {JWT}` |
| **适用场景** | iOS/Android App 集成 |

**支持的平台：** `google` | `apple`

---

## 🔄 完整登录流程

```
┌─────────────────────────────────────────────────────────────┐
│                     App 端登录流程                           │
└─────────────────────────────────────────────────────────────┘

1. App 生成认证 JWT (包含 app_id, 5分钟过期)
   ↓
2. App 调用第三方 SDK (Google/Apple)
   ↓
3. 获取第三方 ID Token
   ↓
4. App 调用本接口 (带认证 JWT)
   POST /auth/google
   Header: Authorization: Bearer {认证JWT}
   ↓
5. 我们的服务验证 ID Token
   ↓
6. 返回用户 JWT Token (7天过期) 给 App
   ↓
7. App 把用户 JWT Token 传给你的后台
   ↓
8. 你的后台生成新的认证 JWT
   ↓
9. 你的后台调用验证接口 (带认证 JWT)
   POST /auth/verify
   ↓
10. 返回完整用户信息
   ↓
11. 你的后台创建会话，完成登录 ✅
```

---

## 🚀 快速集成（4 步）

### 步骤 1: 生成认证 JWT

**iOS (Swift):**
```swift
import CryptoKit

func generateAuthJWT(appId: String, appSecret: String) -> String? {
    let header = ["alg": "HS256", "typ": "JWT"]
    let payload = [
        "app_id": appId,
        "iat": Int(Date().timeIntervalSince1970),
        "exp": Int(Date().timeIntervalSince1970) + 300  // 5分钟过期
    ]
    
    guard let headerData = try? JSONSerialization.data(withJSONObject: header),
          let payloadData = try? JSONSerialization.data(withJSONObject: payload) else {
        return nil
    }
    
    let headerB64 = headerData.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    let payloadB64 = payloadData.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    let signInput = "\(headerB64).\(payloadB64)"
    let key = SymmetricKey(data: appSecret.data(using: .utf8)!)
    let signature = HMAC<SHA256>.authenticationCode(for: signInput.data(using: .utf8)!, using: key)
    let signatureB64 = Data(signature).base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    return "\(signInput).\(signatureB64)"
}
```

**Android (Kotlin):**
```kotlin
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import java.util.Date

fun generateAuthJWT(appId: String, appSecret: String): String {
    return Jwts.builder()
        .claim("app_id", appId)
        .setIssuedAt(Date())
        .setExpiration(Date(System.currentTimeMillis() + 5 * 60 * 1000)) // 5分钟
        .signWith(SignatureAlgorithm.HS256, appSecret.toByteArray())
        .compact()
}
```

---

### 步骤 2: 获取第三方 ID Token

**iOS (Google):**
```swift
// 使用 Google Sign In SDK
GIDSignIn.sharedInstance.signIn(withPresenting: self) { result, error in
    let idToken = result?.user.idToken?.tokenString
    // 拿到 idToken 后调用步骤 2
}
```

**iOS (Apple):**
```swift
// 使用 Sign In with Apple
let request = ASAuthorizationAppleIDProvider().createRequest()
// 在 delegate 中获取
func authorizationController(...) {
    let identityToken = appleIDCredential.identityToken
    let tokenString = String(data: identityToken, encoding: .utf8)
    // 拿到 tokenString 后调用步骤 2
}
```

**Android (Google):**
```kotlin
// 使用 Google Sign In SDK
val account = GoogleSignIn.getLastSignedInAccount(this)
val idToken = account?.idToken
// 拿到 idToken 后调用步骤 2
```

---

### 步骤 3: 调用登录接口

**请求示例：**

```bash
# 先生成认证 JWT
AUTH_JWT=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { app_id: 'test_app' },
  'test_secret_123456',
  { expiresIn: '5m' }
));
")

# 调用登录接口
curl -X POST https://auth-login.pwtk-dev.work/auth/google \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_JWT" \
  -d '{
    "token": "第三方平台返回的ID_Token",
    "platform": "ios",
    "device_id": "设备UUID",
    "a0": "自定义字段（可选）"
  }'
```

**iOS 完整代码：**
```swift
func login(idToken: String, provider: String, appId: String, appSecret: String) {
    // 1. 生成认证 JWT
    guard let authJWT = generateAuthJWT(appId: appId, appSecret: appSecret) else {
        print("生成认证 JWT 失败")
        return
    }
    
    // 2. 调用登录接口
    let url = URL(string: "https://auth-login.pwtk-dev.work/auth/\(provider)")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(authJWT)", forHTTPHeaderField: "Authorization")
    
    let body: [String: Any] = [
        "token": idToken,
        "platform": "ios",
        "device_id": UIDevice.current.identifierForVendor?.uuidString ?? "",
        "a0": "自定义字段（可选）"  // 可选参数
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let success = json["success"] as? Bool,
           success,
           let dataDict = json["data"] as? [String: Any],
           let userJWT = dataDict["token"] as? String {
            
            // 3. 保存用户 JWT Token
            UserDefaults.standard.set(userJWT, forKey: "user_jwt_token")
            
            // 4. 传给后台
            print("用户 JWT Token: \(userJWT)")
        }
    }.resume()
}
```

**Android 完整代码：**
```kotlin
fun login(idToken: String, provider: String, appId: String, appSecret: String) {
    // 1. 生成认证 JWT
    val authJWT = generateAuthJWT(appId, appSecret)
    
    // 2. 调用登录接口
    val client = OkHttpClient()
    val json = JSONObject().apply {
        put("token", idToken)
        put("platform", "android")
        put("device_id", Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID))
        put("a0", "自定义字段（可选）")  // 可选参数
    }
    
    val body = json.toString().toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("https://auth-login.pwtk-dev.work/auth/$provider")
        .post(body)
        .addHeader("Authorization", "Bearer $authJWT")
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            val result = JSONObject(response.body?.string() ?: "")
            if (result.getBoolean("success")) {
                val userJWT = result.getJSONObject("data").getString("token")
                
                // 3. 保存用户 JWT Token
                sharedPreferences.edit()
                    .putString("user_jwt_token", userJWT)
                    .apply()
                
                // 4. 传给后台
                Log.d("Login", "用户 JWT Token: $userJWT")
            }
        }
    })
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",  // 用户 JWT Token (7天过期)，传给后台
    "user_id": "user_123",
    "nickname": "张三",
    "is_new": false
  }
}
```

---

### 步骤 4: 把用户 JWT Token 传给后台

App 把获取到的用户 JWT Token 传给你们的后台服务，后台再调用验证接口验证（见 [后台验证接口文档](./API_VERIFY_TOKEN.md)）。

---

## 📝 请求参数

### 请求头

| 参数 | 必填 | 说明 |
|------|------|------|
| `Authorization` | ✅ | Bearer {认证JWT}，包含 app_id，5分钟过期 |

### 请求体

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `token` | ✅ | 第三方平台的 ID Token | `eyJhbGci...` |
| `platform` | ❌ | 平台类型 | `ios` / `android` |
| `device_id` | ❌ | 设备唯一 ID | UUID |
| `a0` | ❌ | 自定义字段，会在验证时返回 | 任意字符串 |

---

## ❌ 常见错误

### 401 - 认证 Token 无效
```json
{"success": false, "code": "INVALID_AUTH_TOKEN", "message": "认证 Token 验证失败"}
```
**解决：** 
- 检查认证 JWT 是否正确生成
- 检查 app_id 和 app_secret 是否匹配
- 检查 JWT 是否过期（5分钟有效期）

### 400 - Token 验证失败
```json
{"success": false, "code": "INVALID_TOKEN", "message": "ID Token 验证失败"}
```
**解决：** 
- 检查 Token 是否是最新获取的（1小时有效期）
- 检查 Google/Apple 配置是否正确

---

## 🧪 测试

**测试配置：**
- `app_id`: `test_app`
- `app_secret`: `test_secret_123456`

**测试脚本：** `node test-sign.js`

---

## 📞 获取配置

联系服务提供方申请正式的 `app_id` 和 `app_secret`。

**相关文档：**
- [后台验证接口](./API_VERIFY_TOKEN.md)
- [H5 登录接口](./API_H5_LOGIN.md)
